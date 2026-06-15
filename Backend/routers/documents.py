"""
VendorVerse 3.0 – Document Router
Supplier document ingestion into Supabase pgvector.
Documents are associated with a supplier_id and chunked for RAG retrieval.
"""
import os
import uuid
import shutil
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from database import get_session
from models import SupplierDocument, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["Documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = ["application/pdf", "text/csv"]
ALLOWED_CATEGORIES = ["contract", "compliance", "audit", "invoice", "other"]


@router.post("/upload")
async def upload_supplier_document(
    file: UploadFile = File(...),
    supplier_id: str = Form(...),
    category: Optional[str] = Form(default="other"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document (PDF/CSV) for a specific supplier.
    The document is chunked and ingested into Supabase pgvector for semantic search.
    Metadata is tracked in the supplier_document table.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Only PDF and CSV are supported."
        )

    if category not in ALLOWED_CATEGORIES:
        category = "other"

    # Save file to disk
    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    safe_filename = f"{doc_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Ingest into pgvector
    chunks_count = 0
    ingestion_error = None
    try:
        chunks_count = await _ingest_document_to_pgvector(
            file_path=file_path,
            file_type=file.content_type,
            supplier_id=supplier_id,
            doc_id=doc_id,
            filename=file.filename,
            category=category
        )
    except Exception as e:
        ingestion_error = str(e)
        print(f"pgvector ingestion failed: {e}")

    # Track in DB regardless of pgvector success
    supplier_doc = SupplierDocument(
        id=doc_id,
        supplier_id=supplier_id,
        filename=file.filename,
        file_type=file.content_type,
        category=category,
        chunks_ingested=chunks_count,
        file_path=file_path,
        uploaded_by=current_user.email
    )
    session.add(supplier_doc)
    session.commit()

    return {
        "success": True,
        "document_id": doc_id,
        "supplier_id": supplier_id,
        "filename": file.filename,
        "category": category,
        "chunks_ingested": chunks_count,
        "message": "Document uploaded successfully." if not ingestion_error else f"Document saved but vector ingestion failed: {ingestion_error}"
    }


async def _ingest_document_to_pgvector(
    file_path: str,
    file_type: str,
    supplier_id: str,
    doc_id: str,
    filename: str,
    category: str
) -> int:
    """
    Chunk a document and upsert embeddings into Supabase pgvector supplier_embeddings table.
    Returns number of chunks ingested.
    """
    # Load and chunk the document
    chunks = []

    if file_type == "application/pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            full_text = "\n".join(
                page.extract_text() or "" for page in reader.pages
            )
        except Exception as e:
            raise ValueError(f"PDF parsing failed: {e}")

    elif file_type == "text/csv":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            full_text = f.read()
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    # Simple chunking: split by ~1000 chars with 200 char overlap
    chunk_size = 1000
    overlap = 200
    text = full_text.strip()
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap

    if not chunks:
        return 0

    # Generate embeddings
    from rag.store import embed_texts
    embeddings = embed_texts(chunks)

    # Upsert to Supabase pgvector
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

    if supabase_url and supabase_key:
        import supabase as sb
        client = sb.create_client(supabase_url, supabase_key)
        rows = [
            {
                "supplier_id": supplier_id,
                "content": chunks[i],
                "embedding": embeddings[i],
                "metadata": {
                    "doc_id": doc_id,
                    "filename": filename,
                    "category": category,
                    "chunk_index": i,
                    "source": "document"
                }
            }
            for i in range(len(chunks))
        ]
        client.table("supplier_embeddings").upsert(rows).execute()

    return len(chunks)


@router.get("/supplier/{supplier_id}")
def get_supplier_documents(
    supplier_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Return all documents uploaded for a supplier."""
    docs = session.exec(
        select(SupplierDocument)
        .where(SupplierDocument.supplier_id == supplier_id)
        .order_by(SupplierDocument.created_at.desc())
    ).all()

    return {
        "supplier_id": supplier_id,
        "total_documents": len(docs),
        "documents": [
            {
                "document_id": d.id,
                "filename": d.filename,
                "category": d.category,
                "file_type": d.file_type,
                "chunks_ingested": d.chunks_ingested,
                "uploaded_by": d.uploaded_by,
                "created_at": d.created_at.isoformat()
            }
            for d in docs
        ]
    }


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a document record and its file from disk."""
    doc = session.get(SupplierDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove file from disk
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    session.delete(doc)
    session.commit()

    return {"success": True, "message": f"Document {document_id} deleted."}


@router.get("/{document_id}/download")
def download_document(document_id: str, session: Session = Depends(get_session)):
    """Download an uploaded supplier document from disk."""
    doc = session.get(SupplierDocument, document_id)
    if not doc or not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")
        
    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type=doc.file_type or "application/octet-stream",
        content_disposition_type="inline"
    )

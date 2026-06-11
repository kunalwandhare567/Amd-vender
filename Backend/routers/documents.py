from fastapi import APIRouter, UploadFile, File, HTTPException
from rag.store import ingest_document
import os
import shutil

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if file.content_type not in ["application/pdf", "text/csv"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF and CSV are supported.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Ingest the document
        chunks_count = ingest_document(file_path, file.content_type)
        
        return {
            "success": True,
            "filename": file.filename,
            "chunks_ingested": chunks_count,
            "message": "Document uploaded and ingested successfully."
        }
    except Exception as e:
        # Clean up file if processing fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

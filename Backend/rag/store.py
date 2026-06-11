from langchain_core.embeddings import Embeddings  # pyrefly: ignore [missing-import]
from langchain_chroma import Chroma  # pyrefly: ignore [missing-import]
from langchain_core.documents import Document  # pyrefly: ignore [missing-import]
from langchain_community.document_loaders import PyPDFLoader, CSVLoader  # pyrefly: ignore [missing-import]
from langchain_text_splitters import RecursiveCharacterTextSplitter  # pyrefly: ignore [missing-import]
from sqlmodel import Session, select  # pyrefly: ignore [missing-import]
from database import engine
from models import Supplier
from openai import OpenAI  # pyrefly: ignore [missing-import]
import os
import shutil
from dotenv import load_dotenv  # pyrefly: ignore [missing-import]

load_dotenv(override=True)


# Lazy initialization
_vector_store = None

class OpenRouterEmbeddings(Embeddings):
    def __init__(self, api_key: str, model: str = "nvidia/llama-nemotron-embed-vl-1b-v2:free", base_url: str = "https://openrouter.ai/api/v1"):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        response = self.client.embeddings.create(
            model=self.model,
            input=texts,
            encoding_format="float"
        )
        return [item.embedding for item in response.data]

    def embed_query(self, text: str) -> list[float]:
        response = self.client.embeddings.create(
            model=self.model,
            input=text,
            encoding_format="float"
        )
        return response.data[0].embedding

def get_vector_store():
    global _vector_store
    if _vector_store is None:
        api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenRouter API key is missing. Please set AZURE_OPENAI_API_KEY or OPENROUTER_API_KEY in backend/.env")
        
        base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        model = os.getenv("OPENROUTER_EMBED_MODEL", "openai/text-embedding-3-large")
        
        embeddings = OpenRouterEmbeddings(
            api_key=api_key,
            model=model,
            base_url=base_url
        )
        
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")
        try:
            _vector_store = Chroma(
                collection_name="suppliers",
                embedding_function=embeddings,
                persist_directory=db_path
            )
            # Proactively trigger validation check to catch dimension mismatch
            _vector_store.similarity_search("test", k=1)
        except Exception as e:
            print(f"Error initializing Chroma (likely dimension mismatch): {e}")
            print(f"Clearing and rebuilding vector store collection at: {db_path}")
            try:
                import chromadb
                client = chromadb.PersistentClient(path=db_path)
                try:
                    client.delete_collection("suppliers")
                except Exception:
                    pass
            except Exception as reset_err:
                print(f"Failed to reset collection via chromadb client: {reset_err}")
                
            if os.path.exists(db_path):
                try:
                    shutil.rmtree(db_path)
                except Exception as del_err:
                    print(f"Warning: Could not delete {db_path} directory: {del_err}")
            _vector_store = Chroma(
                collection_name="suppliers",
                embedding_function=embeddings,
                persist_directory=db_path
            )
    return _vector_store

def ingest_suppliers():
    """Reads all suppliers from Supabase PostgreSQL and indexes them in ChromaDB."""
    print("Starting supplier ingestion...")
    vector_store = get_vector_store()
    
    with Session(engine) as session:
        suppliers = session.exec(select(Supplier)).all()
        
        documents = []
        for supplier in suppliers:
            # Create a rich text representation for embedding
            page_content = f"""
            Supplier ID: {supplier.supplier_id}
            Name: {supplier.name}
            Location: {supplier.location}
            Product Types: {supplier.product_types}
            Performance Score: {supplier.overall_score or 'Not evaluated'}
            Risk Level: {supplier.risk_level or 'Not evaluated'}
            On-Time Delivery: {supplier.otd_percentage or 'Not evaluated'}%
            Defect Rate: {supplier.defect_rate}%
            Inspection Pass Rate: {supplier.inspection_pass_rate}%
            Avg Lead Time: {supplier.avg_lead_time} days
            Avg Shipping Time: {supplier.avg_shipping_time} days
            Avg Shipping Cost: ${supplier.avg_shipping_cost}
            Avg Manufacturing Cost: ${supplier.avg_manufacturing_cost}
            Avg Manufacturing Lead Time: {supplier.avg_manufacturing_lead_time} days
            Avg Price: ${supplier.avg_price}
            Total Revenue: ${supplier.total_revenue}
            Total Products Sold: {supplier.total_products_sold}
            Production Volume: {supplier.total_production_volume}
            Avg Availability: {supplier.avg_availability}
            Avg Stock Level: {supplier.avg_stock_level}
            Transportation Modes: {supplier.transportation_modes}
            Shipping Carriers: {supplier.shipping_carriers}
            Routes: {supplier.routes}
            Avg Total Cost: ${supplier.avg_total_cost}
            Number of SKUs: {supplier.num_skus}
            """
            
            metadata = {
                "supplier_id": supplier.supplier_id,
                "name": supplier.name,
                "location": supplier.location,
                "risk_level": supplier.risk_level or "Not evaluated",
                "source": "database"
            }
            
            documents.append(Document(page_content=page_content, metadata=metadata))
        
        if documents:
            vector_store.add_documents(documents)
            print(f"Ingested {len(documents)} suppliers into vector store.")
        else:
            print("No suppliers found to ingest.")

def ingest_document(file_path: str, file_type: str):
    """Ingests a PDF or CSV document into the vector store."""
    print(f"Ingesting document: {file_path}")
    vector_store = get_vector_store()
    
    documents = []
    if file_type == "application/pdf":
        loader = PyPDFLoader(file_path)
        documents = loader.load()
    elif file_type == "text/csv":
        loader = CSVLoader(file_path)
        documents = loader.load()
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(documents)
    
    # Add source metadata
    for split in splits:
        split.metadata["source"] = os.path.basename(file_path)
        
    if splits:
        vector_store.add_documents(splits)
        print(f"Ingested {len(splits)} chunks from {file_path}")
    return len(splits)

def get_retriever():
    """Returns a retriever for the supplier vector store."""
    return get_vector_store().as_retriever(search_kwargs={"k": 5})

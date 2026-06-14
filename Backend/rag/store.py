"""
VendorVerse 3.0 – Vector Store
Supplier knowledge ingestion and semantic retrieval using Supabase native pgvector.
Embedding model: openai/text-embedding-3-small (1536 dimensions) via OpenRouter.
"""
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(override=True)


def get_embedding_client(api_key: str = None) -> OpenAI:
    """Returns OpenAI-compatible client pointing to OpenRouter for embeddings."""
    if not api_key:
        api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
    base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set in .env")
    return OpenAI(api_key=api_key, base_url=base_url)


def embed_texts(texts: list[str], api_key: str = None) -> list[list[float]]:
    """Embed a list of texts using text-embedding-3-small via OpenRouter."""
    client = get_embedding_client(api_key=api_key)
    model = os.getenv("OPENROUTER_EMBED_MODEL", "openai/text-embedding-3-small")
    response = client.embeddings.create(
        model=model,
        input=texts,
        encoding_format="float"
    )
    return [item.embedding for item in response.data]


def embed_query(text: str, api_key: str = None) -> list[float]:
    """Embed a single query string."""
    return embed_texts([text], api_key=api_key)[0]


def ingest_suppliers():
    """
    Reads all suppliers from Supabase PostgreSQL and upserts their
    embeddings into the pgvector supplier_embeddings table.
    Falls back gracefully if pgvector table is not yet created.
    """
    print("Starting supplier ingestion into Supabase pgvector...")
    from sqlmodel import Session, select
    from database import engine
    from models import Supplier

    try:
        import supabase as sb
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        use_pgvector = bool(supabase_url and supabase_key)
    except ImportError:
        use_pgvector = False
        print("supabase package not installed. Skipping pgvector ingestion.")

    with Session(engine) as session:
        suppliers = session.exec(select(Supplier)).all()

        if not suppliers:
            print("No suppliers found to ingest.")
            return

        documents = []
        ids = []
        for supplier in suppliers:
            content = (
                f"Supplier ID: {supplier.supplier_id}\n"
                f"Name: {supplier.name}\n"
                f"Location: {supplier.location}\n"
                f"Product Types: {supplier.product_types}\n"
                f"Performance Score: {supplier.overall_score or 'Not evaluated'}\n"
                f"Risk Level: {supplier.risk_level or 'Not evaluated'}\n"
                f"On-Time Delivery: {supplier.otd_percentage or 'Not evaluated'}%\n"
                f"Defect Rate: {supplier.defect_rate}%\n"
                f"Inspection Pass Rate: {supplier.inspection_pass_rate}%\n"
                f"Avg Lead Time: {supplier.avg_lead_time} days\n"
                f"Avg Shipping Time: {supplier.avg_shipping_time} days\n"
                f"Avg Shipping Cost: ${supplier.avg_shipping_cost}\n"
                f"Avg Manufacturing Cost: ${supplier.avg_manufacturing_cost}\n"
                f"Total Revenue: ${supplier.total_revenue}\n"
                f"Transportation Modes: {supplier.transportation_modes}\n"
                f"Shipping Carriers: {supplier.shipping_carriers}\n"
            )
            documents.append(content)
            ids.append(supplier.supplier_id)

        # Generate embeddings
        try:
            print(f"Generating embeddings for {len(documents)} suppliers...")
            embeddings = embed_texts(documents)
            print(f"Generated {len(embeddings)} embeddings successfully.")
        except Exception as e:
            print(f"Embedding generation failed: {e}")
            return

        # Upsert to Supabase pgvector if configured
        if use_pgvector:
            try:
                client = sb.create_client(supabase_url, supabase_key)
                rows = [
                    {
                        "supplier_id": ids[i],
                        "content": documents[i],
                        "embedding": embeddings[i],
                        "metadata": json.dumps({
                            "name": suppliers[i].name,
                            "risk_level": suppliers[i].risk_level or "Not evaluated",
                            "location": suppliers[i].location,
                            "overall_score": suppliers[i].overall_score
                        })
                    }
                    for i in range(len(documents))
                ]
                client.table("supplier_embeddings").upsert(rows).execute()
                print(f"Upserted {len(rows)} supplier embeddings to Supabase pgvector.")
            except Exception as e:
                print(f"Supabase pgvector upsert failed: {e}")
        else:
            print("Supabase pgvector not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing). Embeddings generated but not persisted.")

        print("Supplier ingestion complete.")


def semantic_search(query: str, k: int = 5) -> list[dict]:
    """
    Semantic search over supplier_embeddings using Supabase RPC match_suppliers.
    Falls back gracefully if not configured.
    """
    try:
        import supabase as sb
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        if not (supabase_url and supabase_key):
            return []

        query_embedding = embed_query(query)
        client = sb.create_client(supabase_url, supabase_key)

        result = client.rpc("match_suppliers", {
            "query_embedding": query_embedding,
            "match_count": k,
            "match_threshold": 0.5
        }).execute()

        return result.data or []
    except Exception as e:
        print(f"Semantic search failed: {e}")
        return []


def get_retriever_context(query: str, k: int = 5) -> str:
    """Returns formatted context string from semantic search for use in LLM prompts."""
    results = semantic_search(query, k)
    if not results:
        return ""
    return "\n\n".join([r.get("content", "") for r in results])

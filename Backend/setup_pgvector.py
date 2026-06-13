"""
VendorVerse 3.0 – Supabase pgvector Setup Script
Run this ONCE to create the supplier_embeddings table and match_suppliers RPC.

Usage:
    python setup_pgvector.py
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

SQL = """
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Supplier embeddings table for semantic search
CREATE TABLE IF NOT EXISTS supplier_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id text REFERENCES supplier(supplier_id) ON DELETE CASCADE,
    content text,
    embedding vector(1536),
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- Index for fast vector similarity search (hnsw supports >2000 dimensions)
CREATE INDEX IF NOT EXISTS supplier_embeddings_embedding_idx
    ON supplier_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Semantic search RPC function
CREATE OR REPLACE FUNCTION match_suppliers(
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
    id uuid,
    supplier_id text,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        id,
        supplier_id,
        content,
        metadata,
        1 - (embedding <=> query_embedding) AS similarity
    FROM supplier_embeddings
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
"""

def run_setup():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env")
        return

    print("Connecting to Supabase...")
    try:
        conn = psycopg2.connect(db_url, sslmode="require")
        conn.autocommit = True
        cur = conn.cursor()

        print("Running pgvector setup SQL...")
        cur.execute(SQL)

        print("\n[OK] pgvector setup complete!")
        print("   - vector extension: enabled")
        print("   - supplier_embeddings table: created")
        print("   - hnsw index: created")
        print("   - match_suppliers RPC function: created")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[FAILED] Setup failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check DATABASE_URL in .env is correct")
        print("  2. Make sure pgvector is available on your Supabase plan (it is on free tier)")
        print("  3. Make sure the 'supplier' table exists (run seed.py first if not)")

if __name__ == "__main__":
    run_setup()

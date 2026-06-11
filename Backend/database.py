import os
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# Supabase PostgreSQL connection string (loaded from .env)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Add it to Backend/.env, e.g.: "
        'DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"'
    )

# Supabase enforces SSL on direct connections (port 5432).
# Append sslmode=require if not already present.
if "sslmode" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{separator}sslmode=require"

engine = create_engine(
    DATABASE_URL,
    echo=True,
    # ── Optimized for Supabase Pooler (PgBouncer) ──────────────
    # Using NullPool delegates connection pooling to Supabase's PgBouncer on port 6543.
    poolclass=NullPool,
)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

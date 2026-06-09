import os
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session
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
    # ── Connection-pool settings tuned for Supabase ──────────────
    # Supabase free tier allows ~60 direct connections; keep pool small.
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=300,       # recycle connections every 5 min to avoid idle drops
    pool_pre_ping=True,     # verify connection is alive before handing it out
)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

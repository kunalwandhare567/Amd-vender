from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import socketio
import uvicorn

from database import create_db_and_tables
from routers import suppliers, chat, auth, documents, alerts, sla, interventions, ai_command, rfqs, route_intelligence, agents
from rag.store import ingest_suppliers
from socket_manager import sio

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Run ingestion in background to not block startup
    import threading
    try:
        threading.Thread(target=ingest_suppliers, daemon=True).start()
    except Exception as e:
        print(f"Failed to start ingestion thread: {e}")
    yield

# Create FastAPI app
fastapi_app = FastAPI(
    title="VendorVerse 3.0 API",
    description="AI-Powered Supply Chain Intelligence & Decision Support Platform",
    version="3.0.0",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
]

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Core Supply Chain Intelligence Routers ──────────────────────────
fastapi_app.include_router(auth.router)
fastapi_app.include_router(suppliers.router)
fastapi_app.include_router(alerts.router)
fastapi_app.include_router(sla.router)
fastapi_app.include_router(interventions.router)
fastapi_app.include_router(rfqs.router)
fastapi_app.include_router(chat.router)
fastapi_app.include_router(documents.router)
fastapi_app.include_router(ai_command.router)
fastapi_app.include_router(route_intelligence.router)
fastapi_app.include_router(agents.router)

# Wrap with Socket.IO
app = socketio.ASGIApp(sio, fastapi_app)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

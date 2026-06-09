# 🛡️ Vendir Verse

> An AI-powered supplier intelligence and risk management platform — monitor supplier performance, detect SLA breaches, triage alerts, and trigger automated interventions in real time.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [Seeding the Database](#seeding-the-database)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Supplier Sentinel** is a full-stack web application that helps procurement and supply chain teams manage supplier relationships using AI. It ingests supplier data, evaluates risk, monitors SLA compliance, surfaces critical alerts, and provides an AI-powered chat interface backed by a Retrieval-Augmented Generation (RAG) pipeline.

---

## Tech Stack

| Layer       | Technology                                                              |
|-------------|-------------------------------------------------------------------------|
| **Frontend**  | React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI, Recharts, Leaflet |
| **Backend**   | FastAPI, Python, SQLModel, Socket.IO                                   |
| **AI / LLM**  | Azure AI (DeepSeek-V3.1), LangGraph, LangChain                        |
| **Embeddings**| Azure Cognitive Services (`text-embedding-3-large`)                    |
| **Vector DB** | ChromaDB                                                               |
| **Database**  | Supabase PostgreSQL (via SQLModel / SQLAlchemy)                        |
| **Auth**      | JWT (python-jose + passlib/bcrypt)                                     |
| **Realtime**  | python-socketio / socket.io-client                                     |

---

## Features

- 📊 **Dashboard** — KPI cards, risk distribution charts, supplier heatmap
- 🏭 **Supplier Management** — add, view, and drill into individual supplier profiles
- 🔔 **Alerts** — real-time alerts by severity (Critical / High / Medium / Low) with status tracking
- 📉 **SLA Monitor** — track lead time, shipping time, quality score and inspection rates vs thresholds
- 🚨 **Incidents** — log and track supplier incidents with root-cause tagging
- 🤖 **AI Interventions** — automated, manual, and AI-suggested actions with priority and impact scoring
- 💬 **RAG Chat Agent** — ask natural-language questions over your supplier knowledge base
- ⚡ **AI Command Center** — run AI analysis commands across your supplier portfolio
- 📄 **Document Upload** — upload supplier documents (PDFs) into the RAG knowledge base
- 🌐 **i18n Support** — internationalisation via i18next
- 🔐 **Auth** — register/login with JWT-secured endpoints and role-based access (admin, user, supplier)

---

## Prerequisites

Make sure the following are installed **before** proceeding:

| Tool                    | Minimum Version | Notes                                        |
|-------------------------|-----------------|----------------------------------------------|
| **Node.js**             | 18+             | [nodejs.org](https://nodejs.org)             |
| **npm**                 | 9+              | Bundled with Node.js                         |
| **Python**              | 3.10+           | [python.org](https://python.org)             |
| **Supabase Account**    | Free tier+      | [supabase.com](https://supabase.com)         |
| **Git**                 | any             | [git-scm.com](https://git-scm.com)          |

> **Azure Credentials Required:** You need an active Azure AI project with:
> - A **DeepSeek-V3.1** chat deployment (or compatible Azure OpenAI model)
> - A **text-embedding-3-large** embedding deployment

---

## Project Structure

```
supplier-sentinel/
├── backend/                  # FastAPI backend
│   ├── agents/               # LangGraph AI agent (retrieve → generate)
│   ├── auth/                 # JWT auth utilities
│   ├── chroma_db/            # ChromaDB vector store data
│   ├── kaggle_data/          # Source CSV data files
│   ├── rag/                  # RAG ingestion & retrieval
│   ├── routers/              # API route handlers
│   │   ├── suppliers.py
│   │   ├── alerts.py
│   │   ├── incidents.py
│   │   ├── sla.py
│   │   ├── interventions.py
│   │   ├── chat.py
│   │   ├── ai_command.py
│   │   ├── documents.py
│   │   └── auth.py
│   ├── seed_data/            # JSON seed data files
│   ├── models.py             # SQLModel ORM models
│   ├── database.py           # DB connection & table creation
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── main.py               # App entry point
│   ├── seed.py               # Database seeding script
│   ├── socket_manager.py     # Socket.IO server setup
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Backend environment variables (not committed)
├── src/                      # React frontend
│   ├── components/           # Reusable UI components
│   ├── pages/                # Route-level page components
│   ├── hooks/                # Custom React hooks
│   ├── services/             # Axios API service modules
│   ├── contexts/             # React context providers
│   ├── data/                 # Frontend mock/static data
│   ├── types/                # TypeScript type definitions
│   ├── locales/              # i18n translation files
│   └── App.tsx               # Router & app root
├── public/                   # Static assets
├── index.html                # Vite HTML entry point
├── package.json              # Frontend dependencies & scripts
├── vite.config.ts            # Vite config
├── tailwind.config.ts        # Tailwind CSS config
├── .env.example              # Frontend env template
└── API_SPECIFICATION.md      # Full API endpoint docs
```

---

## Environment Setup

### Backend — `backend/.env`

Create the file `backend/.env` with the following variables:

```env
# ── LLM (DeepSeek-V3.1 on Azure AI) ──────────────────────────────────────
AZURE_OPENAI_API_KEY=<your-azure-api-key>
AZURE_OPENAI_ENDPOINT=https://<your-resource>.services.ai.azure.com/
AZURE_OPENAI_API_VERSION=2024-05-01-preview
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=DeepSeek-V3.1

# ── Embeddings (text-embedding-3-large on Azure Cognitive Services) ────────
AZURE_OPENAI_EMBEDDING_API_KEY=<your-embedding-api-key>
AZURE_OPENAI_EMBEDDING_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-large
AZURE_OPENAI_EMBEDDING_API_VERSION=2023-05-15

# ── Database (Supabase) ─────────────────────────────────────────────────────
# Get this from: Supabase Dashboard → Project Settings → Database → Connection string → URI
# URL-encode special characters in the password (e.g. @ → %40, # → %23)
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

> ⚠️ **Never commit `backend/.env` to version control.** It contains secret API keys.

### Frontend — `.env`

The frontend uses Vite's env system. Copy the example and fill in any overrides:

```env
# (Optional) Override the backend API base URL if not running on localhost:8000
VITE_API_BASE_URL=http://localhost:8000
```

The frontend calls `http://localhost:8000` by default (configured inside `src/services/`).

---

## Installation

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd supplier-sentinel/backend

# 2. Create a Python virtual environment
python -m venv .venv

# 3. Activate the virtual environment
#    On Windows (PowerShell):
.venv\Scripts\Activate.ps1
#    On macOS/Linux:
source .venv/bin/activate

# 4. Install Python dependencies
pip install -r requirements.txt
```

#### Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Set a **Database Password** (save it — you'll need it for the connection string).
3. Once the project is provisioned, go to **Project Settings → Database**.
4. Copy the **Connection string (URI)** and paste it as `DATABASE_URL` in `backend/.env`.
5. Replace `[YOUR-PASSWORD]` with the database password you set in step 2.
6. URL-encode any special characters in the password (e.g., `@` → `%40`, `#` → `%23`).

The seed script will automatically create all tables on Supabase — no manual SQL needed.

---

### Frontend Setup

```bash
# From the project root (supplier-sentinel/)
npm install
```

---

## Running the Application

You need **two terminals** — one for the backend and one for the frontend.

### Terminal 1 — Backend (FastAPI + Socket.IO)

```bash
# From the project root
cd supplier-sentinel

# Activate the backend venv (if not already active)
# Windows:
backend\.venv\Scripts\Activate.ps1
# macOS/Linux:
source backend/.venv/bin/activate

# Start the backend server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at: `http://localhost:8000`  
Interactive API docs (Swagger UI): `http://localhost:8000/docs`

### Terminal 2 — Frontend (Vite Dev Server)

```bash
# From the project root
npm run dev
```

The app will be available at: `http://localhost:5173`

---

## Seeding the Database

After the backend is running and the database is created, populate it with initial data:

```bash
# Activate the backend venv first, then from the project root:
python -m backend.seed
```

This script will:
1. Drop and recreate all tables
2. Insert supplier records (from `backend/seed_data/`)
3. Insert alerts, SLA metrics, interventions, and incidents

> **Note:** The seeder also triggers RAG ingestion of supplier data into ChromaDB in the background when the server starts. Allow a few seconds after boot for the vector store to be ready.

---

## API Reference

Full API documentation is available in two ways:

- **Interactive (live):** `http://localhost:8000/docs` (Swagger UI) when the backend is running
- **Static spec:** See [`API_SPECIFICATION.md`](./API_SPECIFICATION.md)

Key endpoint groups:

| Prefix           | Description                                  |
|------------------|----------------------------------------------|
| `/auth`          | Register, login, get current user            |
| `/suppliers`     | CRUD for supplier records                    |
| `/alerts`        | Fetch and update alert statuses              |
| `/incidents`     | Incident logging and retrieval               |
| `/sla`           | SLA metrics per supplier                     |
| `/interventions` | AI-generated and manual intervention plans   |
| `/chat`          | RAG-powered conversational AI endpoint       |
| `/ai-command`    | Batch AI analysis across the supplier base   |
| `/documents`     | Upload PDFs into the supplier knowledge base |

---

## Architecture

```
┌───────────────────────────────────────┐
│           React Frontend (Vite)       │
│  Pages: Dashboard, Suppliers, Alerts, │
│         SLA, Incidents, Interventions,│
│         Agent Chat, AI Command        │
└──────────────┬────────────────────────┘
               │  REST + Socket.IO
               ▼
┌───────────────────────────────────────┐
│         FastAPI Backend               │
│  Routers → SQLModel (Supabase PG)     │
│  Socket.IO for real-time events       │
└──────┬────────────────────┬───────────┘
       │  LangGraph Agent   │  RAG Store
       ▼                    ▼
┌─────────────┐     ┌──────────────────┐
│ Azure AI    │     │   ChromaDB       │
│ DeepSeek-V3 │     │ (vector search)  │
│ (chat LLM)  │     │                  │
└─────────────┘     └──────────────────┘
                            ▲
                    text-embedding-3-large
                    (Azure Cognitive Svcs)
```

The AI agent is a two-node **LangGraph** graph:
1. **`retrieve`** — performs semantic search over ChromaDB using the user query
2. **`generate`** — passes retrieved context + query to DeepSeek-V3.1 for the final response

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `uvicorn: command not found` | Make sure your virtual environment is activated and `pip install -r requirements.txt` completed |
| `psycopg2` import error | Run `pip install psycopg2-binary` inside the venv |
| CORS errors in browser | Ensure backend is running on port `8000` and frontend on `5173` / `3000` / `8080` |
| ChromaDB empty / chat not working | Wait ~10s after backend startup for background RAG ingestion to complete |
| Supabase auth error | Double-check `DATABASE_URL` in `backend/.env` — URL-encode special chars in the password (`@` → `%40`, `#` → `%23`) |
| `SSL connection` error | Ensure `sslmode=require` is appended to your DATABASE_URL (auto-added by `database.py`) |
| `AZURE_OPENAI_API_KEY` errors | Ensure `backend/.env` exists with valid API credentials |
| Frontend shows no data | Run `python -m backend.seed` from the project root to populate the Supabase database |
| Port already in use | Change the port: `uvicorn backend.main:app --port 8001` (and update the CORS origin + frontend API URL accordingly) |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is for internal / demo use. Contact the repository owner for licensing details.

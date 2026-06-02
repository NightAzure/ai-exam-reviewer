# Architecture Overview

High-level view of the AI Board Exam Reviewer — users, hosted services, and optional local GPU setup.

---

## System map

```mermaid
flowchart TB
  subgraph Users["Users"]
    S[Student]
    A[Admin / Instructor]
  end

  subgraph Client["Browser"]
    UI[Next.js Web App<br/>Dashboard · Courses · Chat · Assessments]
  end

  subgraph Hosted["Cloud / Hosted"]
    NX[Next.js Server<br/>API routes + chat proxy]
    SB[(Supabase<br/>Auth · Postgres · RLS · Storage)]
    VEC[(pgvector<br/>question_bank · document_chunks)]
  end

  subgraph AI["AI Backend"]
    FA[FastAPI<br/>server/main.py]
  end

  subgraph Local["Local / GPU host (optional)"]
    OLL[Ollama<br/>Qwen 2.5 on GPU]
    TUN[Tunnel<br/>cloudflared / ngrok]
  end

  S --> UI
  A --> UI
  UI --> NX
  NX --> SB
  SB --- VEC
  NX -->|chat, hints, reviews, notes| FA
  FA --> VEC
  FA --> SB
  FA --> OLL

  NX -.->|FASTAPI_URL| TUN
  TUN -.-> FA

  style Local fill:#1a1a2e,stroke:#4a5568,color:#e2e8f0
  style Hosted fill:#0f172a,stroke:#334155,color:#e2e8f0
  style Users fill:#14532d,stroke:#22c55e,color:#ecfdf5
```

**Legend**

| Layer | Role |
|-------|------|
| **Users** | Students take courses, chat, assessments; admins manage courses and question banks |
| **Next.js** | UI + authenticated `/api/*` routes; never talks to Ollama directly |
| **Supabase** | System of record — users, courses, attempts, chat threads, files |
| **pgvector** | Embeddings for RAG (exam questions + uploaded PDF chunks) |
| **FastAPI** | All AI work — chat stream, hints, reviews, note generation, embeddings |
| **Ollama** | LLM inference on a local GPU machine |
| **Tunnel** | Exposes home GPU FastAPI to a deployed Vercel app via `FASTAPI_URL` |

---

## Request flows (simplified)

### Typical chat

```mermaid
sequenceDiagram
  actor U as Student
  participant N as Next.js
  participant S as Supabase
  participant F as FastAPI
  participant L as Ollama

  U->>N: Send message
  N->>S: Auth + load thread + mastery
  N->>F: POST /chat/stream
  F->>S: pgvector RAG lookup
  F->>L: Generate response
  L-->>F: Tutor reply
  F-->>N: Stream SSE
  N-->>U: Render in chat
```

### Deployed app + home GPU

```mermaid
flowchart LR
  U[User anywhere] --> V[Vercel / hosted Next.js]
  V -->|HTTPS + TUTOR_API_KEY| T[Tunnel]
  T --> PC[Your PC<br/>FastAPI + Ollama]
  V --> SB[(Supabase)]
  PC --> SB
```

Students use the hosted site. Chat AI runs on your gaming PC; Supabase stays in the cloud for all data.

---

## Deployment modes

| Mode | Next.js | FastAPI | LLM | Best for |
|------|---------|---------|-----|----------|
| **Local dev** | `localhost:3000` | `localhost:8000` | Ollama | Development |
| **Cloud + home GPU** | Vercel | PC via tunnel | Ollama on GPU | Hosted app, you run the model at home |

See [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) for deployment details and [HOME_GPU_PROXY.md](../server/HOME_GPU_PROXY.md) for the tunnel setup.

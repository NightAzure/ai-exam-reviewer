# AI Board Exam Reviewer

A web-based review platform built for Philippine engineering board exam takers. Students get an AI tutor that pulls from a 14,000+ question bank, tracks their mastery per subject, and adjusts over time based on what they're getting wrong.

Built with Next.js, FastAPI, and Supabase. The AI runs on Qwen 2.5 14B locally (via Ollama) with Gemini as a fallback — or Gemini only if you don't have a GPU.

---

## What it does

- **AI tutor chat** — Socratic-style responses grounded in actual exam questions via RAG
- **Assessments** — timed quizzes, manual or randomized from the question bank, with per-attempt tracking
- **Post-exam AI review** — explanations for every wrong answer after submission
- **Hints** — in-quiz Socratic hints that guide without giving the answer away
- **Flashcards** — spaced repetition (SM-2) tied to the question bank
- **Mastery tracking** — per-subject scores that update after each assessment and personalize the AI's responses
- **Notes** — per-topic notes with markdown support and AI-assisted generation
- **Question generation** — admins can generate draft MCQs from the existing question bank using AI, then review and approve them
- **Diagnostic quiz** — identifies weak subjects on first visit

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend + API routes | Next.js 16, TypeScript, Tailwind CSS v4, Radix UI |
| AI backend | FastAPI (Python 3.11+), Qwen 2.5 14B via Ollama, Gemini fallback |
| RAG | Supabase pgvector (`question_bank` + `document_chunks` embeddings) |
| Database + Auth | Supabase (PostgreSQL, RLS, email/Microsoft OAuth) |
| State | Zustand, SWR |

---

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.11+
- A Supabase project (free tier works for development)
- A Google AI API key (for Gemini)
- Ollama + Qwen 2.5 14B if you want local inference (optional)

### 1. Clone and install

```bash
git clone https://github.com/NightAzure/ai-exam-reviewer.git
cd ai-exam-reviewer
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
FASTAPI_URL=http://localhost:8000
TUTOR_API_KEY=any-random-secret
```

Create `server/.env`:

```env
TUTOR_API_KEY=any-random-secret   # must match above
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:3000
DISABLE_OLLAMA=true               # set to false if running Ollama locally
OLLAMA_HOST=http://127.0.0.1:11434 # change if Ollama runs on another machine
```

### 3. Database

Run the migrations in order from `supabase/migrations/` using the Supabase SQL editor or:

```bash
supabase db push
```

### 4. Backfill question embeddings (optional)

After migrations are applied and the question bank is populated, generate pgvector embeddings for RAG:

```bash
cd server
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m scripts.backfill_embeddings
```

Safe to re-run — skips rows that already have embeddings.

### 5. Run

```bash
# Both servers at once
npm run dev:all

# Or separately
npm run dev          # Next.js on port 3000
npm run dev:server   # FastAPI on port 8000
```

---

## Project structure

```
app/
  (admin)/        # Admin panel — course management, question bank, assessments
  (main)/         # Student dashboard — courses, chat, notes
  (api)/          # API route handlers
  api/chat/       # Chat proxy to FastAPI
server/
  main.py         # FastAPI entry point
  ai/             # Provider abstraction (Ollama, Gemini, Bedrock)
  rag/            # pgvector retriever + document ingester
  scripts/        # Embedding backfill utilities
components/
types/
utils/supabase/   # Typed Supabase query helpers
supabase/
  migrations/     # SQL migrations in order
```

---

## Development notes

- Admin routes use the Supabase service role client (`utils/supabase/admin.ts`) to bypass RLS — don't use this client in student-facing routes
- RAG embeddings live in Supabase (`question_bank.embedding`, `document_chunks`); run `python -m scripts.backfill_embeddings` after bulk question imports
- `OLLAMA_HOST=http://your-ollama-host:11434` in the server `.env` points FastAPI at a custom Ollama server
- `DISABLE_OLLAMA=true` in the server `.env` routes all AI calls to Gemini; useful when Ollama isn't running locally
- Assessment attempt numbers are assigned atomically via a Postgres function (`insert_assessment_attempt`) to prevent race conditions under concurrent submissions

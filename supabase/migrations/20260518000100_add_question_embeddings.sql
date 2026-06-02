-- Migration: Add pgvector embeddings to question_bank
-- Replaces the local FAISS+SQLite RAG pipeline with Supabase-hosted vector search.
-- After applying this migration, run: python -m scripts.backfill_embeddings

-- Enable the pgvector extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add the embedding column (384 dims = all-MiniLM-L6-v2)
ALTER TABLE question_bank
    ADD COLUMN IF NOT EXISTS embedding vector(384);

-- HNSW index for approximate nearest-neighbor cosine search.
-- ef_construction=64 balances build speed vs. recall; m=16 is standard.
CREATE INDEX IF NOT EXISTS idx_question_bank_embedding
    ON question_bank USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- RPC function called by SupabaseVectorRetriever.retrieve().
-- p_course_id = NULL → search all courses (used by endpoints without course context).
CREATE OR REPLACE FUNCTION match_questions(
    query_embedding vector(384),
    match_count     int,
    p_course_id     bigint DEFAULT NULL
)
RETURNS TABLE (
    id             bigint,
    question       text,
    correct_answer text,
    explanation    text,
    topic          text,
    subject        text,
    similarity     double precision
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
    SELECT
        id,
        question,
        correct_answer,
        explanation,
        topic,
        subject,
        (1 - (embedding <=> query_embedding))::double precision AS similarity
    FROM question_bank
    WHERE (p_course_id IS NULL OR course_id = p_course_id)
      AND embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Grant execute to authenticated users so the client-side RPC works
GRANT EXECUTE ON FUNCTION match_questions TO authenticated;
GRANT EXECUTE ON FUNCTION match_questions TO service_role;

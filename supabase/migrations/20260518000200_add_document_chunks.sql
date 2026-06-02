-- Document chunks table for RAG over uploaded course documents.
-- Requires pgvector (enabled in 20260518000100).

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id          bigint generated always as identity primary key,
  document_id bigint  NOT NULL REFERENCES public.course_documents(id) ON DELETE CASCADE,
  course_id   bigint  NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  chunk_index int     NOT NULL,
  content     text    NOT NULL,
  embedding   vector(384),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON public.document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON public.document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  match_count     int,
  p_course_id     bigint DEFAULT NULL
)
RETURNS TABLE(
  id          bigint,
  document_id bigint,
  content     text,
  similarity  float
)
LANGUAGE sql STABLE AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE
    (p_course_id IS NULL OR dc.course_id = p_course_id)
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_document_chunks TO authenticated, service_role;

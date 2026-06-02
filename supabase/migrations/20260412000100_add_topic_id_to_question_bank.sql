-- Link question_bank rows to public.topics via a nullable FK.
-- Backfill by matching subject (case-insensitive) to topic name within the same course.
-- The subject column is kept for backwards compatibility (Python RAG layer uses it).

ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS topic_id BIGINT REFERENCES public.topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_question_bank_topic_id
  ON public.question_bank(topic_id);

-- Backfill: match existing subject strings to topics by name + course
UPDATE public.question_bank qb
SET topic_id = t.id
FROM public.topics t
WHERE t.course_id = qb.course_id
  AND LOWER(t.name) = LOWER(qb.subject)
  AND qb.topic_id IS NULL;

-- Backup table for global GEAS RAG seed questions (no course assignment)
CREATE TABLE IF NOT EXISTS question_bank_rag_seed (
  id               bigint PRIMARY KEY,
  question         text NOT NULL,
  subject          text NOT NULL,
  topic            text NOT NULL,
  choice_a         text NOT NULL,
  choice_b         text NOT NULL,
  choice_c         text NOT NULL,
  choice_d         text NOT NULL,
  choice_e         text,
  correct_answer   text NOT NULL,
  explanation      text,
  difficulty_level smallint NOT NULL,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  topic_id         bigint,
  source           text NOT NULL DEFAULT 'manual'
);

-- Copy all orphaned rows before removing them
INSERT INTO question_bank_rag_seed
SELECT
  id, question, subject, topic,
  choice_a, choice_b, choice_c, choice_d, choice_e,
  correct_answer, explanation, difficulty_level,
  created_by, created_at, updated_at,
  topic_id, source
FROM question_bank
WHERE course_id IS NULL;

-- Remove the orphaned rows from the live table
DELETE FROM question_bank WHERE course_id IS NULL;

-- Now safe to enforce NOT NULL
ALTER TABLE question_bank ALTER COLUMN course_id SET NOT NULL;

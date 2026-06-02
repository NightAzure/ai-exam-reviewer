-- Unique constraint to prevent duplicate attempt_numbers (safety net)
ALTER TABLE assessment_attempts
  ADD CONSTRAINT uq_attempt_number UNIQUE (assessment_id, student_id, attempt_number);

-- Atomic insert function using advisory lock to serialize concurrent inserts
-- for the same (assessment_id, student_id) pair
CREATE OR REPLACE FUNCTION insert_assessment_attempt(
  p_assessment_id bigint,
  p_student_id    uuid,
  p_status        text,
  p_score         integer,
  p_total_questions   integer,
  p_answered_questions integer,
  p_correct_answers   integer,
  p_time_spent_seconds integer,
  p_started_at    timestamptz,
  p_submitted_at  timestamptz DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id bigint;
BEGIN
  -- Serialize all inserts for the same (assessment, student) pair.
  -- The advisory lock is transaction-scoped and released automatically on commit/rollback.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_assessment_id::text || ':' || p_student_id::text)
  );

  INSERT INTO assessment_attempts (
    assessment_id,
    student_id,
    attempt_number,
    status,
    score,
    total_questions,
    answered_questions,
    correct_answers,
    time_spent_seconds,
    started_at,
    submitted_at
  )
  SELECT
    p_assessment_id,
    p_student_id,
    COALESCE(MAX(attempt_number), 0) + 1,
    p_status,
    p_score,
    p_total_questions,
    p_answered_questions,
    p_correct_answers,
    p_time_spent_seconds,
    p_started_at,
    p_submitted_at
  FROM assessment_attempts
  WHERE assessment_id = p_assessment_id
    AND student_id = p_student_id
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$;

-- Grant execute to authenticated users (RLS on the table still applies)
GRANT EXECUTE ON FUNCTION insert_assessment_attempt TO authenticated;

-- Missing indexes on flashcard_reviews (full table scan without these)
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user_id
  ON flashcard_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_due
  ON flashcard_reviews(user_id, next_review);

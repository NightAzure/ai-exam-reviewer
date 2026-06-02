-- Scope question_bank to a specific course.
-- Each question belongs to exactly one course; deleting a course removes its questions.

-- Add course_id as nullable to handle existing rows without a course assignment.
-- Rows with course_id IS NULL are orphaned legacy data; new questions require a course_id.
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE;

CREATE INDEX idx_question_bank_course_id ON public.question_bank(course_id);

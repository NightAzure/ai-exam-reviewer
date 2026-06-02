-- P3: Performance indexes for mastery recalculation queries.
-- The mastery recalc groups assessment_attempt_answers by subject for a
-- given student + course; these indexes make that sub-200 ms at scale.

create index if not exists idx_aaa_student_subject
  on public.assessment_attempt_answers(subject);

-- Compound index used by the recalc join: attempt -> attempt_answers
create index if not exists idx_aaa_attempt_subject_correct
  on public.assessment_attempt_answers(attempt_id, subject, is_correct);

-- M3: AI-generated per-question explanations for assessment attempts.
-- One review per attempt (UNIQUE on attempt_id).
-- review_data is an array of { question_id, question_text, student_answer,
--   correct_answer, subject, topic_id, ai_explanation, concept_summary }.

create table if not exists public.assessment_reviews (
  id            bigint generated always as identity primary key,
  attempt_id    bigint not null unique references public.assessment_attempts(id) on delete cascade,
  course_id     bigint not null references public.courses(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  review_data   jsonb not null default '[]',
  generated_at  timestamptz not null default now(),
  model_version text
);

create index if not exists idx_assessment_reviews_student
  on public.assessment_reviews(student_id);

create index if not exists idx_assessment_reviews_course
  on public.assessment_reviews(course_id);

alter table public.assessment_reviews enable row level security;

-- Students read their own reviews.
drop policy if exists "assessment_reviews_student_read_own" on public.assessment_reviews;
create policy "assessment_reviews_student_read_own"
  on public.assessment_reviews
  for select
  to authenticated
  using (student_id = (select auth.uid()));

-- Course editors read all reviews for their course.
drop policy if exists "assessment_reviews_editor_read" on public.assessment_reviews;
create policy "assessment_reviews_editor_read"
  on public.assessment_reviews
  for select
  to authenticated
  using (public.is_course_editor(course_id, (select auth.uid())));

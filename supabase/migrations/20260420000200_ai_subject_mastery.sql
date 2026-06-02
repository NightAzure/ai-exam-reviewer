-- M2: Per-student subject mastery scores, computed after each assessment attempt.
-- Upserted server-side (service role); students can only read their own rows.

create table if not exists public.subject_mastery (
  id                   bigint generated always as identity primary key,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  course_id            bigint not null references public.courses(id) on delete cascade,
  subject              text not null,
  topic_id             bigint references public.topics(id) on delete set null,
  mastery_score        numeric(5, 2) not null default 0
                       check (mastery_score between 0 and 100),
  level                text not null default 'needs_work'
                       check (level in ('needs_work', 'getting_there', 'almost_there', 'proficient', 'mastered')),
  total_questions_seen integer not null default 0 check (total_questions_seen >= 0),
  correct_answers      integer not null default 0 check (correct_answers >= 0),
  last_updated         timestamptz not null default now(),
  unique (user_id, course_id, subject)
);

create index if not exists idx_subject_mastery_course_user
  on public.subject_mastery(course_id, user_id);

create index if not exists idx_subject_mastery_user_score
  on public.subject_mastery(user_id, mastery_score);

alter table public.subject_mastery enable row level security;

-- Students read only their own mastery rows.
drop policy if exists "subject_mastery_student_read_own" on public.subject_mastery;
create policy "subject_mastery_student_read_own"
  on public.subject_mastery
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Course editors can read all mastery rows for their course (analytics).
drop policy if exists "subject_mastery_editor_read" on public.subject_mastery;
create policy "subject_mastery_editor_read"
  on public.subject_mastery
  for select
  to authenticated
  using (public.is_course_editor(course_id, (select auth.uid())));

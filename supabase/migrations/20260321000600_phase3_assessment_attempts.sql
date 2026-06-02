-- Phase 3: student assessment attempts and answer snapshots.

create table if not exists public.assessment_attempts (
  id bigint generated always as identity primary key,
  assessment_id bigint not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  score integer check (score is null or (score >= 0 and score <= 100)),
  total_questions integer not null default 0 check (total_questions >= 0),
  answered_questions integer not null default 0 check (answered_questions >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  time_spent_seconds integer check (time_spent_seconds is null or time_spent_seconds >= 0),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id, attempt_number)
);

create table if not exists public.assessment_attempt_answers (
  id bigint generated always as identity primary key,
  attempt_id bigint not null references public.assessment_attempts(id) on delete cascade,
  question_id bigint references public.assessment_questions(id) on delete set null,
  question_position integer not null check (question_position >= 0),
  question_text text not null,
  question_type text not null default 'multiple-choice',
  options jsonb not null default '[]'::jsonb,
  selected_answer text,
  correct_answer text,
  explanation text,
  subject text,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_position)
);

create index if not exists idx_assessment_attempts_assessment_student
  on public.assessment_attempts(assessment_id, student_id);

create index if not exists idx_assessment_attempts_student_submitted_at
  on public.assessment_attempts(student_id, submitted_at desc nulls last);

create index if not exists idx_assessment_attempts_assessment_status
  on public.assessment_attempts(assessment_id, status);

create index if not exists idx_assessment_attempt_answers_attempt_id
  on public.assessment_attempt_answers(attempt_id);

create index if not exists idx_assessment_attempt_answers_question_id
  on public.assessment_attempt_answers(question_id);

drop trigger if exists trg_assessment_attempts_updated_at on public.assessment_attempts;
create trigger trg_assessment_attempts_updated_at
before update on public.assessment_attempts
for each row
execute function public.set_assessment_updated_at();

alter table public.assessment_attempts enable row level security;
alter table public.assessment_attempt_answers enable row level security;

drop policy if exists "assessment_attempts_select_owner_or_editor" on public.assessment_attempts;
create policy "assessment_attempts_select_owner_or_editor"
on public.assessment_attempts
for select
to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_editor(a.course_id, (select auth.uid()))
  )
);

drop policy if exists "assessment_attempts_insert_owner_member" on public.assessment_attempts;
create policy "assessment_attempts_insert_owner_member"
on public.assessment_attempts
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_member(a.course_id, (select auth.uid()))
  )
);

drop policy if exists "assessment_attempts_update_owner_or_editor" on public.assessment_attempts;
create policy "assessment_attempts_update_owner_or_editor"
on public.assessment_attempts
for update
to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_editor(a.course_id, (select auth.uid()))
  )
)
with check (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_editor(a.course_id, (select auth.uid()))
  )
);

drop policy if exists "assessment_attempt_answers_select_owner_or_editor" on public.assessment_attempt_answers;
create policy "assessment_attempt_answers_select_owner_or_editor"
on public.assessment_attempt_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where aa.id = attempt_id
      and (
        aa.student_id = (select auth.uid())
        or public.is_course_editor(a.course_id, (select auth.uid()))
      )
  )
);

drop policy if exists "assessment_attempt_answers_insert_owner_member" on public.assessment_attempt_answers;
create policy "assessment_attempt_answers_insert_owner_member"
on public.assessment_attempt_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where aa.id = attempt_id
      and aa.student_id = (select auth.uid())
      and public.is_course_member(a.course_id, (select auth.uid()))
  )
);

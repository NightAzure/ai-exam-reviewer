-- Phase 5: dedicated course question bank.

create table if not exists public.question_bank_questions (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'multiple-choice',
  subject text not null default 'General',
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  explanation text,
  created_by uuid references public.profiles(id) on delete set null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_question_bank_questions_course_id
  on public.question_bank_questions(course_id);

create index if not exists idx_question_bank_questions_course_subject
  on public.question_bank_questions(course_id, subject)
  where is_archived = false;

create index if not exists idx_question_bank_questions_course_active
  on public.question_bank_questions(course_id, is_archived);

drop trigger if exists trg_question_bank_questions_updated_at on public.question_bank_questions;
create trigger trg_question_bank_questions_updated_at
before update on public.question_bank_questions
for each row
execute function public.set_assessment_updated_at();

alter table public.question_bank_questions enable row level security;

drop policy if exists "question_bank_questions_select_course_member" on public.question_bank_questions;
create policy "question_bank_questions_select_course_member"
on public.question_bank_questions
for select
to authenticated
using (
  public.is_course_member(course_id, (select auth.uid()))
);

drop policy if exists "question_bank_questions_manage_course_editor" on public.question_bank_questions;
create policy "question_bank_questions_manage_course_editor"
on public.question_bank_questions
for all
to authenticated
using (
  public.is_course_editor(course_id, (select auth.uid()))
)
with check (
  public.is_course_editor(course_id, (select auth.uid()))
);

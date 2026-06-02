-- Phase 2: assessment core schema for admin create/edit and course assessment views.

create table if not exists public.assessments (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  duration integer check (duration is null or duration > 0),
  max_attempts integer not null default 1 check (max_attempts > 0),
  randomize_questions boolean not null default false,
  shuffle_answers boolean not null default false,
  is_enabled boolean not null default false,
  release_date timestamptz,
  deadline timestamptz,
  question_mode text not null default 'manual' check (question_mode in ('manual', 'random')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_questions (
  id bigint generated always as identity primary key,
  assessment_id bigint not null references public.assessments(id) on delete cascade,
  position integer not null default 0,
  question_text text not null,
  question_type text not null default 'multiple-choice',
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  explanation text,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, position)
);

create table if not exists public.assessment_random_rules (
  id bigint generated always as identity primary key,
  assessment_id bigint not null references public.assessments(id) on delete cascade,
  subject text not null,
  count integer not null check (count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, subject)
);

create index if not exists idx_assessments_course_id on public.assessments(course_id);
create index if not exists idx_assessments_created_by on public.assessments(created_by);
create index if not exists idx_assessments_created_at on public.assessments(created_at desc);
create index if not exists idx_assessment_questions_assessment_id on public.assessment_questions(assessment_id);
create index if not exists idx_assessment_questions_assessment_position on public.assessment_questions(assessment_id, position);
create index if not exists idx_assessment_random_rules_assessment_id on public.assessment_random_rules(assessment_id);

create or replace function public.set_assessment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_assessments_updated_at on public.assessments;
create trigger trg_assessments_updated_at
before update on public.assessments
for each row
execute function public.set_assessment_updated_at();

drop trigger if exists trg_assessment_questions_updated_at on public.assessment_questions;
create trigger trg_assessment_questions_updated_at
before update on public.assessment_questions
for each row
execute function public.set_assessment_updated_at();

drop trigger if exists trg_assessment_random_rules_updated_at on public.assessment_random_rules;
create trigger trg_assessment_random_rules_updated_at
before update on public.assessment_random_rules
for each row
execute function public.set_assessment_updated_at();

alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_random_rules enable row level security;

drop policy if exists "assessments_select_course_member" on public.assessments;
create policy "assessments_select_course_member"
on public.assessments
for select
to authenticated
using (public.is_course_member(course_id, (select auth.uid())));

drop policy if exists "assessments_manage_course_editor" on public.assessments;
create policy "assessments_manage_course_editor"
on public.assessments
for all
to authenticated
using (public.is_course_editor(course_id, (select auth.uid())))
with check (public.is_course_editor(course_id, (select auth.uid())));

drop policy if exists "assessment_questions_select_course_member" on public.assessment_questions;
create policy "assessment_questions_select_course_member"
on public.assessment_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_member(a.course_id, (select auth.uid()))
  )
);

drop policy if exists "assessment_questions_manage_course_editor" on public.assessment_questions;
create policy "assessment_questions_manage_course_editor"
on public.assessment_questions
for all
to authenticated
using (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_editor(a.course_id, (select auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_editor(a.course_id, (select auth.uid()))
  )
);

drop policy if exists "assessment_random_rules_select_course_member" on public.assessment_random_rules;
create policy "assessment_random_rules_select_course_member"
on public.assessment_random_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_member(a.course_id, (select auth.uid()))
  )
);

drop policy if exists "assessment_random_rules_manage_course_editor" on public.assessment_random_rules;
create policy "assessment_random_rules_manage_course_editor"
on public.assessment_random_rules
for all
to authenticated
using (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_editor(a.course_id, (select auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and public.is_course_editor(a.course_id, (select auth.uid()))
  )
);

-- M4: AI question / note generation jobs.
-- Written first because question_bank.ai_generation_job_id (migration 000400) references this table.

create table if not exists public.generation_jobs (
  id           bigint generated always as identity primary key,
  course_id    bigint not null references public.courses(id) on delete cascade,
  created_by   uuid references public.profiles(id) on delete set null,
  status       text not null default 'queued'
               check (status in ('queued', 'running', 'done', 'failed')),
  job_type     text not null default 'questions'
               check (job_type in ('questions', 'notes')),
  input_params jsonb not null default '{}',
  -- input_params shape: { topics: string[], count_per_topic: int, difficulty: int }
  result       jsonb,
  -- result shape: GeneratedQuestion[] (questions) or markdown string (notes)
  error        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_generation_jobs_course_status
  on public.generation_jobs(course_id, status);

alter table public.generation_jobs enable row level security;

-- Only course editors can read or write generation jobs.
drop policy if exists "generation_jobs_editor_access" on public.generation_jobs;
create policy "generation_jobs_editor_access"
  on public.generation_jobs
  for all
  to authenticated
  using  (public.is_course_editor(course_id, (select auth.uid())))
  with check (public.is_course_editor(course_id, (select auth.uid())));

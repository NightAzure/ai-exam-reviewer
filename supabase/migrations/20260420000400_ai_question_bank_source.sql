-- M1: Track whether a question_bank row was created manually or by AI generation.
-- P1: Allow instructors to enable/disable AI hints per assessment.

-- question_bank: source column
alter table public.question_bank
  add column if not exists source text not null default 'manual'
  check (source in ('manual', 'ai_generated'));

-- question_bank: link back to the generation job that produced it (nullable)
alter table public.question_bank
  add column if not exists ai_generation_job_id bigint
  references public.generation_jobs(id) on delete set null;

create index if not exists idx_question_bank_generation_job
  on public.question_bank(ai_generation_job_id)
  where ai_generation_job_id is not null;

-- assessments: allow instructor to disable AI hints for a specific assessment
alter table public.assessments
  add column if not exists allow_hints boolean not null default true;

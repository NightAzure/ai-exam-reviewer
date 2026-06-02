-- Canonical mastery recalculation and durable generation job queueing.
--
-- Mastery is recalculated inside Postgres whenever a completed attempt or its
-- answers change. This keeps direct Supabase assessment submissions from
-- relying on a client-side API side effect.
--
-- Generation jobs remain in public.generation_jobs for editor visibility, but
-- workers claim them atomically through service-role-only RPC wrappers.

create schema if not exists app_private;

grant usage on schema app_private to service_role;

-- ---------------------------------------------------------------------------
-- Subject mastery recalculation
-- ---------------------------------------------------------------------------

create or replace function app_private.mastery_level(score numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when score >= 90 then 'mastered'
    when score >= 75 then 'proficient'
    when score >= 60 then 'almost_there'
    when score >= 40 then 'getting_there'
    else 'needs_work'
  end
$$;

create or replace function app_private.recalculate_subject_mastery(
  p_course_id bigint,
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer := 0;
begin
  if p_course_id is null or p_user_id is null then
    return 0;
  end if;

  with completed_attempts as (
    select
      aa.id,
      aa.submitted_at
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where aa.student_id = p_user_id
      and aa.status = 'completed'
      and a.course_id = p_course_id
  ),
  answer_stats as (
    select
      coalesce(nullif(trim(aaa.subject), ''), 'General') as subject,
      min(aaa.topic_id) filter (where aaa.topic_id is not null) as topic_id,
      aaa.attempt_id,
      coalesce(max(ca.submitted_at), now()) as submitted_at,
      count(*)::integer as total,
      count(*) filter (where aaa.is_correct)::integer as correct
    from public.assessment_attempt_answers aaa
    join completed_attempts ca on ca.id = aaa.attempt_id
    group by coalesce(nullif(trim(aaa.subject), ''), 'General'), aaa.attempt_id
  ),
  ranked as (
    select
      answer_stats.*,
      row_number() over (partition by subject order by submitted_at desc, attempt_id desc) as recency_rank
    from answer_stats
  ),
  computed as (
    select
      subject,
      min(topic_id) filter (where topic_id is not null) as topic_id,
      round(
        (
          sum((correct::numeric / nullif(total, 0)) * greatest(11 - recency_rank, 1))
          / nullif(sum(greatest(11 - recency_rank, 1)), 0)
        ) * 100,
        2
      ) as mastery_score,
      sum(total)::integer as total_questions_seen,
      sum(correct)::integer as correct_answers
    from ranked
    where recency_rank <= 10
    group by subject
  ),
  removed as (
    delete from public.subject_mastery sm
    where sm.user_id = p_user_id
      and sm.course_id = p_course_id
      and not exists (
        select 1 from computed c where c.subject = sm.subject
      )
  ),
  upserted as (
    insert into public.subject_mastery (
      user_id,
      course_id,
      subject,
      topic_id,
      mastery_score,
      level,
      total_questions_seen,
      correct_answers,
      last_updated
    )
    select
      p_user_id,
      p_course_id,
      c.subject,
      c.topic_id,
      coalesce(c.mastery_score, 0),
      app_private.mastery_level(coalesce(c.mastery_score, 0)),
      c.total_questions_seen,
      c.correct_answers,
      now()
    from computed c
    on conflict (user_id, course_id, subject)
    do update set
      topic_id = excluded.topic_id,
      mastery_score = excluded.mastery_score,
      level = excluded.level,
      total_questions_seen = excluded.total_questions_seen,
      correct_answers = excluded.correct_answers,
      last_updated = excluded.last_updated
    returning 1
  )
  select count(*) into v_updated from upserted;

  return coalesce(v_updated, 0);
end;
$$;

create or replace function app_private.recalculate_subject_mastery_for_attempt(
  p_attempt_id bigint
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id bigint;
  v_user_id uuid;
  v_status text;
begin
  select
    a.course_id,
    aa.student_id,
    aa.status
  into v_course_id, v_user_id, v_status
  from public.assessment_attempts aa
  join public.assessments a on a.id = aa.assessment_id
  where aa.id = p_attempt_id;

  if v_course_id is null or v_user_id is null or v_status <> 'completed' then
    return 0;
  end if;

  return app_private.recalculate_subject_mastery(v_course_id, v_user_id);
end;
$$;

create or replace function app_private.refresh_mastery_from_attempt_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id bigint;
begin
  v_attempt_id := coalesce(new.id, old.id);
  perform app_private.recalculate_subject_mastery_for_attempt(v_attempt_id);
  return coalesce(new, old);
end;
$$;

create or replace function app_private.refresh_mastery_from_answer_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id bigint;
begin
  v_attempt_id := coalesce(new.attempt_id, old.attempt_id);
  perform app_private.recalculate_subject_mastery_for_attempt(v_attempt_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_assessment_attempts_refresh_mastery
  on public.assessment_attempts;
create trigger trg_assessment_attempts_refresh_mastery
after insert or update of status, score, submitted_at, correct_answers, total_questions
on public.assessment_attempts
for each row
execute function app_private.refresh_mastery_from_attempt_trigger();

drop trigger if exists trg_assessment_attempt_answers_refresh_mastery
  on public.assessment_attempt_answers;
create trigger trg_assessment_attempt_answers_refresh_mastery
after insert or update or delete
on public.assessment_attempt_answers
for each row
execute function app_private.refresh_mastery_from_answer_trigger();

-- Backfill current data once after installing the canonical trigger path.
do $$
declare
  row record;
begin
  for row in
    select distinct a.course_id, aa.student_id
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where aa.status = 'completed'
  loop
    perform app_private.recalculate_subject_mastery(row.course_id, row.student_id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Durable generation queue fields and claim helpers
-- ---------------------------------------------------------------------------

alter table public.generation_jobs
  add column if not exists run_after timestamptz not null default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists max_attempts integer not null default 3 check (max_attempts >= 1);

create index if not exists idx_generation_jobs_queue_claim
  on public.generation_jobs(status, run_after, created_at)
  where status in ('queued', 'running');

create index if not exists idx_generation_jobs_locked_by
  on public.generation_jobs(locked_by)
  where locked_by is not null;

create or replace function app_private.claim_generation_job(
  p_worker_id text,
  p_job_id bigint default null,
  p_lease_seconds integer default 300
)
returns table (
  id bigint,
  course_id bigint,
  job_type text,
  input_params jsonb,
  attempt_count integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(trim(p_worker_id), '') is null then
    raise exception 'p_worker_id is required' using errcode = '22023';
  end if;

  return query
  with candidate as (
    select gj.id
    from public.generation_jobs gj
    where gj.job_type = 'questions'
      and (p_job_id is null or gj.id = p_job_id)
      and gj.status in ('queued', 'running')
      and gj.attempt_count < gj.max_attempts
      and coalesce(gj.run_after, gj.created_at) <= now()
      and (
        gj.status = 'queued'
        or (
          gj.status = 'running'
          and coalesce(gj.heartbeat_at, gj.locked_at, gj.created_at)
            < now() - make_interval(secs => greatest(coalesce(p_lease_seconds, 300), 30))
        )
      )
    order by gj.created_at
    for update skip locked
    limit 1
  ),
  claimed as (
    update public.generation_jobs gj
    set
      status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      heartbeat_at = now(),
      attempt_count = gj.attempt_count + 1,
      error = null
    from candidate
    where gj.id = candidate.id
    returning
      gj.id,
      gj.course_id,
      gj.job_type,
      gj.input_params,
      gj.attempt_count,
      gj.max_attempts
  )
  select
    claimed.id,
    claimed.course_id,
    claimed.job_type,
    claimed.input_params,
    claimed.attempt_count,
    claimed.max_attempts
  from claimed;
end;
$$;

create or replace function app_private.heartbeat_generation_job(
  p_job_id bigint,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.generation_jobs
  set heartbeat_at = now()
  where id = p_job_id
    and status = 'running'
    and locked_by = p_worker_id;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.claim_generation_job(
  p_worker_id text,
  p_job_id bigint default null,
  p_lease_seconds integer default 300
)
returns table (
  id bigint,
  course_id bigint,
  job_type text,
  input_params jsonb,
  attempt_count integer,
  max_attempts integer
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from app_private.claim_generation_job(p_worker_id, p_job_id, p_lease_seconds);
$$;

create or replace function public.heartbeat_generation_job(
  p_job_id bigint,
  p_worker_id text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select app_private.heartbeat_generation_job(p_job_id, p_worker_id);
$$;

revoke all on function public.claim_generation_job(text, bigint, integer) from public;
revoke all on function public.claim_generation_job(text, bigint, integer) from anon;
revoke all on function public.claim_generation_job(text, bigint, integer) from authenticated;
grant execute on function public.claim_generation_job(text, bigint, integer) to service_role;

revoke all on function public.heartbeat_generation_job(bigint, text) from public;
revoke all on function public.heartbeat_generation_job(bigint, text) from anon;
revoke all on function public.heartbeat_generation_job(bigint, text) from authenticated;
grant execute on function public.heartbeat_generation_job(bigint, text) to service_role;

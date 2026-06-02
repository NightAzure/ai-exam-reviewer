-- Harden vector search RPCs and document chunk access.
-- Public RPC names are kept for compatibility, but privileged table access
-- lives in an unexposed schema and always requires a concrete course scope.

create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;

grant usage on schema app_private to authenticated;
grant usage on schema app_private to service_role;

create or replace function app_private.match_questions(
  query_embedding vector(384),
  match_count     int,
  p_course_id     bigint
)
returns table (
  id             bigint,
  question       text,
  correct_answer text,
  explanation    text,
  topic          text,
  subject        text,
  similarity     double precision
)
language plpgsql
stable
security definer
set search_path = extensions, public, pg_catalog
as $$
declare
  _auth_uid  uuid := (select auth.uid());
  _auth_role text := coalesce((select auth.role()), '');
begin
  if p_course_id is null then
    raise exception 'p_course_id is required'
      using errcode = '22004';
  end if;

  if query_embedding is null then
    raise exception 'query_embedding is required'
      using errcode = '22004';
  end if;

  if match_count is null or match_count < 1 then
    raise exception 'match_count must be at least 1'
      using errcode = '22023';
  end if;

  if _auth_uid is not null then
    if not public.is_course_member(p_course_id, _auth_uid) then
      raise exception 'not a member of course %', p_course_id
        using errcode = '42501';
    end if;
  elsif _auth_role <> 'service_role' then
    raise exception 'authenticated user context is required'
      using errcode = '42501';
  end if;

  return query
  select
    qb.id,
    qb.question,
    qb.correct_answer,
    qb.explanation,
    qb.topic,
    qb.subject,
    (1 - (qb.embedding <=> query_embedding))::double precision as similarity
  from public.question_bank qb
  where qb.course_id = p_course_id
    and qb.embedding is not null
  order by qb.embedding <=> query_embedding
  limit pg_catalog.least(match_count, 20);
end;
$$;

create or replace function app_private.match_document_chunks(
  query_embedding vector(384),
  match_count     int,
  p_course_id     bigint
)
returns table (
  id          bigint,
  document_id bigint,
  content     text,
  similarity  double precision
)
language plpgsql
stable
security definer
set search_path = extensions, public, pg_catalog
as $$
declare
  _auth_uid  uuid := (select auth.uid());
  _auth_role text := coalesce((select auth.role()), '');
begin
  if p_course_id is null then
    raise exception 'p_course_id is required'
      using errcode = '22004';
  end if;

  if query_embedding is null then
    raise exception 'query_embedding is required'
      using errcode = '22004';
  end if;

  if match_count is null or match_count < 1 then
    raise exception 'match_count must be at least 1'
      using errcode = '22023';
  end if;

  if _auth_uid is not null then
    if not public.is_course_member(p_course_id, _auth_uid) then
      raise exception 'not a member of course %', p_course_id
        using errcode = '42501';
    end if;
  elsif _auth_role <> 'service_role' then
    raise exception 'authenticated user context is required'
      using errcode = '42501';
  end if;

  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::double precision as similarity
  from public.document_chunks dc
  where dc.course_id = p_course_id
    and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit pg_catalog.least(match_count, 20);
end;
$$;

revoke all on function app_private.match_questions(vector(384), int, bigint) from public;
revoke all on function app_private.match_questions(vector(384), int, bigint) from anon;
revoke all on function app_private.match_document_chunks(vector(384), int, bigint) from public;
revoke all on function app_private.match_document_chunks(vector(384), int, bigint) from anon;

grant execute on function app_private.match_questions(vector(384), int, bigint) to authenticated;
grant execute on function app_private.match_questions(vector(384), int, bigint) to service_role;
grant execute on function app_private.match_document_chunks(vector(384), int, bigint) to authenticated;
grant execute on function app_private.match_document_chunks(vector(384), int, bigint) to service_role;

create or replace function public.match_questions(
  query_embedding vector(384),
  match_count     int,
  p_course_id     bigint default null
)
returns table (
  id             bigint,
  question       text,
  correct_answer text,
  explanation    text,
  topic          text,
  subject        text,
  similarity     double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from app_private.match_questions(query_embedding, match_count, p_course_id);
$$;

create or replace function public.match_document_chunks(
  query_embedding vector(384),
  match_count     int,
  p_course_id     bigint default null
)
returns table (
  id          bigint,
  document_id bigint,
  content     text,
  similarity  double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from app_private.match_document_chunks(query_embedding, match_count, p_course_id);
$$;

revoke all on function public.match_questions(vector(384), int, bigint) from public;
revoke all on function public.match_questions(vector(384), int, bigint) from anon;
revoke all on function public.match_document_chunks(vector(384), int, bigint) from public;
revoke all on function public.match_document_chunks(vector(384), int, bigint) from anon;

grant execute on function public.match_questions(vector(384), int, bigint) to authenticated;
grant execute on function public.match_questions(vector(384), int, bigint) to service_role;
grant execute on function public.match_document_chunks(vector(384), int, bigint) to authenticated;
grant execute on function public.match_document_chunks(vector(384), int, bigint) to service_role;

alter table public.document_chunks enable row level security;

drop policy if exists "document_chunks_select_course_member" on public.document_chunks;
create policy "document_chunks_select_course_member"
on public.document_chunks
for select
to authenticated
using (
  public.is_course_member(course_id, (select auth.uid()))
);

drop policy if exists "document_chunks_manage_course_editor" on public.document_chunks;
create policy "document_chunks_manage_course_editor"
on public.document_chunks
for all
to authenticated
using (
  public.is_course_editor(course_id, (select auth.uid()))
)
with check (
  public.is_course_editor(course_id, (select auth.uid()))
);

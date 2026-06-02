-- Structured subtopics and production duplicate safety for AI generation.

create table if not exists public.topic_subtopics (
  id          bigint generated always as identity primary key,
  course_id   bigint not null references public.courses(id) on delete cascade,
  topic_id    bigint not null references public.topics(id) on delete cascade,
  name        text not null,
  description text,
  order_index int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint topic_subtopics_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists idx_topic_subtopics_course_topic
  on public.topic_subtopics(course_id, topic_id, order_index);

create unique index if not exists idx_topic_subtopics_unique_name
  on public.topic_subtopics(course_id, topic_id, lower(trim(name)));

drop trigger if exists trg_topic_subtopics_updated_at on public.topic_subtopics;
create trigger trg_topic_subtopics_updated_at
before update on public.topic_subtopics
for each row execute function public.set_question_bank_updated_at();

alter table public.topic_subtopics enable row level security;

drop policy if exists "topic_subtopics_select_course_member" on public.topic_subtopics;
create policy "topic_subtopics_select_course_member"
on public.topic_subtopics
for select
to authenticated
using (public.is_course_member(course_id, (select auth.uid())));

drop policy if exists "topic_subtopics_manage_course_editor" on public.topic_subtopics;
create policy "topic_subtopics_manage_course_editor"
on public.topic_subtopics
for all
to authenticated
using (public.is_course_editor(course_id, (select auth.uid())))
with check (public.is_course_editor(course_id, (select auth.uid())));

alter table public.question_bank
  add column if not exists subtopic_id bigint references public.topic_subtopics(id) on delete set null,
  add column if not exists cognitive_skill text,
  add column if not exists question_fingerprint text;

create or replace function public.normalize_question_fingerprint(input text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(regexp_replace(
      regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', ' ', 'g'),
      '\s+', ' ', 'g'
    ))::text,
    ''
  )
$$;

create or replace function public.set_question_bank_fingerprint()
returns trigger
language plpgsql
as $$
begin
  new.question_fingerprint = public.normalize_question_fingerprint(new.question);
  return new;
end;
$$;

drop trigger if exists trg_question_bank_fingerprint on public.question_bank;
create trigger trg_question_bank_fingerprint
before insert or update of question on public.question_bank
for each row execute function public.set_question_bank_fingerprint();

with normalized as (
  select
    id,
    course_id,
    public.normalize_question_fingerprint(question) as fp,
    row_number() over (
      partition by course_id, public.normalize_question_fingerprint(question)
      order by id
    ) as rn
  from public.question_bank
)
update public.question_bank qb
set question_fingerprint =
  case
    when n.rn = 1 then n.fp
    else n.fp || '__legacy_duplicate_' || qb.id::text
  end
from normalized n
where qb.id = n.id
  and n.fp is not null;

create unique index if not exists idx_question_bank_course_fingerprint
  on public.question_bank(course_id, question_fingerprint)
  where question_fingerprint is not null;

create index if not exists idx_question_bank_subtopic_id
  on public.question_bank(subtopic_id);

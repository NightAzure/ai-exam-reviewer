create table if not exists public.course_notes (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id bigint references public.topics(id) on delete set null,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_notes_course_user
  on public.course_notes(course_id, user_id);

create index if not exists idx_course_notes_topic_id
  on public.course_notes(topic_id);

drop trigger if exists trg_course_notes_updated_at on public.course_notes;
create trigger trg_course_notes_updated_at
before update on public.course_notes
for each row
execute function public.set_assessment_updated_at();

alter table public.course_notes enable row level security;

drop policy if exists "course_notes_select_owner_or_editor" on public.course_notes;
create policy "course_notes_select_owner_or_editor"
on public.course_notes
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_course_editor(course_id, (select auth.uid()))
);

drop policy if exists "course_notes_insert_owner_member" on public.course_notes;
create policy "course_notes_insert_owner_member"
on public.course_notes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_course_member(course_id, (select auth.uid()))
);

drop policy if exists "course_notes_update_owner_or_editor" on public.course_notes;
create policy "course_notes_update_owner_or_editor"
on public.course_notes
for update
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_course_editor(course_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  or public.is_course_editor(course_id, (select auth.uid()))
);

drop policy if exists "course_notes_delete_owner_or_editor" on public.course_notes;
create policy "course_notes_delete_owner_or_editor"
on public.course_notes
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_course_editor(course_id, (select auth.uid()))
);

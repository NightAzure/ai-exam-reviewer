-- Phase 1D: starter helper functions + RLS for course staff, documents, and chat.
-- These policies are intentionally conservative and can be refined later.

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = _user_id
      and p.role::text = 'admin'
  );
$$;

create or replace function public.is_course_editor(_course_id bigint, _user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.courses c
    where c.id = _course_id
      and c.instructor_id = _user_id
  )
  or exists (
    select 1
    from public.course_staff cs
    where cs.course_id = _course_id
      and cs.user_id = _user_id
  )
  or public.is_admin(_user_id);
$$;

create or replace function public.is_course_member(_course_id bigint, _user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.course_id = _course_id
      and e.student_id = _user_id
      and e.status::text in ('approved', 'active', 'enrolled')
  )
  or public.is_course_editor(_course_id, _user_id);
$$;

alter table public.course_staff enable row level security;
alter table public.course_documents enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "course_staff_select_member_visible" on public.course_staff;
create policy "course_staff_select_member_visible"
on public.course_staff
for select
to authenticated
using (public.is_course_member(course_id, auth.uid()));

drop policy if exists "course_staff_manage_editor_only" on public.course_staff;
create policy "course_staff_manage_editor_only"
on public.course_staff
for all
to authenticated
using (public.is_course_editor(course_id, auth.uid()))
with check (public.is_course_editor(course_id, auth.uid()));

drop policy if exists "course_documents_select_member_visible" on public.course_documents;
create policy "course_documents_select_member_visible"
on public.course_documents
for select
to authenticated
using (public.is_course_member(course_id, auth.uid()));

drop policy if exists "course_documents_manage_editor_only" on public.course_documents;
create policy "course_documents_manage_editor_only"
on public.course_documents
for all
to authenticated
using (public.is_course_editor(course_id, auth.uid()))
with check (public.is_course_editor(course_id, auth.uid()));

drop policy if exists "chat_threads_owner_only" on public.chat_threads;
create policy "chat_threads_owner_only"
on public.chat_threads
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "chat_messages_owner_thread_only" on public.chat_messages;
create policy "chat_messages_owner_thread_only"
on public.chat_messages
for all
to authenticated
using (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_threads t
    where t.id = thread_id
      and t.user_id = auth.uid()
  )
);

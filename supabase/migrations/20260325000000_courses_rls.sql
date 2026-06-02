-- Add RLS to courses table so users can only see courses they belong to.
-- Admins can see all courses. The service role (used by admin API routes) bypasses RLS entirely.

alter table public.courses enable row level security;

-- A user can see a course if they are:
--   1. the instructor
--   2. an enrolled student (active/approved/enrolled)
--   3. a staff member
--   4. an admin
drop policy if exists "courses_select_member_or_admin" on public.courses;
create policy "courses_select_member_or_admin"
on public.courses
for select
to authenticated
using (
  instructor_id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1
    from public.enrollments e
    where e.course_id = courses.id
      and e.student_id = auth.uid()
      and e.status::text in ('approved', 'active', 'enrolled')
  )
  or exists (
    select 1
    from public.course_staff cs
    where cs.course_id = courses.id
      and cs.user_id = auth.uid()
  )
);

-- Only admins and instructors (via service role on admin routes) can insert/update/delete courses.
-- Regular mutations go through API routes that use the service role client, so these policies
-- cover direct client access.
drop policy if exists "courses_write_admin_only" on public.courses;
create policy "courses_write_admin_only"
on public.courses
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Phase 1A: extend the current course model and add non-student course staff.
-- This migration is intentionally narrow:
-- - keep existing public.profiles, public.courses, public.topics, public.enrollments
-- - add the minimum extra columns/tables needed by the current UI

do $$
begin
  create type public.course_staff_role as enum ('instructor', 'ta');
exception
  when duplicate_object then null;
end $$;

alter table public.courses
  add column if not exists allow_self_enrollment boolean not null default true,
  add column if not exists enrollment_limit integer,
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz;

create table if not exists public.course_staff (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.course_staff_role not null,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id) on delete set null,
  unique (course_id, user_id, role)
);

create index if not exists idx_course_staff_course_id on public.course_staff(course_id);
create index if not exists idx_course_staff_user_id on public.course_staff(user_id);


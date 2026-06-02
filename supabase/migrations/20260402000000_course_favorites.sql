create table if not exists public.course_favorites (
  id         bigint generated always as identity primary key,
  user_id    uuid   not null references auth.users(id) on delete cascade,
  course_id  bigint not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.course_favorites enable row level security;

-- Users can only see and manage their own favorites
drop policy if exists "Users can view own favorites" on public.course_favorites;
create policy "Users can view own favorites"
  on public.course_favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own favorites" on public.course_favorites;
create policy "Users can insert own favorites"
  on public.course_favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.course_favorites;
create policy "Users can delete own favorites"
  on public.course_favorites for delete
  using (auth.uid() = user_id);

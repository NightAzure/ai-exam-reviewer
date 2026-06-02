-- Phase 1C: persistent chat threads/messages for the course chat UI.
-- Ownership is per user. Threads can optionally be tied to a course.

create table if not exists public.chat_threads (
  id bigint generated always as identity primary key,
  course_id bigint references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  model text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.chat_threads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  model text,
  content text not null,
  tool_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_threads_course_id on public.chat_threads(course_id);
create index if not exists idx_chat_threads_user_id on public.chat_threads(user_id);
create index if not exists idx_chat_threads_updated_at on public.chat_threads(updated_at desc);
create index if not exists idx_chat_messages_thread_id on public.chat_messages(thread_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at);

create or replace function public.set_chat_threads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_chat_threads_updated_at on public.chat_threads;
create trigger trg_chat_threads_updated_at
before update on public.chat_threads
for each row
execute function public.set_chat_threads_updated_at();

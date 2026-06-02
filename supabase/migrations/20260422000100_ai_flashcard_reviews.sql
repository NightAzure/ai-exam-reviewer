create table if not exists public.flashcard_reviews (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  course_id     bigint not null references public.courses(id) on delete cascade,
  question_id   bigint not null references public.question_bank(id) on delete cascade,
  ease_factor   numeric(4,2) not null default 2.5,
  interval_days integer not null default 1,
  repetitions   integer not null default 0,
  next_review   date not null default current_date,
  last_rating   text check (last_rating in ('hard','medium','easy')),
  unique (user_id, question_id)
);

alter table public.flashcard_reviews enable row level security;

create policy "owner_only" on public.flashcard_reviews
  using (user_id = auth.uid());

alter table public.pilot_submissions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_pilot_submissions_user_created
  on public.pilot_submissions (user_id, created_at desc)
  where user_id is not null;

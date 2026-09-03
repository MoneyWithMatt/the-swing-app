create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  request_type text not null check (request_type in ('access','rectification','erasure','restriction','objection','portability')),
  status text not null default 'open' check (status in ('open','in_progress','completed','declined')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

alter table public.privacy_requests enable row level security;
revoke all on public.privacy_requests from anon, authenticated;
create index if not exists idx_privacy_requests_status_created on public.privacy_requests (status, created_at);

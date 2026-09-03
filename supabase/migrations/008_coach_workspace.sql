create table if not exists public.coach_analyses (
  id uuid primary key default gen_random_uuid(),
  coach_profile_id uuid not null references public.coach_profiles(id) on delete cascade,
  student_user_id uuid references auth.users(id) on delete set null,
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_email text check (student_email is null or char_length(student_email) <= 320),
  title text check (title is null or char_length(title) <= 120),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  video_path text not null unique,
  video_mime_type text not null,
  video_size_bytes bigint not null check (video_size_bytes > 0 and video_size_bytes <= 52428800),
  recording_path text,
  summary text not null default '' check (char_length(summary) <= 4000),
  annotations jsonb not null default '[]'::jsonb,
  video_expires_at timestamptz not null default (now() + interval '7 days'),
  video_deleted_at timestamptz,
  result_expires_at timestamptz,
  result_deleted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_analyses_coach_created_idx
  on public.coach_analyses (coach_profile_id, created_at desc);

create index if not exists coach_analyses_video_expiry_idx
  on public.coach_analyses (video_expires_at)
  where video_deleted_at is null;

create index if not exists coach_analyses_result_expiry_idx
  on public.coach_analyses (result_expires_at)
  where result_deleted_at is null and result_expires_at is not null;

alter table public.coach_analyses enable row level security;
revoke all on table public.coach_analyses from anon, authenticated;
grant all on table public.coach_analyses to service_role;


create extension if not exists pgcrypto;

create table if not exists public.pilot_submissions (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  golfer_name text not null check (char_length(golfer_name) between 1 and 100),
  golfer_email text not null,
  question text not null check (char_length(question) between 1 and 180),
  camera_angle text not null check (camera_angle in ('face_on', 'down_the_line')),
  handedness text not null check (handedness in ('right', 'left')),
  video_path text not null unique,
  video_mime_type text not null,
  video_size_bytes bigint not null check (video_size_bytes > 0 and video_size_bytes <= 52428800),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'submitted', 'in_review', 'ready', 'cancelled')),
  payment_status text not null default 'not_started' check (payment_status in ('not_started', 'checkout_created', 'authorized', 'captured', 'cancelled')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  summary text,
  drills jsonb not null default '[]'::jsonb,
  chapters jsonb not null default '[]'::jsonb,
  annotations jsonb not null default '[]'::jsonb,
  recording_path text,
  video_expires_at timestamptz not null default (now() + interval '7 days'),
  video_deleted_at timestamptz,
  result_expires_at timestamptz,
  result_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_pilot_submissions_status_created
  on public.pilot_submissions (status, created_at desc);
create index if not exists idx_pilot_submissions_email_created
  on public.pilot_submissions (golfer_email, created_at desc);
create index if not exists idx_pilot_submissions_video_expiry
  on public.pilot_submissions (video_expires_at)
  where video_deleted_at is null;
create index if not exists idx_pilot_submissions_result_expiry
  on public.pilot_submissions (result_expires_at)
  where result_deleted_at is null and result_expires_at is not null;

alter table public.pilot_submissions enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('swing-videos', 'swing-videos', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The pilot uses server-created signed upload/download URLs. No public table or
-- storage policies are required; the service-role key stays server-side only.

alter table public.pilot_submissions
  add column if not exists video_expires_at timestamptz not null default (now() + interval '7 days'),
  add column if not exists video_deleted_at timestamptz,
  add column if not exists result_expires_at timestamptz,
  add column if not exists result_deleted_at timestamptz;

create index if not exists idx_pilot_submissions_video_expiry
  on public.pilot_submissions (video_expires_at)
  where video_deleted_at is null;

create index if not exists idx_pilot_submissions_result_expiry
  on public.pilot_submissions (result_expires_at)
  where result_deleted_at is null and result_expires_at is not null;

create table if not exists public.coach_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  photo_path text,
  sports text[] not null default array['golf']::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_profiles_sports_check check (cardinality(sports) > 0 and sports <@ array['golf','disc_golf']::text[])
);

alter table public.coach_profiles enable row level security;
revoke all on public.coach_profiles from anon, authenticated;
create index if not exists idx_coach_profiles_active_sports on public.coach_profiles using gin (sports) where active;

alter table public.pilot_submissions add column if not exists coach_profile_id uuid references public.coach_profiles(id) on delete set null;
alter table public.pilot_submissions add column if not exists sport text not null default 'golf' check (sport in ('golf','disc_golf'));
create index if not exists idx_pilot_submissions_coach_created on public.pilot_submissions (coach_profile_id, created_at desc) where coach_profile_id is not null;

insert into public.coach_profiles (user_id, display_name, description, sports)
values ('de668afe-284d-4345-a0b3-f88a4e87adbb', 'Matt Robertson', 'Friendly, focused swing feedback you can take straight to your next practice session.', array['golf'])
on conflict (user_id) do nothing;

update public.pilot_submissions
set coach_profile_id = (select id from public.coach_profiles where user_id = 'de668afe-284d-4345-a0b3-f88a4e87adbb')
where coach_profile_id is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-photos', 'coach-photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

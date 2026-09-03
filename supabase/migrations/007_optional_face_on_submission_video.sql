alter table public.pilot_submissions
  add column if not exists face_on_video_path text,
  add column if not exists face_on_video_mime_type text,
  add column if not exists face_on_video_size_bytes bigint;

alter table public.pilot_submissions
  drop constraint if exists pilot_submissions_face_on_video_size_bytes_check;

alter table public.pilot_submissions
  add constraint pilot_submissions_face_on_video_size_bytes_check
  check (face_on_video_size_bytes is null or face_on_video_size_bytes > 0);

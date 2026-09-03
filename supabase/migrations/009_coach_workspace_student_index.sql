create index if not exists coach_analyses_student_user_idx
  on public.coach_analyses (student_user_id)
  where student_user_id is not null;

alter table public.pilot_submissions
  drop constraint if exists pilot_submissions_payment_status_check;

alter table public.pilot_submissions
  add constraint pilot_submissions_payment_status_check
  check (payment_status in ('not_started', 'checkout_created', 'authorized', 'discounted', 'captured', 'cancelled'));

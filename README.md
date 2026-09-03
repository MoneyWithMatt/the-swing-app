# The Swing App

A pilot-ready MVP for on-demand human golf swing analysis. It retains the original browser-only demo and adds an optional real cross-device flow using Supabase, Stripe sandbox payments, and Resend notifications.

## Run locally

Install Node.js, then:

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js.

## Prototype scope

- Mock authentication.
- Mock £5 payment pre-approval.
- Browser/localStorage mock data.
- Coach dashboard and timestamped video annotations.
- Polished in-app analysis playback instead of real MP4 export.

These bullets describe the original demo path. The optional pilot path below adds durable submissions, private video storage, sandbox payments, and email notifications. Customer accounts and rendered video export remain deferred.

## Real pilot setup

The pilot is designed to cost little or nothing while testing:

- Supabase stores submissions and private videos.
- Stripe runs in sandbox/test mode, so the £5 authorization and capture move no real money.
- Resend sends notifications when configured; it is optional during local testing.
- Vercel hosts the Next.js app.

### Temporary video retention

- Original swing videos are private and expire seven days after upload.
- Sending the analysis attempts to delete the original immediately.
- A daily protected cleanup job retries expired files and removes abandoned uploads.
- Golfer-facing results expire after 14 days. The cleanup job removes any recording and clears the written analysis.
- Supabase retains only operational metadata after media and result deletion.

### 1. Create the Supabase data and bucket

Open the Supabase SQL editor and run:

```text
supabase/migrations/001_pilot.sql
```

The migration creates the private `swing-videos` bucket and the `pilot_submissions` table. The free Supabase plan currently limits an individual upload to 50 MB, and the pilot enforces the same limit.

### 2. Configure local environment values

Copy `.env.example` to `.env.local` and fill in the Supabase project URL, service-role key, Stripe sandbox secret key, coach access key, and coach email. Never commit `.env.local`.

Generate a random `CRON_SECRET` of at least 16 characters. Vercel sends it to the daily cleanup endpoint automatically.

The app intentionally rejects live Stripe keys. `STRIPE_SECRET_KEY` must start with `sk_test_`.

### 3. Configure the Stripe sandbox webhook

Point a Stripe sandbox webhook at:

```text
https://YOUR_APP_URL/api/stripe/webhook
```

Subscribe to `checkout.session.completed`, then add its `whsec_...` signing secret to `STRIPE_WEBHOOK_SECRET`.

### 4. Add the same values to Vercel

Import the GitHub repository into Vercel, add every environment value from `.env.example`, and set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS URL.

### Pilot routes

- `/new` — real upload and Stripe sandbox checkout when configured; local demo fallback otherwise.
- `/request/[token]` — private golfer status/result link.
- `/coach/pilot` — Matt's private live queue, protected by `COACH_ACCESS_KEY`.
- `/coach` — original browser-only demonstration dashboard.
- `/api/cron/cleanup-videos` — protected daily expiry and deletion job configured by `vercel.json`.

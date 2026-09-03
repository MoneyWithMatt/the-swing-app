# UK GDPR launch checklist

The code supports compliance but cannot certify the organisation by itself. Review this checklist before accepting real customers and whenever a supplier or data use changes.

## Implemented in the app

- Private temporary swing-video storage; originals expire after 7 days and coach responses after 14 days.
- Authentication and coach/golfer role checks; service credentials remain server-side.
- Public privacy and cookie notices linked from every page.
- Privacy and age acknowledgement at golfer signup.
- Authenticated JSON data export and recorded account-erasure requests.
- No advertising or optional analytics cookies. Add prior consent before introducing either.

## Owner actions before public launch

- Confirm the controller identity, contact email and wording in `/privacy` with a UK data-protection professional.
- Record the lawful basis, purpose, fields, recipients, location and retention period for each processing activity.
- Accept and retain data-processing agreements with Supabase, Vercel, Stripe and Resend; document international-transfer safeguards.
- Create a monthly process for open `privacy_requests`; verify identity and normally answer within one month.
- Create an erasure runbook that deletes private storage objects before the Supabase Auth user, and documents any information retained under a legal obligation.
- Create a breach plan: contain, assess, document and report a notifiable breach to the ICO within 72 hours.
- Restrict production dashboards with MFA and least privilege; rotate secrets when staff or suppliers change.
- Enable Supabase leaked-password protection before launch and review Supabase security advisors after every schema change.
- Maintain tested backups and document their retention and eventual erasure behaviour.
- Do not admit under-18 users until a suitable parental-authorisation and child-friendly notice process has been reviewed.
- Re-run a data protection impact assessment before adding AI analysis, biometrics, behavioural tracking, public video sharing or large-scale monitoring.

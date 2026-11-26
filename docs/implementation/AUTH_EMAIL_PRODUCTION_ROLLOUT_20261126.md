# Production authentication email rollout — 2026-11-26

Scope: existing VELDRYN production project only (nyjwigipamnvpdvpauuv). No new hosted project, database branch, schema migration, credentials in Git, or client update. Repository configuration is not proof of hosted settings.

## Before activation
- In the Supabase Dashboard, inspect the current SMTP provider, email templates, rate limits, email confirmations, secure email changes, and redirect allowlist. Record existing non-secret settings and template bodies in a secure operator location for rollback; do not save credentials in Git.
- Preserve the current production Site URL and allowed redirects (mobile expects veldryn://auth; repository config allows it). Preserve PKCE and manual account linking. Do not alter confirmation requirements or Google sign-in in this rollout.
- If a working custom SMTP provider already exists, prefer retaining it unless there is a concrete reason to migrate.
- Otherwise sign up at https://resend.com/supabase and verify a sending subdomain of a domain owned by the operator. Add provider-supplied DNS records (SPF/DKIM) and configure appropriate DMARC. Disable click and open tracking. Do not use the demo sending domain for player mail.
- Connect the production project through the Resend integration, or enter host smtp.resend.com, port 465 (TLS) or 587 (STARTTLS), username resend, sending-only API key as password, sender name VELDRYN, and a no-reply address on the verified domain. Enter secrets directly in the provider/dashboard. Do not send secrets in chat.
- Keep the initial Supabase custom SMTP email limit at 30/hour or lower to match observed traffic and provider quotas. Free Resend allows 100/day and 3,000/month; monitor usage and prevent abuse. Preserve existing anti-abuse settings.

## Apply templates through hosted Dashboard
https://supabase.com/dashboard/project/nyjwigipamnvpdvpauuv/auth/templates

| Dashboard template | Subject | Repository file |
| --- | --- | --- |
| Confirm signup | Confirm your VELDRYN account | confirmation.html (existing) |
| Reset password | Reset your VELDRYN password | recovery.html |
| Change email address | Confirm your VELDRYN email address | email_change.html |
| Magic link | Your VELDRYN sign-in link | magic_link.html |

Files are under backend/supabase/templates. Hosted templates must be applied explicitly; merging does not activate SMTP or templates. Preserve the Supabase ConfirmationURL variable exactly; do not replace it with a hardcoded link or OTP-only flow, because the app exchanges the PKCE code. No external images, marketing links or tracking pixels. Existing email change is also used by guest conversion.

## Controlled production validation
Use only an operator-owned mailbox and disposable account, not existing player accounts. Check delivery and sender authentication, mobile deep-link return on same device, signup confirmation, resend, password reset, magic link, and guest link -> verify -> password setup. Verify the guest keeps the same Supabase UUID and character ownership. Test email changes for both addresses if secure email changes is enabled. Check spam folder, expired/reused links, and no duplicate accounts on retries. Verify that normal guest and Google login still work. Do not use a real player's account or send bulk email. Check Resend delivery/bounce results and Supabase Auth logs; avoid copying tokens or email addresses into shared logs. Security notification emails are a separate follow-up after delivery is verified.
 
## Rollback
If delivery or callback fails, restore the prior affected template(s) and previous known-working SMTP provider configuration via the Dashboard; never disable email verification to work around a mail failure. Pause rollout and inspect logs without exposing tokens. Do not change database or account ownership.

References: https://supabase.com/docs/guides/auth/auth-smtp ; https://supabase.com/docs/guides/auth/auth-email-templates ; https://resend.com/supabase

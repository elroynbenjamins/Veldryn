# Online staging release checklist

Use two dedicated staging accounts: **A** owns the activity or Party, and **B** is the second player. Never use a player account for the smoke command.

## Before testing

1. Apply pending Supabase migrations and deploy the `gameplay` Edge Function to staging.
2. Start the staging app with `node tools/start-staging-mobile.mjs`.
3. Confirm both accounts can sign in and that the app shows the staging environment.
4. Keep the smoke account idle, then run:

   ```powershell
   $env:ONLINE_SMOKE_CONFIRM='I_UNDERSTAND_STAGING_WRITES'
   $env:ONLINE_SMOKE_SUPABASE_URL='https://<staging-project>.supabase.co'
   $env:ONLINE_SMOKE_SUPABASE_ANON_KEY='<staging-anon-key>'
   $env:ONLINE_SMOKE_EMAIL='<dedicated-smoke-account-email>'
   $env:ONLINE_SMOKE_PASSWORD='<dedicated-smoke-account-password>'
   pnpm --dir apps/mobile run test:online-staging-smoke
   ```

   Expected result: authenticated read, one versioned settings write, and an identical idempotent retry.

## Two-account checks

1. With A and B, send World, Party, and Guild messages. Verify unread badges appear only for the recipient and clear after the displayed message is acknowledged.
2. Create a Party with A, invite B, accept on B, then leave/disband. Verify both clients update without an app restart.
3. Switch A to a second account while Party or chat requests are in flight. The previous account's Party, badges, drafts, and late responses must not appear on the new account.

## Resilience checks

1. Start a gameplay action, disable the network immediately after submitting, then restore it. The app must show **Retry pending action**; retrying must settle the original request once, not create a second reward.
2. Start a gameplay action, background the app for at least 30 seconds, then resume. The state must refresh from the server and preserve any pending request.
3. Repeat on a weak/throttled connection. New gameplay actions must remain blocked while an uncertain request is pending.

## Operational review

1. Inspect the current hourly `ops_metric_buckets` rows for `gameplay.command.*`.
2. Confirm command outcome and latency buckets are grouped only by command type—never account ID, request ID, or payload.
3. Investigate spikes in `retryable_failure` or `conflict` before promoting the build.

## Manual chat translation — 1.0.10 release gate

- [x] Staging translation quota migration applied; caller-only quota RPC, no message content stored
- [x] Staging Edge Function deployed with JWT verification enabled and caller-scoped chat RLS
- [x] Dedicated translation contract and full mobile CI green on the refined PR branch before privacy-gate follow-up
- [ ] Configure the server-only DEEPL_API_KEY secret in staging and verify a valid DeepL subscription; do not add keys to this repository
- [ ] Publish docs/legal/manual-chat-translation-privacy-notice.md to the external Privacy Policy URL linked in Settings
- [ ] With a dedicated authenticated staging user, translate chat messages into all 8 languages and back to original, including emotes and punctuation
- [ ] Verify Guild, Party and Live Dungeon revoked membership cannot access messages through the translation function (404)
- [ ] Verify unauthenticated (401), malformed request (400), inaccessible message (404), account rate-limit (429) and provider failure (503) paths
- [ ] Verify account switch mid-request does not display another account's translation
- [ ] Run the new deterministic Edge handler integration tests and full mobile CI, then set CHAT_TRANSLATION_RELEASED=true only after the privacy and provider gates are satisfied
- [ ] Configure production provider credentials and deploy the tested SQL/function before the first enabled production client; do not turn on the feature in an unconfigured build

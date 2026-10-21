# Guild Token Shop release — 1.0.0

The permanent Guild Token Shop is ready for the 1.0.0 application release. It contains twelve reviewed rewards: two pets, three combat companions, three profile borders, one profile icon, and three five-emote bundles.

`20261103000002_guild_token_shop_release_v1.sql` is the release switch. It enables only those catalogue rows and grants `guild_shop_purchase_server_v4(uuid,text)` to `service_role`. `anon`, `authenticated`, and `public` remain unable to invoke purchase RPCs; all pricing, level checks, token debits, and entitlement writes remain server-authoritative. The original proposed version collided with the already deployed chat emote entitlement migration; the release switch now follows the deployed chain.

## Required rollout order

1. Deploy the server/Edge handler that serves `backend/online/guild-shop-read.ts` and its purchase route.
2. Inspect linked Supabase migration status and run the normal linked dry run.
3. Apply the database migration chain, including `20261103000002_guild_token_shop_release_v1.sql`.
4. On staging, use a real account in a guild to verify the visible catalogue, a token award, one purchase, durable entitlement after relaunch, and duplicate-purchase rejection.
5. Build the `1.0.0` Android release candidate and complete device checks for sign-in, purchases, chat, combat companions, profile border preview/equip, and reconnect.
6. Submit the verified AAB through the configured production EAS/Play flow.

## Local evidence

- `node backend/test-guild-shop-migrations.mjs` — 25 migrations, transactional entitlement and privilege checks.
- `npm run test:guild-shop-art` — all twelve permanent reward SKUs have validated art and mappings.
- `npm run test:companions` — mobile/backend companion identity and live roster checks.
- `npm run test:event-release-graph` — only the released Veilbreak event pack is reachable in production sources.
- `npm run test:online` and `npm run test:pre-codex` — online authority and core smoke coverage.

## Hosted deployment receipt — 18 October 2026

- Project: `Veldryn` (`nyjwigipamnvpdvpauuv`). Staging is inactive and was not resumed.
- Rebuilt the gameplay bundle with `node tools/build-online.mjs` and deployed only the `gameplay` Edge Function using the authenticated Supabase CLI. Hosted readback reports version 27, ACTIVE. Its existing handler-based authentication is retained.
- Before applying, the linked dry run listed exactly `20261103000002_guild_token_shop_release_v1.sql`.
- Applied that migration with `supabase db push --linked --yes`. A second linked dry run reports the remote database is up to date and has no pending migrations.
- Database readback confirms all twelve intended catalogue entries are enabled, purchase EXECUTE is granted to `service_role`, and it is denied to both `anon` and `authenticated`. Construction spending remains disabled.
- Both the deployed catalogue route and purchase route reject unauthenticated requests with HTTP 401 `auth_required`.
- Security advisors were inspected. Guild Shop server-only tables have informational RLS-without-policy findings, consistent with denying direct player access. The project also reports security-definer and guest-auth policy warnings and disabled leaked-password protection; these broader notices were not changed by this release switch.
- No player tokens were spent or entitlements granted for hosted verification. A signed-in device purchase/relaunch test and the store build remain outstanding.
- The initial linked `public` lint identified nine broken functions. These were repaired in the follow-up deployment below. Baseline evidence: `output/guild-shop-release-db-lint.json`.
- Deployed gameplay source SHA-256: `2699d4aec62a9099b36c74658c5df5a861d548eb965912e19b39759a80834d48`.

## Hosted database repair receipt — 18 October 2026

- Applied `20261103000003_repair_release_database_functions.sql` to the linked production project after a dry run listing only that migration. The subsequent dry run reports no pending migrations.
- Restored the missing frozen PvE roster table, encounter sizing columns and encounter-creation helper. Preserved encounter damage and claim history; passive contribution credit remains disabled in favor of timed v3 attempts. New roster access remains server-only with RLS enabled.
- Fixed ambiguous SQL references in attempt settlement, gift administration, quest completions, appearance updates and notice upserts. The legacy activity read now delegates to the current protected/partial/inactive decay implementation.
- Separate linked lint runs for `public` and `private`, using `--level error --fail-on error`, both exited successfully with no findings. All nine original function errors are resolved.
- `backend/supabase/tests/release_database_repairs.sql` passed against production in a transaction that was rolled back. It exercises gift catalogue reads, both activity versions, quest reads, repeated notice upserts, appearance revision increments, PvE board/roster creation, idempotent attempt submission, exactly-once settlement, and restricted grants. No test notices, admin roles, attempts or guild changes were retained.
- Existing Guild Shop transactional regression tests also passed (25 migrations), and migration-version/dollar-quote validation passed (271 migrations).
- Security advisors before and after: zero ERROR findings, the same 257 WARN findings, and no new warnings. These existing advisories are not a claim of full security clearance; device/relaunch and store release checks above remain outstanding.
- Verification artifacts: `output/database-repair-postdeploy-smoke-result.json`, `output/database-repair-public-lint-receipt.txt`, `output/database-repair-private-lint-receipt.txt`, and `output/database-repair-security-advisors-after.json`.

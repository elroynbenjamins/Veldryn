# 1.0 release hardening — 21 October 2026

## Scope and source correction

Reviewed GitHub main at `3dcff79d196c70e9cb7fe56ef34fb7545771af7f`. The attached August backend v2.1 and older workbooks are historical inputs, not the current release implementation. Do not treat findings against those attachments as confirmed deployed vulnerabilities.

- Player Market is already removed from active source. September migrations remove its tables; `20261018000020_post_deploy_lint_repairs.sql` drops the orphaned reservation RPC. Preserve migration history. NPC selling, Event Shops and Guild Shop are separate systems and remain supported.
- Later migrations restrict the old idle receipt RPC to service_role and revoke authenticated access to the old expedition reward RPC. Actual deployed grants still need verification on the target environment.
- Current mobile settlement advances its clock separately and carries reward remainders. The backend `calculateIdleClaim` helper is referenced by its smoke tests, not the current mobile or online handlers searched in this pass. Fixing it is preventive foundation hardening, not evidence of a live mobile exploit.
- Current online status documents describe server-owned gameplay and co-op transactions; the old archive's incomplete contracts do not establish that these are missing from main.

## Changes

- Consume excess capped offline time in the backend idle helper, retaining only an unprocessed sub-second remainder. Repeating a claim cannot collect another capped block from the same absence.
- Reject invalid timestamps, non-finite/negative rates, invalid caps and unsafe reward totals.
- Reject fractional/non-finite crafting quantities, invalid skill levels/recipe quantities and unsafe multiplied rewards.
- Add regression coverage and a PR/main workflow for backend typechecking, compilation and economy smoke tests.
- Remove stale future-market guidance, mark the original milestone scope historical, and align the test contract with current 8h base / 24h free / 30h maximum runtime policy. No gameplay balance values were changed.

## Remaining release work

1. Verify deployed function grants, clean database resets and database concurrency against current migrations; no production database mutation was performed in this pass.
2. Exercise production claim/retry/reconnect paths with two clients, including duplicate request IDs, changed payloads and account ownership denial.
3. Complete guest linking/recovery, purchases/restores and Android upgrade-path device QA.
4. Reconcile remaining historical scope documents with the current release manifest before treating workbook specifications as launch gates.
5. Profile actual mobile startup, profile customization and chat flows on a release device before changing performance-sensitive code.

The helper regression suite is not a substitute for PostgreSQL transaction tests or device validation.

## Verification completed

- `cd backend && npm run typecheck` — passed.
- `cd backend && npm run test:release-economy` — full backend compilation and new regression suite passed.
- `cd backend && npm run backend-pass-smoke` — passed.
- `cd backend && npm run production-smoke` — passed.
- `git diff --check` — passed.

Dependencies installed locally with `npm install --ignore-scripts --no-package-lock`; no lockfile change. The initial sparse checkout omitted backend data; after including the tracked data directory, the full typecheck passed. No mobile runtime changes, device tests, live RPC tests or database migration execution in this pass.

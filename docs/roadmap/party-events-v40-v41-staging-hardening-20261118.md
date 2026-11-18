# Party Events V40–V41 release-read hardening — 18 November 2026

**Scope:** Hidden/unmounted backend prototypes in draft PR #1347. No production code route, migration, reward, account entitlement, player event, or mobile release enabled.

## V40 — current enrolled event only

The existing V33 private SQL returns the latest event for the verified account, which may be historical. V40 now guards V39's authenticated GET adapter before returning the event:
- Seven-day event status must be `active` during the event clock window.
- At closure, `active` is rejected; `closed` is visible only in the 24-hour Day 8 **read-only** results window; `settled` cannot appear until at least one hour after the event ends.
- Future or historical enrollments return `null` (never imply an active event).
- The database's server-authored timestamp must be within 120 seconds behind or 30 seconds ahead of a trusted application server clock. Untrustworthy clocks or contradictory phase transitions are rejected.
- The account ID remains server-authenticated; V40 never accepts account/party/event selectors or client clocks and introduces no additional SQL writes.
- Day 8 status visibility does **not** grant claims, combat, inventory writes or settlement. This is not a claim deadline or complete history/archive policy.

The V39 read-route's constructor now applies V40 by default. Deterministic V39/V40 tests assert stale, future, early-closed, expired-active and early-settled events are not shown as legitimate current progress.

## V41 — full private schema inventory audit, mandatory for readiness

V35 inspects only 28 columns from six key private tables. V41 explicitly checks every SQL object authored by the 18 unreleased V11–V30 drafts:
- **29 tables:** all RLS enabled and no direct `anon` or `authenticated` privileges for SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES or TRIGGER.
- **47 private functions:** no `anon` or `authenticated` EXECUTE permission; SECURITY DEFINER functions must pin the empty search path. PostgreSQL persists `SET search_path=''` as `search_path=""` in `pg_proc.proconfig`.
- The audit rejects missing, duplicate, unexpected or insecure tables/functions; it does not permit schema deployment, player access or payouts, even when the inventory is correct.
- V37 staging-readiness now **requires** a successful V41 security report in addition to the V35 column check, approved SQL file contract and audited initial Greenfields materials.
- The hidden dedicated CI executes V40/V41 adversarial tests.

## Live staging rollback evidence

Read-only/synthetic tests were executed against **Veldryn Staging 20260924**, not production. Draft migrations were applied only inside a single explicitly rolled-back transaction, with synthetic SQL suites isolated in savepoints.

- The full 18-migration chain compiled/ran in staging without errors.
- In-transaction SQL inventory: **29** draft private Party Event tables, **47** private Party Event functions; **0** missing table RLS, **0** direct player table privileges, **0** player function EXECUTE grants and **0** unpinned private SECURITY DEFINER functions.
- `authenticated` has an existing USAGE privilege on the `private` schema, but this is **not** per-object SELECT/EXECUTE/WRITE authorization; no tested Party Event object is directly player-accessible. Review exposed-schema settings separately before release.
- Separate rollback-only focused SQL regression runs passed V11 receipt, V12 canonical sources, V13 settled scouting, V14 activity EP, V15 objective EP, V16 supply donations, V17 ballot/stage advancement, V18 finale reservation, V23 boss replay attestation, V24 zero-EP/reward offers, and V25 claim intent/preflight/quote.
- After every suite and the final independent metadata probe, **zero Party Event tables/functions remained installed**. No persistent staging setup or rewards were created.

## Remaining release blockers

1. Exact-head GitHub Actions for this new PR commit (queued at latest check). Source-level tests are authored but should not be called green until jobs actually finish.
2. Live server-only producer/outbox calls for canonical gathering, crafting, co-op receipt, stage transitions, votes and inventory sinks; full enrolled account ownership and performance fixtures.
3. Persistent **staging-only** schema install after security review, authenticated HTTP mount and rate limiting, and a proper current-week selector that detects any duplicated/overlapping account enrollment before promotion.
4. A real one-transaction, independently replay-verified Day 8 reward writer, canonical account Renown destination, save/XP/Gold and Inbox parity, repeated-request recovery, cross-worker and crash rollback tests. V38's PGlite atomicity fixture is only a model.
5. Mobile integration and Android/TalkBack/translation/9-class balance checks, broader CI and separate release gate.

Keep backend PR #1347 and companion QA mobile PR #1349 **draft, unmerged and unmounted** until the blocking work is reviewed. Production and Play unchanged.

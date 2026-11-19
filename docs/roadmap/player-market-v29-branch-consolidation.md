# Player Market — branch synchronization and consolidation (19 November 2026)

**Status: DRAFT / HIDDEN / DO NOT DEPLOY.** Consolidation merges the V17–V28 acquisition/resale/read/expiry draft with the separately validated account-wide bulk-resource/V17b expiry work, atop current `main`, while preserving current client and release fences.

## Reconciliation decisions
- Git history includes current `main`, draft PR #1055 (feature/player-market-v17-acquisition-policy), and validated PR #1420 (codex/market-account-bulk-expiry-v17) as parents of the reconciliation commit. No force-push or production state change.
- Preserve main's latest `apps/mobile/src/online/market-inbox.ts`: V19 purchased-gear Bank warning on the old draft predates V21's authenticated vault, so do not reintroduce that client-side restriction.
- Merge the old `browse` request schema into main's `backend/online/market-auth-boundary.ts` while retaining main's UTF-8 byte-size request guard and the permanently disabled handler/transport switch. A client account ID is never accepted.
- Add back the old draft's read/auth/acquisition tests to `backend/package.json` while retaining newer main test tasks.
- Preserve the old draft's V18–V28 SQL migrations, re-entry policy, exact Forge provenance, direct transfer, resale, authenticated reads and restricted retention/expiry. Keep all new migrations unexposed and disabled.
- Preserve PR #1420's *separate* V17 bulk partial-fill migration and V17b mixed original-offer expiry dispatcher. V28 resale expiry remains a separate path: do not treat resale as a V17 original offer.
- Consolidate the disposable PostgreSQL 17 runner to execute all 40 dependency-ordered migrations, the V18–V28 tests **and** the V17 partial-fill/original-equipment expiry regressions. Retain concurrency and rate-limit shell suites and CI release-fence validation.

## Explicit no-release invariants
- `PLAYER_MARKET_RELEASED`, `MARKET_AUTHENTICATED_SERVICE_READY`, `MARKET_EDGE_TRANSPORT_RELEASED` and all database global/equipment trading gates stay false. Never add a runtime API route, scheduler, public write grant or item-tradable approvals during branch synchronization.
- Changes to source migration files do not certify reconciliation with Supabase's timestamped applied-migration history. Production currently lacks the Market schema. The Supabase deployment workflow is manual-only; **do not** dispatch `supabase db push` to staging or production until version history has been reconciled.
- Staging's V17/V17b private routines were applied previously and their rollback-only synthetic tests passed. That is *not* validation of the full merged V18–V28 stack: require clean-PG17 full CI, staging rollback-only integration checks, concurrency and Android QA before merging this draft to main.
- Preserve all earlier open PRs for traceability until the consolidated branch is verified, then retire duplicate drafts with links to the chosen consolidation PR.

## Follow-up integration
1. Run complete GitHub CI on the reconciled branch; diagnose failures without enabling release switches.
2. Verify V18 acquisition and V22–V24 resale interplay with partial-fill sale history (one receipt per settled resource fill, no equipment split).
3. Establish one trusted worker entrypoint for original-offer expiry (V17b dispatcher) plus resale expiry (V28). Do not run a real scheduled worker until launch.
4. Reconcile migration history and price/lot/acquisition policy approvals on disposable DB then isolated staging; keep production untouched.
5. Finish authenticated buy routing, safe claims/inbox UX, abuse limits, live QA, and explicit release approval.

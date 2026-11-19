# Party Events V39 — live staging rollback rehearsal, 18 Nov 2026

Target: **Veldryn Staging 20260924** (not Veldryn production). All SQL executions were wrapped in one outer `BEGIN` / `ROLLBACK`; each standalone draft migration's internal `BEGIN`/`COMMIT` was replaced by the outer transaction for the test only. Every test fixture likewise ran behind a savepoint.

## Verified results

1. **Before rehearsal:** zero `private.party_event_*` tables and zero Party Event functions installed.
2. **Full SQL compatibility:** all 18 hidden V11–V30 migration drafts executed in ascending order against the live staging schema without an error. The in-transaction metadata inventory showed 102 Party Events-related relations (including generated indexes).
3. **After rollback:** independently rechecked zero remaining Party Event relations and functions. No schema, fixtures, privileges, events, rewards or player data were persisted.
4. **V23 boss replay attestation SQL:** passed with the full chain applied only inside the outer rollback transaction.
5. **V25 immutable reward quote SQL:** initial test failed because its first negative expectation was stale. The V25 function intentionally locks `online_game_states` **before** `character_wallets`, so a fixture lacking both should reject missing online inventory before missing wallet. Corrected the test and added a separate missing-wallet case **after** online state exists. The same full-chain staging rollback rehearsal then passed.

## What this does and does not prove

The migration syntax/dependency chain is compatible with current staging, and the two focused V23/V25 regressions pass transactionally. This is **not** persistent staging deployment, full SQL regression coverage, permission approval, native mobile readiness, production load testing, or authorization to pay rewards.

Keep PR #1347 as a draft and retain all hidden migrations outside `backend/supabase/migrations`. The source-only V39 Auth transport must remain unmounted until explicit staging enrollment and read-only integration approval.

## Next gates

- Complete exact-head GitHub CI, the full remaining SQL security/roster/stage transition matrix, independently reviewed RLS and function grants, and Auth route rate limiting.
- Validate real service producers for gathering, co-op, crafting and supply donations against canonical save/revision and party member ownership.
- Implement a real, independently replay-verified, account-locked Day 8 writer and Inbox/receipt/Gold/XP/Renown atomic settlement, with failure injection and replay tests; V38 remains a **model**, not a production writer.
- Reconcile draft backend and mobile QA PRs with main, localize all user copy, complete Android/TalkBack/performance checks, and separately approve a restricted launch.

**Production untouched; Party Event exposure and rewards remain OFF.**

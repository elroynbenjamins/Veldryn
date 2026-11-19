# World Boss V61 — first live event and hotfix operations

**18 November 2026 · hidden draft · no gameplay rehearsal requested**

The product decision is to try the first real World Boss in production once
minimum launch safety is implemented, rather than run a staged simulated
battle. This runbook **does not** deploy, enable, schedule or grant rewards.
Automated schema/contract checks are still required because they do not
simulate a World Boss encounter. There is no staging gameplay rehearsal gate.

## Player experience and fixed rules

- A SINGLE World Boss is globally selected every 14-day cycle:
  Hollowroot (Asterfall) → Solbrand (Sunscar) → Rimewarden (Frostmarch).
  Old event/replay IDs `sunscar`, `frostmarch` stay unchanged.
- Monday 00:00 UTC through Saturday 00:00 UTC: five full preparation days.
- Saturday 00:00 UTC through Monday 00:00 UTC: continuous 48-hour battle.
  Three **total** account-wide attempts, not three per character/day.
- Up to three new characters per account; pre-existing fourth/fifth are still
  eligible. Two War Camp donations **per account**, across character switches.
- Combat and reward receipts are server-owned, idempotent and auditable. Never
  use a client clock, boss selector, Power or damage claim as authority.

## Emergency controls — V61 private SQL draft

`world-boss-incident-controls-v61.sql` defines a persistent per-event
operator record that defaults to all new actions **closed**. Three independent
switches govern only NEW receipt inserts:

| Operator control | Blocks newly created | Leaves intact |
| --- | --- | --- |
| `new_raids_open` | Account raid reservations | Existing reserved/completed attempts, replay storage and settlement |
| `new_donations_open` | War Camp material debits/donation receipts | Previously accepted donations and frozen camp tiers |
| `new_claims_open` | New claim transactions | Earned source ledger and already-issued claim receipts |

The DB trigger locks the operator row before accepting each new receipt.
The operator update must wait for any already-accepted transaction to
commit/rollback. If a donation had begun debiting inventory or a claim had
begun crediting a wallet, a paused trigger aborts the **entire transaction**,
so there is no partial charge. A previous idempotent receipt is still
readable without creating a new write. Stop gates do not disable the V18
settlement/replay proof recovery path.

Controls and reason-bearing revisions have a private, append-only audit
table. The aggregate operator status view reports event status, shared HP,
new-action gates, reserved/committed/voided attempts, committed attempts
missing replay proof, donation count, claim count and reward ledger count.
No player IDs, combat replay payloads or inventory contents are included.
Only a privileged database operator may modify or read this private control
surface; it is not an authenticated mobile RPC.

**Important:** V61 SQL is a **design draft**, not a deployable migration.
Its lock-order and atomicity tests must pass in disposable CI; it must be
reviewed as part of the private schema migration. These controls are not
installed on staging or production and cannot stop the current public
shared-world boss feature.

## Real-first deployment sequence (no mock boss event)

1. **Privacy prerequisite:** approve retention and erasure rules (#1348),
   enforce private user deletion/fencing and prevent leaked replay objects.
   No retention duration is assumed.
2. **Minimum server prerequisites:** reviewed private SQL and privileges,
   verified Auth-derived account, bounded launch epoch, DB-level 14-day
   global uniqueness, V61 stop gates and aggregate status, immutable
   account-wide receipts, trustworthy replay/claim idempotency. Source tests
   and migration review are not a fake battle.
3. **Prepare the first real cycle:** operator records exactly one approved
   event ID, initial closed control row, server-sourced calendar, artwork,
   translated player guidance and a known owner able to perform hotfixes.
   Do not automatically open the next cycle before reviewing the first.
4. **Open preparation** for the real event only at its server-scheduled
   Monday UTC boundary. Leave raids closed until its Saturday window;
   do not use a client-selected event or temporary dev button.
5. **Open raids** during the real Saturday–Sunday battle. Monitor aggregate
   reserved/committed/voided counts, unresolved replay proofs, global HP,
   and error rates. Do not reveal private account identifiers in public
   logs. Allow legitimate late retries using their original request ID.
6. **Handle claims** as their own controlled channel after rewards and
   eligibility are verified. Never reset a wallet or re-run a global
   milestone based only on UI complaints; inspect immutable source receipts.
7. **Close new actions** when the event ends, preserve all previously
   committed receipts, reconcile outstanding settlements and let the
   official next 14-day cycle be configured only through the approved
   provisioner.

## Hotfix playbook (operator-only, not executed)

- **New raids hang, consume slots incorrectly, or the boss HP becomes
  suspicious:** pause `new_raids_open`; leave existing settlement workers
  operating and inspect `reserved_attempts`,
  `committed_without_replay_proof`, and committed HP receipts.
- **Material deduction incorrect:** pause `new_donations_open` and check
  per-account receipts against authoritative inventory. Never refund
  blindly: duplicate compensation can become an exploit.
- **Duplicate currency / incorrect payout:** pause `new_claims_open`.
  Earned ledger rows and previously issued balances remain untouched.
  Fix the claim calculation and resume only after source consistency.
- **Server error/partial outage:** pause the affected action(s), communicate
  a temporary interruption, and deploy a versioned hotfix. Do not reset
  three-attempt counters or reinitialize a boss's HP to disguise problems.
- **Potential privacy/auth or replay exposure:** stop all new actions,
  revoke unsafe service access and follow the approved incident procedure.
  Do not use live players as test fixtures for unverified access controls.

Operator SQL example (template, **not executed**):
```sql
BEGIN;
UPDATE private.world_boss_ops_v61
SET new_raids_open = false, revision = revision + 1,
    changed_by = 'approved-operator',
    change_reason = 'pause new raid attempts during incident response'
WHERE event_id = '<actual-approved-event-uuid>'::uuid;
-- Require exactly one updated row; check event-specific state.
SELECT event_id, new_raids_open, new_donations_open,
       new_claims_open, controls_revision,
       committed_without_replay_proof
FROM private.world_boss_ops_status_v61
WHERE event_id = '<actual-approved-event-uuid>'::uuid;
COMMIT;
```
An operator must verify the target and transaction result before committing.
Never run the example with a guessed event ID or without authorized access.

## Launch blockers (no mock battle requested)

- V58 and V59 private privacy/erasure drafts still require final policy,
  reviewed source consolidation and real Auth/Storage integration.
- The live World Boss schema and authenticated game-action routes are not
  installed or enabled. UI preview action buttons are disabled.
- World Sigil impact payouts and 9-class/5-bracket fairness require final
  approval; the current V28 reward bridge leaves impact payout locked.
- Real Android/Expo UI, screen accessibility, phase-boundary behavior,
  route authentication and operator stop control must pass targeted checks.
- **No launch, merge, migration or forced staging rehearsal occurs in this
  PR.** Do not imply a production first event is available yet.

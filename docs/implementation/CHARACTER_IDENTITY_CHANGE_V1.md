# Character identity changes — v1 foundation (not released)

## Approved product rules

- **Rename:** a character may change its username with a one-use coupon credit or a verified Google Play one-use purchase. Staff can grant or execute a correction. All progress, gear, currencies, inventory, social identity and achievements survive.
- **Class change:** requires a verified one-use Google Play purchase or an explicit staff-authorized action. A successful change removes **equipped character gear only**, including its exact crafted-gear instance records. It must not delete bank, inventory, equipped gathering tools, un-equipped gear or any account progression.
- Transfer the two class combat skills by position, preserving XP and fractional remainder; derive levels using the current combat curve. Profession XP stays unchanged. Recalculate base HP/attack/defense from the target class.
- Replace an equipped `class:OLD` portrait with `class:NEW`. The old portrait is no longer selectable through class access, while earned icons remain earned.
- Unequip an active companion whose role becomes incompatible; never delete companion ownership, XP or Bond. Preserve existing saved loadout names and food but clear their equipment selections and incompatible companion selections.
- Names must pass the shared identity-name rules (including reserved/offensive names). Require a **case-insensitive global uniqueness** check in the authoritative DB transaction, even though the legacy schema only has a per-account uniqueness constraint.

## First implementation

`apps/mobile/src/core/character-identity-change.ts` contains the pure, auditable transition for either change type. It does not trust caller authorization and **must never** be exposed as a generic player-owned gameplay command. `apps/mobile/tests/character-identity-change.ts` covers loss isolation, stats, skill XP, icon access, compatible companions, loadouts, identity validation, and rejection of invalid equipment ownership.

## Secure server workflow still needed

1. Create a **private, RLS-protected credit ledger**: `rename` or `class`, account owner, one-use source (`coupon` / `google_play` / `admin`), non-secret source reference, created/consumed timestamps, character id and command receipt. Never expose free-form grants to player RPCs.
2. Redeem hashed, expiring **rename-only coupon codes** using the authenticated account id, per-account/per-code limits, and atomic claim + credit issuance. Reuse the existing code-entry UI only after integrating its grant response.
3. Add **consumable** Google Play product IDs for Rename and Class Change, product catalog/presentation, Play Console configuration, verified purchase-token and acknowledgement handling, and single-use credit issuance. Existing VIP purchase ownership cannot substitute for identity-change credits; clients never self-report paid status.
4. Add one server-only transaction that locks account and `online_game_states`, verifies the current revision, ownership, no active activity/unfinished Forge jobs/active dungeon or party queue, validates the target class or unique name, consumes exactly one verified credit (except authorized admin), updates the authoritative save **and** `public.characters` / `player_profiles` / current display identity, increments game revision and writes an idempotency receipt/audit log. If *any* step fails, roll back the credit and all writes.
5. For class changes, reconcile DB equipment instances, public equipment snapshot, legacy and coop loadouts, Echo and world-boss snapshots, role-bound queue registrations and profile combat power. Revalidate earned cosmetics and do not mutate shared character/account history.
6. Build a preview and confirmation in **Account → Character Management**, showing exactly which equipped pieces are destroyed, which companion is unequipped and that combat skill XP is retained. Make purchase/claim unavailable without an issued credit; prevent accidental double confirmation.
7. Tests: same request id is replayed without charging twice; two concurrent requests consume no more than one credit; stale revisions, taken names, forged client entitlements, busy characters, guest accounts, craft ownership conflicts, payment refunds, and cross-account IDs all fail closed.
8. After staging DB migrations and Android testing, enable player-facing controls behind a remote feature flag. **No production migration, new paid products, or player-facing entitlement controls are enabled by this PR.**

## Admin policy

Keep admin tools separate from customer purchases. Require staff role confirmation, a change reason, and an audit entry containing a rollback snapshot. Do not grant admin rights by putting a `qa_` command in the user gameplay transport.

## Operational note

Erebus's one-time change on Nov 13, 2026 is already complete in production and is **not** re-applied by this design or test suite.

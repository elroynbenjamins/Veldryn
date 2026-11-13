# Character Identity Changes — V1 development status

## Scope and player rules

- **Rename:** consume exactly one verified rename credit issued by a one-use coupon or a server-verified Google Play consumable. Character, inventory, progression, gold, companions, guild membership, cosmetics and social record survive.
- **Class change:** consume exactly one verified class credit from an approved Google Play purchase or staff grant. Destroy **only equipped character gear** and corresponding exact crafted-gear receipts. Keep unequipped copies, bank, inventory, overflow, tools, currencies, profession XP and companions.
- Transfer two class skills by position, preserving the accumulated XP and fractional remainders; recalculate levels from the existing combat XP curve. Rebase base statistics to the new class.
- Update class portrait access and selected portrait. Earned non-class cosmetic icons remain available.
- Unequip an incompatible companion but retain its ownership and Bond progress.
- Require clean active activities, no active class drills, no unclaimed Forge queues, consistent crafted gear ownership and no active party/dungeon queue for a class change.

## Implemented in the draft PR

### Pure engine transition

`apps/mobile/src/core/character-identity-change.ts` is an auditable, pure function. It is deliberately not exposed through the normal gameplay command type. Core tests include loss isolation and skill XP conservation.

### Private single-use credit ledger

`backend/supabase/migrations/20261113055000_character_identity_change_credits_v1.sql` adds:

- Private RLS-protected tables `character_change_credits_v1`, `character_change_coupons_v1`, `character_change_coupon_claims_v1` and `character_change_receipts_v1`.
- An authenticated, one-account-per-code rename coupon claim, using *only* stored SHA-256 hashes and configurable expiry/global claim cap.
- A service-role-only idempotent grant RPC for verified payments or administrator authorization. Its Google Play source reference is a **SHA-256 hash** of a verified purchase token, never the token itself.
- An authenticated self-only credit balance RPC. **No player can directly grant or consume credits.**

No rename codes have been seeded and no paid SKUs have been created.

### Atomic transaction

`backend/supabase/migrations/20261113060000_character_identity_change_commit_v1.sql` adds service-role-only raw-save loading, receipt lookup and one atomic change-commit RPC:

- Locks the same account as the gameplay engine, then checks character/account ownership, save revision, existing request receipt and matching unconsumed credit.
- Only accepts the *specific* name/class fields that the server-generated transition is allowed to mutate. Rejects all other progression, inventory, bank, gold or account changes.
- Rejects conflicting character names across accounts, including case-insensitive matches.
- Changes the authoritative save, character/profiles, relevant class-dependent co-op/echo snapshots, revision, consumed credit and audit receipt in one transaction. Failure rolls back everything.
- Replayed requests cannot consume the credit again; a different action using the same request ID is rejected.
- Class change fails closed if a live party/dungeon queue or legacy authoritative equipment representation needs manual reconciliation.

**Existing duplicate usernames:** production contains legacy case-insensitive duplicates, so adding a global unique index immediately would break live data. V1 rejects currently taken names for new renames. A later name-reservation/cleanup pass is required to guarantee new character creations and renames cannot race on the same username.

### Server transport and redeem UI

- `backend/online/character-change.ts` authenticates the caller, checks strict request schemas, hashes the action, performs idempotent receipt lookup and invokes the trusted pure transition and service-only atomic SQL commit.
- `backend/online/tests/character-change.ts` tests authentication, ownership, forged fields, credit failure, stale version and replay.
- `apps/mobile/src/online/redeem-code.ts` routes `VEL-REN-<random>` coupons to the rename-credit RPC and shows a successful rename-credit message.
- The **production gameplay Edge route is deliberately not changed**: Veldryn's release gate requires a regenerated, checked-in gameplay Edge bundle. Build and commit the bundle *before* enabling the route; no mobile class/rename screen is enabled today.

## Validation

- Staging PostgreSQL dry-run of both migrations: **PASS** (DDL and authenticated/service permissions).
- Staging rollback test of atomic rename and receipt replay: **PASS**.
- Staging rollback test of class transition with equipped gear removed: **PASS**.
- Staging rollback test of cross-account credit isolation, taken-name denial, one-claim-per-account coupons, skill XP and resource preservation: **PASS**.
- `backend/supabase/tests/character_identity_change_v1.sql` records the complete disposable fixture; it finishes in `ROLLBACK` and contains no real user IDs.
- Mobile/backend TypeScript and GitHub CI validation are pending execution; a staging SQL pass is **not** a completed Android/Play Billing release test.

## Still required before any player launch

1. Create verified Google Play consumable products (proposed identifiers only; do not assume a price). Connect the existing Google Play verifier and acknowledgement flow to `issue_character_change_credit_server_v1`. Handle refunds and repeated purchases without minting duplicates.
2. Add owner/staff admin UI with staff authorization verified server-side, required reason, account/character targeting and complete audit/rollback visibility.
3. Add Account → Character Management preview and confirmation. The player must see selected new name/class, precise equipment to be destroyed, any companion unequip, retained XP and available credits. Mobile state should refetch after redemption or change.
4. Expose the authenticated server route behind a disabled-by-default release switch, then build/commit the generated gameplay Edge bundle and verify its parity. Do **not** expose player-initiated mutations until all dependent migrations are deployed.
5. Test against the exact live equipment and co-op schemas on staging (including Forge jobs, Echo sharing, party membership, active dungeons, credit contention, and old saved presets); test payment token replay, cancel/refund, staged release rollback, and multi-account name conflicts.
6. Clean up legacy duplicate character names before enforcing a global unique index. Ensure creation also checks/reserves names.
7. Run mobile core + online TypeScript suites, generated-bundle parity, Android integration checks, and apply migrations to staging. Only then propose enabling production.

## Operational note

The manual Errapel → Erebus change on November 13, 2026 is already completed and audited in production. This PR never re-applies that action.

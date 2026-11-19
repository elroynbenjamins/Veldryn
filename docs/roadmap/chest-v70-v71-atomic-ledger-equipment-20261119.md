# Veldryn hidden chest V70–V71: atomic receipt ledger and Equipment 2.0 custody

**19 November 2026 — hidden draft only, not a migration or production deployment.**

## V73 compatibility note (stacked World Boss PR #1454 only)

The newer World Boss V73 prototype revises V70 to use a pinned **READ COMMITTED** transaction with an explicit per-account inventory row lock and an event-first V57 account-erasure preflight for World Boss sources. This resolves the incompatible assumption that V70's old SERIALIZABLE transaction could invoke V57, whose existing draft function explicitly rejects isolation other than READ COMMITTED to avoid stale erasure snapshots.

The account-lock contract and rollback/readback remain mandatory. This is a **review proposal, not approval** to replace SERIALIZABLE in production. Real two-process PostgreSQL 16 contention and account-erasure races, plus the behavior of every other chest writer, still need to be proven before rollout. PGlite synthetic proof validation is insufficient for that final gate.

## V70: reusable account-locked SQL chest store

The reusable V67 loot table and V69 receipt-first settlement worker are now backed by a proposed **single-connection PostgreSQL adapter** in `backend/src/server/loot/chest-postgres-store-v70.ts`.

- In the stacked V73 proposal, runs `BEGIN ISOLATION LEVEL READ COMMITTED` and locks an **account-wide** `private.chest_account_fence_v70` row, not just a chest key. This prevents two different chests concurrently selecting the same supposedly unowned piece without coordinating inventory state.
- Reads a **committed** receipt before checking the current drop table or deriving any new entropy. On replay it verifies the canonical reward-grant ledger and performs **independent read-back from physical wallet/items/Inbox stores**; the adapter cannot treat journal entries alone as delivery.
- On first settlement, checks authoritative earned-source proof, registered loot table and account ownership, persists a frozen receipt, credits all guaranteed rewards, delivers each selected item, inserts exactly one Inbox record, verifies all effects, and **commits only after every leg succeeds**.
- A single failure anywhere rolls back all receipt, wallet, resource, item, Inbox and grant-ledger writes. Postgres uniqueness and source keys deny double settlement. No second network connection, async queues or client-provided odds may be used inside injected physical ports.
- Generic `private.chest_reward_grant_legs_v70` records source, component, ordinal, item ID, quantity, physical grant ID and optional issued equipment UUID. Insert triggers compare **every** leg to the frozen receipt. Both receipts and legs are immutable after insertion. The SQL proposal includes RLS and **zero** permissions for anonymous, authenticated or service-role writes.
- Account data erasure is **explicitly blocked** by RESTRICT FKs until the V55/V57 erasure fences and approved identity-redaction policy are consolidated. Do not circumvent this by cascading out paid receipts.

Only a review-only draft lives at `docs/roadmap/party-events/hidden-migrations/20261119104500_universal_chest_ledger_v70.sql`. The schema does **not** exist in staging or production. The adapter requires unimplemented **SQL-only** existing wallet/resource/Inbox/physical inventory ports; it is not mounted.

**Important:** V69 now also requires `grantInbox` on the same transaction and freezes whether equipment goes to a verified character or to account-bound unclaimed storage.

## V71: existing EQ2 and gathering equipment, not synthetic craft recipes

`backend/src/server/loot/chest-equipment-bridge-v71.ts` maps the V69 frozen gear hit to the canonical, server-owned item identities without creating a copy:

| Content | Canonical lookup | Custody | Immutable rules |
|---|---|---|---|
| Party Event | V51 `PE_` piece and V66 exact 20-piece × T1–T9 descriptor | Authenticated owner's **verified character**, pinned in the receipt | One/two-stat combat profile, eight existing 2-/3-piece sets, server rarity/quality/affix roller required |
| World Boss | V64 existing gathering set and exact slot ID for the event's verified boss, T1–T9 | **Account-bound unclaimed equipment** (no character redirect) | Only the boss-specific gathering-speed stat and affixes, preserves existing 1% chest gear odds and ten-slot collection |
| Future content | No fallback template; requires explicit server registry entry | To be defined by that content | Defaults to **blocked** |

All V71 candidates return `readyForIssuance:false` with mandatory blockers. `assertChestEq2PhysicalReadbackV71` structurally verifies receipt source, owner, destination, item UUID, slot/set/tier, rarity, quality, exact-stat hash, version and same-transaction physical custody against the **DB-fetched item**. This structural check is NOT a standalone authorization, RNG implementation, or permission to mint.

The present Equipment 2.0 draft PR #1382 still only registers recipe-based `EQ2_` gear T1–T4; it does not yet register `PE_` event templates or T5–T9 numeric budgets and the shared online custody writer. The older `public.equipment_v24_item_instances` is not a valid substitute. Consequently the V70 adapter **hard-blocks every equipment item grant** until a separately reviewed Equipment 2.0 issuer and complete source/physical custody tests exist. This stops partial currency payouts on gear-hit receipts too.

## Verification and follow-up

- `backend/tests/chest-reward-ledger-v70.mjs` executes the **actual V70 draft SQL** in disposable PGlite: private permissions, canonical source/owner matching, mismatched guarantee/drop/inbox denial, unique item/source, immutable rows, foreign-account denial, account-erasure RESTRICT and full rollback.
- `backend/tests/chest-postgres-store-v70.mjs` integrates the compiled V70 adapter and V69 service with disposable **physical wallet/resource/item/Inbox fixture tables**: first delivery, replay after table revision, failed grant rollback, retry, foreign account, missing EQ2 issuer and production-off gates.
- `backend/src/server/loot/__tests__/chest-equipment-bridge-v71.ts` validates **180 Party combinations and 270 World Boss combinations**, rejects forged owner/tier/set/stat/quality/read-back and preserves World Boss account-bound custody.
- The hidden chest GitHub workflow compiles and runs all V70/V71 tests and asserts both release flags remain **false** and V70 SQL never appears in `backend/supabase/migrations`.

**Remaining required before merging into production `main`:** register real source proof tables (#1388), migrate/reconcile V61/V65/World Boss receipts into one source namespace, approved SQL writer role/RLS and account-erasure path, same-connection actual Gold/material/Companion Essence/Party Sigils/World Boss wallet/Inbox implementations, account inventory and EQ2 item issuance (#1382), T5–T9 server stats, two-connection PG16 race/failure tests, all CI green, Android QA and explicit go/no-go.

**No staging or production SQL was executed. No chest reward or feature flag was enabled.**

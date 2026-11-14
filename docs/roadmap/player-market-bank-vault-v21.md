# Player Market V21 — Exact Forge shared-bank vault

**13 November 2026 | Hidden, draft PR #1055 | No market release, no server deployments**

## Goal

Allow a market-purchased, individually verified Forge equipment copy to be **deposited in the account's shared bank and withdrawn by a different eligible character**, without bypassing character progression, creating duplicates or modifying its rare attributes. Unlike a normal character transfer, a bank deposit is custody, not ownership; the prior receiving character remains the immutable receipt's owner until withdrawal completes.

## New private SQL surface

Migration: `backend/supabase/migrations/20261113073000_market_purchased_gear_bank_vault_private_v21.sql`.

- Adds `storage_state` (`character` or `bank`) to the V19 purchased-gear provenance ledger; existing claimed copies default to `character`.
- Creates RLS-enabled, fully revoked `private.market_equipment_bank_actions_v21`, with unique `(account_id,idempotency_key)`, request hash, exact instance, action, character, source indices, expected revision and immutable response.
- Adds bank-mode verifier `private.market_owned_banked_copy_valid_v21`: requires one intact original Forge receipt, one matching physical stack in `bank.stacks`, no other equipment/stack reference for that exact instance anywhere in the snapshot, and exactly one original owner in the account roster.
- Replaces **only the body** of the existing V19 snapshot-integrity trigger. It remains `SECURITY DEFINER` with an empty `search_path` and no RPC grants; `character` mode uses the original V19 strict held-copy verifier, while `bank` mode uses V21. Ordinary snapshot writes cannot switch modes or move a purchased copy.
- Adds one private, security-invoker bank RPC `market_move_purchased_equipment_bank_v21(uuid,text,text,text,text,integer,integer,bigint,text,text)`. **No client, authenticated, anon or service-role EXECUTE privileges are granted.** Runtime and equipment Market CHECK constraints are unchanged and false.

## Atomic deposit and withdrawal contract

1. Verify the fully disabled-by-default runtime/equipment gates; acquire the same account advisory lock as normal server saves, and lock the canonical game-state row.
2. Return the durable idempotent result only for an exact matching prior action/key/hash. Otherwise require the supplied game-state revision to match.
3. Lock V19's exact-copy provenance and ensure the current custody mode permits the requested action.
4. **Deposit**: require the exact verified copy held in a named active/inactive character's inventory or equipment pouch, protected from equipped/loadout, favorite and locked-item moves; require bank capacity. Remove one source stack and append to `bank.stacks`; keep the Forge receipt's previous owner and market-required level intact.
5. **Withdrawal**: require the banked exact copy at the supplied bank index, check that the chosen character belongs to the same account, and verify its saved class matches the relational `public.characters.class_id`. Compute its actual level from server-snapshot XP using V18; check the original SKU plus rarity level requirement before withdrawal. Check destination storage capacity. Remove exactly one bank stack, append to the eligible character's inventory or pouch, rebind the original receipt owner.
6. Change the private custody mode and recipient before updating the game snapshot in **one database transaction**. The V19/V21 trigger re-validates all physical and receipt invariants in the final state. Any failure rolls back stacks, provenance, character receipt, revision and idempotency ledger together.
7. Record a private account-scoped audit row and return the new revision. No bank tax or Gold transfer (a bank move is within one account).

## Verification performed

All tests used synthetic accounts and transaction-scoped temporary SQL on connected **Veldryn Staging PostgreSQL 17**, followed by `ROLLBACK`. No Market schema, item record, sale or Gold amount was retained.

- Full previously passing V12–V20 exact equipment purchase/claim/transfer tests remain green, including socket traits, 5% seller tax, Inbox, alternate character level/class and idempotency.
- New V21 valid deposit and eligible withdrawal (including transfer from an alternate character to a different main), copy custody and receipt-owner preservation, bank capacity, non-owner deposit, full withdrawal inventory, character outside the account, stale revision, replay/conflict/double withdrawal, incorrect bank item index.
- New V21 guards block ordinary snapshot bank withdrawals, duplicate exact copies in bank, forged rarity and forged receipt owner, wrong-class character, under-level character on withdrawal.
- Independent V21 ACL/disabled-gate test and V12 resource lifecycle both passed. The disposable full-stack PostgreSQL CI runner now includes **28 migration layers**, the V21 ACL test, and new post-rollback security assertions.
- Existing staging V12 equipment browser function remains behind the GitHub version's socket-gem listing check. Equipment test used the current GitHub V12 browse migration **only inside its ROLLBACK transaction**. Persistent schema reconciliation still required before any deployment.
- GitHub Actions' clean-PG17 status is distinct from staging validation and has not been confirmed green yet.

## Remaining security and rollout gates

This is a **private implementation building block**, not a live player feature. Do not expose `private` SQL routines to the mobile client or use client-supplied account IDs without an independently authenticated account-bound Edge gateway. Auth-bound endpoints, rate limits, UI action confirmation, audit and error UX, lifecycle/load tests, current catalog approval and release flag reviews remain.

**V22 recommendation:** develop a chained exact-instance re-list / resale custody design. V8's lifetime unique escrow key and V19's one-buyer provenance ledger intentionally block naive repeated sales. A secure solution must retire/chain previous provenance and escrow, maintain equipment rolls, revalidate the next buyer's class/level, and prevent duplicate Gold, item or seller payment on idempotent retries and cancellations.

Market remains entirely hidden, with V18-approved catalog still empty and live `trading_enabled=FALSE`.

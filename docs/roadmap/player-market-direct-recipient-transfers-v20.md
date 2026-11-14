# Player Market V20 — Direct recipient transfers (hidden)

**13 November 2026. Draft implementation only, no staging/production schema persisted. Player Market remains disabled.**

## Purpose

V17–V18 validate purchase-level and rarity requirements before Gold settlement. V19 records immutable exact-instance market provenance, validates the selected claim recipient, and denies shared-bank/cross-character saves of purchased Forge gear. V20 permits a **deliberate, server-serialized transfer** from one already-eligible character to another **also eligible** character belonging to the same account.

This implementation does **not** enable shared-bank staging, item resale, the client transfer button, or public trading. It is a protected private transaction building block for a future authenticated Edge route.

## Implemented transaction

New SQL `backend/supabase/migrations/20261113063000_market_direct_recipient_transfer_private_v20.sql` adds:

- Private RLS/revoked ledger `market_equipment_recipient_transfers_v20` with account-scoped idempotency key and SHA-256 request hash, exact Forge instance, source and destination character IDs, storage locations, expected revision and result.
- The V19 online-snapshot validation trigger is kept in the private schema but changed to `SECURITY DEFINER` (pinned empty search path, no dynamic SQL, no public/service-role EXECUTE grants). This allows ordinary `service_role` online-game saves to invoke the trigger without granting direct read access to the private provenance ledger. The trigger only validates and raises errors; it never exposes account data.
- Private **security-invoker** function `market_transfer_purchased_equipment_v20(uuid,text,text,text,integer,text,text,bigint,text,text)`. No client, service-role or authenticated grants; hard-false runtime and equipment flags remain.
- Same account advisory transaction lock as game saves, locked authoritative `online_game_states` revision and locked V19 exact-copy provenance. Replay returns saved result; same key with different arguments/hash is rejected.
- Revalidates the source's exact held equipment identity, immutable Forge receipt, server-owned existing recipient, and no current equipment/loadout reservation, favorite or locked item.
- Recipient must be one uniquely owned account character; relational class and canonical saved class must agree; level is computed from canonical XP using V18, and must meet the **original purchase requirement including the original rolled rarity**.
- Accepts only inventory or equipment-pouch source/destination. No equipment bank movement, auction listing, reassignment to other accounts or equipped gear manipulation.
- Verifies source index, precise instance ID and SKU; destination capacity; then removes exactly one source stack, adds exactly one destination stack, rebinds only `ownerCharacterId` in the original full Forge receipt and updates the exact-copy V19 recipient — **atomically in one DB transaction**.
- V19's existing snapshot trigger revalidates the resulting game state against the newly moved ledger recipient before commit; failures roll back receipt/provenance/stack/revision/audit together.
- Completed transfers have a durable audit receipt, replay returns `replayed:true`, and no Gold or fee is charged because this is a same-account internal transfer.

## Verification performed (staging PG17, fully rolled back)

A transient test transaction loaded the GitHub V12 browse function (required due existing staging socket-gem browse drift), V18, V19, V20, then executed the expanded V12 exact equipment lifecycle.

**Passing cases:** eligible cross-character direct transfer, second transfer back, account-owned character/class and XP thresholds, under-level target blocked without moving any stack or receipt, source non-owner blocked, shared Bank destination blocked, full target inventory blocked, saved loadout reservation blocked, same idempotency key replayed exactly once, reused key with different hash blocked, stale revision blocked, preexisting V19 anti-forgery rules preserved, 5% seller tax and sale history unaffected.

A separate transient transaction loaded V18/V19/V20 and validated the V20 ACL/release gates together with the complete V12 resource lifecycle (5% tax, 20 offer cap, minimum lots, cancellation, idempotent purchase). The V20 security suite additionally creates a synthetic account and successfully performs a normal online-game snapshot update as `service_role` under the private V19 integrity trigger, then rolls all changes back.

All transactions concluded in SQL `ROLLBACK`. GitHub Actions' clean PG17 full-stack suite was updated to load **27 migrations** and run V20 security checks. GitHub CI is not represented as passed until its workflows conclude.

## Deliberate remaining restrictions

- **No shared-bank deposit/withdrawal for purchased Forge gear.** A safe implementation needs a private bank-held provenance state and guarded withdrawal with a fresh destination XP/class check; normal account snapshot edits must still be rejected.
- **No resale/relist of previously purchased gear.** V8 has a lifetime unique exact-instance escrow index, and V19 has a primary-keyed purchased-instance provenance ledger. Relaxing the old index alone would be unsafe: the resale flow needs a chained custody-event model, transactional retirement of the previous owner/provenance, cross-sale preservation of all stat rolls, atomic seller payout and idempotency, plus regression cases for duplicate/replayed/reverted relists. Keep the current fail-closed behavior until that model exists.
- No client transfer UI or Auth-bound Edge gateway. A future connected wrapper must authenticate ownership independently rather than trusting `p_account_id` supplied by a caller.
- No approved Market source-item catalog or production trading flags. This branch must remain draft and out of production.
- Review staging Market browse schema drift before any permanent migration.

## Files

- Private migration: `backend/supabase/migrations/20261113063000_market_direct_recipient_transfer_private_v20.sql`
- Security test: `backend/supabase/tests/player_market_recipient_transfer_v20.sql`
- End-to-end synthetic lifecycle: `backend/supabase/tests/player_market_v12_equipment_tax_lifecycle.sql`
- Clean PG17 CI runner: `backend/supabase/tests/run_market_v12_full_stack_ci.sh`
- Earlier acquisition/provenance notes: `docs/roadmap/player-market-purchase-acquisition-v18.md` and `docs/roadmap/player-market-provenance-v19.md`

**Recommended next pass V21:** safe provenance-held shared-bank vault and eligible withdrawal, followed separately by resale escrow chain and UI/Edge integration; do not conflate those risk surfaces.

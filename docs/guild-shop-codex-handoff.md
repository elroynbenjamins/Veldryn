# Codex handoff — Guild Shop PR #594

Branch: `feature/guild-shop-foundation` -> `main`.

## Do not merge yet
Foundation contains catalog, pure economy calculations, tests (not run), database migrations, read-only snapshot RPC, and an unmounted read handler. It is **not a playable implementation**.

## Critical integration tasks
1. Inspect existing guild/account schema and migration naming. Confirm account UUID, guild ID type, membership level source, and RLS/service-role execution model.
2. Validate and apply the new migrations in a disposable Supabase instance. Check privileges, replay, row locks, weekly boundary and migration compatibility.
3. The grant/purchase SQL RPCs are intentionally service-role-only but trust their caller. Never expose them directly to clients. Implement verified reward sources, guild membership/level checks, canonical prices, and collectible granting atomically. Avoid purchase debit without entitlement delivery.
4. Existing `guild_shop_snapshot_server_v1` must be called only after authenticated account verification. Mount `backend/online/guild-shop-read.ts` with a real `guildLevelForAccount` adapter and verify build import paths.
5. Wire a compact Guild Shop UI inside existing guild navigation. Show locked/owned states, token progress and event bonus explanation; do not add fake purchase buttons.
6. Integrate construction project resources with actual inventory/gold deduction, officer controls, permanent guild cosmetics and donation idempotency.
7. Wire event milestone token claims through verified event completion records. Event tokens bypass standard weekly cap but cannot be farmed infinitely.
8. Confirm companion rarity taxonomy: existing tiers may not include Epic. Resolve before adding companions.
9. Run backend/mobile typechecks, database tests, concurrency tests, and staging smoke. Reconcile latest `main` and only then request merge.

## Known concerns
- Catalog reward IDs and construction resource keys are placeholders, not final content IDs.
- SQL grant caps per claim at 100000, but caller must enforce event reward tables and participation.
- Shop purchase RPC currently debits tokens and records ownership but does **not** grant in-game collectible; never call it in production as-is.
- Read handler is not mounted. Snapshot uses service-role access and explicit verified account parameter.
- Test file has not been executed.
- No assets have been created for companions, pets, emotes or cosmetics.

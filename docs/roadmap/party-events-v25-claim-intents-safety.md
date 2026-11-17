# Party Events v25: account-serialized claim-intent safety overlay

**Status: DRAFT ONLY — no live rewards, no claim API, no deployment.** This supplements the v25 quote and preflight sections of `party-events-weekly-stories-v9.md`, not a replacement for them.

## Existing authoritative state

A staging schema audit confirmed:
- `public.character_wallets(character_id,gold)` holds character gold.
- `public.online_game_states(account_id,character_id,state,revision)` holds the active game-state snapshot, including `inventory.stacks` and `inventory.capacity`.
- `public.commit_online_game_guild_pve_v1` serializes normal player commits under the transaction advisory lock `hashtextextended('party-account:'||account_id,0)`.

A future payout MUST use this same lock, the correct frozen character and the same atomic commit transaction; a separate gold ledger is unsafe.

## v25 claim-intent overlay

`backend/supabase/migrations/20261113223000_party_event_claim_reservations_v25.sql` adds:

- `private.party_event_reward_quote_v25(offer_id,account_id)`: nonpaying canonical v2 reward quote from the private v24 immutable offer, locked choice, band, personal EP and party difficulty. Returns exact gold, XP, GEM_DUST, Companion Essence, Bondstones and Party Renown values **without client amounts**.
- `private.prepare_party_event_claim_intent_v25(offer_id,account_id,request_id)`: account advisory lock, event/week/offer identity and v23+v24 provenance checks, frozen member character validation, active online-state and wallet row locks, material stack quantity and slot-capacity checks, bigint wallet-overflow checks. The immutable `private.party_event_claim_intents_v25` row stores the quote hash, frozen quote, state revision, wallet-before, capacity and occupied/new slots, with uniqueness per offer and per account/week. An identical retry returns the existing record. A changed request fails closed.
- `private.claim_party_event_reward_from_intent_v25`: an explicit always-rejected payout guard. This separate name avoids overwriting the parallel v25 quote/preflight guard `private.claim_party_event_reward_v25`.
- `private.party_event_claim_intents_inbox_v25(account_id)`: a private, account-filtered **non-claimable** projection with zero transfers.

All tables have RLS and are immutable. No `anon`, `authenticated` or direct `service_role` table write access. Every intent is permanently `blocked_unreleased`, `claimable=false`, `claimed=false`, `rewards_granted=false` and `entitlement_created=false`.

**Intents are NOT a settlement:** the preflight snapshot can become stale; nothing is credited, and the result must be revalidated **at the eventual economy commit**. A future v26 must do every gold/XP/material/companion/renown credit and a unique paid receipt in a single transaction, with correct item-lock and overflow treatment and authenticated user identity. Skill XP still needs a verified target-skill choice.

## Server integration

- `backend/src/server/party/weekly-party-claim-intents-v25.ts`: gated trusted quote, claim-intent, no-payout Inbox contracts; fixed server-side request key and enforced no-claim return flags. The claim method always throws `party_event_v25_payout_not_released`.
- `backend/online/party-event-claim-intents-v25.ts`: parameterized PostgreSQL service-only SQL adapter, no public/mobile route.
- `backend/src/server/party/__tests__/weekly-party-claim-intents-v25.ts`: v2 amount parity, feature gate, idempotent request, malformed materials, bogus claim flags, hard-blocked payout.
- `backend/supabase/tests/party_event_claim_intents_v25.sql`: frozen quote formulas, owner isolation, missing active game state, full inventory, retry after freeing a slot, GEM_DUST quantity overflow, wallet bigint overflow, identical/changed request keys, immutable intent and unchanged wallet/revision.
- `backend/online/tests/party-event-canonical-supplies-v22.ts` extended to verify private v25 quote/intent/inbox parameter ordering and missing-row rejection.

The backend weekly test runner and private workflow path filters include these files. **GitHub TypeScript CI result is not yet confirmed.**

## Validation

- **PASS:** focused v25 SQL test using an outer staging `BEGIN ... ROLLBACK`.
- **PASS:** 15 SQL regression suites (v11–v19, v21–v25, additional no-EP v24 scenario) against the v25 chain ending at `20261113223000`, four isolated savepoint/rollback batches.
- **PASS:** all 16 current Party Events migration files including the parallel `20261113224500` claim preflight and `20261113230000` quote migrations compile together under rollback.
- **PASS:** the parallel claim-intent/preflight tests and separate quote/v24 offer tests against the complete 16-migration chain.
- **NOT done:** production migration, live feature release, payout enablement, a real claim transaction, Inbox mail delivery, verified TypeScript CI.

Keep draft PR #1045 open, unmerged, and all release/grant flags disabled.

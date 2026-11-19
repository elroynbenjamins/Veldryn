# Party Events V63–V64 — hidden atomic claim adapter and Equipment 2.0 integration contract

**19 November 2026. Status: DEV BRANCH ONLY, UNMERGED, NOT DEPLOYED, NOT ENABLED.**
Stacked on Party Events V61/V62 draft PR #1412, ultimately Party/World chest catalog #1407.

## Pass V63 — single-transaction Postgres reward gateway

- Added `weekly-party-event-atomic-store-v63.ts`, a concrete Postgres **session-oriented** `PartyEventRewardStoreV60` adapter. It requires an authenticated lower-case UUID + canonical Monday UTC week and begins one `SERIALIZABLE` connection. It imposes a bounded `lock_timeout=5s`, then locks the **real private V11 roster + event-week rows** via `FOR UPDATE OF r,w`.
- Account/week ambiguity, missing roster, cross-party source, unsettled or mismatched V61 proof, duplicate collection IDs, invalid Party Sigil balances, foreign/corrupt/replayed V60 receipts, forged resource amounts and unsafe EQ2 mint requests fail closed.
- All grant ports are transaction-bound to the SAME connection; use existing Party Sigils, Gold, Gem Dust, Companion Essence, inventory and Inbox source ledgers **only inside this transaction**. The adapter inserts the V61 canonical chest/exchange receipt with exact metadata and JSON parity, then applies resources. A later failure triggers `ROLLBACK` and releases the connection; success commits only once.
- The V63 store remains unmounted, requires explicit QA-only opt-in, and has `PARTY_EVENT_ATOMIC_STORE_V63_RELEASED=false`. It has no network calls, public RPC or client identity claims. **The current ports are interfaces, not a production database adapter.** In particular, there are no implementations for the real existing wallets/Inventory/Inbox or source-time Day 8 evidence joins.
- The serializable, same-connection ordering is designed to prevent duplicate payout, but **two independent live Postgres connections, serialization retries, transaction cancellation, timeout and outage recovery still need staging verification**. No service-role INSERT grant has been added to V61 review SQL.

## Pass V64 — truthful Equipment 2.0 chest issuance boundary

- Added `weekly-party-event-equipment-v64.ts`. It accepts only V51 canonical piece objects (eight sets, twenty pieces), a verified account, frozen owner character, Monday UTC week, source key and server-pinned tier. No class locks, weapon fields or client-selected modifiers.
- Introduces a strict return contract for a future authenticated issuer: same source/account/week/character/family/set/slot/tier, valid rarity and Q0–Q100, canonical exact-stat snapshot hash, proof of committed same-transaction custody, no pre-existing gem sockets, and frozen immutable item instance/receipt identity.
- **Critical discovery:** current Equipment 2.0 draft #1382 supports only `EQ2_` recipe-bound crafting templates at **T1–T4**, while Party Event rewards are separate `PE_` event-only set identities with **T1–T9**. The current instance factory rejects event gear. `planPartyEventEquipmentIssuanceV64()` therefore returns explicit **mandatory blockers on every event piece**; tiers 5–9 add a tier-extension blocker. V63 refuses to mint until these are actually resolved.
- This policy retains V51 exact event gear identities and 3+2 set bonuses; it does not alter the existing Equipment 2.0 crafting economy, dungeon gear or World Boss gathering equipment. No fake replacement `EQ2_` item or invented stat roll is issued.

## Refinement / regression

- One-store, single-connection mock tests run the actual V60 gateway over V63 transaction orchestration with fake **DB transaction scoped** reward ledgers: failure of resource grant rolls back receipt **and Sigil/Gold/Gem Dust/Essence**, two queued same-source clients resolve to one grant, an ACK loss/secret rotation replays the frozen receipt, and corrupt rewards/foreign proof/bad collection fail.
- All twenty V51 event pieces, T1–T9 tier compatibility and mismatched owner, class, source, family, slot, rarity, quality, hash, uncommitted custody and forged item metadata are checked in V64 tests.
- Hidden TypeScript test configuration and chest GitHub workflow include the new tests and false feature-flag guards. **Exact-head CI remains to be confirmed.**
- Supabase November 2026 notes include Supabase CLI v3 defaulting to local; no CLI or DDL deployment is done here. Prefer private, server-only database access and avoid SECURITY DEFINER public RPCs during design.
- Do not give user a claim/open/exchange action or assert production grants until canonical source tables (#1388), the actual wallet/Inventory/Inbox SQL ports, finalized event Equipment 2.0 manifest, T5–T9 rules, physically durable custody, staging cross-worker rollback tests, and approved large-update release gates are all in place.

## Work required next

1. Finalize V61 review SQL and verify the 3+2 collection/equipment identity and account erasure behavior through a real two-session PostgreSQL replay and fault suite (not merely mock fixtures/PGlite).
2. Implement canonical frozen V61 proof SQL backed by authoritative V11/V14/V49/V50 supply/finale sources, plus an actual server-only transaction-bound wallet/resource/Inbox adapter; preserve payout source ledger idempotency without a new currency.
3. Create and verify `PE_` equipment template extensions in the **same** Equipment 2.0 project/branch, with new T5–T9 roll policies and physical inventory/Bank custody. No shortcuts through T4 templates or bypasses of class/equip rules.
4. Integrate into final Combat 2.0 encounter engine, run full CI, staging QA and Android accessibility/localization, and approve a coordinated major release.

**No SQL draft was deployed to production/staging, no live user data was modified, and no Party Event feature was enabled.**

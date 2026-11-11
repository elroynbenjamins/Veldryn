# Veldryn World Boss — V12 Production-Rule Loadouts, War Camp Supply & Reward Accounting

**2026-11-11 · Development-only draft · Hidden / not enabled.**

V12 extends [V11 War Camp/fixed-threat simulation](world-boss-war-camp-and-fixed-threat-v11.md) and [V10 replay-safe attempt model](world-boss-reservations-v10.md). The existing **14-day rotation, 7-day event, 3 account attacks, 1 Tank / 2 Damage / 1 Support, frozen Echoes and War Orders** remain unchanged. The **approved design cap is 100 World Sigils per event**; no wallet, currency, shop or live event exists.

## 1. Trusted T1–T4 combat loadouts — implemented test-only

`backend/online/world-boss-loadout-v12.ts` is a **disabled server-owned state adapter**, not a route.

It composes two existing and maintained Veldryn paths:
- `deriveOnlineCoopLoadout`: equipped items, stat conversions, set bonuses, socket/gem calculations, companion ownership/availability, abilities, character combat level and Combat Power.
- `verifyPartyEventEquippedCopyOwnershipV4`: exact forged-copy ownership per character/slot, duplicate copy prevention and required gear level checks.

A trusted loader must read `public.online_game_states` by authenticated account + selected character; compare the authoritative `revision` to the client expectation; never accept a client-provided GameState, calculated Combat Power, abilities, socket list, or companion object. The adapter returns an immutable **V9-compatible snapshot**, with a source digest and a server-defined five-bracket policy. The minimum character level and bracket boundary values are explicitly **server-configured / not decided for release**.

The isolated validation `world-boss-real-loadout-v12.ts` samples **all nine class identities × T1–T4** using Veldryn's own regional equipped-item fixtures, checks forged equipment and ownership rejection, and creates a real V9 1/2/1 Echo roster. It then tests all 3 bosses × 3 global phases × 4 equipped brackets × 3 War Orders × 2 seeds = **216 fixed-threat personal battles**, repeated with a frozen War Camp (another **216**), recording damage, Guard, role survival, Support healing/shield use and Tank protection.

The observed [36-cohort V12 CI calibration archive](spreadsheets/world-boss-v12-game-fixture-calibration-test-only.csv) records the results, rather than treating proposed balance numbers as approved. **All 36 cohorts averaged four surviving actors**, and **Frostmarch Armored at T1 averaged 0 boss HP damage** against the frozen T2 reference Guard, while T4 averaged 143,233.49. These data indicate extreme lower-tier barrier pressure and insufficient role-survival stakes; no live adjustments are approved.

This is much closer to the current game's gear rules than the previous *relative-only* adapter. However, the fixtures are still **synthetic** and not actual authenticated live accounts. This does **not yet prove** class/role win rates, correct production difficulty, or server authority end-to-end. V9 replay/roster authority remains a deliberately injected trusted-loader contract until a real, audited DB caller is wired.

### Important calibration safeguards

- T2 reference enemy Attack, Defense **and local Guard** stay frozen while comparing T1/T2/T3/T4; only the squad's actual gear-derived stats change. Never make a stronger player's Attack automatically increase incoming boss damage.
- Squad formation, role stats and exact abilities remain class specific. Companion/gem benefits come from the existing verified game-state resolver (fixture gear may omit them; no benefit is invented).
- War Camp buffs and order effects are taken from server-side frozen snapshots; no post-fight mutation is possible.
- Test failure should expose a bad boss script or survivor/role metric. **Do not auto-nerf equipment or increase pressure just to force deaths.** Calibrate actual account snapshots before assigning global HP/damage targets.
- Role parity remains unapproved. Benchmark World Impact by class, power bracket, boss and phase, with >=100 independent samples per reference and no automatic Sigil grant.

## 2. War Supplies donation server model — implemented test-only

`backend/src/server/combat/world-boss-supply-economy-v12.ts` models an authoritative inventory and **single serialized transaction** per donation *inside one process*. The future network command should contain only recipe ID and request ID; principal account is server-authenticated. Exact ingredient quantities are fixed by the server event recipe policy, not submitted by a client.

Guarantees exercised in the in-memory model:
- Exactly **2 accepted bundles per account per event**, shared across all 3 tracks.
- Locked inventory resources are validated and consumed exactly once. Out-of-stock or invalid recipes fail without granting progress.
- Duplicate same-key requests return original receipts; changed recipe with reused ID is rejected.
- Track thresholds and resource recipes are fixed at event start. Each track reaches Tier I/Tier II based on real accepted receipts, not fake progress from the client.
- War Camp community revision is bumped after a successful donation; new battles freeze its digest and tiers. Existing battles retain their previously frozen buffs.
- Donations after the seven-day closing timestamp fail; existing receipts remain readable after close.
- **Test-only:** 18 identical network retry requests, account-wide donation limit, and **24 simultaneous accounts attempting the last 12 donation slots**.

A global in-memory Promise mutex is **not a multi-server database transaction**. There is NO external game-state debit, no persistence, no event in the DB and no Sigils minted.

## 3. World Sigil eligibility — implemented read-only reference

`previewWorldBossRewardsV12` derives entitlements solely from **trusted committed attempts, supply receipts and recorded global milestone crossings**. It never calls a wallet service. It enforces exactly 3 attacks, 2 donated bundles, immutable source IDs, no duplicate ordinals, and a **100 maximum**:

| Source | Per event maximum |
|---|---:|
| 3 completed successful attacks (10 each) | 30 |
| Initiator World Impact thresholds 0.8 / 1.8 / 3.0 | 30 |
| Community HP 70% / 30% / 0%, only if at least 1 committed battle | 30 |
| Two authenticated War Camp bundles (5 each) | 10 |
| **Maximum** | **100** |

Failed but committed battles use the approved draft's 5-Sigil participation amount instead of 10. A borrowed Echo gives its owner no passive World Sigils. Buying cosmetics and permanent wallet persistence remain separate release tasks. No one can earn extra Sigils by simply retrying a command.

## 4. Private PostgreSQL proposal (NOT DEPLOYED)

[world-boss-supply-reward-private-schema-proposal-v12.sql](world-boss-supply-reward-private-schema-proposal-v12.sql) drafts a **read-only, never-executed** schema for event War Camp tracks, account/event donation receipts, and future immutable reward entitlement keys.

Verified against staging's **schema metadata only** (no user data read or database changes): `public.online_game_states` has `account_id` UUID, `character_id` UUID, `state` JSONB, `revision` bigint and `updated_at`. The live GameState inventory structure, player market reservations and game-write optimistic revision policy must be reconciled before building a real database debiter.

Required atomic lock order: **event row → authoritative game state row → supply track row → account/event receipts**. Read existing idempotency receipt before checking event close. Decrement the actual server-owned JSON inventory, bump game-state revision and write the supply receipt/progress **in the same PostgreSQL transaction**; reject stale writers. Rewards must be computed from committed proofs with unique event/account/source keys and an account event maximum of 100 **before** any future wallet grant.

RLS must remain enabled, tables private, anon/authenticated clients denied, with no public security-definer function and no sensitive account/service key exposed. A hash is not authentication. The prior [V9 SQL proposal](world-boss-private-schema-proposal-v9.sql) has still not been executed, so this V12 DDL **cannot** be run independently. A proper SQL migration needs its own review and CLI workflow and should be tried in staging only after explicit approval.

## 5. What remains

1. Verify the focused [Hidden World Boss V12 validation workflow](../../.github/workflows/world-boss-v12-validation.yml) and regressions; distinguish unrelated current `backend/online/coop.ts` syntax issues and existing mobile UI failures from World Boss failures.
2. Wire the state bridge into a genuinely authenticated server-only loader, with a durable reserved roster and revision. Add actual multi-process PostgreSQL concurrency tests.
3. Reconcile live-state crafting, skills, gems, companions and account Combat Power across all four tiers. Measure worst-case mixed Echo squads and compare real PvE time-based combat behavior with the separate 14-round simulator.
4. Refine boss damage/guard numbers **only** after meaningful survivability and real Tank/Support counterplay have been measured, with role-normalized Impact fairness.
5. Implement and test owner-bound transactional War Supplies, eventual Sigil wallet with exactly-once claims, Inbox settlement, UI/animations and a server flag still OFF until explicit launch approval.

**No production or staging schema was changed; no user inventory, currencies or running events were modified.**

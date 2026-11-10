# Veldryn — Party Events v4: source-derived loadouts and security calibration

**Date:** 10 November 2026  
**Status:** Hidden-only code/QA pass, currently under review in [PR #1032](https://github.com/elroynbenjamins/Veldryn/pull/1032). **Not enabled, not deployed, no reward grants.**  
**Prior baseline:** [v3 stage prototype and gear-ratio calibration](party-events-prototype-and-calibration-v3.md) and [v2 gameplay design](party-events-design-v2.md).  
**One design workbook per major feature:** Party Events v3 remains authoritative until measured v4 outputs are reviewed.

## 1. What changes in v4

The previous 324-case gear-proxy calibration multiplied combat kit stats by derived equipment ratios. The new v4 runner follows **the same production loadout preparation used for online co-op dungeons** instead:

1. Construct synthetic but valid `GameState` fixtures using the **real** Veldryn v33 craftable, class-restricted T1–T4 equipment catalog.
2. Allocate unique owner-bound `CraftedGearInstance` IDs and slot references. Use the actual tier gate, quality/rarity and per-copy enhancement data. Create no real inventory, accounts, item grants or backend database rows.
3. Call `deriveOnlineCoopLoadout(accountId, serverLoadedState, serverGameVersion)`. It computes real shared `effectiveStats`, including class gear identity, set bonuses, quality/rarity, enhancement, Stat Gem rolls, class skill levels, and validated chosen combat companion. Actual Effect Gem family/resonance enters the combat snapshot.
4. Before freezing for Party Events, `verifyPartyEventEquippedCopyOwnershipV4` checks that every referenced forged copy belongs to the currently selected character, matches the slot/item, and is eligible at the XP-derived level. Duplicate per-slot instance IDs and stale revisions are rejected. Legacy unmarked item-ID gear retains the old co-op fallback.
5. `freezeTrustedPartyEventLoadoutV4` uses a server-loaded state and expected server revision; it calls the existing Party Event hash-protected `freezePartyEventBossLoadout`. It never consumes a client-authored stats payload or an untrusted companion/Gem representation.
6. Use the existing deterministic, **disabled** Party Event 12-tier simulation to compare unprepared and upgraded setups; all outputs remain terminal log summaries and cannot create Event Points, supplies, loot or Renown.

**Boundaries:** This is a *real source-code derivation applied to synthetic fixtures*, not a sample of production user equipment distributions, not automatic Party Event loadout persistence, and not a production-safe claim that every rate is balanced. No player state is read or changed. No SQL migrations, endpoints, cron, event navigation or feature flags are enabled.

## 2. Exact synthetic loadout profiles

| Attribute | Plain crafted | Prepared crafted | Source |
| --- | --- | --- | --- |
| Gear | All available class-legal T1/T2/T3/T4 slots | Same full set | v33 equipment catalog and recipes |
| Physical instances | Current character-owned forged copy, one per slot | Same, with unique receipts | `CraftedGearInstance` and owned slot mapping |
| Rarity | Common | Rare | `craftedRarityStatMultiplier` via shared `effectiveStats` |
| Quality | Q50 (neutral) | Q85 | `craftedGearQualityMultiplier` |
| Enhancements | Rank 0 | Rank +4 on each selected copy | `enhancedGearStats` |
| Stat/Effect gems | None | Ring G5 Precision + Predator with 110% rolls | `equippedCanonicalSocketsV1` and `summarizeGemLoadoutV1` |
| Class combat skills | Starting levels | Both disciplines at level 30, from exact XP | `characterClassEffects` |
| Combat companion | None | One owned, idle level-10 companion of an allowed *different* role | `validateCompanionLoadout` and `applyCharacterCompanionAssist` |
| Actual role and abilities | Nine backend class kits | Same, plus the real companion-assist ability | `launchPlayer` and verified snapshot adapter |
| Supplies | None | None for this isolated gearing test | Optional resources are a separate experiment |

**Important modeling caveat:** Quality, rarity, maximum enhancements and G5 gems in a low gear tier are an intentionally *strong crafted test profile*, **not a typical player's expected equipment**. Real distribution and acquisition-cost calibration is still required; the presence of these items does not prove they are routinely affordable.

## 3. Calibration matrix

The planned validation matrix is **9 class focuses × 4 equipment tiers × 3 party sizes × 3 difficulty settings × 2 verified gear profiles = 648 deterministic party-boss scenarios**, with 2–4 unique account/character IDs and normal role rules. Reusing immutable per-member source snapshots reduces fixture generation and avoids test-to-test carryover.

Record per group:
- Mean/min/max cleared tiers; fraction clearing first tier; fraction at cap Tier 12.
- Reward-band distributions by 2/3/4 member roster, Standard/Veteran/Heroic, and chosen focus class.
- Source record hash, frozen actor hash, legal equipment status, Effect Gem presence, companion ability presence.
- Differences between plain and prepared gear, particularly whether T2/T3/T4 still compress at the upper cap.

**Do not publish numeric outcomes until the dedicated GitHub Actions job has run and its actual logs have been inspected.** Previous v3 values in the spreadsheet are **gear proxy results**, not v4.

## 4. Security and determinism checks

- Disallow a forged copy owned by another character even if the client-visible item ID matches; do not let its Q85/rarity/enchant bonuses influence a Party Event result.
- Reject duplicate equipped instance IDs, wrong slot, wrong class, gear above XP-derived level and stale game revisions.
- The chosen companion must be owned, eligible for the class role and not currently assigned elsewhere; its frozen combat ability is generated server-side.
- Modifying a frozen actor after hashing is rejected at Day 8; changing local equipment after a frozen result must not re-run the original fight.
- No registration, event progression, score posting, settlement, purchasing, escrow or reward grants occur anywhere in this harness.

## 5. Balance recommendation and ship gates

**Do not commit a new boss curve just because v3's proxy saturated at 12/12.** Use v4 to establish the true shape of T1–T4 progression first. If later tiers still saturate, test **mid-to-late tier growth** while holding Tier 1 accessible and maintaining Tank/Support parity. Before selecting a live curve, run representative quality/rarity/gem/companion distributions, both saved loadout compositions and mixed-level parties, repeated seeds, all 12 authored event variations, verified supply bonuses and real code-level family hazards.

### Still missing before Party Events could be released

1. Trusted snapshot persistence on live Party Event enrollment and pre-close replacement, immutable Day 8 freeze and claim-safe outbox.
2. Server-owned objective receipt authoring and voting/phase runtime; v3 stage previews grant no EP.
3. Source-priced, economically sustainable resource orders; no mandatory Player Market dependence.
4. Atomic multi-currency Inbox/cache payout and explicit decision on partial-event rewards.
5. Real stage/finale family hazard scripts and replay UI; rankings remain hidden until Leaderboards is independently enabled.
6. Database migration/authorization tests, load/performance tests and developer-approved production feature enablement.

**Feature-gate invariant:** `PARTY_WEEKLY_EVENTS_RELEASED === false`; `PARTY_EVENT_STAGE_V3_RELEASED === false`; `PARTY_EVENT_VERIFIED_LOADOUT_V4_RELEASED === false`. The v4 adapter is private and has no live routes.

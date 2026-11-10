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

### Important level-scale mismatch to evaluate

The reused dungeon loadout builder computes combat stat scale from **`legacyCharacterLevelFromXp(character.xp)`**, while the Party Event boss currently scales from the **visible rebased character level** in its frozen actor. These are not necessarily equal after the combat XP curve change. This is a concrete possible reason T2–T4 previously saturated the 12-tier cap. The v4 runner deliberately preserves both actual code paths to expose the difference instead of silently changing one of the formulas. A future approved boss-level anchor must be validated against the visible difficulty, earned combat XP and real equipment power; **no live/hidden boss scaling has been altered here**.

## 3. Calibration matrix

The implemented validation matrix is **9 class focuses × 4 equipment tiers × 3 party sizes × 3 difficulty settings × 2 verified gear profiles = 648 deterministic party-boss scenarios**, with 2–4 unique account/character IDs and normal role rules. Reusing immutable per-member source snapshots reduces fixture generation and avoids test-to-test carryover.

Calibration records include:
- Mean/min/max cleared tiers; fraction clearing first tier; fraction at cap Tier 12.
- Reward-band distributions by 2/3/4 member roster, Standard/Veteran/Heroic, and chosen focus class.
- Source record hash, frozen actor hash, legal equipment status, Effect Gem presence, companion ability presence.
- Differences between plain and prepared gear, particularly whether T2/T3/T4 still compress at the upper cap.

The **first successful authoritative test run** ([Actions #42843378307](https://github.com/elroynbenjamins/Veldryn/actions/runs/42843378307)) completed all **648 scenarios**. Its unchanged v2 boss gave the following average cleared tiers for **2-player Standard** parties, with all these synthetic groups clearing at least Tier 1:

| Equipment tier | Plain crafted | Q85/rare/+4, Gem + companion + skills |
| --- | ---: | ---: |
| T1 | 6.56 / 12 | 9.22 / 12 |
| T2 | 10.56 / 12 | 12.00 / 12 |
| T3 | 12.00 / 12 | 12.00 / 12 |
| T4 | 12.00 / 12 | 12.00 / 12 |

The subsequent **passing** curve comparison ([Actions #42849065762](https://github.com/elroynbenjamins/Veldryn/actions/runs/42849065762)) validated three mirrored real-loadout combat scenarios against the original Day 8 code and ran **64 curve cohorts × nine focal classes**. Complete exact cohort results are versioned in [party-events-v4-real-loadout-curve-results.csv](spreadsheets/party-events-v4-real-loadout-curve-results.csv). Standard two-player means (seed variation explains small differences from the first 648 cases):

| Gear profile | Old v2 growth | Gradual | Medium | Steep |
| --- | ---: | ---: | ---: | ---: |
| T1 plain | 6.89 | 5.22 | 4.33 | 4.11 |
| T2 plain | 10.44 | 7.67 | 6.67 | 5.78 |
| T3 plain | 12.00 | 9.11 | 7.56 | 7.00 |
| T4 prepared | 12.00 | 10.33 | 9.33 | 8.22 |

**Post-tuning verification:** [Party Events CI #42849675720](https://github.com/elroynbenjamins/Veldryn/actions/runs/42849675720) passed the revised hidden boss, all 648 source-derived cases, three parity comparisons, and the 108-stage/72-combat stage preview regressions. [Exact 72 medium-curve cohort records](spreadsheets/party-events-v5-medium-authoritative-results.csv) are versioned alongside the earlier comparative CSV. On two-player Standard parties, the new mean tiers are **T1: 4.44 plain / 5.89 prepared; T2: 6.78 / 8.11; T3: 7.89 / 9.00; T4: 8.11 / 9.33**. Every sampled group cleared Tier 1. These numbers are synthetic verified-input simulations, not actual production cohorts. The final rewards economy and class composition remain unvalidated.

**Provisional hidden balance choice: Medium** — from Tier 2 onward apply +42% compounded boss HP, +20% Attack, and +16% Defense per tier. This is `1.42^(tier-1)`, `1.20^(tier-1)`, and `1.16^(tier-1)`, with **Tier 1 unchanged** and normal event difficulty multipliers still 1.00/1.20/1.40. It leaves headroom for T5+ equipment without excluding early players from the first tier. The hidden `weekly-party-boss-v2.ts` implements this draft curve, but the feature remains disabled. Later hazard mechanics, mixed-level groups, realistic inventories, skill distributions and resource preparation are outstanding release gates; this is **not final approved live balance**.

## 4. Security and determinism checks

- Disallow a forged copy owned by another character even if the client-visible item ID matches; do not let its Q85/rarity/enchant bonuses influence a Party Event result.
- Reject duplicate equipped instance IDs, wrong slot, wrong class, gear above XP-derived level and stale game revisions.
- The chosen companion must be owned, eligible for the class role and not currently assigned elsewhere; its frozen combat ability is generated server-side.
- Modifying a frozen actor after hashing is rejected at Day 8; changing local equipment after a frozen result must not re-run the original fight.
- No registration, event progression, score posting, settlement, purchasing, escrow or reward grants occur anywhere in this harness.

## 5. Balance recommendation and ship gates

**The real-source v4 test justifies a provisional hidden Medium tier-growth curve, but not a public release.** Preserve the verified easy Tier 1 and monitor class composition, party size, and role parity. Do not assume the 12 tiers' reward economy or the future family-specific mechanics are calibrated merely because a synthetic class/gear scenario passes. Before selecting a live curve, run representative quality/rarity/gem/companion distributions, both saved loadout compositions and mixed-level parties, repeated seeds, all 12 authored event variations, verified supply bonuses and real code-level family hazards.

### Still missing before Party Events could be released

1. Trusted snapshot persistence on live Party Event enrollment and pre-close replacement, immutable Day 8 freeze and claim-safe outbox.
2. Server-owned objective receipt authoring and voting/phase runtime; v3 stage previews grant no EP.
3. Source-priced, economically sustainable resource orders; no mandatory Player Market dependence.
4. Atomic multi-currency Inbox/cache payout and explicit decision on partial-event rewards.
5. Real stage/finale family hazard scripts and replay UI; rankings remain hidden until Leaderboards is independently enabled.
6. Database migration/authorization tests, load/performance tests and developer-approved production feature enablement.

**Feature-gate invariant:** `PARTY_WEEKLY_EVENTS_RELEASED === false`; `PARTY_EVENT_STAGE_V3_RELEASED === false`; `PARTY_EVENT_VERIFIED_LOADOUT_V4_RELEASED === false`. The v4 adapter is private and has no live routes.

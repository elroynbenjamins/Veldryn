# Party Events v6 — hidden finale hazard pass

**Status (12 November 2026):** Test-only family-mechanic proposal. Not released, not linked to live Day 8 settlement, and no item/EP/reward grants. The authoritative v5 Medium boss remains unchanged.

## What this pass implements

- Four separate combat-engine hazard kits, each with two interruptible cast abilities:
  - Broken Caravan — Raider Charge + Cargo Breach; metric: escort integrity.
  - Nightfall Hunt — Nightfall Howl + Tracking Mark; metric: tracking marks.
  - Broken Wards — Runestone Pulse + Ward Overload; metric: ward stability.
  - Lost Reliquary — Mirrored Sweep + Seal Overflow; metric: seal pressure.
- Each has three presentation variations and **two server-choice slots** (Stage 2 and Stage 3), validated against the family-specific approved choices.
- A conservative choice reduces special-hazard damage but slightly extends the boss fight (up to +4% HP). An aggressive choice increases special-hazard pressure while shortening the fight (down to -4% HP). These are **prototype values**, not approved balance.
- All hazard attacks show 3–4.5-second interruptible casts; common defenses, healing, damage racing and verified preparation are viable. There is **no fixed role composition**. Two to four players, even all Damage, can participate.
- These new abilities and the optional preview combat use the real deterministic combat engine with a bounded duration and a replayable seeded result. No custom payout formula is attached.
- Coverage: four families × three variations × four voting pairs × two party compositions = **96 preview fights**, plus validation of illegitimate choices/rosters and deterministic output.

## v7 continuation: source-derived companion assists and objective traces

- New `weekly-party-finale-objectives-v7.ts` reads genuine combat event records from the hidden finale hazard preview. It never fabricates companion stats, achievements or rewards.
- Four UI-ready *display-only* objective meter definitions: **Escort Integrity** (100 downward), **Tracking Marks** (0 upward), **Ward Stability** (100 downward), and **Seal Pressure** (0 upward).
- Warnings, resolved hazard hits, shield absorption, effective healing, party boss damage, interrupts and individual owner-bound companion ability contributions are derived from logged real combat events.
- Hidden 72-scenario family/variation/ballot/roster-size matrix now uses source-generated character-assist abilities from the existing companion adapter. Valid classes and matching companion roles remain required.
- **Important design update:** the persistent Party now has a proposed separate 1 Tank / 2 Damage / 1 Support membership requirement in [PR #1046](https://github.com/elroynbenjamins/Veldryn/pull/1046). The earlier v6 all-Damage combat fixtures remain useful legacy/stress tests, **not an allowed composition for new persistent Parties**. The Party Event 2–4-player final difficulty still needs calibration under the restricted formation.
- Objective pressure and percentages are diagnostic only; the existing authority to decide fight victory, payout, account entitlement and roster eligibility remains unchanged.
- Feature flag `PARTY_EVENT_FINALE_OBJECTIVES_V7_RELEASED` remains `false`. Source-derived companion effects still need matchup/balance calibration; no outcome meter is connected to the live boss.

## v8 continuation: four different types of gameplay

**Status:** Hidden deterministic combat and objective prototype, not a shipped rule or a reward/settlement gate. Source: `weekly-party-distinct-finales-v8.ts`.

| Family | Real engine identity | Unique preview goal | Tactical vote tradeoffs |
| --- | --- | --- | --- |
| **Broken Caravan** | Physical raider charge (area hit), targeted Cargo Breach that leaves a vulnerability debuff, reinforcement attack phase | Keep **Escort Integrity** at or above 30. Cargo breaches and real raid damage erode it; actual player healing, shielding and interruptions restore some of the lost integrity | Safe Pass and Brace Wagons protect cargo; Fast Pass and Disrupt Raiders weaken the captain but raise the breach rate |
| **Nightfall Hunt** | Nightfall Howl reduces incoming healing; the alpha can cast a protective self-veil; HP phases expose the alpha to extra damage | Build at least **35 Tracking Marks** using actual hits, boss damage, exposure triggers and interrupted howls; successful concealment and howls erase progress | Clear Trail aids accuracy; Shadow Trail is shorter but makes the prey harder to hit. Hunt the Alpha boosts exposure windows but raises retaliation |
| **Broken Wards** | AoE arcane pulse with real lingering damage-over-time, interruptible Overload, self-shields at 65% and 30% boss HP | Keep **Ward Stability** at or above 30 by limiting overloads and rune-burn damage; genuine shields, heals and interrupts help | Ground Spires shortens rune burns but toughens defenses. Overload Wards reduces enemy barriers but increases the backlash |
| **Lost Reliquary** | Mirrored Sweep, stacking-type seal corruption via real **true-damage DoT** (pierces shields), fracture phase that increases threat and guardian vulnerability | Keep **Seal Pressure** at or below 70; overflow casts, corruption damage and breaking seals raise pressure, while interruptions and actual healing offset it | Quiet Passage / Preserve Seals slows the encounter safely; Deep Passage / Break Seals exposes the guardian while increasing dangerous corruption |

Each family also has **three different scene twists** with small, deterministic differences in cadence, pressure and defenses. Stage 2 and Stage 3 both have exactly two family-specific choices; all four ballot pairs are validated against accepted IDs.

**Scope of uniqueness:** Boss abilities, targets, status effects, HP phases, shields, defensive modifiers, exposure windows, composition validation and objective calculations are different in the deterministic engine, not merely different names or color palettes. Companion contribution is read from the existing server-generated combat assist abilities and logged effects. No companion is assigned a made-up event-specific stat bonus or required by name.

**Preview outcomes:** The new `hypotheticalClear` field is true only for a simulated combat victory plus its family's preview objective. It **never** mints event points, loot or character rewards; the real Day 8 boss resolver is untouched. All Stage 2/3 ballots, equipment, companions and verified supplies must be frozen by the authoritative server before any future settlement wiring.

**Party composition:** New persistent Parties are being restricted by [PR #1046](https://github.com/elroynbenjamins/Veldryn/pull/1046) to **1 Tank / 2 Damage / 1 Support**; v8's full four-person previews now reject nonstandard compositions. Two/three-member previews remain valid only within these role caps. Old v6 all-Damage scenarios remain legacy stress tests, not allowed future rosters.

**Balance tuning required before launch:** Compare cautious/risky branch choices with real power/gear level curves, validate that 30/35/30/70 objective thresholds are fair, use real fully frozen companion/food/potion state, check actual Day 8 tiers, evaluate how barriers and DoTs interact with all nine classes, and then wire server-owned ballots to a transaction-safe event resolver. Keep v8's released constant false throughout.

## Guardrails

- `PARTY_WEEKLY_EVENTS_RELEASED`, `PARTY_EVENT_STAGE_V3_RELEASED`, `PARTY_EVENT_FINALE_HAZARDS_V6_RELEASED`, `PARTY_EVENT_FINALE_OBJECTIVES_V7_RELEASED`, and `PARTY_EVENT_DISTINCT_FINALES_V8_RELEASED` stay false.
- The new module is not imported from `resolvePartyEventDayEightBoss` or public APIs; the old Medium curve, contribution accounting, shared reward-band formula and saved loadout verification remain as before.
- Replay-only metrics are labels for future UX, **not implemented objective-health meters**. Do not claim the mechanic is fully shippable or allow the browser to author votes.
- Stage vote selection must eventually be read from a frozen, service-authored ballot ledger. Client-provided `stage2Choice`, `stage3Choice`, `baseline` or `players` is never sufficient for authoritative settlement.

## Next implementation passes before release

1. Connect locked, server-owned stage choices and verified source-derived equipment/companion/potion snapshots to the hidden hazard simulation (no client combat stats).
2. Promote the v8 event-specific objective replay into a verified, server-owned state machine only after validation. The hidden v8 formula is prototype-only, not a finalized economic, combat or reward rule.
3. Run legal 1 Tank / 2 Damage / 1 Support teams and valid incomplete rosters with mixed-level, role-specific, companion-assisted 12-tier simulations across all three difficulties and 12 variations. Keep illegal all-Damage rosters only in isolated stress tests.
4. Calibrate defensive/aggressive choices to an expected spread of no more than one cleared tier for comparable groups, without a dominant universal strategy or class-specific companion requirement.
5. Recalibrate supply costs against real resource acquisition and implement claim-safe, idempotent rewards only after all settlement/security QA passes. Preserve hidden rankings until Leaderboards releases.

**No production launch or automatic gameplay modifications are authorized by this pass.**

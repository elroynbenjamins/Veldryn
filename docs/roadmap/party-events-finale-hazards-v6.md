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

## Guardrails

- `PARTY_WEEKLY_EVENTS_RELEASED`, `PARTY_EVENT_STAGE_V3_RELEASED`, and `PARTY_EVENT_FINALE_HAZARDS_V6_RELEASED` stay false.
- The new module is not imported from `resolvePartyEventDayEightBoss` or public APIs; the old Medium curve, contribution accounting, shared reward-band formula and saved loadout verification remain as before.
- Replay-only metrics are labels for future UX, **not implemented objective-health meters**. Do not claim the mechanic is fully shippable or allow the browser to author votes.
- Stage vote selection must eventually be read from a frozen, service-authored ballot ledger. Client-provided `stage2Choice`, `stage3Choice`, `baseline` or `players` is never sufficient for authoritative settlement.

## Next implementation passes before release

1. Connect locked, server-owned stage choices and verified source-derived equipment/companion/potion snapshots to the hidden hazard simulation (no client combat stats).
2. Add real **escort integrity / tracking marks / ward stability / seal pressure** objective resolution with non-class-exclusive counter-actions and event replay cues.
3. Run all-Damage, all-Support where legal, balanced, two/three/four player, mixed-level and companion-assisted 12-tier simulations across all three difficulties and 12 variations.
4. Calibrate defensive/aggressive choices to an expected spread of no more than one cleared tier for comparable groups, without a dominant universal strategy or mandatory Tank/Support.
5. Recalibrate supply costs against real resource acquisition and implement claim-safe, idempotent rewards only after all settlement/security QA passes. Preserve hidden rankings until Leaderboards releases.

**No production launch or automatic gameplay modifications are authorized by this pass.**

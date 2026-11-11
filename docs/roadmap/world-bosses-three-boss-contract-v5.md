# Veldryn World Bosses — Three-Boss Encounter & Engineering Contract v5

**Date:** 2026-11-10. **Status:** DESIGN-ONLY / UNAPPROVED numeric hypotheses. **Production:** World Bosses remain hidden, with no live events, endpoint, migration, item rewards, or art assets.

## 1. What carries forward

**User-confirmed:** every 14 days; seven active days followed by seven inactive days; three attacks per account per event, with no daily obligation; asynchronous initiator plus saved Echo loadouts; community-wide optional War Supplies. These are unchanged.

**Prior, still proposed:** Tank + 2 Damage + Support, three rotating bosses, global phases selected once at battle start (100–70% / 70–30% / 30–0%), fourteen combat rounds, World Impact fairness, World Sigils (98 theoretical under historical v5; **superseded November 11, 2026 by a 100-Sigil proposed cap**, see [updated shop/reward design](world-bosses-design-v2.md)), two supply bundles per account, Residual Echo attempts after community victory, and cosmetics-first rewards.

**Engineering baseline:** v3 Hollowroot is authored in `spreadsheets/world-bosses-hollowroot-rounds-v3.csv`. v4 verified **812 test-only deterministic engine runs**, not full World Boss rounds; initial baseline teams all survived, and real Support abilities mattered under stress. The existing time-driven engine currently approximates several mechanics. See [v4 findings](world-bosses-hollowroot-engine-calibration-v4.md). **This v5 document does not claim to have implemented or validated a turn scheduler.**

## 2. Design objective and boss rotation

| Boss | Narrative | Main tactical check | Tank | Damage | Support |
| --- | --- | --- | --- | --- | --- |
| Hollowroot Colossus | Forest; regrowth / attrition | Interrupt local Regrowth, break amber guard, survive Roots/Spores | Root Slam protection | Guard + heart exposure | Cleanse spores, heal real damage |
| Sunscar Devourer | Sunscar; sand/heat and armor plates | Expose solar plates while managing marked burst/burn | Sandbreaker/Desert Fury | Armor plate fracture | Cleanse burns and handle multi-target pressure |
| Frostmarch Warden | Frostmarch; barriers and freeze | Crack Icebound Aegis before pressure builds | Intercept Ice Spear | Shatter ice shield | Cleanse freeze and use consumed shields |

Rotation remains **Hollowroot → Sunscar → Frostmarch** every 14 days (same boss every six weeks). Each fight starts in the **current global phase**, locked for the entire 14-round instance. These are global encounter phases, *not* a boss locally transitioning its HP threshold.

## 3. Shared fourteen-round authoritative contract

- Each round resolves: **(1)** expire/start-of-round status ticks with deterministic priority; **(2)** current signed telegraph from previous round; **(3)** the four fighters' automatic actions and valid pre-selected War Order; **(4)** scripted boss effect, if the telegraph's target is still valid; **(5)** mitigation/heal/shield/guard ledgers; **(6)** emit exact ordered replay events. Final ordering must be adjusted for the existing server engine, not duplicated in the client.
- A telegraph has a persistent `targetSet`/selection seed, `issuedRound`, `resolvesRound=issuedRound+1` and an ability ID. Effects may target only the committed group or a documented deterministic fallback if a target dies. Client does **not** select a different target mid-replay.
- One major boss spike per 2–3 rounds; ordinary actions can still happen in between. Round 14 closes after remaining valid actions and status settlements; no fabricated final hit, and a status with an outstanding tick must not generate an invisible post-run charge.
- An exposure is **two opportunity rounds**; +10% damage only during actual exposed-target hits. Local guard has its own event-instance HP/absorption ledger. Guard restoration is capped at the local guard ceiling. **Never heal/debit global HP via guard changes.**
- Regrowth, Sunward Plates and Icebound Aegis operate on local guard **only**. Their break and regeneration are shown with verified combat events. World HP deduction comes from committed eligible effective squad attacks against the boss, separately from local shield damage.
- Player skills, conditions and companion passives must use an immutable **resolved server snapshot**. A borrowed Echo spends no attempt, earns no passive Sigils, and cannot be selected twice. No dungeon-only potions or food use.
- Results are generated **once**, not simulated again on Skip/2×. Replay is an exact presentation of a durable event log. Interrupted sessions recover the same battle ID/seed and result.

### Ledger contract (server-only)

Store per hit: `eventId, round, actorId, ownerSnapshotId, targetId, abilityId, attempted, mitigated, shieldAbsorbed, localGuardAbsorbed, hpDamage, effectiveHeal, statusDelta, causeEventId`. All quantities nonnegative; use bounded precision and deterministic rounding. **Do not sum attempted damage as community damage.**

For each committed attack separately store: `rawSquadBossHpDamage`, `localGuardDamage`, `creditedWorldDamage`, `hpBefore`, `hpAfter`, `residualEcho`, `impact`, `rewardReceiptId`, `snapshotHash`, `engineVersion`. In a single atomic transaction:

`creditedWorldDamage = residualEcho ? 0 : min(eventHpBefore, eligibleSquadDamageAfterCap)`

`eventHpAfter = eventHpBefore - creditedWorldDamage`

If another attack has already finished the boss before this commit, allocate **zero** new global damage and mark the committed receipt as Residual Echo without changing its battle replay or personal combat result. The battle receipt must not be awarded twice. Successful/failure attack outcomes require a separately defined objective and cannot be inferred from local boss death, since the local boss is intentionally not an ordinary killable enemy.

## 4. Sunscar Devourer — authored v5 proposal

**Silhouette:** coiled desert wyrm / plated serpent, obsidian maw, segmented bronze sand armor, hot ember seams. **Unique identity:** a fast, dangerous damage boss, rather than a second Hollowroot.

**Armor plates:** a finite per-attempt `solarPlateGuard` distinct from community HP. A scripted fracture window exposes glowing plates to verified damage for the next **two player-action rounds**. Start with +10% eligible weak-point damage as a test hypothesis; Break Armor contributes its capped +5% only to barrier/weak-point effects. Do not invent fracture success without a ledger entry.

**Heat / Scorch Mark:** mark one server-selected backline target at telegraph time. Resolution attacks that target, with a visible burn that ticks for two rounds unless cleansed. *Initial tests only*: burn tick **2.5% max HP**, two ticks; unique mark hit/cleave coefficients are in CSV. Resist mitigation is a real class/equipment effect. A targeted failure/survival must be attributable to executed mechanics, not a client animation.

**Phase intents:**
- **Armored:** Sandbreaker frontline cleaves and sand armor fracture. Tank and Damage each have tangible counters.
- **Exposed:** Burning Tempest group attacks, Scorch Mark, plate windows. Support must save measurable effective HP.
- **Enraged:** Desert Fury frontal burst and Solar Collapse multi-target, with plate windows for offensive tradeoff.

All 42 phase/round cues are specified in `spreadsheets/world-bosses-sunscar-rounds-v5.csv`. Coefficients are **initial hypotheses** relative to benchmark enemy attack and are *not tuned production values*.

## 5. Frostmarch Warden — authored v5 proposal

**Silhouette:** ancient glacial sentinel, single off-centre bright eye, runic ice shield, broken pauldrons and trailing cloth. **Unique identity:** attrition through barriers, control and survivability — not only higher raw damage.

**Icebound Aegis:** finite local shield ledger, not extra community HP. Scripted barrier and shatter windows (two player-action rounds) make piercing armor tactically important. Shatter breaks only when real registered damage consumes the threshold; proposed +10% weak-point window applies only if actually broken.

**Freeze / Frostbite:** a visible next-action-only freeze reduces one non-Tank actor's **next action by 50%** unless cleansed. It must not permanently disable Echoes or cancel the whole round. Frostbite is two real ticks of **2.5% max HP** as a starting hypothesis, with cleanseability and precise source attribution. Support shields count only if consumed by a real attack.

**Phase intents:**
- **Armored:** Aegis begins active, Ice Spear targets the frontline, barrier fracture creates a reward for Damage.
- **Exposed:** Freezing Chains and Frostbite create a cleanse/healing challenge; Aegis can refresh locally (capped).
- **Enraged:** Glacial Reprisal and Whiteout combine front protection with group shield consumption, never undetectable one-shots.

All 42 authored cues are in `spreadsheets/world-bosses-frostmarch-rounds-v5.csv`. Freeze, barriers and splash need a real ordered scheduler; the existing time-driven PvE engine does not prove them yet.

## 6. War Orders and the War Camp

One chosen War Order per attack (not mid-fight):
- **Break Armor:** *proposed* +5% verified guard break and weak-point effect, capped, no generic Attack buff.
- **Hold the Line:** *proposed* +5% to relevant real team mitigation, measured from avoided damage, not fake Tank score.
- **Steady Assault:** default modest attack/sustain tradeoff to be defined during calibration; **do not silently invent an equivalent +5% permanent DPS bonus**.

The v3 T1–T4 **12 real-item-ID** War Camp recipes remain the source of truth. T3 and T4 are both Sunscar-derived in current equipment progression; do not require Frostmarch reagents for T4 supplies. Do not consume class-equipment binding resins, unique crafting components, pets or rolled equipment. Keep two bundles per account across all lanes, 4 proposed Sigils each, with actual resource debits and future-only battle buffs. Validate opportunity cost again after the newest T3/T4 Dunewood, gold and XP changes.

## 7. Calibration matrix / gating

The v4 samples are a **70-second proxy**, not a true 14-round fight. Do not scale global event HP from their 51k–116k displayed per-squad numbers or keep the old illustrative 28k calibration unexamined. Neither is a real median committed World Boss attempt.

**Required offline / CI test grid once true scheduler is implemented:**
1. All **9 class identities × T1–T4 × 3 boss phases × 3 bosses × ≥100 seeded replicates = ≥32,400** matched-bracket deterministic combats. The four-player 1/2/1 composition must hold for all initiating roles.
2. Repeat representative stress brackets with mixed Echo power and several measured enemy-pressure levels; validate not merely whether anyone survives, but **initiator survival, damage, guard break, effective heal, consumed shields, cleanse value, wipes and round reached**.
3. Counterfactual same-seed runs: suppress Tank protection, suppress Support utility, omit Damage guard-break tools, and rotate all three War Orders. Distinct class roles must change outcomes in relevant encounters.
4. Calibrate role-normalized World Impact against **real** prevented damage, absorbed shield ownership, effective heals and boss damage, then test milestones 0.8/1.8/3.0 for Tank/Damage/Support within **five percentage points** for comparable bracket and participation.
5. Only after genuine combat values exist rerun 40/200/1000-population simulations, attempt-rate scenarios, event-end victory odds, early kill/Residual Echo ratio, Sigil economy, and realistic 30–45-minute supply recipes.

**Quality gates:** seeded replay bit-for-bit deterministic; all telegraphed spikes resolve on next round or produce an explicit cancelled-target event; local guard never changes global HP; role counters produce verifiable attribution; no rewards or attempt drains on server fault; no negative HP or duplicate receipt; every displayed damage tick reconciles.

**Do not infer** that 1.5×/2× boss Attack is approved from v4's small three-seed pressure sweep. Those were deliberately high-pressure probes, not deployed balance coefficients.

## 8. Release safety / client UX

Current navigation preference: **World screen = exploration**, **Dungeon = separate screen via Account**, **World Boss = its own compact screen**, reached from an event banner/Account quick entry *only after* release authorization. No return to World/Dungeon mixed tabs. No public leaderboards while Leaderboards is unreleased. First-entry guided tour: collective HP, three account attacks, borrowed Echoes and optional supplies; hide tutorial paragraphs from main screens afterward.

Boss overview mobile hierarchy: boss portrait → global phase/HP → remaining time → attacks available → **Attack** → War Camp/Rewards/History. Preparation displays resolved gear/companions and unavailable dungeon consumables; replay has real hit-by-hit events, normal/2×/Skip; result distinguishes **Combat damage**, **Actual world HP credit** and **World Impact** so the three cannot be confused. Include clear Residual Echo messaging after global victory, phone-size testing, reduced-motion signals and internationalized labels.

Do not create or enable production database schemas, Edge functions, schedules, shop, currency, player invitations, map content or art in this design pass. A hidden technical prototype is appropriate only after the 14-round engine/event ledger is independently tested.

## 9. Next engineering pass in recommended order

**A — deterministic scheduled engine:** implement phase-fixed 14-round fight and exact cues; support local guard separate from HP; targeted two-tick statuses, cleanse/interrupt, role-attributed prevention; retain existing 70-second engine proxy as regression. Test only.

**B — robust receipts and idempotency:** versioned snapshot resolution, account-wide three-attempt exclusivity, global event HP transaction, supply receipt/milestone ledger, replay storage and fail/retry recovery, all behind an **off** flag. No public UI.

**C — actual balance + economy:** run the seeded combat grid and population model; revise 0.82 small-community HP adjustment and 98-Sigil ceiling only with evidence. Audit role parity and resources against Player Market sinks.

**D — art/UI/release:** original three pixel-art bosses and Veldryn-compatible animations, compact mobile flow, guided tutorial, a sandboxed seven-day season, then explicit release sign-off. This document approves **neither** live activation nor the proposed numerical values.

## Sources / accompanying artifacts

- [World Bosses foundation v2](world-bosses-design-v2.md)
- [Hollowroot encounter & synthetic model v3](world-bosses-hollowroot-v3.md)
- [Corrected engine calibration v4](world-bosses-hollowroot-engine-calibration-v4.md)
- [Sunscar 42-round script](spreadsheets/world-bosses-sunscar-rounds-v5.csv)
- [Frostmarch 42-round script](spreadsheets/world-bosses-frostmarch-rounds-v5.csv)

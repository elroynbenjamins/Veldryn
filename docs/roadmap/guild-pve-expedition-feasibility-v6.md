# Veldryn Guild PvE — V6 participation, resource feasibility and simulation bridge

**November 15, 2026. Hidden test-only budget calibration; NOT actual Veldryn combat simulation, no live changes.**

Continues [V5 Broken Forge content](./guild-pve-broken-forge-content-v5.md), [V4 campaign/fairness contract](./guild-pve-expeditions-content-v4.md), and the retained V3 21-sheet expedition workbook.

## What was actually done

A deterministic, dependency-free **theoretical** budget runner was added at [`tools/guild-pve-budget-v6.mjs`](../../tools/guild-pve-budget-v6.mjs). It generates three documented datasets:

- [2,835 attendance, stance-mix, gear-sensitivity and tier scenarios](./spreadsheets/guild-pve-v6-effort-sensitivity-test-only.csv)
- [21 supply milestone / per-account cap checks](./spreadsheets/guild-pve-v6-supply-reachability-test-only.csv)
- [21 seven-node required-activity budget allocations](./spreadsheets/guild-pve-v6-mandatory-node-budget-test-only.csv)

All four files have been saved and indexed. **Important: these are algebraic feasibility calculations.** The 'gear' factor is a hypothetical 0.8 / 1.0 / 1.2 sensitivity input, *not* stats or damage measured from Veldryn's engine; the 'balanced' operation coefficient 0.90 is a hypothetical role-mix efficiency. None of the outputs represents win probability, ability performance, survival, observed player behavior or release-ready HP. No character state, inventory, token, scheduler, schema, API or release flag is touched.

Reproduce from repository root:

```bash
node tools/guild-pve-budget-v6.mjs --summary
node tools/guild-pve-budget-v6.mjs --effort > /tmp/guild-pve-effort.csv
node tools/guild-pve-budget-v6.mjs --supply > /tmp/guild-pve-supply.csv
node tools/guild-pve-budget-v6.mjs --allocation > /tmp/guild-pve-allocation.csv
```

The runner performs its own row counts and node-effort conservation assertions. Remote CI execution has not been reported as complete merely by committing the script.

## A. Why the existing V3 'Scout' effort may be excessive

Existing nominal effort thresholds from V3: **Scout 58%, Veteran 68%, Mythic 78%**, applied to eight available Seals per counted guild account with a minimum scaling count of four. The user-facing target was instead a casual event navigable by approximately **65–75% participating members**, without requiring all eight Seals or a particular class.

For this model we deliberately reserve **ceil(10% of committed Seals)** for optional combat tasks and apply one of three *hypothetical* operation mixes: all-Assault=1.00, balanced=0.90, defensive=0.82. This exposes structural attempt shortages **even before real class/boss damage or survival are considered**. Attendance is tested at 50/65/70/75/90%; per-participant Seals spent at 4/6/8; both floor and ceil numbers of attendees; underprepared/reference/prepared multiplicative sensitivities 0.8/1.0/1.2. The available 8 Seals are **not** replaced: the model only varies how many a player uses.

### Focus case: 70% attendance, six Seals per attending account, balanced 0.90, reference gear, 10% optional

| Frozen roster | Counted participants (ceil) | Effective required-path effort | V3 Scout target | V6 trial Scout target | V3 clears model? | Trial clears model? |
| ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4 | 3 | 14.4 | 19 | 13 | No | Yes |
| 8 | 6 | 28.8 | 38 | 25 | No | Yes |
| 12 | 9 | 43.2 | 56 | 37 | No | Yes |
| 20 | 14 | 67.5 | 93 | 61 | No | Yes |

**Finding:** V3's 58% is incompatible with this particular plausible attendance/spend hypothesis across all four sizes; that does not prove live guilds would lose. Reducing raw HP alone is also unsafe because the contribution needs role, preparation and boss-phase constraints.

**Explicitly provisional V6 alternative thresholds**, for further testing only:

| Tier | V3 normalized effort ratio | V6 alternative trial | Intent |
| --- | ---: | ---: | --- |
| Scout | 0.58 | **0.38** | Majority of moderately active guilds progress |
| Veteran | 0.68 | **0.50** | Good preparation or more Seals / higher turnout |
| Mythic | 0.78 | **0.62** | High engagement and effective tactical decisions |

These ratios represent hypothetical **required-path equivalent effort** and are **not a live HP multiplier**, not a promise of completion, and not approved balance. In the focus scenario **only Scout clears** at all four normal guild sizes; Veteran and Mythic appropriately remain additional challenges. Actual attacks may have weaker non-damage contribution but stronger mitigation value, making a scalar 'efficiency' inadequate. Keep original V3 ratios in the design record until real-engine tests justify a change.

### The node budget has seven—not eighteen—combat gates

Seven mandatory combat nodes consume Assault Seals across the required route:

`C1-04 Gate Patrol`, `C1-06 Gatekeeper`, `C2-01 Molten Corridor`, `C2-05 Forge Overseers`, `C2-06 Emberbound Seer`, `C3-01 Inner Lift`, `C3-06 Hollow Warden`.

`C1-01` is free. Remaining nodes are optional and may use Orders, Seals, donated resources or free votes.

The [mandatory-node budget CSV](./spreadsheets/guild-pve-v6-mandatory-node-budget-test-only.csv) uses deterministic largest-remainder allocation with **at least one effort unit per mandatory node**. Provisional weighting of the seven nodes is **9% / 17% / 10% / 10% / 18% / 10% / 26%**, respectively. This merely divides an algebraic effort budget; **it does not specify enemy HP, attack count, encounter duration or drop rates**. Avoid translating 'one unit' to 'one kill' before actual combat testing. The finale has the largest budget, so optional weakening remains interesting without automatic removal of difficulty.

## B. Optional supplies expose small-guild dead ends

V3 supply model is 40 nominal points per counted member **per chapter**, minimum roster scale four, and Scout/Veteran/Mythic goal multipliers 1.00/1.25/1.50. A member may provide **150% of their nominal individual share**, i.e. 60/75/90 points per chapter, regardless of the minimum roster floor. Guilds choose supplies voluntarily; full donations never gate access to the finale.

| Actual contributors, Scout | Chapter requirement | Maximum from all these accounts under cap | Highest reachable completion | First 50% boon? | Full 100% boon? |
| ---: | ---: | ---: | ---: | --- | --- |
| 1 | 160 | 60 | 37.5% | **No** | No |
| 2 | 160 | 120 | 75% | Yes | **No** |
| 3 | 160 | 180 | 100% | Yes | Yes |
| 4 | 160 | 240 | 100% | Yes | Yes |
| 8 | 320 | 480 | 100% | Yes | Yes |
| 20 | 800 | 1,200 | 100% | Yes | Yes |

The same proportional dead-end exists across all three tiers. Allowing solo entry but silently presenting an unreachable first boon is poor UX.

**Proposed mitigation, not approved:**
1. Add a modest **25% preparation milestone** (one finite utility charge) for each optional supply objective, preserving current 50% and 100% benefits and the global direct-stat cap. This grants a meaningful target to a solo guild: 25% of its 160-point Scout objective is 40, below its 60-point cap.
2. Clearly display "**Maximum with current roster: 38%**" (or the correct current value) when full goal is mathematically unreachable. Avoid messaging that implies the player is lazy or required to recruit.
3. Never add paid attempts, a Gold shortcut, forced guild-bank usage or hidden material deductions. The fixed four-account floor and capped personal contribution protect against one-player guild alt-farming.
4. Use **only one** reward entitlement per 25/50/100% tier and a frozen per-chapter manifest. The added 25% utility charge cannot be farmed by repeatedly donating or changing guilds.
5. Keep rare material <=20% of points and optional Gold substitution <=10% as **V3 proposed**, not live-tested constraints. Item-specific values (1/3/12) remain placeholders.

A stronger alternative would be eliminating the four-account floor only for the optional resource track, but this risks allowing cheap complete boons to fresh one-account guilds; evaluate in a future economy simulation rather than silently making the change.

## C. Source inspection relevant to real combat V7

The codebase already contains useful but **different** simulators:

1. `tools/regional-combat-sim-entry.ts` reuses actual **nine-class**, equipment/companion/gem-enriched synthetic fixtures from `tools/regional-gear-cp-benchmark-entry.ts`; it tests ordinary hunts and the actual Fallen Knight preview. It does **not** implement Guild Expeditions.
2. `backend/online/world-boss-loadout-v12.ts` is a disabled server-owned co-op loadout bridge leveraging `deriveOnlineCoopLoadout` and forged-copy ownership checks; World Boss tests found that a T2-frozen threat profile suppressed all T1 damage in a Frostmarch Armour cohort. Reuse the verified conversion principles, not World Boss HP or currencies.
3. `apps/mobile/src/content/guild-skill-paths.ts` specifies **Vanguard** bonuses for timed *Guild Boss* attempts. These do **not** prove the same buff is active for new expedition battles; auditing and explicit mode scoping are required.
4. `apps/mobile/src/core/guild-progression-v1.ts` has a Guild XP level-cap progression model; event XP must be calculated **once per shared milestone**, and caps verified against the actual online guild XP contract.
5. The current mobile Guild Bank UI exposes existing resource item IDs named in [V5 supply candidates](./spreadsheets/guild-pve-broken-forge-supply-candidates-v5.csv). **UI presence does not validate acquisition rate, current craft demand, tradability or market value.**
6. The earlier regional simulation documentation warns that **Frostmarch T5/T6 crafting-source alignment is unresolved** and T6 not released. Do not assume these new expedition objectives can require T6 or expensive Frostmarch materials.

### Required real-combat bridge (not yet built)

- Derive an immutable legal gear/skill/gem/companion **server-resolved** character snapshot from the real co-op adapter with forged ownership verification, level alignment and active guild membership.
- Generate actual class-specific Assault/Guard/Rally outcomes against a frozen reference threat profile. V5's 36 authored cues must be mechanically parsed into a server-side phase machine; no fake damage.
- For each guild size 1/2/3/4/8/12/20, participant mix, role composition, realistic items/consumables and difficulty, aggregate **real effective HP damage**, prevented damage, cleanses, support charges, pressure trajectory, wipe/survival, Seals spent and milestone reachability.
- Run at least 100 controlled deterministic seeds per benchmark where stochastic effects could materially change outcomes; use comparable seeds for paired variants but acknowledge different action order may shift RNG use.
- Calibrate **boss HP independently** from player gear, choose frozen threat brackets server-side, and check no intended eligible power band is fully nullified by Guard. Do not auto-increase boss Attack from a stronger attacker's stats.
- Build anti-duplication concurrency tests: exactly-one Seal debit, scope retries to the same committed loadout and phase, stale-target refunds, crossing thresholds once, ledger-backed role impact and idempotent rewards.
- Evaluate partial reward coverage and each optional supply item's actual cost from source drop/craft data. A numerical goal is not release-ready until it respects current 25-level chapter progression and account-shared character access.

## D. Release and acceptance gates

**Go/no-go for the next V7 engineering prototype:** 18-node graph valid; 36-cue script validated; all nine class snapshots legal; 4/8/12/20 guild scenarios with varied attendance and actual (not assumed) Seal utilization; 1–3 guild partial rewards still meaningful; Scout approachable under casual participation; Veteran/Mythic require preparation; real Guard/Rally utility; supply 25/50/100% reachability and item scarcity; economic effect on Guild Tokens and Guild XP bounded; no regression in weekly Guild Hunt.

No public Raid Gate tab change, new release flag activation, SQL migration, cron, online route, real supply deduction or reward entitlement was made during V6. V6 is a **reproducible feasibility screen only**, not evidence of production balance.

# Veldryn Equipment × Combat 2.0 — Expanded-set launch consolidation

**Source integration date: 2026-11-22. Private, unmerged, release flags OFF.**  
**Owner direction:** the larger, 12-family T1–T4 **48-tiered-set content base is part of the initial Equipment/Combat 2.0 launch**, not something to defer automatically to a post-launch expansion. Enemies and bosses must be built and balanced *after* that set base, its bonus stats, gems and executable trait combinations are validated.

## Consolidation state — real sources, not competing guesses

### On integration branch: integration/eq2-combat2-expanded-sets-launch-20261122
- Combat 2.0's actual nine-class / 18-spec / 12-family / T1–T5 structural set, server deterministic encounter, enemy and trait adapters, dungeon boon/artifact drafts, and 2026-11-22 review contracts inherited from private Combat development.
- 63 existing Forge/Crafting files imported as actual Git blobs from hidden Equipment revision `design/eq2-combat-affix-traits-review-20261121`: core server item/recipe/quality/rarity/affix rolls, ownership/receipts, crafting, physical-storage rehearsals, gems, 16 regression test files, docs, review CI and source validators.
- Hidden, unmounted server/client ordinary equipment catalogue parity mirrored to support verification, **not publicly rendered**; no changes to existing UI screens or themes.
- 11-family server+hidden-client shared weapon **eligibility policy** imported from the separate weapon draft. Its four new Hewing Axe templates, clients, unlocks and source restrictions still need canonical import/consolidation.
- All import actions were content overlays on a private branch, **not merges to main**. The source branches remain unchanged for history and unresolved follow-up.

### Source facts the new registry now enforces

| Dimension | Fact | Interpretation |
| --- | ---: | --- |
| Existing pinned T1–T4 Forge ordinary templates | 169 | Real, hidden draft server item IDs; no release |
| Foundation + alternate craft routes | 338 | Real, hidden recipe definitions; not unlocked on production |
| Old compact Forge set IDs / set pieces | 15 / 42 | Existing IDs preserved; not the new system ceiling |
| Combat 2.0 designed family names | 12 | Four Tank / four Damage / four Support |
| Combat 2.0 tiered family IDs | 60 | 12 per tier T1–T5; T5 future |
| Intended initial T1–T4 tiered sets | **48** | **Content acceptance scope** for 2.0 launch |
| Intended T1–T4 member slots | **204** | 51 member slots per tier; candidate exact IDs are not yet item templates |
| Proposed 2p/3p/4p/6p bonus entries | **108** | 27 thresholds × T1–T4; coefficients not yet approved/implemented |
| Structural six-piece sets (T1–T4) | 12 | Citadel, Breakerforge and Rootshield at each tier |
| Physical six-piece Forge set IDs | 0 | **None issuable until real member templates are authored** |
| Equipment bonus stat proposal | 17 | Role/family synergy mapped for every proposal; engine rollout incomplete |
| Signature combat trait proposals | 27 | All covered by cross-family boss test directions; none automatically granted |
| World Boss gathering utility proposal | 1 | Worldwalker; **not** a combat trait or set bonus |

### Important: 204 concept IDs are not 204 approved new items

The generated `EQ2_LAUNCH_T1_...` member IDs are **stable, nonissuable placeholders for content planning**. When final item-by-item authoring is complete, approved existing Forge templates may be assigned with explicitly sourced migration, or new unique pieces may be introduced. **Do not add 204 to 169 and call them crafted items; do not count 48 as currently obtainable sets.** The live Forge legacy items and all real player copies are untouched. The existing 15 compact draft sets should not silently disappear or become 63 guaranteed launch sets; their final role is a separate item-level reconciliation decision.

## Playstyle palette for T1–T4 boss tuning

| Set family | Role | Intent | Candidate boss pressure to test |
| --- | --- | --- | --- |
| Oathplate | Tank | Defense, HP, timed guard | Survive honest direct-hit cast windows |
| Citadel | Tank | HP, shield efficiency, party protection | Team multi-hit pulses without infinite shields |
| Bloodsteel | Tank | Offense + strictly budgeted reflection | Original post-shield HP-hit windows; 0.1% boss HP / 5s shared cap where relevant |
| Vigilhide | Tank | Evasion + Tenacity | Distinguish avoidable attacks from scripted unavoidable hazards |
| Quickstep | Damage | Haste, Basic Attack Damage | Keep a global minimum action interval; no repeated proc recursion |
| Horizon | Damage | Accuracy, Crit Chance and Crit Damage | Evasive targets without allowing crit-on-crit loops |
| Blackscript | Damage | Hex/DoT Potency and Ability Damage | Elemental DoT/resistance/cleanse phases, not physical bleed abuse |
| Breakerforge | Damage | Penetration, direct Ability Damage, burst | Armor-resilient enemies with counterable burst windows |
| Brightweave | Support | Credited class heals and shields | Party healing demand that rewards effective, not overhealing |
| Stormthread | Support | Tempo, Tenacity, ability windows | Control recovery and pacing without infinite cooldown resets |
| Rootshield | Support | Elemental Ward, shield + party reduction | Group elemental mechanics, no uncontested shield stacking |
| Echohide | Support | Effective heal echo and sustain | Sustained damage with anti-recursion |

Set thresholds may independently grant server-approved **set effects** when the player has owned, equipped, valid exact pieces, but **never automatically issue rare item signature traits**. At most two authored combat traits are selected from **separately obtained, eligible special gear**. Further traits on worn items remain dormant.

The full 17-affix proposal includes Attack%, Defense%, Max HP%, Haste, Crit Rate, Crit Damage, Accuracy, Evasion, Penetration, Ward, Shield Strength, class Healing%, Hex/DoT Potency, Tenacity, Ability Damage%, Basic Attack Damage% and Reflect Damage%. Ordinary Forge's current 12-name roll table **does not directly equal** this final 17-affix policy; old ambiguous Potency stays blocked until defined.

## Completion gates — no false launch readiness

1. **Single signed source**: reconcile actual set IDs, role/slot/tier membership, old 15 IDs, 169 original templates, 11 shared weapon families, four Hewing Axes, six potential rare blueprint items and all source ownership. No missing or duplicated items, off-slot Forge roll combinations, silent set rewrites or double quality/rarity scaling.
2. **Obtainability**: each launch set's actual intended thresholds have enough authored unique pieces, recipe and/or elite/dungeon/party/world acquisition, drop tables and source-validated server claims. Dungeon/Party/World unique rewards stay chest/drop only where policy requires. Crafting uses gathered/refined materials plus meaningful combat drops; economy preserves market demand without excessive mandatory grind.
3. **Executable mechanics**: balance every 2p/3p/4p/6p set threshold using exact source-event provenance and approved final caps; finish 17-channel affix integration and appropriate authored signature trait handlers. Reflect must share its 5s boss ceiling, no proc-on-proc, unbounded healed HP, instant full HP grants, or double-use of temporary buffs.
4. **Trusted character build**: data persists via real privileged character, bank, inventory and Forge item-instance receipts with idempotent reward settlement; never activate by a client-supplied flag or synthetic verification callback.
5. **Benchmark before bosses**: test 9 classes × 18 specialization builds × T1–T4 actual rarities/qualities × no/partial/full set × 0/1/2 permitted special traits × gem sockets × companion/boon combinations. Compare kill rate, hit source events, effective mitigation, heals, tank threat, combat duration and party-role contribution. Use the same seeds against all six regional bosses, dungeon tier variants, party events, World Boss and Guild PvE.
6. **Playable content**: confirm 48 intended launch tiered families are actually item-source backed and beatable, including role-relative fairness and rare gear overlap, before treating the initial 2.0 as content complete. Do not quietly downgrade the 48-scope ambition to 15.
7. **Presentation and release**: show actual pixel-art mobile screens/themes for owner approval **before** any user-facing UI redesign or theme implementation. Full server/client parity, strict CI, staging Postgres/Edge concurrency, Android regressions and economy QA. No 1.0.x release or production activation until independently signed off.

## Evidence and current limitations

New hidden sources `equipment-expanded-launch-registry.ts` and `equipment-expanded-set-synergy-review.ts` import real source catalogues and produce **review-only evidence**. Their tests check no fabricated ids, 48 set concepts, 204 nonissuable member identities, 108 unfinished bonus choices, and parity with the actual 17-affix/28-trait review JSON. They have no gameplay API route, no item mint/recipe registration, no current HP/stat write, and no numeric set effects.

**This integration consolidates source branches and locks the expanded launch scope. It does NOT yet fulfill the item-authoring, combat-implementation, or balance/release gates above.** 

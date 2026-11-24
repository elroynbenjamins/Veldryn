# Veldryn 2.0 — Equipment × Combat measurement plan and release acceptance (review v1)

**21 November 2026. Proposed metrics, NOT observed game balance, CI success or user-approved coefficients.**
**Isolated draft documentation only — no changes to production, staging, 1.0.x, mobile UI, item RNG, reward policies or live encounters.**

[Core rules contract](./CORE_EQUIPMENT_COMBAT_VISION_V1.md).

## 1. Build a real, repeatable baseline

A benchmark is a **source-integrated encounter with real server-authored tier/level/class skill definitions, legal exact-copy gear, real Enemy 2.0 kit, fixed seed and verified server event order**. Fake 100-damage hit loops, synthetic stat tables and 10,368 abstract matrix rows may validate contracts, but are **not** evidence of combat parity or win rates. Store `rulesetVersion`, source branch/commit, exact gear+skill+enemy+companion hashes, seed, starting health/resources, mode and credited result.

### Fixed cohort grid

| Dimension | Cases needed |
| --- | --- |
| Character | All 9 canonical classes × 2 valid specs = **18** identities |
| Tier and level | T1–T4 at tier-entry, middle, and upper realistic level (verify actual gates) |
| Equipment | Same-tier baseline Common; median Rare; high-quality Rare; median Epic; best legitimate Mythic; protected legacy conversion |
| Source | Ordinary gear; legal 2/3/4/6 set; rare blueprint; Fishing signature; Dungeon/Party chest; no gear or gems as controls |
| Traits | 0, 1, 2 legal active; intentionally invalid third/duplicate/other-character/banked trait; unrestricted-vs-one-offense variants as separate policies |
| Enemies | 8 archetypes normal/elite, 6 handcrafted regional bosses, real T1 authored teaching kits and a no-trait control |
| Context | Solo, 1 Tank+2 Damage+1 Support dungeon, Q-Mode/Echo, all-Damage/flexible Party Event, World Boss, guild participation |
| Resources | Actual class cooldown/resource cycle, no tonic and approved one tonic/one heal where mode permits; companion and no-companion |
| Status RNG | At least 100 stable per-cohort seeds for distribution; special seeds for each cast/phase/proc branch, with same-seed replay parity |

Do **not** multiply these dimensions into a single impossible Cartesian job. Run a **paired baseline** (same seed/snapshot with one measured variable changed), then orthogonal stress and targeted boss+party cases. Publish coverage by dimension and a list of uncovered intersections.

### Minimum instrumentation per simulation

- Total real-time and simulated-time encounter length; idle world actions/h and credited eligible kills/h.
- First hit vs total hit; basic vs class direct vs DoT vs companion vs generated damage; effective DPS, burst P95, crits, misses, action count and resource/cooldown use.
- Max HP, shield grants/absorbed, *actual HP lost*, effective healing, overheal, survival, deaths, wipe reason, time below 30% HP and healing potion usage.
- Normal mitigation from Defense, Ward, flat/percent equipment defense, Glassfin 3% signature, partial set and skills, plus explicit bypass from true/phase damage.
- Proc counts by **source item / original action ID / trait ID**, active windows, cooldown suppression, secondary damage proportion and reflection shared ledger consumption.
- Boss phase time, individual telegraph interrupts/counter reactions and fallback usage; phase HP locks; unexpected kill/wipe above threshold.
- Authenticated expected reward receipt count (exactly 0 on fail, 1 on success according to mode), repeated-seed and lost-response replay results.
- CP alongside effective damage/survival to flag any drift; CP never substitutes for these outputs.

## 2. Candidate numerical acceptance envelopes

**None of these thresholds is approved or measured; they are review starting points.** If a legitimate class spec fails, investigate mechanics rather than blindly buffing/nerfing to make everyone identical.

| KPI | First review target | Interpretation |
| --- | --- | --- |
| Same-role solo effective damage | Most specs within ±12% of role median at equal real investment | Differences in burst, DoT, sustain remain intentional |
| Tank/Support world kill pacing | ~75–90% of median Damage-role eligible kills/h at matched tier, provided better sustain/utility | Avoid non-viable slow crafting/combat resource farms |
| High-quality Rare vs low-quality Epic | Frequent meaningful overlap in *at least one role-relevant performance dimension* | Not a promise equal all stats; test actual rarity policy |
| One authored combat trait | Typical ~1–4% **average** increase to its niche metric, or a meaningful but infrequent survival save | Avoid 1–4% hard cap on momentary burst or a life-saving proc |
| Two equipped trait sources | No recurring proc chain; added value should have diminishing/cadence bounds | Decide whether two offense traits can remain legal |
| Reflect (all defenders) | Per original hit ≤1.5% defender HP; enemy total ≤0.2% HP/5s, **regional boss ≤0.1%** | Check full-party shared ledger, not per-Tank budget |
| Basic/ability roll separation | No damage channel cross-activation | One original basic hit gets Basic% only; class direct skill gets Ability% only |
| Haste/crit/evasion | No permanent cast starvation, invulnerability, 100% guaranteed ordinary crit or evade via legitimate build | Set approved soft/hard caps **after** inspecting full legal builds |
| No proc recursion | Zero generated-hit trait, gem, leech, resource or class-action reentry | Exact event-provenance test; not performance test |
| Replay parity | Same source snapshot+seed gives identical events/outcome+reward receipt | Include reconnections and retries |
| Wipe / boss logic | Zero unwarranted success/failure before actual HP/end-state completion | Especially boss casts around 70%/35% and Endurance retry |
| Legacy isolation | Byte-for-byte identical 1.0.x combat results with V2 unissued/disabled | Mandatory before any feature-branch promotion |

### Proposed starting class interaction hypotheses (not number promises)

- **Ironwarden (Sentinel/Warlord):** reliable guard and original direct counter; Riposte at most once/8s, no Guard/resource from counter itself.
- **Bastion (Fortress/Guardian):** strongest consistent shield/ally survival, controlled low DPS cost, no infinite shield refresh.
- **Dreadguard (Bloodbound/Harbinger):** hit-to-heal/weakening trade-off; health conversion cannot self-proc.
- **Wayfinder (Deadeye/Pathfinder):** accuracy/crit/precision, avoid boss-evasion bypass and guaranteed burst.
- **Ravager (Executioner/Berserker):** large cooldown burst vs haste/tempo path, no permanent haste lock.
- **Hexweaver (Cursebinder/Voidcaller):** typed DoT/hex vs direct skill; physical Bleed excluded from Hex Potency.
- **Knife Dancer (Bladedancer/Shadowblade):** fast combo/evasion, misses/target switch reset gear Sword Dance as designed.
- **Dawnkeeper (Lightbringer/Sunwarden):** real effective ally healing, moderate damage, no overheal-triggered procs.
- **Stonecaller (Earthwarden/Runeshaper):** shielding/tempo and one nonstacking Thunder Totem, pulses at 2/4/6 seconds; totem ticks cannot mint class resources/procs.

## 3. Scenario matrix for balancing the surrounding game

| Test | Reference player composition | Enemy/mechanic/goal | Pass evidence |
| --- | --- | --- | --- |
| Early T1 solo | Nine roles at valid T1 entry with plain gear | Eight teaching monsters; no random hidden trait; early physical & magic | Credible hit/damage, no 0-damage softlock; viable role clear times |
| T2 solo | Plain-to-Rare and 0/1 legal traits | Swift/Stonehide/Venomous; basic and skill channel counterplay | Real hit rates, typed DoT, viable gear and class alternatives |
| T3 solo | Mid-quality Rare/Epic and different gem builds | Elite 2-trait combinations, control and armor | No invulnerable evasion, no endless heal, clear source-only proc budgets |
| T4 solo | High-quality Rare/Epic/Mythic; 0/1/2 selected traits | Burst/Hex/Regeneration/elite; six crafted signatures where tier applicable | No tier leakage, strong rare gear competitive in a niche |
| Six regional bosses | Each of 18 specs at appropriate reachable tier | Boss A/B per region, 70%/35% phases, interrupts+fallback | Per-boss phase ledger, reasonable wins/fails, no reflect/invuln bypass |
| 4-player Dungeon | 1T/2D/1S with realistic gear+companion and one consumable/run | Regular nodes, elites, normal boss, Endurance | Threat/heal uptime, reasoned wipes, reward and Marks receipt parity |
| Dungeon boon interaction | Baseline and every valid source-owned boon/artifact combination | 16/14 proposed catalog, including 6 hooked/3 blocked reactions | No unsupported grant, one choice/room, no double reflect or secondary proc |
| Q-Mode / Echo | Same valid team snapshot and seed | Disconnect, saved Echo snapshot and response retry | Determinism, ownership, no post-snapshot gear rewrite |
| World Boss | Individual and many actors, all available characters per account | 5-day prep, 2-day battle, 3 total attempts; large target HP | Shared reflect boss caps, fair contribution, unique attempts/rewards |
| Party Event | Four Damage vs mixed classes | 7-day saved loadouts and boss scaling | Flexibility survives, no forced class gate, scaling avoids unfair spikes |
| Guild PvE | Multiple members and roles | Shared world combat mechanics with guild rewards | No duplication, contribution correctness, no proc source overflow |
| Production preservation | 1.0.10/1.0.11 saved equipment, gems, tools and dungeon runs | Upgrade simulation, legacy-only calls, missing V2 authority | Item custody and historical outputs identical until explicit migrated encounter |

## 4. Economy follows verified combat, not hypothetical kills/hour

Once the cohort kills/h distribution is measured, recompute eligible normal/elite kill volume at T1–T4 for the *actual* world drop rules. Distinguish authored rare chance from legacy normalization (currently some sub-100% monster drops are multiplied by 0.5×0.95 before settlement). The 0.25% proposed T4 scarce material may be 0.11875% in those cases. Evaluate P50/P90/P95 supply time for 1, 3, 5 and 10 equipment crafts at low/median/high real kill rates; do not treat 150/300/900 kills/h synthetic stress profiles as observed telemetry.

Measure gathering→refining XP/h separately from assembly attempt rate and Gold/material sinks. Require combat pieces in normal equipment, and scarcer drops only for appropriate tier/quality gates. Do not solve scarcity by bypassing combat requirements via an alternate recipe. Verify `SUNSTONE_INGOT` conflicting formula, missing source IDs, T1/T3 pre-unlock enemy drops and `GLASSBOUND_DUST` before publishing recipes.

Six candidate Fishing/Dungeon signatures: T2 Riverthorn/Heartwood, T3 Oasistide/Scorpionstrike, T4 Glassfin/Riftfang. Fishing supplements original catch; Dungeon catalysts require one successful authenticated completion receipt (not failed runs, Marks purchases, merchant, or Player Market). No release of 1%/0.8%/0.6% fishing, 24%/18%/15% dungeon material or existing elite blueprint odds until source permissions/weekly run rules and ownership are approved.

## 5. Security, economy and compatibility gates

Each required gate must have an attached *exact head* CI result and/or staging transaction evidence; an authored test, queued run or synthetic callback does not pass:

1. **Single gameplay catalogue** for 169 vs earlier gear templates; canonical class/spec/skill manifest; real owned set composition; all 17 named affixes with version/unit/source mapping and approved slot-legal totals.
2. **Frozen item ownership** across all five account characters, bank, inventory, equipment, Forge pouch/ready and marketplace; no duplicate ID, stale banked item, claim-after-switch theft or copy-25 bypass.
3. **Source authorization** for equipment, skills, companion, gem, enemy, boss and room choice; 2 active signatures bound to selected exact items, one semantic ruleset; negative tests on hostile forged input.
4. **Genuine encounter authority**, not fake test callbacks: locked seed, player+gear+skills+HP, enemy kit and damage events, Phase 70/35%, source idempotence, room votes and combat state replay.
5. **Cross-system limits:** Reflection shared across tanks/boons, Bleed/DoT source refreshing, effective ally shield/heal-only triggers, event-provenance from original vs secondary hits.
6. **Complete trait coverage** (28 design choices are not automatically executable), 3 pending Dungeon 2.0 procs, all 18 specialization mechanics and 6 authored boss kits.
7. **Benchmark report** with P50/P95 TTK, real DPS/idle kills/h, role survival/healing and unmaskable counterplay; approved coefficients by tier before scaling other modes.
8. **Mode-specific settlement**: solo, Dungeon/Endurance/Echo, World Boss per-account attempts, Party Event, Guild PvE rewards all exactly once on success (and zero on failure); no unverified player writes.
9. **Approval and UX:** actual in-game screen/theme visual review accepted before coding UI redesign; mobile compactness + existing larger Samsung layout; localization, accessibility and Android staging QA.
10. **Release hold until approval:** staging migrations, rollback, fresh full integration/legacy CI, auth and 2.0 flags, Google Play versioning and coordinated rollout all signed off independently. Do not deploy documentation.

## 6. Proposed next engineering sequence

**Design gate (this PR)**: review this shared rules contract, source-of-truth decisions and candidate target envelopes. No tuning or implementation implied.

**Integration A:** reconcile catalogue/set/source-version and frozen Forge/Combat affix proof; add real versioned transition/adapters behind disabled V2 gates. Add strict fixture for max-legal affix loadouts; reject malformed, never earned.

**Integration B:** take latest compatible Skills 2.0, Equipment trait engine, Enemy/Boss 2.0 and Dungeon source receipt branches, rebase/reconcile to one private candidate without changing `main`; complete missing event hooks and real DB authority; preserve legacy.

**Balance C:** run real class×tier×archetype and six-boss matrices with data logs; tune player gear/class stats first, enemy AI/damage and phased boss HP second, Dungeon/World Boss/Party Event third, rewards/economy fourth. Iterate until metrics and counterplay are stable.

**Release D:** present screenshots/themes to owner, obtain gameplay coefficients approval, run staging + Android + full exact-head CI, sign off one major 2.0 release. In-progress 1.0.x remains isolated.

**Reference facts must not be mistaken for verification:** hidden engine has individual targeted green runs in some PRs, but separate stacked branch tests, synthetic matrices and queued CI do not prove this combined system is integrated, secure or balanced.

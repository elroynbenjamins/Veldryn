# Equipment 2.0 × Combat/Enemies 2.0 — Affixes & signature traits (review v2)

**21 November 2026 · REVIEW ONLY (v2) · Not approved, not enabled, not merged into `main`.**
This is a proposal for the shared **combat-effect vocabulary and boundaries**, not a new live loot table. The machine-readable, audited source for the proposal is [`eq2-combat-affix-trait-proposal-v1.json`](./eq2-combat-affix-trait-proposal-v1.json). Values below are proposed **per individual equipment item** and must be approved/tuned after real class, enemy, gem and market simulation.

## Why this pass is necessary
- Hidden Equipment/Crafting 2.0 presently rolls **12 Forge roll names** (`armor`, `maxHp`, `ward`, `tenacity`, `critRate`, `critDamage`, `haste`, `penetration`, `accuracy`, generic `potency`, `abilityDamage`, `healingPower`), while the private Combat 2.0 bridge supports **13 different IDs** and currently has no direct adapter for Tenacity or direct Ability Damage.
- Combat 2.0's 13 existing channels include Attack%, Evasion%, Shield Strength%, and Hex Potency, which are **not equivalent** to the existing generic Forge rolls. Do not rename or auto-convert a stored item without its true meaning and source version.
- Existing **169 normal T1–T4 templates / 338 routes**, 6 unreleased elite/boss blueprint candidates, versioned immutable exact-item rolls, original-crafter ownership, 25-copy protection and release OFF state stay exactly as they are in the hidden branch.
- **Basic Attack Damage%** and **Reflect Damage%** are proposed as two separate, *new* channels; they are not generic Attack%, ability damage or true damage immunity. Both require new engine adapters and no legacy-item auto-conversion.
- The separate private Combat 2.0 set catalogue is not yet reconciled against the 15 partial T1–T4 equipment sets. Don't quietly mint extra full sets or reuse legacy 2/4/6/8/10 bonus triggers.

## Decision A — Three layers, not one giant stat pool

1. **Base item attributes**: Attack, Defense and HP, created by the server from the exact item ID, tier, material profile, rarity and 0–100 quality. A frozen craft receipt is already rarity/quality-scaled: **never multiply it again**.
2. **Random bonus stats (affixes)**: 17 tightly defined, numerical increases selected by the secure Forge/reward roller and frozen on that instance. One per type per item; slot eligibility and role weighting, but **no arbitrary class-locking**. Eligible classes/weapon hands use the canonical equipment family policy. Haste/Crit/Evasion/accuracy use percentage points when increasing a chance/rate; damage/HP/armor/healing use relative percentages.
3. **Signature traits**: intentionally authored **event-driven effects** attached to rare-blueprint pieces and appropriately sourced dungeon/party equipment, plus the World Boss's separate gathering utility. Normal crafted equipment has **no random combat trait**, even at Mythic. Higher rarity already improves base stats, roll strength and affix count; layering unrestricted procs would make Mythic mandatory and inflate both power and market prices.

**Sockets** remain independent: one Stat Gem + one Effect Gem as allowed by the server's immutable exact-copy and sidecar policies. Gems do not secretly count as random affixes and do not get their effects from item quality. **Set bonuses** are separately authored threshold rules, not traits or random affixes.

## Decision B — Proposed 17 ordinary affixes

The existing **13 Combat 2.0 IDs are retained verbatim**. Add `tenacity_pp`, `ability_damage_pct`, `basic_attack_damage_pct` and `reflect_damage_pct` behind future explicit engine adapters; none may activate without the approved class/enemy rules and deterministic event simulation.

| Stat | Combat meaning | T1 range | T2 | T3 | T4 | Equipment-affix cap |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Attack% | Raises trusted Attack / attackPower | 0.5–1.0 | 0.8–1.6 | 1.2–2.2 | 1.5–2.6 | 12% |
| Defense% | Raises base+gear Defense | 0.6–1.2 | 1.0–2.0 | 1.5–3.0 | 1.8–3.5 | 18% |
| Max HP% | Raises max HP; no free full heal | 0.8–1.6 | 1.2–2.5 | 2.0–4.0 | 2.5–4.5 | 24% |
| Haste (+pp) | Action pacing, minimum action interval | 0.3–0.9 | 0.5–1.3 | 0.8–2.0 | 1.0–2.2 | 12 pp |
| Crit Rate (+pp) | Direct hit critical probability | 0.2–0.7 | 0.3–1.0 | 0.5–1.5 | 0.6–1.7 | 8 pp |
| Crit Damage% | Critical damage multiplier | 1.0–2.5 | 1.5–3.5 | 2.5–5.5 | 3.0–6.0 | 22% |
| Accuracy (+pp) | Eligible hit chance only | 0.2–0.7 | 0.3–1.0 | 0.5–1.5 | 0.6–1.7 | 8 pp |
| Evasion (+pp) | Dodge eligible hits, not boss inevitables | 0.2–0.6 | 0.3–0.9 | 0.4–1.2 | 0.5–1.4 | 7 pp |
| Penetration (+pp) | Ignore armor mitigation, not shields | 0.4–1.1 | 0.7–1.7 | 1.0–2.5 | 1.2–2.8 | 12 pp |
| Elemental Ward (+pp) | Mitigates fire/ice/arcane/nature/shadow | 0.2–0.7 | 0.3–1.0 | 0.5–1.5 | 0.6–1.8 | 10 pp |
| Shield Strength% | Buffs generated ally/self shields | 0.6–1.2 | 1.0–2.2 | 1.6–3.3 | 2.0–3.8 | 18% |
| Healing Power% | Class heals; excludes leech/tonics | 0.8–1.8 | 1.2–2.8 | 2.0–4.5 | 2.5–5.0 | 22% |
| Hex/DoT Potency% | Shadow/arcane/nature DoT, no direct hits | 0.5–1.3 | 0.8–2.0 | 1.2–3.0 | 1.5–3.4 | 16% |
| Tenacity (+pp) **new adapter** | Shortens eligible ordinary status durations | 0.8–1.6 | 1.2–2.6 | 2.0–4.0 | 2.5–4.5 | 24 pp |
| Ability Damage% **new adapter** | Direct damaging class skills, not attacks/DoT | 0.8–1.8 | 1.2–2.8 | 2.0–4.5 | 2.5–5.0 | 22% |
| **Basic Attack Damage%** **new adapter** | Ordinary direct attacks only (not skills, DoTs or procs) | 0.8–1.6 | 1.2–2.6 | 1.8–3.8 | 2.2–4.5 | 19% |
| **Reflect Damage%** **new adapter** | Return a portion of enemy-origin direct HP damage actually taken | 0.3–0.7 | 0.5–1.0 | 0.7–1.4 | 0.9–1.8 | 8% |

The source JSON specifies **which slots** may roll each ID and validates that even *every eligible slot rolling its maximum T4 value* stays below the corresponding **equipment-only** cap. Cap values are **not** ceilings for class passives, sets, pets, gems, buffs, and temporary status effects combined. Combined ceilings require a future separately approved Combat 2.0 policy. Do not let a legitimately minted item become unusable because a cap was set below a legal roll sum.

Unit rule: **2.0% Attack** means multiply Attack by `1.02`; **+2.0 pp Crit Rate** means add `0.02` to crit probability. **+5% Basic Attack Damage** changes a direct basic hit of 100 into 105 damage before other approved hit stages, while a **5% Reflect Damage** roll returns up to 5 damage from an enemy hit which actually removed 100 player HP, subject to the shared reflection safety budget. Basic Attack Damage does not amplify class skills, pets, DoTs, gem/trait procs or reflected attacks. The hidden Forge's `percent=2.0` is **not** the Combat bridge's fractional `value=0.02` until a trusted, version-tagged adapter converts it. This fixes a potential hundredfold interpretation error.

**Current rarity counts preserved (no reroll changes in this design):** T1–T2 Common/Uncommon/Rare/Epic 1, Legendary/Mythic 2; T3–T4 Common/Uncommon/Rare 1, Epic/Legendary 2, Mythic 3. Existing quality curve Q0 −25% to Q100 +25% of item primary stats remains a separate step. T4 can have distinct proposed magnitudes; **do not silently update hidden numeric roll policy before balance approval**.

### Old hidden affix names: future migration contract
- `armor` → `defense_pct` **only** after confirming Defense semantics; `ward` → elemental `ward_pp` **only** if the old roll was specifically elemental; `tenacity` and `abilityDamage` require new combat adapters.
- `maxHp`, `critRate`, `critDamage`, `haste`, `penetration`, `accuracy`, `healingPower` need source-version/unit checks, not a textual rename.
- **Generic `potency` is ambiguous** between damage, skill power, healing and DoT. It has **no automatic migration**. Quarantine behind version-aware compatibility until owner-approved mapping or a preservation rule exists.
- Attack%, Evasion%, Shield Strength%, Hex Potency%, Basic Attack Damage% and Reflect Damage% require new explicit roll-source registration in the equipment generator; they are not currently rolled under the new IDs. The current server item manifest and immutable receipts are unchanged in this proposal.

## Decision C — 28 proposed signature traits

| Trait | Role / source hint | Deterministic effect | Cooldown |
| --- | --- | --- | --- |
| Bastion Heart | Tank / blueprint, dungeon | Survive a hit at ≤40% HP → gain shield worth 6% Max HP | 30s |
| Hardened Resolve | Tank / blueprint, party | Before a hit ≥10% Max HP → reduce that hit by 8% | 20s |
| Thornbound Riposte | Tank / dungeon, party | Return 8% actual hit damage, capped at 1.5% own Max HP and the shared retaliation limit | 15s |
| First Light | Damage / blueprint, dungeon | First successful direct hit +7% damage, once per encounter | Once |
| Ruthless Edge | Damage / blueprint, party | +5% direct damage vs target at ≤30% **pre-hit** HP | 14s |
| Quickened Focus | Damage / dungeon, party | Direct class ability crit → next direct ability +5% within 6s | 20s |
| Graceful Mend | Support / blueprint, dungeon | Direct heal ally at ≤40% pre-heal HP → +7% healing | 15s |
| Warding Hands | Support / blueprint, party | Next eligible ally shield created +7% | 18s |
| Soothing Light | Support / dungeon, party | Direct heal removes 1 **dispellable ordinary** debuff | 35s |
| Worldwalker | Utility / World Boss | Best equipped copy grants 2% gathering action-time reduction | Passive |

### Six additional Tank traits

| Trait | Trigger and provisional effect | Cooldown |
| --- | --- | --- |
| Bulwark Oath | Reduce first eligible direct enemy hit by 12% | Once/fight |
| Frostbound Guard | On elemental direct hit, next elemental hit faces +5 pp Ward within 8s | 28s |
| Unshaken | Shorten one ordinary debuff by 12%; boss exceptions respected | 25s |
| Guardian Aegis | Self-shield grants another vulnerable ally a 3% own-Max-HP shield | 30s |
| Vital Reserve | After surviving a hit at ≤25% HP, heal self 3% Max HP | 45s |
| Counterbalance | Successful dodge grants +6% to next direct basic hit within 7s | 20s |

### Six additional Damage traits

| Trait | Trigger and provisional effect | Cooldown |
| --- | --- | --- |
| Echoing Strike | Direct class hit echoes 8% of its damage, capped at 20% own Attack Power | 30s |
| Hunter's Precision | Missing an eligible attack grants +4 pp Accuracy to next direct attack | 18s |
| Sword Dance | Every third consecutive direct basic hit on the same target gains +5% damage | 9s |
| Spell Fang | Elemental skill direct hit inflicts a brief nonstacking DoT worth 3% of damage | 25s |
| Deep Cut | Critical basic hit inflicts a brief physical Bleed worth 4% of damage | 24s |
| Armor Breaker | Class-skill crit reduces target armor 3% for 5s, only 1.5% against bosses | 28s |

### Six additional Support traits

| Trait | Trigger and provisional effect | Cooldown |
| --- | --- | --- |
| Mending Echo | Direct heal also restores a different injured ally for 8% of effective healing | 24s |
| Resonant Barrier | Extend the duration of one class-created ally shield by 2s | 22s |
| Restorative Bloom | Direct heal applies an unstackable 4s HoT equal to 5% of effective healing | 26s |
| Fortified Prayer | Shielded ally takes 4% less from next physical direct attack within 8s | 30s |
| Swift Recovery | After an ally exits ordinary control, grant +3 pp Haste for 6s | 25s |
| Beacon of Courage | Direct heal grants +4% to recipient's next direct basic attack within 8s | 26s |

**Total: nine Tank, nine Damage, nine Support and one World Boss gathering utility trait — 28 choices.** They are *authored possibilities*, not 28 items, released loot sources, or immediately working combat code. Rare blueprint and special chest provenance remains mandatory.

Numbers above are intentionally modest, **provisional**, and not a promise of new crafting, loot or trading. Source hints indicate permitted provenance categories, **not** actual published item assignments. The six T2–T4 rare-blueprint candidates are still locked. Dungeon/Party signature gear remains chest/drop-only, not obtainable from NPC, Guild, Dungeon or World shops, sigil exchange, or Player Market. World Boss gear preserves its existing gathering specialization and the previously defined chest gear odds; don't modify the 1% chest gear hit in this review.

### Avoid proc clutter and forced meta
- An item can bear **one authored signature trait** at most. A character can wear multiple trait-bearing pieces, but chooses **up to two active combat traits per saved build**. Additional equipped traits remain explicitly *dormant*, while all normal item stats, affixes and legal set counts still apply. This avoids rejecting ownership or equipment simply because a third trait item was worn.
- The active selection must be bound to server-confirmed **equipped item instance IDs**. Swapping, trading, salvaging or Bank-moving a source invalidates its trait activation; it does not duplicate or automatically transfer its proc.
- At most one copy of the same trait may be active. A global **1-second cooldown** per actor prevents burst proc storms; the selected build-slot order provides a deterministic tie-break when both fire on the same event.
- **Reflect Damage%** is a separate passive retaliation channel and shares a **single output budget** with Thornbound Riposte. It uses *only real HP lost after armor, Ward and shield absorption* from a direct attack by the original enemy. It excludes fully absorbed hits, DoT ticks, environmental hazards, boss phase/telegraph effects, companions, other players, self-harm and reflected/trait-generated hits. Maximum per original attack is **1.5% of defender Max HP**; maximum cumulative output is **0.2% of target Max HP per five seconds**, tightened to **0.1% for regional bosses**. No reflect-on-reflect, crit, lifesteal, gem activation or trait activation. These output ceilings are distinct from the **8% maximum sum of Reflect Damage affix rolls** and must be enforced on the server.
- Every trait event must use **server combat time**, a frozen new-encounter ruleset and seeded RNG if chance is later introduced. Existing traits in this design are deterministic and have their own cooldowns; no silent client rolls.
- **No proc triggers another proc**, trait damage cannot crit or leech, and Effect Gem proc hits cannot trigger traits. DoT ticks, potions, companion actions and reflected hits do not impersonate direct player hits. Internal event provenance is preserved for replay.
- Enemy shields have the current experimental **10% max HP** limit; player shields use their separately approved player limit. Boss-unique locks, mandatory telegraphs, invulnerability and un-dispellable statuses are immune to generic Evasion/Tenacity/Cleanse shortcuts. `Soothing Light` only removes statuses explicitly tagged dispellable by the server.

**No client UI/theme design is authorized by this contract.** A later visual-review mockup should show the two active trait selections compactly within the existing equipment/build inspection, clearly label any dormant traits and expose cooldown/eligible-event text without popups or sudden layout jumps. Implement only after appearance/themes are approved.

## Decision D — One source-owned calculation and enemy counterplay contract

Proposed new-run resolver order:

```text
authenticated account + exact equipped instances + active build preset
 → class/level-only actor (never a legacy gear-computed actor)
 → class skills, talents, specialization and companion-independent baselines
 → exact frozen equipment primary stats (no second rarity/quality scaling)
 → approved tier-specific set bonuses (not live legacy set thresholds)
 → version-tagged 17-ID affixes (unit conversion once)
 → permanent Stat/Effect Gem sidecars, deduplicated by item and receipt
 → validate selected signature trait sources (up to 2), freeze encounter snapshot
 → server-owned Enemy 2.0 archetypes, traits and boss telegraphs
 → deterministic combat event stream + bounded trait trigger hooks
 → one authenticated replay-safe reward/Inbox/Gold/XP settlement
```

The new contract gives explicit strategic matchups without hard-counters:

| Enemy archetype / mechanic | Relevant equipment choices | Safety rule |
| --- | --- | --- |
| Guardian, Stonehide, Fortified | Penetration, direct skill damage | Never ignores all Defense |
| Swift, assassin, Elusive | Accuracy, Evasion, HP | Unavoidable boss casts remain unavoidable |
| Caster, Hexer, Warded | Elemental Ward, Tenacity, class healing | Physical/true damage is not reduced by Ward |
| Venomous, Rending, Chilling | Tenacity, dispellable-only Soothing Light | Enemy debuff cap remains 3 per source in 2.0 |
| Executioner / low-HP burst | Max HP, shields, Hardened Resolve | No self-resurrection from damage after death |
| Regenerating, support / prolonged boss | Direct-damage build, First Light or Ruthless Edge | Execute damage bounded; no infinite offense loops |

**Do not apply any of this to current live dungeon or existing in-flight combat receipts.** New world/party/guild/solo/dungeon 2.0 encounters require one authoritative versioned snapshot, and all nine classes, the eight enemy archetypes and six regional bosses require balance QA.

## Integration checklist before approval/promotion

- [ ] Owner approves/revises the **17 labels, gameplay semantics and slot eligibility**. Tier values and caps above are *test proposals*, not a final balance decision.
- [ ] Owner approves signature-trait **two-active-build** model, 28 starter trait designs and rare-source policy. No UI changes until actual compact screen/theme review.
- [ ] Audit hidden 12-roll to Combat 13-ID mismatch; agree versioned **non-destructive** handling for old `potency`/`ward`/receipts.
- [ ] Build new **server-only** typed adapters for Tenacity, Ability Damage, Basic Attack Damage and Reflection and persist numeric unit/version, not just a display string. Explicitly register Attack/Evasion/Shield/Hex/Basic/Reflect roll sources; update both hidden client/server manifests together.
- [ ] Resolve T1–T4 partial set catalogue vs separate Combat 2.0 T1–T5 set families; never invent full 6-piece eligibility where items don't exist.
- [ ] Balance 9 classes × both specs × 4 launch tiers × all enemy archetypes + six bosses with equipped/unequipped trait deltas, basic-attack/skill separation and five-second reflection ceilings and defensive/healing/DoT loop bounds. Observe P50/P95 damage and time-to-kill, companion interactions and real market/crafting scarcity.
- [ ] Unify combined gem+set+class+affix caps so **every legitimate gear combination** remains loadable; fail closed for forgeries, not earned items.
- [ ] Keep 2.0 flags OFF until authenticated item ownership, Bank/Pouch/Inbox custody, single-account CAS, game-state isolation, old-item preservation, staging rollback and versioned replay all pass.
- [ ] After approval, implement in the hidden 2.0 branch only, with exact-head CI and a coordinated Combat/Skills/Enemies deployment—not a 1.0.11 change.

### Cross-branch references
- Hidden Equipment 2.0 server roll table: `backend/src/server/equipment/equipment-crafting-v2-rolls.ts` in #1382/#1495/#1552 stack.
- Hidden Combat 2.0: `backend/src/server/combat/v2/equipment-affixes.ts` in #1377.
- Enemy prototype source and status safety: #1376; current dungeons remain unchanged.
- Read-only audit: `node tools/validate-eq2-affix-traits-review.mjs`; regression: `node --test tools/tests/eq2-affix-traits-review.test.mjs`.

**This proposal intentionally changes zero live drop rates, RNG, equipment stat receipts, rarity bands, attack formulas, release flags, shop items, skills, databases or user-visible screens.**

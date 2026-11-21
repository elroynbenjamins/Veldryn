# Veldryn 2.0 — Signature crafting ↔ Skills, Gems, Enemies and Bosses interface

**21 November 2026. Source-derived review, synthetic battle-envelope QA only. NOT live.** Adds no real combat events, item definitions, Fishing drops, Dungeon material grants, SQL, UI or player data changes. Parent: stacked review-only PR #1549, itself on the unmerged 2.0 economy branch.

## A. What was checked

Read the **separate** private Combat/Skills 2.0 parent branch `feature/combat-v2-foundation-contract-20261118` and pinned six actual Git blob SHA identifiers in `signature-combat-interop-contract-v1.json` for:

- `backend/src/server/combat/engine.ts`: accuracy and crit before damage; Defense/penetration, ward, shield and actual HP damage; timed DoT and heal/shield emissions.
- `v2/equipment-affixes.ts`: 13 server-sourced affixes; Hex Potency modifies shadow/arcane/nature DoT but **not physical DoT**; Ward reduces nonphysical/nontrue damage.
- `v2/skill-effects.ts`: Skills 2.0 character passive and variant effects.
- `v2/reactive-passive-runtime.ts`: deterministic reactive triggers and cooldowns, **but not an equipment-instance signature trait resolver**.
- `v2/specialization-styles.ts`: 9 class identities and 18 specialization designs.
- `v2/unified-equipment-encounter.ts`: source-owned equipment snapshot compilation.

These code files live in **another unmerged draft**, not this equipment-economy branch. A specific reviewed blob may be superseded by the ongoing Skills 2.0 (#1551), Enemies 2.0 (#1430) and Gems 2.0 work. Before actual implementation, refresh the pinned contract against the intended canonical integration commit and review all changed hooks.

## B. Signature trait integration surface

| Signature | Server event that should own it | Stacking/exclusion | Read-only fixture proof |
| --- | --- | --- | --- |
| **T2 Riverthorn Cut** | Successful, positive-HP-damage direct physical ability event | 6% chance, 12% of hit over 4 sec, 12-sec ICD; never a proc from a proc | Seeded Bleed event simulation |
| **T2 Heartwood Retort** | Incoming enemy direct hit which actually removes 15%+ max HP | 2% further direct nontrue reduction *on subsequent hits only*, 5-sec window, 18-sec ICD | Heavy-hit trigger, active window and true/DoT exclusions |
| **T3 Oasis Afterglow** | Actual positive credited ally heal or shield | Target gets 2%-max-HP extra shield, 18-sec caster-wide ICD; never zero-overheal, self, HoT tick, gem/pet echo | Synthetic ally event stream, dedup and recursion guard |
| **T3 Scorpionstrike Bleed** | Successful *physical skill* hit, not every basic hit | 8% chance, 18% hit over 4 sec, 10-sec ICD | Seeded physical-skill-only stream |
| **T4 Glassfin Guard** | Owned and validated equipped item snapshot, at incoming direct damage calculation | Persistent **3%** after Defense/Ward; true, DoT and environmental damage excluded; one signature defensive family | 1,000 eligible direct damage becomes 970, bypass categories remain 1,000 |
| **T4 Riftfang Bleed** | Successful original physical hit owned by exact item/actor | 10% proc, 24% of original hit over 4 sec, 10-sec ICD, half vs boss, one roll per ability use | Seeded per-use Bleed simulation and boss coefficient |

### Event ordering and double-scaling rules

The incoming hit is fully resolved with the class baseline, owned quality/rarity, equipment affixes, socketed Stat/Effect Gems, Skills and enemy Defense/Ward once. The **credited positive direct hit** becomes the signature Bleed basis. The signature then creates a separate *physical* periodic effect with its own provenance, **not another direct hit** and not an eligible callback for additional signature procs. No second conversion of ATK%, critical chance, rarity multiplier, Hex Potency or shield strength is allowed.

The existing engine's timed DoT record is a starting type contract, **not proof that equipment-created physical Bleed, same-source refresh, fixed total-damage amount, boss resistance or immunity is fully supported**. It is particularly important not to have a class-authored Hexweaver or Knife Dancer DoT overwritten by equipping Bleed gear. An exact instance/attacker effect-key and independent status namespace are needed.

The incoming 3% guard should not pretend to negate true damage or damage-over-time. The 2% triggered Heartwood buff starts **after** the heavy hit; the triggering hit is never retroactively reduced.

The existing reactive skill callbacks do not by themselves solve the Oasis event trigger: gem-created Mercy shields, Renewal HoT, secondary variant shields, and class passives need distinct source tags, positive effective credits and a server-issued action sequence. A repeated client ability ID is **not** an action-use ID. The cooldown state must belong to the owned equipment trait with encounter timing in milliseconds, not the device clock.

### Source-bound item rules

The six candidate signature items remain new, separately identified future crafts. No signature catalyst opens the existing six rare blueprint-only crafts, nor makes Dungeon/Party/World Boss chest-exclusive equipment craftable. Dungeon completion materials remain account-bound and receipt-idempotent; Fishing side drops are additional catches and require verified server payout, with marketplace trade review outstanding. All actual work remains behind OFF 2.0 release flags.

## C. 486 synthetic cases, and what those numbers mean

Added `tools/evaluate-eq2-signature-matrix-v1.mjs`, which runs:

**9 classes × 2 specializations × 3 tiers × 3 enemy kinds × 3 hit-cadence profiles = 486 seeded *fixtures*.** Each case composes the corresponding tier's only available signature offense with its same-tier defensive or support variant. This explicitly corrected an earlier hypothetical comparison that applied the T4 Guard effect to lower-tier rows.

Profile assumptions are intentionally artificial: 120/180/240 second enemy windows, successful direct-hit damage normalized to 100 (not true final damage), physical-hit eligibility and hit cadence defined only for QA, 90% generic hit probability. The real Combat 2.0 engine, owned stats, actual boss mechanics, cooldown/DoT settlement and RNG are not imported.

| Tier | Normal synthetic potential Bleed / eligible physical damage | Elite | Boss |
| --- | ---: | ---: | ---: |
| **T2 Riverthorn** | ~0.41% | ~0.51% | ~0.23% |
| **T3 Scorpionstrike** | ~1.08% | ~0.96% | ~0.54% |
| **T4 Riftfang** | ~1.35% | ~1.59% | ~0.79% |

The *uncooldowned theoretical expectation before status refresh/immunity* for T4 is 10% chance × 24% damage = **2.4% of eligible hit damage**, halved to **1.2%** on bosses; individual short-seed cases can be above or below this expectation. Actual delivered damage may be lower if Bleed is refreshed, resisted, or targets die before the fourth tick.

For T4 Glassfin, the fixture labels 75% of incoming damage as eligible direct nontrue damage: it prevents 3% of that eligible part, equivalent to **2.25% of all incoming fixture damage**. It does **not** grant 3% against every damage source, and no T2/T3 row receives that T4 effect.

T2 Heartwood has zero uptime against the intentionally below-threshold normal fixture hits, activates only on eligible heavy elite/boss hits, and shields only subsequent damage within its 5s windows. T3 Oasis produces shields only for support-role rows with positive credited heal/shield events; this is a fixture distribution, **not a restriction that other classes cannot equip Support-oriented gear**.

**These are sanity envelopes, not balancing approval.** A genuine final nine-class/two-spec tier-by-tier normal/elite/6-boss/dungeon benchmark is still required, using real item-affix/gem snapshots, physical hit counts, elite patterns, DoT immunity and party healer cases. Targeted enhancement/potion, effect-gem, companion and pet synergies remain unresolved.

## D. Tests and acceptance gates

- `tools/tests/eq2-signature-tank-support-preview-v1.test.mjs` checks source-wide ally shield cooldown, no overheal/self/gem/HOT proc, heavy-hit-only activation, next-hit-only protection and true/DoT exclusions.
- `tools/tests/eq2-signature-matrix-v1.test.mjs` checks exact 9/18/3/3/3 coverage (486), deterministic replay, no cross-tier effect leakage, caps, pinned source hashes, nonnegative effects, and fail-closed modified flags/fixtures.
- These run **only** in the isolated `Equipment 2.0 economy review-only audits` GitHub Actions workflow. No real backend Combat 2.0 packages are imported.
- All live combat/enemy/dungeon/gem routes, player inventory and production flags are unchanged.

**Blocking before any implementation:** user review of mechanics and numerical values; authoritative trait event/cooldown statuses; mixed-effect set/gem cap policy; original account/character item ownership; fishing and Dungeon source receipts; server-only RNG; staging transaction/rollback; exact-head backend/mobile CI and local Android QA. UI appearance/themes need their own user approval first.

**No main merge, no deployment and no unreviewed UI implementation.**

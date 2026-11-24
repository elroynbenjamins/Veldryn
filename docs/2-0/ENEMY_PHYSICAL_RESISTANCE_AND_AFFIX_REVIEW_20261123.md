# Veldryn 2.0 — physical Enemy & Boss counterplay + equipment-affix pass 2
**23 Nov 2026 | HIDDEN REVIEW ONLY | Source-gated; not merged, deployed, or UI-approved**

## Enemy profiles: no weak generic archetype assumptions
The real existing Enemy V2 system persists authored kits and issues a cryptographically scoped authority after verifying the base-to-prepared snapshot and locked run. This pass creates a separate, WeakMap-branded physical-resistance authority that can ONLY be issued from the existing Enemy V2 authority and the exact same encounter input. It refuses unsigned client tags, stale combat, bosses outside the six canonical IDs, role mismatches or incorrect region boss-profile tags.

The six *candidate* values are deliberately modest (6–10%) and remain hidden behind a source-authorized path; **the current frozen Forge bridge still uses neutral resistance, because its generic Enemy adapter is not the persisted-kit pipeline**. Do not change that fact without integrating verified Enemy V2 persistence/custody. Values need real 9-class × 18-spec cross-gear/equal-CP simulations and owner balancing approval.

| Canonical boss ID | Slash | Pierce | Blunt |
|---|---:|---:|---:|
| BOSS_EXP_ROOT | +8% resist | +10% resist | −10% vulnerable |
| BOSS_EXP_BELL | +10% resist | +10% resist | −8% vulnerable |
| BOSS_EXP_SOLAR | +8% resist | +10% resist | −6% vulnerable |
| BOSS_EXP_SPHINX | neutral | −6% vulnerable | +8% resist |
| BOSS_EXP_BELLBEAST | −6% vulnerable | neutral | +6% resist |
| BOSS_EXP_CANTOR | +6% resist | +6% resist | −8% vulnerable |

Normal/elite are neutral until their exact species, authoritative region and persisted kit family are authored. Other tactical approaches (debuffs, interrupts, magic, vulnerability windows, shields, class builds) remain viable.

## Affixes: candidates, NOT the current item roll pool
Existing Forge source has 169 pinned items with 1–4 tiers; the proposed 204 planned T1–T4 set members and rare T5 sets are not mint-authorized. Eligible offensive subtype roll only on weapons whose own source-authored BASIC subtype includes it. Support caster wands cannot randomly receive useless physical damage. Defensive subtype resistance can be considered on helmet/chest/legs/boots/cape/offhand. Damage roll T1 1–2%, T2 1.5–3%, T3 2–4%, T4 2.5–5%; defense roll T1 .5–1.5%, T2 .75–2%, T3 1–2.5%, T4 1.25–3%. Values are design candidates and must remain in the unchanged total random-affix count/CP budget, NOT added for free or stacked above legal counts. T5–T9 values await corresponding canonical server source.

No changes to current 13 original class/combat affix semantics, extra Forge rolls, rarity/quality curves, pre-existing copies, set identities, innate T5 percent bonuses, trade/crafting or Player Market rules. This review has `PHYSICAL_AFFIX_ACTIVATED_V2=false`, no RNG API and no item mutation.

## Integration / QA gate
- First pass #1676 must pass strict TS and physical authored Rune Bash test with real variant-specific compiled IDs.
- Pass 2 type tests must show forged/missing Enemy authority rejected, cross-seed digest rejected, all six canonical boss IDs matched, old/unsigned enemy tags insufficient and typed affix ranges eligibility consistent.
- A future combined source adapter must issue the enemy profile only after real persisted Enemy 2.0 kit verification, compose with authenticated Forge originals, and run paired same-CP/same-seed damage comparisons. No profile activation without it.
- No live build, staging/production DB mutation, item issue, market claim, or UI/theme changes; full coordinated 2.0 launch gate remains.

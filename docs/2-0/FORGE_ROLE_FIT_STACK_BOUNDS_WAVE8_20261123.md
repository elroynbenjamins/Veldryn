# Veldryn 2.0 — Wave 8: class-role affix fit and physical-slot stack risk (23 Nov 2026)

**HIDDEN SOURCE/ENGINE QA ONLY.** Based on Wave 7 #1692 (Wave 6 #1689, Wave 5 #1687, Wave 4 #1682).
No `main` merge, deployed app, new equipment minted, PvE stat changes, approved loot weights, Combat Power policy, player-market admission, UI, themes or account/Supabase writes.

## Question answered: do mechanically legal proposed Forge affixes actually fit the classes?

The Wave 5 pool covered all 340 physically required class/tier/slot cells, but **that was only a compatibility proof**. The new source-grounded review classifies each currently suggested original Forge stat as:

- **Role core**: Tank: Armor/Max HP/Ward/Tenacity; Damage: Crit Rate/Crit Damage/Haste/Penetration/Accuracy/Ability Damage; Support: Healing Power/Ward/Max HP/Tenacity/Haste
- **Shared utility**: Tank Haste/Accuracy, Damage defensive/survival options, Support Armor/Accuracy
- **Role crossover**: offensive affixes on Tank/Support and Healing Power on pure Damage, only when mechanically supported. These may be valid counter-build choices **if deliberately authored**, never mandatory by accident.

These are review labels only, not changes to class equip eligibility or combat effects. Generic Forge Potency remains quarantined.

**Critical high-rarity issue:** T3/T4 Mythic rolls **three distinct stat IDs**. Some currently suggested role/slot pools have fewer than three core+utility choices. In those slots, at least one role-crossover stat is **mathematically unavoidable regardless of numeric weights**. A higher-weight core stat cannot fix insufficient variety. Existing Forge item identities must not be altered or reused to silently widen eligibility.

Key cases:

- **Tank gloves:** no role-core original Forge stat is currently permitted by Combat's glove-slot table. The candidate list can fit the 3-roll rule only by mixing utility and offensive cross-role stats. A pure defensive/tank-quality Mythic glove is impossible without a separately authored source-to-Combat eligibility correction.
- **Tank signature weapon/accessory slots:** check 2H/paired grip, innate Tank baseline and offensive tradeoffs. A forced DPS affix may undermine Tank build identity; avoid treating a mathematically available stat as universally desirable.
- **Damage helmet:** currently role-core count may be zero, yet a helmet full of defensive/shared-utility stats can be **a useful intentional counter-build choice**. A core count of zero alone is not equivalent to a broken item. Review it separately.
- **Support cape:** current Ward/Max HP/Haste options can provide role-aligned utility even with the generic Potency alias quarantined.
- **Support amulet:** Healing Power is role-core, but the 3-roll eligible pool may still force offensive/crossover stats. Provide genuine supportive alternatives if that is not intended.

## Wave 8 implementation

`equipment-forge-affix-role-balance-review.ts` derives roles from the real Skills 2.0 contract, source item identity and hand occupancy from the real pinned 169-template Forge manifest, stat eligibility from the actual Combat percent-affix table and Forge-to-Combat bridge, max stat magnitudes from original T1–T4 Forge ranges, and exact multi-roll probabilities from Wave 7. It returns:

- all **30** proposed role/slot pools with core, utility, crossover labels, intentionally defensive-only flag and high-tier forced-crossover flag;
- all **36** class × tier complete *source-template* loadouts, each with nine or ten actual physical slots, including 20 genuine paired/2H reserved offhands;
- the number of T3/T4 physical slots whose high-rarity three-roll pool **forces** crossover;
- deliberately loose *maximum roll stack* per stat for each full class/tier configuration. These are bounds (one maximal stat roll per eligible physical slot), **not actual observed distributions, final stat caps, approved combat balance, or fully minted persisted equipment**;
- two contrasting, explicitly unapproved Wave 7 scenario probability reviews for single-roll and T3/T4 Mythic stat crossover.

`__tests__/equipment-forge-affix-role-balance-review.ts` validates the 30 policies and 36 source-only loadouts, source IDs, role-fit classification, required grips and absent separate offhands, cross-role mandatory cases, original Forge RNG immutability, and Combat's actual `compileTrustedEquipmentAffixesV2` behavior. **QA-only** role-appropriate cases execute original Combat 2.0 engine channels: Tank haste and ability damage, Damage helmet defense, Support cape ward, Support amulet healing, additive two-item Ward and Max HP stacking, failed cap / duplicate application, and same-seed deterministic replay through the actual Combat engine.

All Combat-channel test actors and approved-policy placeholders are **explicit isolated QA fixtures**. They are not mint-provenanced, authenticated item loadouts or final class Skills builds. A successful engine replay only checks the mechanical plumbing: never treat it as a gameplay win-rate forecast.

## Recommended approval decisions (NOT executed)

1. **Tank gloves/other forced crossover pools:** either approve intentionally hybrid offensive Tank gear (and clearly communicate this at higher rarity), **or** separately author slot eligibility and exact Forge-affix identity for genuine Tank counterplay (e.g. Ward, Tenacity, Armor or carefully controlled shield strength). Do not change the Combat slot matrix by stealth and do not invent new stat magnitudes.
2. **Support amulet:** favor a choice between Healing Power and true support/survival utility at high rarity; do not mis-map `potency` to a healing/hex stat. Any further Ward/Tenacity/Max HP eligibility is a separate reviewed server rule.
3. **Damage helmet:** preserve intentional defensive versatility, with no assumption that every Damage piece must roll offensive stats.
4. **High rarity:** require at least three mutually distinct **approved role-appropriate or intentionally approved hybrid** choices for a T3/T4 Mythic piece. Derive exact inclusion rates *without replacement* as in Wave 7; no mandatory crossover unless explicitly justified.
5. **Full loadout caps:** only approve numeric percentages after comparing projected stat caps, Skills 2.0 throughput, battle duration, enemy counters, boss mechanics and set bonuses. Protect build diversity; do not force a class, companion or one stat to be mandatory.

## Stop-ship

The preview candidates, numerical weights, stacked stat caps, original set/innate % effects, real account-locked 10-copy Combat source, legacy-market provenance and final UI/themes remain **unapproved**. Original Forge generator and generated copies unchanged. Broad mobile/Edge/Skills/Dungeon/Economy CI failures remain separate gates. The coordinated Veldryn 2.0 release is still blocked.

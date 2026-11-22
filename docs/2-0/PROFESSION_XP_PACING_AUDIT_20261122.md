# Veldryn 2.0 — Profession XP Pacing Audit

**22 November 2026 · Hidden design/economy review only · NO LIVE CHANGE**

## Source data (verified)

The existing server-owned Equipment V2 \`equipment-crafting-v2-skill-xp.ts\` mirrors the live Smithing/Tailoring progress policy:

\`oldNext(L) = floor(floor(90 * L^1.42 + 35 * L) * 1.6)\`

The newer hidden Skills/Classes V2 profession target \`profession-progression.ts\` currently proposes:

\`draftNext(L) = ceil((120 + 28*(L-1) + 0.85*(L-1)^2) / 10) * 10\`

All figures below are **cumulative XP from profession Lv1**, assuming the same XP awarded per successful training action. They are not real observed XP/hour or an approved experience-rate migration.

| Level reached | Existing V33 XP mirror | New draft target | XP reduction / implied speedup |
|---|---:|---:|---:|
| 10 | 16,308 | 2,290 | 7.12× |
| 22 (T3) | 112,659 | 10,920 | 10.32× |
| 35 (proposed T4) | 346,619 | 30,590 | 11.33× |
| 45 (T5) | 635,544 | 55,280 | 11.50× |
| 55 (T6) | 1,030,650 | 90,180 | 11.43× |
| 65 (T7) | 1,540,914 | 136,980 | 11.25× |
| 75 (T8) | 2,174,389 | 197,380 | 11.02× |
| 90 (T9) | 3,371,560 | 317,150 | 10.63× |
| 100 (Master) | 4,344,061 | 418,970 | 10.37× |

**Finding:** the current experimental curve would slash total XP by about **90–91%** through most of the T3–T9 progression if reward XP remains unchanged. This is likely too aggressive for Veldryn's skill mastery and Player Market economy, despite the approved goal of smoother profession-only training.

## Recommended progression target, still subject to user approval

Keep the *tier gate proposal* (T1=1, T2=10, T3=22, T4=35, T5=45, T6=55, T7=65, T8=75, T9=90), but **do not adopt** the existing 10× faster XP curve.

Use a provisional comparison target **~1.5–2.0× easier than current**, not 10×. As a concrete review model, retain the shape of the existing power curve while changing the pre-multiplier from 1.6 to 0.9:

\`candidateNext(L) = ceil(floor(90 * L^1.42 + 35 * L) * 0.9 / 10) * 10\`.

This works out to roughly **1.78×** less accumulated XP than the current live curve. At T3 (22), ~63,490 XP; T4 (35), ~195,160; T9 (90), ~1,896,990; Lv100 ~2,444,070. It is an illustrative **design candidate**, not a committed runtime XP rule.

The crafting overhaul should make training more convenient *primarily by adding many useful gathering → processing → crafting training actions* and better XP/resource efficiency. Full equipment must still require substantial refined inputs, Gold, time, scarce combat components and sometimes rare blueprints. Low-resource training items should not flood the tradeable finished equipment economy.

### Economy verification required before any change

1. Measure early/mid/endgame XP/hour for Mining, Woodcutting, Fishing, Herbalism, Smithing, Tailoring, Cooking, Alchemy and Enchanting with real activity durations.
2. Simulate 1/5/10/30/60 active minutes per day, effects of tools, Forge training, optional primary focus and resource sinks; do not make professions mutually mandatory.
3. Record cumulative raw material, rare combat drop, blueprint, Gold and inventory turnover costs to reach each tier.
4. Confirm a combat Lv1 crafter can obtain *all* mandatory ingredients legitimately via Player Market, trade or verified commission escrow.
5. Measure how many tradeable completed T2/T3/T4 items a player can create per XP level; ensure training recipes differ from scarce finished gear.
6. Validate existing players' XP and level migration for fair treatment, no rollback of earned unlocks and no inflationary retroactive award.
7. Confirm server-owned profession XP curve is pinned once for both mobile preview and backend and upgrade is *versioned*. Two simultaneous live level curves are not acceptable.

### Current implementation status / safety

- **Classes/Skills 2.0 hidden foundation:** independent T1–T9 profession level/checks exist, XP target is currently an unmounted draft function. \`characterLevel\` continues to be combat-only.
- **Equipment 2.0 hidden Forge:** own-profession-only crafting authorization was corrected in hidden #1600 and merged into expanded Equipment 2.0. Its XP awarding intentionally retains the existing live Smithing/Tailoring curve; this avoids retroactive level distortions.
- **No XP curve, profession level, recipe, reward, player inventory or live endpoint is changed by this report.** The game owner's explicit balance approval, replay/market tests, UI/theme review, and one coordinated 2.0 launch remain gates.

# Veldryn Combat + Equipment 2.0 — Physical Subtype Balance Pass 4
**23 November 2026 · HIDDEN REVIEW BRANCH · NO RUNTIME RELEASE OR MOBILE THEME CHANGE**

## Source readback
Physical Blunt, Slashing and Piercing are authored in the pinned 169-equipment draft, with 36 T1–T4 class weapons and 12 shield-bash candidates. The Combat 2.0 signed source path, Enemy 2.0 signed boss candidate profiles and read-only subtype affix eligibility live in the stacked hidden PR chain #1674 → #1676 → #1684. No old/pre-2.0 equipment is upgraded or made tradeable; all source-less T5–T9 rolls remain blocked.

## Pass 4A: A true replacement budget, not free extra affixes
- Existing hidden Forge original rarity bands authorize 1–3 random affixes per item (depending on rarity and tier). This pass **imports exactly those source bands**, their original role-weighted roll pool and per-tier ranges from `equipment-crafting-v2-rolls.ts`. A new read-only helper exports whether an existing role can roll an original stat; it does **not** alter RNG, probabilities, quality, base-stat multiplier or original affix counts.
- An eligible new physical-type damage or resistance affix is a **nonissuable new-mint candidate** that substitutes for precisely one original role-eligible, tier-correct roll. A proposal must specify which original slot is replaced. It cannot change a frozen existing item, invent a rarity, reroll on client, add bonus rolls or bypass class/slot restrictions.
- Offensive subtype proposals remain limited to matching eligible physical weapon identities. Hexweaver wands cannot roll physical damage. Shield-bash abilities are independent authored effects; no automatic offhand outgoing bonus.
- Defensive subtype resistance proposals remain limited to helmet/chest/legs/boots/cape/offhand. All proposals retain unchanged 10-slot character inventory rules and calculate *potential* aggregate relative contributions only; **no actual stats are granted**.
- Candidate original T1–T4 damages: 1–2%, 1.5–3%, 2–4%, 2.5–5%. Candidate defensive 0.5–1.5%, 0.75–2%, 1–2.5%, 1.25–3%. These are *replacements*, not automatically added on top of current 13 Combat V2 channels or 12 pinned Forge roll identities. `PHYSICAL_AFFIX_ACTIVATED_V2=false` and `PHYSICAL_AFFIX_REPLACEMENT_REVIEW_ONLY=true`.

## Pass 4B: 432 physical counterplay scenarios on the actual deterministic Combat engine
- 9 source-pinned class weapon identities × 2 actual class specialization IDs × T1–T4 × 6 authored regional boss IDs = **432 isolated matched scenarios**, compared both with neutral types and with signed boss candidate subtype resistances.
- Every actor uses the **same synthetic HP, Attack, Defense, crit, accuracy, basic attack timing and RNG seed**, and physical subtype weights from their real source class weapon. This isolates the physical type effect instead of confusing it with class base stats.
- The comparator also runs the actual Combat engine and issues QA-only signed tokens. It checks deterministic replays, same miss/hit RNG, source-matched Blunt/Pierce/Slash multipliers and maximum candidate boss delta, with no implicit Blunt staff-caster nor wand physical bonuses. It covers 18 source-named specs but does NOT simulate specialization-specific skills/passives.
- **This is not an official equal-Combat-Power test.** Real class base stats, skills, companion bonuses, rarity/quality, set traits and CP composition have not been calibrated. Those require a production-source, versioned CP policy and approved enemy telemetry. No class counterplay percentages or provisional boss matchups are approved merely because this isolation test passes.

## Additional safety fixes in this pass
- The signed physical token cannot bind a different class's pinned weapon, even if a forged/QA caller passes a plausible copy ID. It still requires actual frozen Forge preflight in the real entrypoint.
- The pure physical multiplier validates **all three** outgoing and incoming subtype values, not just the subtypes used in the immediate attack, preventing malformed unused channels from surviving authorization.
- Existing engine hit/crit RNG, generic physical defense and penetration, DoTs, spells, reflection and extra trait echoes are unchanged.

## Release and CI gates
Run the hidden Equipment + Combat strict TS and source-composed tests:
```
pnpm --dir backend exec tsc -p tsconfig.equipment-combat-v2-launch.json
node backend/dist-equipment-combat-v2-launch/server/combat/v2/__tests__/equipment-physical-affix-budget-review.js
node backend/dist-equipment-combat-v2-launch/server/combat/v2/__tests__/physical-equal-stats-matchup-matrix.js
```
The broader Skills 2.0 workflow is independently failing with unresolved mobile import/module/rootDir errors. Those failures are tracked and not silently suppressed by this PR. Real 2.0 class+skill+companion CP, roll distribution, PvE boss data, source custody/craft/escrow, UI/theme sign-off, Player Market generation isolation and coordinated release approval still gate production.

# Combat 2.0 — first executable physical subtype pass
**HIDDEN; not merged to main; not deployed; engine integration only through the authenticated frozen Forge V2 adapter.**
Development child of EQ2 damage-type catalogue #1674.

- Physical remains the one existing damage channel. Basic attacks from real source-verified pinned T1–T4 weapons carry Slash, Pierce or Blunt weights. Same physical attack, hit and crit RNG; no extra attacks.
- Explicit authored direct physical variants (Rune Bash with verified shield, Fortress Rebuff and Citadel Slam with verified shield, Crush Guard, Sunder Blow, Windshot, Heartseeker, Scarlet Loop, Twin Fang) can override; otherwise inherit eligible weapon mix. No automatic type on spells, staff casts, physical DoTs or secondary trait/reflect/true damage.
- The authority token is scoped to a complete immutable encounter digest and mapped only from exact frozen Forge equipment evidence after the existing account/custody/claim preflight. No arbitrary client tags, arbitrary item IDs or invented forge affixes; identity and anti-duplicate checks are applied.
- Enemy resistance and outgoing subtype equipment bonuses are **neutral** in actual first-pass encounters. The resolver's pure balance tests support bounded -20%..+30% incoming and 0..+15% outgoing for future Enemy 2.0 kit and new authorizations; none are live or granted through crafted gear.
- No new physical subtypes for generic V1 or alternate V2 encounter entrypoints without the exact source authority; no changes to the existing 13-affix mint pool, existing rarity/quality scaling, item snapshots, set bonus authoring, crafting, market eligibility, guild, dungeon or live routes.
- No UI implementation before UI/theme approval. Real enemy subtype authoring, per-slot resistance rolls, CP adjustments, exact-source skill override reconciliation and benchmarked balancing are later passes.

## QA/run targets
`pnpm --dir backend exec tsc -p tsconfig.equipment-combat-v2-launch.json`
`node backend/dist-equipment-combat-v2-launch/server/combat/v2/__tests__/physical-damage-engine-authority.js`
`node tools/test-eq2-physical-subtype-catalogue-review-v1.mjs`

The new isolated tests use QA-only synthetic witnesses to exercise runtime logic, not a claim of authenticated live PostgreSQL identity/settlement. Existing frozen Forge source integration tests must remain green, and full workflows require release review.

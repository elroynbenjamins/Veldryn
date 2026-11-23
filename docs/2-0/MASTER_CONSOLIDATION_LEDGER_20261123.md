# Veldryn 2.0 — master consolidation ledger (Wave 1, 23 November 2026)

> **HIDDEN DEVELOPMENT ONLY — DO NOT MERGE INTO MAIN, DEPLOY, RUN DATABASE MIGRATIONS, ENABLE FLAGS, OR CHANGE UNAPPROVED UI/THEMES.** This ledger documents source integration, not release readiness.

## Consolidation strategy

Consolidate **each system's authoritative source and tests**, then reconcile **cross-system boundaries**, and finally run a **coordinated 2.0 release audit**. Avoid wholesale merges of diverged feature branches and avoid treating draft test fixtures as production item grants.

Current wave is based on real Equipment Forge → Combat source integration **#1665** (descended from #1661 and #1653). It is a short-lived development child, **not** a declaration that this branch has absorbed all Skills/Equipment/Crafting work.

## Wave 1: landed in this child branch

- Reconciled the **owner-approved 23 Nov refining input adjustment** from **#1668** against the actual Forge → Combat integration branch: Copper/Iron ore 3→5, Greenwood/Ironwood logs 3→4, treated Dunewood 4→5, reinforced Dunewood 5→6.
- Kept **one canonical live Sunstone recipe** (6 Sunstone Ore + 4 Dunewood → 3 ingots); the reviewed **2.0 proposal** is 8 ore per 3 ingots, **not** a second registered route. Glassbound Alloy remains 2 existing ingots + 1 Glassbound Dust.
- Ported all six source/review/test files. Five had exactly the same source blob on the two base branches; the sixth test file had independent changes. Merged **both** the refining-cost assertions and the existing `material_lot_quantity_mismatch` / `incomplete_material_lot_coverage` custody assertions without dropping either.
- The **48 planned T1–T4 sets / 204 members** and **746 draft recipe routes** remain review-only. All proposed new material grants, craft reservation commits and equipment mints remain unauthorized.

### Source-backed verification required at this exact head

The existing private workflow is `.github/workflows/equipment-combat-v2-expanded-sets-integration.yml`. Its real commands include:

- `pnpm --dir backend exec tsc -p tsconfig.equipment-combat-v2-launch.json`
- `node tools/test-eq2-48-set-source-reconciliation-v3.mjs`
- `node tools/test-eq2-material-origin-atomic-v6-v7.mjs`
- Independent Forge/Combat source, set identity, class/spec, negative custody and public-route import fence checks in the same workflow.

No tests are claimed passed by this document. Verify **PR checks at the new commit SHA**, not an ancestor, before promoting this child to the next hidden integration stage.

## System ownership and integration status

| System | Existing source of truth / review work | Unresolved consolidation boundary |
| --- | --- | --- |
| Skills & Classes 2.0 | Canonical hidden #1377; later tactics/replay #1655 → #1663 → #1666 | Port only source-owned tactical/event fixes into real Forge integration; do not replace the frozen-copy compiler with synthetic 10-slot QA gear |
| Equipment Forge / Crafting | #1598, #1653 and source-connected #1661 → #1665 | 169 original Forge items / 338 routes, 15 protected Forge sets / 42 pieces; 48 new sets / 204 members are **not mint-authorized**; 746 paths are previews |
| Profession & gathering economy | Independent profession logic in #1377; tool XP and innate percent drafts #1644; UI review #1672 | Additive same-skill tool XP rolls, final per-tool caps, recipe XP and skill independence must be settled server-side; do not import draft UI without owner visual approval |
| Refining | Owner-approved hidden #1668 **partially integrated in this wave** | New review costs are reconciled; canonical Sunstone recipe needs a separately approved versioned migration before activation |
| Combat & counterplay | #1377, #1637, real Forge bridge #1661 → #1665; alternative measured Skills fixtures #1666 | Source-specific Forge scaling; verified statuses/abilities, accurate set bonuses, ten slots, final CP and caps, boss cases and true persistence |
| Enemies & Bosses | Existing authored 2.0 bosses and deterministic replay in private Combat branches | Final 9-class / 18-spec balance and boss counterplay test at real final equal CP, not synthetic stat index |
| Multiplayer & Market | Planned integration dependent on unified 2.0 account/item authority | Persisted party/dungeon/world boss state and server-only rewards; market must reject all legacy/pre-2.0 gear even on resale, and verify mint/custody provenance |

## Required cross-system invariants (stop-ship)

1. **Versioned item identity:** distinguish authentic newly minted Equipment 2.0 physical copies from legacy equipment, `EQ2_LAUNCH_` concepts and stackable material IDs. No UI name, tag or item art can authorize mint, equip, trade or resale.
2. **One rarity/quality application:** real Forge `exactItem.baseStats` is **already scaled**. Apply base attack/defense/HP exactly once; never route through the Combat resolver for *unscaled* authored equipment.
3. **Authoritative affixes:** preserve actual source roll IDs, units and slot eligibility. Do not silently map the original `potency` roll to Hex/DoT, discard unsupported rolls, invent set effects or assume final approved caps.
4. **One transactional owner:** account/character session, Gold, materials (Inventory and Bank), queue, crafting XP, item claim, equipment custody, and idempotency must settle in authenticated serializable transactions. Synthetic verifier callbacks are **not** production account proof.
5. **Profession independence:** all profession tiers must be achievable without combat leveling or leveling another profession; combat-origin ingredients may be acquired through trade/commissions. Combat equipment *wear* gates remain separate from profession *craft* gates.
6. **No cross-system reward bypass:** bosses, dungeons, party events, future market, and commissions must use the same item generation and claim-provenance contract; combat simulation must never become an item grant authorizer.
7. **Release/UX fence:** no main merge, app/Edge activation, staging/production migration, or unapproved UI/theme runtime change from this consolidation. An integrated 2.0 launch requires owner signoff and staging rollback rehearsal.

## Next ordered consolidation passes

- **Wave 2: Skills ↔ real Forge integration** — compare #1666's observed counterplay/324-simulation analyzers against #1665's real-minted Forge bridge; port the smallest compatible source and tests without copying synthetic item authority. Verify deterministic replay and exact-head private CI.
- **Wave 3: Equipment sets / affixes / tool XP** — settle 15 protected and 48 draft set identities, source-owned innate % stats, full ten-slot custody and ambiguous Forge Potency policy. Reconcile #1644 tool XP stacking without adopting unapproved UI.
- **Wave 4: Profession, processing and craft settlement** — source registry for 14 unregistered materials, trade/commission supply, canonical Sunstone migration review, and real PG17 two-session ownership/CAS/replay tests.
- **Wave 5: Combat + Enemies/Bosses** — final policy-approved CP, tier/counterplay parity and persistent four-player simulation, followed by Dungeons, World Bosses, Party Events and legacy-excluding Player Market.
- **Final: master consolidation** — new-item lifecycle/market resale, economic simulations, mobile responsive UX/theme signoff, migration/rollback, exact-head Actions and full 1.x compatibility matrix.

**No individual draft's passing test, and no source-only branch reconciliation, constitutes 2.0 release approval.**

# Equipment + Crafting 2.0 — hidden implementation foundation

Created November 18, 2026. **Design preview only; not released or connected to settlement.**

## Shared release and migration safety
- Equipment 2.0 and Crafting 2.0 have one client flag: EQUIPMENT_CRAFTING_V2_RELEASED=false. Both aliases resolve to it.
- Separate backend fail-closed gate: EQUIPMENT_CRAFTING_V2_SERVER_RELEASED=false. No endpoints mount it yet.
- Player Market remains independently hidden. A preview quote cannot place an order or reserve listings.
- No edits to live item IDs, crafting recipes, progression, inventory, Combat Power, market, queue, or historical craft receipts.
- Do not enable either gate before server authoritative rolls, immutable item instances, gems/upgrades migration, synchronized version rollout, UI parity and staging smoke tests.

## Implemented behind the hidden gate
- Preview-only 1–2 stat slot profiles at equal weighted budgets; tier budget candidate is 1.08 times the existing per-slot anchor.
- Fixed proposed quality scaling from Q0 0.75x to Q100 1.25x. No arbitrary client rarity stat multiplier is used as an authority.
- T1–T4 proposed rarity odds/affix counts and inspectable stat-specific affix bands.
- Candidate assembly Gold anchored to T1/T2/T3/T4 chest values 400 / 1500 / 6000 / 12000 and current representative XP 198 / 522 / 840 / 1290, with +5% XP for set pieces. **Not production data.**
- Tier component/binder mapping using existing items.
- Deterministic, read-only material sourcing plans: self-gather, market, or hybrid; quote only explicit price/quantity listings. No fabricated market prices.
- Pure screen state: item overview, materials, possible rolls, set and queue, with priority CTA based on blockers. No real craft action can be invoked from this model.

## Next implementation passes before a 2.0 release
1. Authoritative shared equipment template IDs, class equip eligibility, exact T1–T4 set catalog and real recipe variants. Preserve existing 2-path legacy items.
2. Server-side secure rarity/quality/affix generation at craft completion, fixed receipt snapshots, deterministic retries, validation, audit, replays, instance-bound trading.
3. New native UI catalogue/detail/materials/queue/reveal screens wired to read-only preview data; compact accessible 360px layout and translations.
4. Real processing and crafting-cost dependency graph with reservation, self-source navigation, and future authenticated market quote/purchase flow.
5. Simulate T1–T4 classes against gear share targets of 17/45/14/14/10, enemy/boss 2.0 parity; inspect Gold income and actual economy telemetry before finalizing prices.
6. Staging tests covering inventory/bank, multi-character, enchants, gems, market protections, legacy migration, Gold charge/refund, race conditions, version gate and release rollback.

## Smoke test
Compile mobile core using the repository's TypeScript tooling, then run:
node .core-build/apps/mobile/tests/equipment-crafting-v2-hidden.js

The test asserts feature secrecy, budget conservation, one/two stats, rarity odds, quality behavior, affix bands, Gold/XP candidates, and no synthetic market prices.

## Continued pass: T1–T4 catalogue, recipes, armaments, server rolls and UX

- Hidden `equipment-v2-catalog.ts` defines 15 compact sets, 42 set pieces, 24 standalone pieces with stable `EQ2_*` IDs and two-stat-safe slot profiles. It does NOT replace legacy V33 ten-piece sets.
- Hidden `equipment-v2-recipes.ts` defines two material methods for each of 66 pieces: 132 unreleased route recipes. Methods keep Gold, XP, time, output and rarity odds identical while trading off primary and secondary regional materials. Accessories may use Smithing or Tailoring.
- Hidden `equipment-v2-armaments.ts` defines all nine class weapon archetypes across T1–T4, including class-specific optional offhands: 52 armament templates. **They do not have sellable/craftable recipes yet.** Two/dual-handed weapons absorb the offhand flat-stat budget; one-hand+offhand is budget equivalent.
- Hidden `equipment-crafting-v2-adapter.ts` reads existing Inventory, Bank, levels and queue for internal UI previews. It recommends the method with fewer unavailable material types, without silently changing a player's explicit choice.
- Unmounted `EquipmentCraftingV2Preview.tsx` renders stats, material shortages, Gold, profession XP, time, method choice, set bonuses and rarity possibilities with 44px interaction targets. It has no gameplay mutations.
- Hidden backend `equipment-crafting-v2-rolls.ts` contains an unmounted cryptographically secure server candidate generator, weighted role/slot pools, independent rarity/quality draws and nonduplicate affixes. It does **not** write a persisted receipt, authorize ownership, or debit currency.
- Client/server rarity odds, tier-specific affix counts and affix ranges are parity-tested. Unique gear CI also compiles and runs the new model test. Mobile UX CI checks hidden UI safety.

**Open requirements**: transactional server-side receipt persistence and replay, signed/verified recipe and character authorization, authoritative economy validation and market escrow, finished class weapon recipes, full migration audit, native player-facing screens with translation, combat simulations and staging parity. The independent market release flag remains off. Do not merge or enable any 2.0 release gate until these are complete.

## Transaction and mobile UX follow-up (November 18)

- Fixed a catalog import bug that collapsed full slot names to one-letter keys. Set-piece IDs are now unique with valid slots/profiles. This is guarded by catalogue and client/server parity tests.
- Server-owned pinned manifest: `equipment-crafting-v2-manifest.ts` stores 66 canonical templates and 132 recipes, including output, profession, inputs, Gold, XP, timing and level requirements. No caller-provided materials/prices/stats are accepted.
- Isolated transaction model: `equipment-crafting-v2-transaction.ts` validates trusted account/character state, level and profession, debit-on-start reservation across Inventory/Bank, exact queue slot scheduling, claim-after-finish, secret server RNG on claim, original-crafter XP/item ownership, 25-copy cap, request-ID replay and conflict handling. Input state remains immutable until an atomic commit.
- Server-only tests cover Gold and material conservation, forged command rejection, stale version, cross-character claims, early claim, duplicate claim, max-copy refusal, queue capacity and gate refusal.
- Focused backend TypeScript target `tsconfig.equipment-v2.json` and equipment CI step added to compile and execute transactional tests.
- Mobile catalogue `EquipmentCraftingV2CataloguePreview.tsx`: virtualized searchable 66-item list, tier and role filters, materials-ready view and 44px touch targets.
- Internal workshop `EquipmentCraftingV2WorkshopPreview.tsx` connects the catalogue and read-only detail screen, without any gameplay write actions. Mobile UX CI includes static safety/interaction checks.
- Explicit cross-catalogue parity check rejects drift in item profile, slot, tier, role, profession, required materials, Gold, XP, time and level floors. Input ingredient IDs must exist in live resource definitions.

**Not implemented yet**: PostgreSQL-backed SERIALIZABLE/row-locking adapter, persistence of reservation & exact item instances, server-route authorization and authenticated account binding, legacy inventory migration, complete class-specific weapon crafting, release combat calculations and skill/monster integration, real market purchase/escrow, translated production UI, art, and successful CI/staging verification.

All changes are source-only on a draft branch. No production DB changes; do not activate either V2 release gate or merge the draft as a release until blockers close.

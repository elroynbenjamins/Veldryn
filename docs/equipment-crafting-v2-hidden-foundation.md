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

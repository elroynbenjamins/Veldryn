# Novice character system implementation

## Source decisions

- Source: Character System Codex Pack v4, runtime assets v1 and Start Character Equipment Design v5.
- Canonical class/set names come from runtime `classes_runtime_map.json` / `first_crafted_sets.json` and workbook `Starter_Sets_Roadmap!A3:E11`.
- Workbook `Starting_Loadout_Crafting` has shifted class labels; do not use those labels as mappings. `Early_Crafting_Progression!A3:E7` supplies the staged progression concept, not numeric recipes.
- Older contracts describe full sets as creation grants; design v5 supersedes that. Creation remains base outfit + one basic primary weapon.
- Helmet/chest/gloves/legs/boots/weapon are required for all sets. Ironwarden, Dreadguard, Dawnkeeper, Hexweaver, Knife Dancer and Stonecaller also have an offhand. Knife Dancer uses the newer v5 second-blade option rather than the old dual-blade single-slot contract.
- Bastion's tower shield remains its primary weapon. No duplicate offhand shield is granted.

## Implemented flow

1. Create a character; review names its first crafting goal.
2. Open Skills → Novice set. Inspect the gameplay equipment path and piece list.
3. Gather Copper Ore/Greenwood Logs and hunt Moss Rats for Moss Fiber; collect activity rewards.
4. Craft pieces with Inventory-first/Bank-second materials. A successful craft records the piece in optional `character.craftedNoviceItemIds`.
5. Equip individual items from Inventory, or choose Character → Equip owned novice set. Bulk equip consumes owned Inventory/Bank pieces, returns replaced gear to storage, and fails atomically if anything is missing or replacement storage is full.
6. Home and Character display the class emblem. Novice equipment changes stats only and does not unlock character artwork.

## Provisional prototype balance

The source pack does not define recipe costs/stats. These are explicit implementation assumptions, kept together in `src/content/novice-sets.ts`:

- All pieces: Smithing 1, instant craft, 20 Smithing XP, 2 Moss Fiber.
- Chest and weapon: 8 Copper Ore + 8 Greenwood Logs. Other pieces: 4 of each.
- Weapon costs 20 gold; each other piece costs 10. Full set costs 70 or 80 gold (six/seven pieces).
- Character levels: chest 1; weapon/offhand 2; gloves/boots 3; helmet/legs 4.
- Identity pieces require chest craft history; gloves/boots require weapon history; helmet/legs require boots history. Missing sold pieces may be recrafted.
- Primary attack: previous basic weapon +2. Chest defense 2, other non-weapon pieces defense 1. HP: chest 6, legs 4, head 2. Bastion weapon defense 2, Dawnkeeper weapon defense 1, Stonecaller weapon HP 5. No set-stat bonus.
- Recipes and items are class-restricted. Existing general crafting remains available in Skills → Crafting.

## Appearance limits

The earlier starting and first-crafted character PNGs were retired because their identities were incorrect. Novice sets remain gameplay equipment and have no character-skin registration. The class emblem is shown until a future full skin has correct, user-confirmed male and female references.

This full-set-only rule is authoritative for every equipment set. Equipping or previewing individual pieces never changes the character appearance. A future approved skin may unlock only after the user owns every required item in that set.

## Save and test contract

Save schema stays v5; old saves default to empty crafting history and receive no free equipment. Crafted history, gear, presentation and full-set recognition survive load. Crafting is pure and failed crafts do not record progress. Bulk equip preserves item counts and clamps HP without free healing.

Tests: all nine classes × both presentations, 60 recipes/items, class/level/prerequisite checks, bank material consumption, storage failure atomicity, item conservation, repeat equip, legacy migration and save reload. Appearance tests require the emblem fallback until a correct full male/female skin is approved. Full TypeScript, regression suites and Android export are required. Phone layout/interaction QA remains outstanding.

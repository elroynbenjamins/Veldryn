# VELDRYN Content Mapping

The workbook is the design source. Runtime files are implementation representations, not independent design authorities.

| Workbook concept/sheet | Offline runtime target | Future export target | Rule |
|---|---|---|---|
| Classes / class skills | `apps/mobile/src/content/classes.ts` | `content/classes.json` | Stable class IDs; do not rename IDs for display text changes. |
| Monsters / regional monsters | `src/content/monsters.ts` | `content/monsters.json` | Keep region, level, combat and loot references data-driven. |
| Items / regional equipment | `src/content/items.ts` | `content/items.json` | Stable item ID; slot/profile/rarity are fields. |
| Recipes | `src/content/skills.ts` initially | `content/recipes.json` + `recipe_ingredients.json` | Split recipes from profession definitions as content expands. |
| Quests / assignments | `src/content/quests.ts` | `content/quests.json` | Requirements/rewards use IDs, not display-name matching. |
| NPCs/dialogue | not required yet | `content/npcs.json`, `dialogue.json` | Add only when quest UI needs them. |
| Boss definitions | `src/content/monsters.ts` initially | `content/bosses.json` | Boss gates are progression authority. |
| Pets / Combat Units | out of offline MVP | dedicated JSON exports | Do not stub power into current solo balance. |
| Expeditions | backend/reference only | expedition JSON exports | Not part of Milestone 1. |
| Settings / Accessibility | local settings types/UI | `settings_schema.json` | Workbook v4.5 defaults are canonical. |

## Import discipline
Codex may manually encode the small MVP subset. Once content volume grows, add a deterministic workbook/export pipeline instead of maintaining large duplicate tables by hand.

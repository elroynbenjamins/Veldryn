export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const recipes=read('src/content/equipment-recipes-v33.ts');
const skills=read('src/content/skills.ts');
const path=read('src/core/equipment-crafting-path.ts');
const inspect=read('src/components/ItemQuickInspect.tsx');
const recipeCard=read('src/components/RecipeCard.tsx');
const skillsScreen=read('src/screens/SkillsScreen.tsx');
const app=read('App.tsx');
const novice=read('src/content/novice-sets.ts');
const refinery=read('src/components/EnchantingRefineryPanel.tsx');

ok(recipes.includes('V33_EQUIPMENT_RECIPES')&&recipes.includes("CRAFT_V33_"),'V33 equipment needs a dedicated complete recipe adapter');
ok(recipes.includes('slotMultiplier')&&recipes.includes('timerRange'),'V33 recipe costs/timers must respect slot and tier pacing');
ok(recipes.includes("case 'T5'")&&recipes.includes("case 'T8'"),'Regional material plans must differ across later tiers');
ok(recipes.includes('EQUIPMENT_CRAFT_SKILL_BY_CLASS')&&recipes.includes("WAYFINDER:'tailoring'")&&recipes.includes("IRONWARDEN:'smithing'"),'V33 equipment must assign class-specific Smithing/Tailoring ownership');
ok(recipes.includes('TIER_CHARACTER_LEVEL_FLOOR')&&recipes.includes('TIER_CRAFTING_LEVEL_FLOOR'),'V33 recipes must keep explicit character/profession tier floors');
ok(recipes.includes("SUNSCALE")&&recipes.includes("FROSTBLOOM")&&recipes.includes("ASHEN_MYRRH"),'Tailoring later tiers must use regional Herbalism fibers');
ok(skills.includes('...(V33_EQUIPMENT_RECIPES as Recipe[])'),'V33 recipes must be part of the authoritative recipe catalog');
ok(!skills.includes('GENERATED_COMPLETE_SET_RECIPES'),'Pre-V33 generated equipment recipes must be removed');
ok(!skills.includes('TAILOR_MOSSWRAP_GLOVES')&&!skills.includes('CRAFT_TRACKER_CHEST'),'Legacy profession/class-set gear recipes must not remain in the active recipe catalog');
ok(novice.includes('EQUIPMENT_CRAFT_SKILL_BY_CLASS[set.classId]'),'Novice equipment must follow the same Smithing/Tailoring class map');

ok(path.includes('workingTowardItemSource'),'Equipment crafting planner must reuse shared source navigation');
ok(path.includes("kind:'material'"),'Missing materials must become explicit blockers');
ok(path.includes("mode:'crafting'")&&path.includes('Train '),'Skill blockers must route to profession training');
ok(path.includes('craftTimeLabel:formatQueueTimeV31'),'Craft planner must show meaningful craft duration');

ok(inspect.includes('CRAFTING PATH'),'Quick Inspect must expose the equipment crafting plan');
ok(inspect.includes("ingredient.missing+' missing"),'Quick Inspect must show exact missing material quantities');
ok(inspect.includes('onNavigate(ingredient.source)'),'Quick Inspect material blockers must be actionable');
ok(recipeCard.includes('MISSING SOURCES'),'Expanded recipe cards must surface missing material and prerequisite sources');
ok(!recipeCard.includes('craft time'),'Recipe cards must not imply a live timer before the timed crafting queue runtime exists');
ok(recipeCard.includes('onNavigate(row.destination)'),'Recipe source rows must navigate through the generalized Working Toward destination');
ok(skillsScreen.includes('onNavigateCraftingSource'),'Skills must accept source navigation');
ok(skillsScreen.includes('onNavigate={onNavigateCraftingSource}'),'Skills must pass source routing into recipe cards');
ok(app.includes('onNavigateCraftingSource={openWorkingTowardDestination}'),'Recipe material actions must reuse the global travel-aware Working Toward router');
ok(skillsScreen.includes('EnchantingRefineryPanel')&&skillsScreen.includes("initialSkill==='enchanting'"),'Enchanting skill detail must expose the Gem Refinery instead of legacy equipment recipes');
ok(refinery.includes('availableGemRefinementsV1')&&refinery.includes("type:'gem_refine'"),'Gem Refinery UI must use authoritative raw-gem refinement availability and command flow');

console.log('PASS: equipment crafting/source UI is exact, actionable and routed through shared progression navigation');

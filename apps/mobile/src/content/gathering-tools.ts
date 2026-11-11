import {rebasedCombatLevelFromLegacyLevel as rebaseLevel} from '../core/progression';
import type {GatheringSkillId} from '../core/types';
import {increasedCraftingGoldCost} from './crafting-gold-cost';

export interface GatheringToolBlueprintDef{
  itemId:string;
  knowledgeId:string;
  sourceMonsterId:string;
  dropChance:number;
}
export interface GatheringToolDef{
  id:string;name:string;skillId:GatheringSkillId;tier:1|2|3|4;
  actionTimeMultiplier:number;
  /** Required level in the tool's own gathering skill to equip and craft it. */
  unlockLevel:number;
  /** Main character Level requirement. */
  requiredCharacterLevel:number;
  icon:string;
  blueprint?:GatheringToolBlueprintDef;
  recipe:{xp:number;gold:number;seconds:number;inputs:{itemId:string;quantity:number}[]};
  rarity:'common'|'uncommon'|'rare'|'epic';value:number;
}

/** Tool blueprints are 25% rarer than their previously authored odds.
 * The normal 5% combat-drop reduction is applied separately by MONSTERS. */
export const TOOL_BLUEPRINT_DROP_MULTIPLIER=0.75;
/** Drop chances are stored as fractional probabilities, so 0.001 = 0.10%.
 * Round the FINAL monster drop probability down, after the existing general
 * 5% reduction, rather than rounding the authored baseline too early. */
export const TOOL_BLUEPRINT_DROP_ROUNDING_STEP=0.001;
export function roundDownToolBlueprintDropChance(chance:number):number{
 if(!Number.isFinite(chance)||chance<0||chance>1)throw new Error('invalid_tool_blueprint_chance');
 return Math.floor(chance/TOOL_BLUEPRINT_DROP_ROUNDING_STEP+1e-10)*TOOL_BLUEPRINT_DROP_ROUNDING_STEP;
}
/** Tool crafts cost twice the current Gold and twice each input material.
 * Craft duration, output count, unlocks and Smithing requirements do not change. */
export const TOOL_CRAFT_COST_MULTIPLIER=2;
/** The prior +3 XP stays, then an additional 75% applies, rounded UP to 10 XP.
 * E.g. previous 105 XP → 108 → 189 → 190 Smithing XP. */
export const TOOL_CRAFT_XP_BONUS=3;
export const TOOL_CRAFT_XP_MULTIPLIER=1.75;
export const TOOL_CRAFT_XP_ROUNDING_STEP=10;
export function increasedToolCraftXp(baseXp:number):number{
 if(!Number.isSafeInteger(baseXp)||baseXp<0)throw new Error('invalid_tool_craft_xp');
 return Math.ceil((baseXp+TOOL_CRAFT_XP_BONUS)*TOOL_CRAFT_XP_MULTIPLIER/TOOL_CRAFT_XP_ROUNDING_STEP)*TOOL_CRAFT_XP_ROUNDING_STEP;
}
const tool=(definition:GatheringToolDef):GatheringToolDef=>({
 ...definition,
 requiredCharacterLevel:rebaseLevel(definition.requiredCharacterLevel),
 recipe:{
  ...definition.recipe,
  xp:increasedToolCraftXp(definition.recipe.xp),
  gold:increasedCraftingGoldCost(definition.recipe.gold)*TOOL_CRAFT_COST_MULTIPLIER,
  inputs:definition.recipe.inputs.map(input=>({...input,quantity:input.quantity*TOOL_CRAFT_COST_MULTIPLIER})),
 },
});
const blueprint=(itemId:string,knowledgeId:string,sourceMonsterId:string,dropChance:number):GatheringToolBlueprintDef=>({
 itemId,knowledgeId,sourceMonsterId,dropChance:dropChance*TOOL_BLUEPRINT_DROP_MULTIPLIER,
});

export const GATHERING_TOOLS:GatheringToolDef[]=[
  // Tier 1 is always learnable, but still requires early investment in the relevant gathering skill.
  tool({id:'COPPER_PICKAXE',name:'Copper Pickaxe',skillId:'mining',tier:1,actionTimeMultiplier:1,unlockLevel:3,requiredCharacterLevel:16,icon:'⛏',rarity:'common',value:120,recipe:{xp:110,gold:120,seconds:120,inputs:[{itemId:'COPPER_INGOT',quantity:8},{itemId:'GREENWOOD_LOG',quantity:14}]}}),
  tool({id:'GREENWOOD_HATCHET',name:'Greenwood Hatchet',skillId:'woodcutting',tier:1,actionTimeMultiplier:1,unlockLevel:3,requiredCharacterLevel:3,icon:'🪓',rarity:'common',value:110,recipe:{xp:105,gold:110,seconds:114,inputs:[{itemId:'GREENWOOD_LOG',quantity:24},{itemId:'MOSS_FIBER',quantity:12}]}}),
  tool({id:'REEDLINE_ROD',name:'Reedline Fishing Rod',skillId:'fishing',tier:1,actionTimeMultiplier:1,unlockLevel:3,requiredCharacterLevel:3,icon:'🎣',rarity:'common',value:100,recipe:{xp:100,gold:100,seconds:114,inputs:[{itemId:'GREENWOOD_LOG',quantity:20},{itemId:'MOSS_FIBER',quantity:10}]}}),

  // Tier 2 blueprints are approachable regional drops; the tool itself remains a meaningful material craft.
  tool({id:'ASTER_IRON_PICKAXE',name:'Aster-Iron Pickaxe',skillId:'mining',tier:2,actionTimeMultiplier:.75,unlockLevel:10,requiredCharacterLevel:16,icon:'⛏',rarity:'uncommon',value:440,blueprint:blueprint('BP_ASTER_IRON_PICKAXE','tool_recipe:ASTER_IRON_PICKAXE','CAVE_SKITTER',.05),recipe:{xp:340,gold:650,seconds:240,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:16},{itemId:'IRONWOOD_LOG',quantity:26},{itemId:'REINFORCED_FITTING',quantity:3}]}}),
  tool({id:'ASTER_IRON_HATCHET',name:'Aster-Iron Hatchet',skillId:'woodcutting',tier:2,actionTimeMultiplier:.75,unlockLevel:10,requiredCharacterLevel:16,icon:'🪓',rarity:'uncommon',value:430,blueprint:blueprint('BP_ASTER_IRON_HATCHET','tool_recipe:ASTER_IRON_HATCHET','THORNLING',.05),recipe:{xp:330,gold:620,seconds:228,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:15},{itemId:'IRONWOOD_LOG',quantity:30},{itemId:'REINFORCED_FITTING',quantity:3}]}}),
  tool({id:'IRONWOOD_ROD',name:'Ironwood Fishing Rod',skillId:'fishing',tier:2,actionTimeMultiplier:.75,unlockLevel:10,requiredCharacterLevel:16,icon:'🎣',rarity:'uncommon',value:420,blueprint:blueprint('BP_IRONWOOD_ROD','tool_recipe:IRONWOOD_ROD','MIRE_HERON',.05),recipe:{xp:320,gold:600,seconds:222,inputs:[{itemId:'IRONWOOD_LOG',quantity:36},{itemId:'ASTER_IRON_INGOT',quantity:9},{itemId:'WISP_DUST',quantity:10}]}}),

  // Tier 3 is a genuine progression chase: higher gathering level, Level 20 and a rarer blueprint.
  tool({id:'OATHSTONE_PICKAXE',name:'Oathstone Pickaxe',skillId:'mining',tier:3,actionTimeMultiplier:.5,unlockLevel:20,requiredCharacterLevel:20,icon:'⛏',rarity:'rare',value:1180,blueprint:blueprint('BP_OATHSTONE_PICKAXE','tool_recipe:OATHSTONE_PICKAXE','RUNEBOUND_MINER',.02),recipe:{xp:900,gold:2400,seconds:480,inputs:[{itemId:'OATHSTONE_INGOT',quantity:22},{itemId:'CROWNWOOD_LOG',quantity:40},{itemId:'OATHGLASS_SHARD',quantity:8}]}}),
  tool({id:'OATHSTONE_HATCHET',name:'Oathstone Hatchet',skillId:'woodcutting',tier:3,actionTimeMultiplier:.5,unlockLevel:20,requiredCharacterLevel:20,icon:'🪓',rarity:'rare',value:1160,blueprint:blueprint('BP_OATHSTONE_HATCHET','tool_recipe:OATHSTONE_HATCHET','ANCIENT_TREANT',.02),recipe:{xp:880,gold:2300,seconds:468,inputs:[{itemId:'OATHSTONE_INGOT',quantity:20},{itemId:'CROWNWOOD_LOG',quantity:46},{itemId:'OATHGLASS_SHARD',quantity:7}]}}),
  tool({id:'OATHSCALE_ROD',name:'Oathscale Fishing Rod',skillId:'fishing',tier:3,actionTimeMultiplier:.5,unlockLevel:20,requiredCharacterLevel:20,icon:'🎣',rarity:'rare',value:1140,blueprint:blueprint('BP_OATHSCALE_ROD','tool_recipe:OATHSCALE_ROD','DROWNED_PILGRIM',.02),recipe:{xp:860,gold:2200,seconds:456,inputs:[{itemId:'CROWNWOOD_LOG',quantity:44},{itemId:'OATHSTONE_INGOT',quantity:14},{itemId:'OATHSCALE_PIKE',quantity:10}]}}),

  // Tier 4 belongs to Frostmarch. It is deliberately a long-term efficiency upgrade, not required to enter the region.
  tool({id:'FROSTIRON_PICKAXE',name:'Frostiron Pickaxe',skillId:'mining',tier:4,actionTimeMultiplier:.4,unlockLevel:46,requiredCharacterLevel:46,icon:'⛏',rarity:'epic',value:3600,blueprint:blueprint('BP_FROSTIRON_PICKAXE','tool_recipe:FROSTIRON_PICKAXE','BELLWRAITH',.01),recipe:{xp:2400,gold:8500,seconds:960,inputs:[{itemId:'FROSTIRON',quantity:32},{itemId:'RIMEGLASS',quantity:12},{itemId:'REINFORCED_FITTING',quantity:10}]}}),
  tool({id:'FROSTIRON_HATCHET',name:'Frostiron Hatchet',skillId:'woodcutting',tier:4,actionTimeMultiplier:.4,unlockLevel:46,requiredCharacterLevel:46,icon:'🪓',rarity:'epic',value:3550,blueprint:blueprint('BP_FROSTIRON_HATCHET','tool_recipe:FROSTIRON_HATCHET','FROSTWOLF',.01),recipe:{xp:2350,gold:8300,seconds:948,inputs:[{itemId:'FROSTIRON',quantity:30},{itemId:'RIMEGLASS',quantity:10},{itemId:'CHOIR_BLOOM',quantity:4}]}}),
  tool({id:'RIMEGLASS_ROD',name:'Rimeglass Fishing Rod',skillId:'fishing',tier:4,actionTimeMultiplier:.4,unlockLevel:46,requiredCharacterLevel:46,icon:'🎣',rarity:'epic',value:3500,blueprint:blueprint('BP_RIMEGLASS_ROD','tool_recipe:RIMEGLASS_ROD','CHOIR_HUNTER',.01),recipe:{xp:2300,gold:8100,seconds:936,inputs:[{itemId:'FROSTIRON',quantity:22},{itemId:'RIMEGLASS',quantity:14},{itemId:'CHOIR_BLOOM',quantity:4}]}}),
];

export const TOOL_ITEMS=GATHERING_TOOLS.map(entry=>({id:entry.id,name:entry.name,type:'tool' as const,value:entry.value,rarity:entry.rarity,toolSkillId:entry.skillId,toolTier:entry.tier,actionTimeMultiplier:entry.actionTimeMultiplier}));
export const TOOL_BLUEPRINT_ITEMS=GATHERING_TOOLS.flatMap(entry=>entry.blueprint?[{
  id:entry.blueprint.itemId,
  name:entry.name+' Blueprint',
  type:'quest' as const,
  value:0,
  rarity:entry.rarity,
  knowledgeUnlockId:entry.blueprint.knowledgeId,
}]:[]);
export const TOOL_RECIPES=GATHERING_TOOLS.map(entry=>({
  id:`CRAFT_${entry.id}`,
  name:entry.name,
  skillId:'smithing' as const,
  // Tool unlocks are controlled by the gathering skill, character level, and blueprint—not Smithing level.
  level:1,
  xp:entry.recipe.xp,
  gold:entry.recipe.gold,
  seconds:entry.recipe.seconds,
  inputs:entry.recipe.inputs,
  output:{itemId:entry.id,quantity:1},
  characterLevel:entry.requiredCharacterLevel,
  requiredKnowledgeId:entry.blueprint?.knowledgeId,
  knowledgeItemId:entry.blueprint?.itemId,
}));
export const gatheringToolDef=(id?:string)=>id?GATHERING_TOOLS.find(entry=>entry.id===id):undefined;
export const gatheringToolsFor=(skillId:GatheringSkillId)=>GATHERING_TOOLS.filter(entry=>entry.skillId===skillId);
export const gatheringToolBlueprintItems=()=>TOOL_BLUEPRINT_ITEMS;
export const gatheringToolBlueprintForMonster=(monsterId:string)=>GATHERING_TOOLS.flatMap(entry=>entry.blueprint?.sourceMonsterId===monsterId?[{tool:entry,blueprint:entry.blueprint}]:[]);

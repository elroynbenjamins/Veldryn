import type {GearSlot} from './types';
import type {EquipmentV2Tier,EquipmentV2Profile} from './equipment-crafting-v2-foundation';
import {equipmentV2PreviewBaseStats,EQUIPMENT_V2_RARITIES,equipmentV2AffixCount} from './equipment-crafting-v2-foundation';
import {equipmentV2DraftAssembly,equipmentV2SourcePlan,equipmentV2CostSummary,type EquipmentV2Ingredient,type EquipmentV2SourceStrategy} from './equipment-crafting-v2-economy';
import {EQUIPMENT_CRAFTING_V2_RELEASED} from './release-flags';

export type EquipmentV2PrimaryAction='craft'|'unlock'|'prepare_components'|'find_materials'|'review_market_purchase'|'free_queue_slot'|'obtain_gold';
export interface EquipmentV2RecipePreviewInput {
 name:string;tier:EquipmentV2Tier;slot:GearSlot;profile:EquipmentV2Profile;setPiece:boolean;
 rarityMultiplier?:number;quality?:number;
 ingredients:readonly EquipmentV2Ingredient[];
 strategy:EquipmentV2SourceStrategy;marketReleased?:boolean;
 characterLevel:number;professionLevel:number;
 goldAvailable:number;queueHasCapacity:boolean;processingGold?:number;
}
/** A presentation model; NO side effects, purchases, claim actions or live item rewrites. */
export function equipmentV2HiddenRecipeScreen(input:EquipmentV2RecipePreviewInput){
 const draft=equipmentV2DraftAssembly(input.tier,input.slot,input.setPiece);
 const actualMarketEnabled=Boolean(input.marketReleased)&&EQUIPMENT_CRAFTING_V2_RELEASED;
 const source=equipmentV2SourcePlan(input.ingredients,input.strategy,actualMarketEnabled);
 const cost=equipmentV2CostSummary({assemblyGold:draft.gold,processingGold:input.processingGold??0,source});
 const requiredCharacter={1:2,2:12,3:26,4:40}[input.tier];
 const requiredProfession={1:1,2:8,3:20,4:34}[input.tier];
 const locked=input.characterLevel<requiredCharacter||input.professionLevel<requiredProfession;
 const missingMaterial=source.ingredients.some(row=>row.gatherOrProcess>0);
 const missingComponents=source.ingredients.some(row=>row.gatherOrProcess>0&&input.ingredients.find(v=>v.itemId===row.itemId)?.kind==='component');
 const pendingMarketPurchase=source.ingredients.some(row=>row.bought>0);
 const cannotAfford=input.goldAvailable<cost.knownGold;
 const action:EquipmentV2PrimaryAction=locked?'unlock'
  :missingComponents?'prepare_components'
  :missingMaterial?'find_materials'
  :pendingMarketPurchase?'review_market_purchase'
  :cannotAfford?'obtain_gold'
  :!input.queueHasCapacity?'free_queue_slot':'craft';
 const canCraftNow=action==='craft'&&source.fullySupplied;
 return {
  name:input.name,tier:input.tier,slot:input.slot,
  baseStats:equipmentV2PreviewBaseStats(input.tier,input.slot,input.profile,input.quality??50,input.rarityMultiplier??1),
  draftXp:draft.xp,source,cost,
  requirements:{characterLevel:requiredCharacter,professionLevel:requiredProfession,locked},
  action,canCraftNow,marketControlsEnabled:actualMarketEnabled,
  sections:['result','materials','potential_rolls','set','queue'] as const,
  rarityOutcomes:EQUIPMENT_V2_RARITIES.map(row=>({...row,affixes:equipmentV2AffixCount(input.tier,row.rarity)})),
 };
}
/** Only permitted route entrypoint. It stays invisible until the shared release gate opens. */
export function equipmentV2PublicEntryAvailable(){return EQUIPMENT_CRAFTING_V2_RELEASED;}

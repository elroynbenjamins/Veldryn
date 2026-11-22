/**
 * Veldryn 2.0 hidden gathering-tool profession and custody preflight.
 *
 * This file is pure server policy. It is NOT a public API endpoint, a source
 * of authenticated inventory state, a grant/roll writer or a live V1 migration.
 * Callers must load progression, recipe knowledge and exact physical copies
 * from their authenticated transactional store and recheck under the lock.
 *
 * A specialist smith may forge tools without gathering/combat XP; a specialist
 * gatherer may equip a trade-acquired tool without smithing/combat XP.
 * Tier/blueprint/material/licensing are separate checks, never interchangeable.
 */
import {
  mayWorkProfessionTierV2,validateTrustedProgressionV2,
  type ProfessionTierV2,type TrustedProgressionV2,
} from './profession-progression';

export type ToolGatheringSkillV2='mining'|'woodcutting'|'fishing';

export interface GatheringToolTemplateV2 {
  readonly itemId:string;
  readonly gatheringSkill:ToolGatheringSkillV2;
  readonly tier:ProfessionTierV2;
  /** Already-authored T2+ permanent recipe knowledge, not a new random drop. */
  readonly blueprintKnowledgeId:string|null;
}

/**
 * Only the 12 currently authored tool identities are supported by this pilot.
 * The generic profession policy supports tiers T1-T9, but T5-T9 equipment
 * cannot be minted before a reviewed recipe/item/source catalogue exists.
 */
export const GATHERING_TOOL_TEMPLATES_V2:readonly GatheringToolTemplateV2[]=[
  {itemId:'COPPER_PICKAXE',gatheringSkill:'mining',tier:1,blueprintKnowledgeId:null},
  {itemId:'GREENWOOD_HATCHET',gatheringSkill:'woodcutting',tier:1,blueprintKnowledgeId:null},
  {itemId:'REEDLINE_ROD',gatheringSkill:'fishing',tier:1,blueprintKnowledgeId:null},
  {itemId:'ASTER_IRON_PICKAXE',gatheringSkill:'mining',tier:2,blueprintKnowledgeId:'tool_recipe:ASTER_IRON_PICKAXE'},
  {itemId:'ASTER_IRON_HATCHET',gatheringSkill:'woodcutting',tier:2,blueprintKnowledgeId:'tool_recipe:ASTER_IRON_HATCHET'},
  {itemId:'IRONWOOD_ROD',gatheringSkill:'fishing',tier:2,blueprintKnowledgeId:'tool_recipe:IRONWOOD_ROD'},
  {itemId:'OATHSTONE_PICKAXE',gatheringSkill:'mining',tier:3,blueprintKnowledgeId:'tool_recipe:OATHSTONE_PICKAXE'},
  {itemId:'OATHSTONE_HATCHET',gatheringSkill:'woodcutting',tier:3,blueprintKnowledgeId:'tool_recipe:OATHSTONE_HATCHET'},
  {itemId:'OATHSCALE_ROD',gatheringSkill:'fishing',tier:3,blueprintKnowledgeId:'tool_recipe:OATHSCALE_ROD'},
  {itemId:'FROSTIRON_PICKAXE',gatheringSkill:'mining',tier:4,blueprintKnowledgeId:'tool_recipe:FROSTIRON_PICKAXE'},
  {itemId:'FROSTIRON_HATCHET',gatheringSkill:'woodcutting',tier:4,blueprintKnowledgeId:'tool_recipe:FROSTIRON_HATCHET'},
  {itemId:'RIMEGLASS_ROD',gatheringSkill:'fishing',tier:4,blueprintKnowledgeId:'tool_recipe:RIMEGLASS_ROD'},
];
const templatesById=new Map(GATHERING_TOOL_TEMPLATES_V2.map(t=>[t.itemId,t]));
if(templatesById.size!==GATHERING_TOOL_TEMPLATES_V2.length)
  throw Error('tool_v2_duplicate_authoritative_template');

export function gatheringToolTemplateV2(itemId:string):GatheringToolTemplateV2|undefined{
  return templatesById.get(itemId);
}

/** Inventory/learned knowledge must come from a server-owned account ledger. */
export interface TrustedToolCraftPreflightV2 {
  readonly progression:TrustedProgressionV2;
  readonly learnedBlueprintKnowledgeIds:readonly string[];
  /** A physical, unconsumed blueprint item present in this maker's custody. */
  readonly carriedBlueprintItemIds:readonly string[];
}
export type ToolCraftPreflightResultV2=
  |{readonly permitted:false;readonly reason:'unknown_tool'|'smithing_tier_locked'|'blueprint_locked'}
  |{readonly permitted:true;readonly tool:GatheringToolTemplateV2;
    /** Consume this item and learn its knowledge atomically with the craft. */
    readonly blueprintItemToConsume:string|null;
    readonly knowledgeToUnlock:string|null};

/**
 * This is a LICENSE check, not a successful craft. A transaction must still
 * validate exact material quantities, gold, recipe revision, copy limits, and
 * server-issued rarity/quality/bonus rolls before issuing any physical tool.
 */
export function planGatheringToolCraftV2(
  source:TrustedToolCraftPreflightV2,itemId:string,
):ToolCraftPreflightResultV2{
  validateTrustedProgressionV2(source.progression);
  const tool=gatheringToolTemplateV2(itemId);
  if(!tool)return {permitted:false,reason:'unknown_tool'};
  // The MAKER trains Smithing, not the tool's target gathering profession.
  // No combat level, recipient gathering level or optional focus requirement.
  if(!mayWorkProfessionTierV2(source.progression,'smithing',tool.tier))
    return {permitted:false,reason:'smithing_tier_locked'};
  if(!tool.blueprintKnowledgeId)
    return {permitted:true,tool,blueprintItemToConsume:null,knowledgeToUnlock:null};
  const knowledgeId=tool.blueprintKnowledgeId;
  if(source.learnedBlueprintKnowledgeIds.includes(knowledgeId))
    return {permitted:true,tool,blueprintItemToConsume:null,knowledgeToUnlock:null};
  const blueprintItemId='BP_'+tool.itemId;
  if(!source.carriedBlueprintItemIds.includes(blueprintItemId))
    return {permitted:false,reason:'blueprint_locked'};
  return {
    permitted:true,tool,blueprintItemToConsume:blueprintItemId,
    knowledgeToUnlock:knowledgeId,
  };
}

export type ToolCustodyLocationV2='inventory'|'bank'|'equipped'|'market_escrow';
export interface TrustedGatheringToolCopyV2{
  readonly instanceId:string;
  readonly itemId:string;
  readonly ownerCharacterId:string;
  readonly location:ToolCustodyLocationV2;
}
export type EquippedToolTiersV2=Readonly<Partial<Record<
  ToolGatheringSkillV2,Readonly<Partial<Record<number,string>>>
>>>;
export interface TrustedToolEquipPreflightV2{
  readonly progression:TrustedProgressionV2;
  readonly characterId:string;
  /** Load from one locked item-instance and equipment-slot snapshot. */
  readonly instances:readonly TrustedGatheringToolCopyV2[];
  readonly equippedBySkillAndTier:EquippedToolTiersV2;
}
export type ToolEquipPreflightResultV2=
  |{readonly permitted:false;readonly reason:
      'unknown_tool'|'gathering_tier_locked'|'missing_copy'|
      'copy_not_owned'|'copy_not_in_inventory'}
  |{readonly permitted:true;readonly slot:{readonly skill:ToolGatheringSkillV2;
      readonly tier:ProfessionTierV2};
    readonly equipInstanceId:string;readonly replacedInstanceId:string|null;
    readonly noChange:boolean};

const supportedSkills:ReadonlySet<string>=new Set(['mining','woodcutting','fishing']);
const custodyLocations:ReadonlySet<string>=new Set(['inventory','bank','equipped','market_escrow']);
function assertTrustedToolCopySnapshotV2(source:TrustedToolEquipPreflightV2):Map<string,TrustedGatheringToolCopyV2>{
  if(!source.characterId||typeof source.characterId!=='string')
    throw Error('tool_v2_invalid_character');
  if(!Array.isArray(source.instances))
    throw Error('tool_v2_invalid_instance_ledger');
  const copies=new Map<string,TrustedGatheringToolCopyV2>();
  for(const copy of source.instances){
    if(!copy||typeof copy.instanceId!=='string'||!copy.instanceId||
      typeof copy.ownerCharacterId!=='string'||!copy.ownerCharacterId||
      typeof copy.itemId!=='string'||!copy.itemId||
      !custodyLocations.has(copy.location)||copies.has(copy.instanceId))
      throw Error('tool_v2_invalid_instance_ledger');
    copies.set(copy.instanceId,copy);
  }
  const slots=source.equippedBySkillAndTier;
  if(!slots||typeof slots!=='object'||Array.isArray(slots))
    throw Error('tool_v2_invalid_slots');
  const occupied=new Set<string>();
  for(const [skill,tiers] of Object.entries(slots)){
    if(!supportedSkills.has(skill)||!tiers||typeof tiers!=='object'||Array.isArray(tiers))
      throw Error('tool_v2_invalid_slots');
    for(const [rawTier,id] of Object.entries(tiers)){
      const tier=Number(rawTier);
      if(!Number.isSafeInteger(tier)||tier<1||tier>9||String(tier)!==rawTier||
         typeof id!=='string'||!id||occupied.has(id))
        throw Error('tool_v2_invalid_slots');
      occupied.add(id);
      const copy=copies.get(id),tool=copy&&gatheringToolTemplateV2(copy.itemId);
      if(!copy||!tool||copy.ownerCharacterId!==source.characterId||
         copy.location!=='equipped'||tool.gatheringSkill!==skill||tool.tier!==tier)
        throw Error('tool_v2_invalid_equipped_custody');
    }
  }
  for(const copy of source.instances){
    // An equipped physical copy cannot exist without an explicit corresponding
    // slot. This prevents double bonus application and inventory/equip overlap.
    if(copy.ownerCharacterId===source.characterId&&
       copy.location==='equipped'&&!occupied.has(copy.instanceId))
      throw Error('tool_v2_orphan_equipped_copy');
  }
  return copies;
}

/**
 * The RECIPIENT only needs the matching gathering profession's own tier.
 * A market/commission transfer becomes usable after the server ledger changes
 * owner and location to this character's INVENTORY. No Smithing or combat gate.
 * Actual slot swaps require an atomic transaction, not this planning result.
 */
export function planGatheringToolEquipV2(
  source:TrustedToolEquipPreflightV2,instanceId:string,
):ToolEquipPreflightResultV2{
  validateTrustedProgressionV2(source.progression);
  const copies=assertTrustedToolCopySnapshotV2(source);
  const copy=copies.get(instanceId);
  if(!copy)return {permitted:false,reason:'missing_copy'};
  const tool=gatheringToolTemplateV2(copy.itemId);
  if(!tool)return {permitted:false,reason:'unknown_tool'};
  if(copy.ownerCharacterId!==source.characterId)
    return {permitted:false,reason:'copy_not_owned'};
  if(!mayWorkProfessionTierV2(source.progression,tool.gatheringSkill,tool.tier))
    return {permitted:false,reason:'gathering_tier_locked'};
  const current=source.equippedBySkillAndTier[tool.gatheringSkill]?.[tool.tier];
  if(current===instanceId&&copy.location==='equipped')
    return {permitted:true,slot:{skill:tool.gatheringSkill,tier:tool.tier},
      equipInstanceId:instanceId,replacedInstanceId:null,noChange:true};
  if(copy.location!=='inventory')
    return {permitted:false,reason:'copy_not_in_inventory'};
  return {permitted:true,slot:{skill:tool.gatheringSkill,tier:tool.tier},
    equipInstanceId:instanceId,replacedInstanceId:current??null,noChange:false};
}

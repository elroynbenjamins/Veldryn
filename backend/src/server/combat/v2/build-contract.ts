/**
 * VELDRYN Combat 2.0: isolated, server-authoritative loadout contract.
 * This module is not imported by live combat. Nothing here mutates a character
 * or item. Numeric affixes and skill execution belong to later passes.
 */
export const CLASS_ROLES_V2 = {
  IRONWARDEN: 'tank', BASTION: 'tank', DREADGUARD: 'tank',
  WAYFINDER: 'damage', RAVAGER: 'damage', HEXWEAVER: 'damage', KNIFE_DANCER: 'damage',
  DAWNKEEPER: 'support', STONECALLER: 'support',
} as const;
export type ClassIdV2 = keyof typeof CLASS_ROLES_V2;
export type RoleV2 = (typeof CLASS_ROLES_V2)[ClassIdV2];
export const GEAR_SLOTS_V2 = ['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'] as const;
export type GearSlotV2 = (typeof GEAR_SLOTS_V2)[number];
export const BUILD_CONTRACT_VERSION_V2 = 1;
export const BUILD_RULES_V2 = {
  specializationLevel:10, variantLevel:20, signaturePassiveLevel:30, capstoneLevel:50,
  earlyActiveSlots:2, activeSlots:3, signaturePassiveSlots:2, maxTalentRank:3,
  talentPointLevels:[10,15,20,25,30,35,40,45,50],
} as const;

/** Build this snapshot from authenticated server character/inventory state. */
export interface VerifiedCharacterV2 {
  classId:ClassIdV2;
  level:number;
  ownedInstanceIds:ReadonlySet<string>;
}
/** An item instance, not an item definition. Legacy class restrictions remain. */
export interface EquipmentInstanceV2 {
  instanceId:string;
  slot:GearSlotV2;
  eligibleClasses?:readonly ClassIdV2[];
  eligibleRoles?:readonly RoleV2[];
  setFamilyId?:string;
  tier?:string;
  /** Server-authored equip level; legacy and T1–T5 obey the same floor. */
  requiredLevel?:number;
}
export interface SetFamilyV2 {
  id:string; role:RoleV2; slots:readonly GearSlotV2[]; thresholds:readonly number[];
}
export interface SpecializationV2 { id:string; classId:ClassIdV2; capstoneId:string }
export interface ActiveSkillV2 {
  id:string; classId:ClassIdV2; unlockLevel:number; defaultVariantId:string;
  variantIds:readonly string[];
}
export interface PassiveNodeV2 {
  id:string; classId:ClassIdV2; unlockLevel:number; maxRank:1|2|3;
  prerequisite?:{id:string;rank:number};
}
export interface BuildCatalogV2 {
  itemsByInstanceId:Readonly<Record<string,EquipmentInstanceV2>>;
  setsById:Readonly<Record<string,SetFamilyV2>>;
  specializationsById:Readonly<Record<string,SpecializationV2>>;
  skillsById:Readonly<Record<string,ActiveSkillV2>>;
  passivesById:Readonly<Record<string,PassiveNodeV2>>;
}
export interface BuildSelectionV2 {
  /** IDs only. Client stat rolls, skill multipliers and levels are never trusted. */
  specializationId:string|null;
  equipment:Partial<Record<GearSlotV2,string>>;
  activeSkills:readonly {skillId:string;variantId:string}[];
  talentRanks:Readonly<Record<string,number>>;
  signaturePassiveIds:readonly string[];
  capstoneId:string|null;
}
export interface BuildIssueV2 { code:string; at:string }
export interface ResolvedSetV2 { familyId:string;pieces:number;activeThresholds:number[] }
export interface BuildValidationV2 {
  valid:boolean;issues:BuildIssueV2[];activeSkillSlots:number;
  availableTalentPoints:number;spentTalentPoints:number;resolvedSets:ResolvedSetV2[];
}
const isSlot=(s:string):s is GearSlotV2=>(GEAR_SLOTS_V2 as readonly string[]).includes(s);
export const talentPointsAtLevelV2=(level:number):number=>
  BUILD_RULES_V2.talentPointLevels.filter(x=>level>=x).length;

/**
 * Validate using ONLY a trusted snapshot and server-owned catalog.
 * No stat changes, rerolls, drop changes, DB writes, or implicit migration.
 */
export function validateBuildV2(
  verified:VerifiedCharacterV2, requested:BuildSelectionV2, catalog:BuildCatalogV2,
):BuildValidationV2 {
  const issues:BuildIssueV2[]=[];
  const issue=(code:string,at:string)=>{issues.push({code,at});};
  const level=verified.level,role=CLASS_ROLES_V2[verified.classId];
  if(!Number.isSafeInteger(level)||level<1)issue('invalid_level','character.level');
  const activeSkillSlots=level>=10?BUILD_RULES_V2.activeSlots:BUILD_RULES_V2.earlyActiveSlots;
  const availableTalentPoints=talentPointsAtLevelV2(level);
  const spec=requested.specializationId?catalog.specializationsById[requested.specializationId]:undefined;
  if(level<BUILD_RULES_V2.specializationLevel){
    if(requested.specializationId)issue('specialization_locked','specializationId');
  }else if(!requested.specializationId)issue('specialization_required','specializationId');
  else if(!spec||spec.id!==requested.specializationId||spec.classId!==verified.classId)
    issue('specialization_invalid','specializationId');
  if(requested.capstoneId!==null){
    if(level<BUILD_RULES_V2.capstoneLevel)issue('capstone_locked','capstoneId');
    if(!spec||requested.capstoneId!==spec.capstoneId)issue('capstone_invalid','capstoneId');
  }

  if(requested.activeSkills.length>activeSkillSlots)issue('too_many_active_skills','activeSkills');
  const seenSkills=new Set<string>();
  requested.activeSkills.forEach((s,i)=>{
    const at='activeSkills.'+i;
    if(seenSkills.has(s.skillId))issue('duplicate_skill',at);
    seenSkills.add(s.skillId);
    const skill=catalog.skillsById[s.skillId];
    if(!skill||skill.id!==s.skillId||skill.classId!==verified.classId){
      issue('unknown_skill',at);return;
    }
    if(skill.unlockLevel>level)issue('skill_locked',at);
    if(!skill.variantIds.includes(s.variantId))issue('invalid_variant',at);
    if(level<BUILD_RULES_V2.variantLevel&&s.variantId!==skill.defaultVariantId)
      issue('variant_locked',at);
  });

  const seenItems=new Set<string>(),counts=new Map<string,number>();
  for(const [slot,instanceId] of Object.entries(requested.equipment)){
    const at='equipment.'+slot;
    if(!isSlot(slot)){issue('unknown_equipment_slot',at);continue;}
    if(typeof instanceId!=='string'||!instanceId){issue('unknown_item',at);continue;}
    if(seenItems.has(instanceId))issue('duplicate_item',at);
    seenItems.add(instanceId);
    if(!verified.ownedInstanceIds.has(instanceId)){issue('item_not_owned',at);continue;}
    const item=catalog.itemsByInstanceId[instanceId];
    if(!item||item.instanceId!==instanceId){issue('unknown_item',at);continue;}
    if(item.slot!==slot){issue('item_slot_mismatch',at);continue;}
    if(item.requiredLevel!==undefined&&(
      !Number.isSafeInteger(item.requiredLevel)||item.requiredLevel<1||level<item.requiredLevel
    )){issue('item_level_ineligible',at);continue;}
    const classLocked=Boolean(item.eligibleClasses?.length);
    const roleLocked=Boolean(item.eligibleRoles?.length);
    // Both restrictions must pass when both are present. Nothing becomes universal.
    if(classLocked&&!item.eligibleClasses!.includes(verified.classId)){
      issue('item_class_ineligible',at);continue;
    }
    if(roleLocked&&!item.eligibleRoles!.includes(role)){
      issue('item_role_ineligible',at);continue;
    }
    if(!classLocked&&!roleLocked){issue('item_role_ineligible',at);continue;}
    if(!item.setFamilyId)continue;
    const set=catalog.setsById[item.setFamilyId];
    if(!set||set.id!==item.setFamilyId||set.role!==role||!set.slots.includes(slot)||
      set.slots.includes('weapon')||set.slots.includes('offhand')||
      set.thresholds.some(t=>!Number.isSafeInteger(t)||t<2||t>set.slots.length)){
      issue('invalid_set_definition',at);continue;
    }
    counts.set(set.id,(counts.get(set.id)??0)+1);
  }

  let spentTalentPoints=0;
  for(const [id,rank] of Object.entries(requested.talentRanks)){
    const at='talentRanks.'+id, node=catalog.passivesById[id];
    if(!node||node.id!==id||node.classId!==verified.classId){
      issue('unknown_passive',at);continue;
    }
    if(!Number.isSafeInteger(rank)||rank<1||rank>node.maxRank||rank>BUILD_RULES_V2.maxTalentRank){
      issue('invalid_talent_rank',at);continue;
    }
    spentTalentPoints+=rank;
    if(node.unlockLevel>level)issue('talent_locked',at);
    if(node.prerequisite&&(requested.talentRanks[node.prerequisite.id]??0)<node.prerequisite.rank)
      issue('missing_prerequisite',at);
  }
  if(spentTalentPoints>availableTalentPoints)issue('too_many_talent_points','talentRanks');
  if(level<BUILD_RULES_V2.signaturePassiveLevel&&requested.signaturePassiveIds.length)
    issue('signature_passive_locked','signaturePassiveIds');
  if(requested.signaturePassiveIds.length>BUILD_RULES_V2.signaturePassiveSlots)
    issue('too_many_signature_passives','signaturePassiveIds');
  const seenSignatures=new Set<string>();
  requested.signaturePassiveIds.forEach((id,i)=>{
    const at='signaturePassiveIds.'+i;
    if(seenSignatures.has(id))issue('duplicate_signature_passive',at);
    seenSignatures.add(id);
    const node=catalog.passivesById[id];
    if(!node||node.id!==id||node.classId!==verified.classId||node.unlockLevel>level||
      !requested.talentRanks[id])issue('invalid_signature_passive',at);
  });
  const resolvedSets=[...counts.entries()].map(([familyId,pieces])=>({
    familyId,pieces,
    activeThresholds:[...new Set(catalog.setsById[familyId].thresholds)]
      .sort((a,b)=>a-b).filter(t=>pieces>=t),
  })).sort((a,b)=>a.familyId.localeCompare(b.familyId));
  return {valid:issues.length===0,issues,activeSkillSlots,availableTalentPoints,spentTalentPoints,resolvedSets};
}

/** Explicit server-only kill switch: disabled without both conditions. */
export function buildMayAffectCombatV2(serverEnabled:boolean,validation:BuildValidationV2):boolean {
  return serverEnabled===true&&validation.valid;
}

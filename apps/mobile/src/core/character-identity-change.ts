import {CLASSES} from '../content/classes';
import {classSkillsFor} from '../content/class-skills';
import {combatCompanionDef} from '../content/combat-companions';
import {characterClassSkills} from './class-skills';
import {classCompanionRole} from './combat-companions';
import {auditCraftedGearOwnership} from './crafted-gear-ownership';
import {characterNameError,normalizeCharacterName} from './identity-names';
import type {ClassId,GameState,GearSlot} from './types';

/**
 * Pure state transition used by a future server-authorized identity-change transaction.
 * This function does NOT authorize a payment, coupon or admin; the caller must verify
 * authorization and consume a single-use credit in the same DB transaction as the save.
 * Never expose it as an ordinary player gameplay command.
 */
export type CharacterIdentityChange =
 | {kind:'rename';characterId:string;newName:string}
 | {kind:'class';characterId:string;newClassId:ClassId};

export interface CharacterIdentityChangeResult {
 state:GameState;
 summary:{
  characterId:string;kind:'rename'|'class';before:string;after:string;
  destroyedEquipmentCopies:number;companionUnequipped:boolean;
 };
}

export function applyCharacterIdentityChange(state:GameState,change:CharacterIdentityChange,nowMs:number):CharacterIdentityChangeResult{
 const character=state.character;
 if(!character||character.id!==change.characterId)throw new Error('active_character_required');
 if(!Number.isSafeInteger(nowMs)||nowMs<0)throw new Error('invalid_time');

 if(change.kind==='rename'){
  const newName=normalizeCharacterName(change.newName);
  const issue=characterNameError(newName);
  if(issue)throw new Error(issue);
  if(newName===character.name)throw new Error('name_unchanged');
  if((state.otherCharacters??[]).some(row=>row.character.name.toLocaleLowerCase()===newName.toLocaleLowerCase()))throw new Error('name_taken');
  return {
   state:{...state,character:{...character,name:newName}},
   summary:{characterId:character.id,kind:'rename',before:character.name,after:newName,destroyedEquipmentCopies:0,companionUnequipped:false},
  };
 }

 const newClass=CLASSES.find(row=>row.id===change.newClassId);
 if(!newClass)throw new Error('invalid_class');
 if(newClass.id===character.classId)throw new Error('class_unchanged');
 if(state.activity!==null||character.classTraining)throw new Error('stop_activity_before_class_change');
 if((state.account.equipmentCraftingQueue??[]).some(job=>job.ownerCharacterId===character.id))throw new Error('claim_crafting_before_class_change');
 const audit=auditCraftedGearOwnership(state);
 if(!audit.consistent)throw new Error('equipment_ownership_audit_failed');

 const destroyedIds=new Set(Object.values(character.equipmentInstanceIds??{}).filter((id):id is string=>typeof id==='string'&&!!id));
 const records=state.account.craftedGearInstances??[];
 const recordedIds=new Set(records.map(row=>row.id));
 if([...destroyedIds].some(id=>!recordedIds.has(id)))throw new Error('equipped_item_instance_not_found');
 // Only equipped instances are destroyed. Bank, inventory, overflow, pouch and
 // every unequipped crafted copy remain unchanged.
 const remainingRecords=records.filter(row=>!destroyedIds.has(row.id));
 const oldSkills=characterClassSkills(character);
 const newSkillDefs=classSkillsFor(newClass.id);
 const classSkills=newSkillDefs.map((row,index)=>({...oldSkills[index],skillId:row.id}));
 const remainders=Object.fromEntries(newSkillDefs.map((row,index)=>{
  const oldId=oldSkills[index].skillId;
  const value=character.classSkillRemainders?.[oldId];
  return [row.id,typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<1?value:0];
 }));
 const companionId=character.equippedCombatCompanionId;
 const companion=companionId?combatCompanionDef(companionId):undefined;
 const companionUnequipped=Boolean(companionId&&(!companion||companion.role===classCompanionRole(newClass.id)));
 const nextCompanionId=companionUnequipped?undefined:companionId;
 const keepItemIds=new Set([
  ...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks,...(character.equipmentPouch?.stacks??[]),
 ].map(stack=>stack.itemId));
 const enhancements={...(character.gearEnhancements??{})};
 for(const itemId of Object.values(character.equipment)){
  if(itemId&&!keepItemIds.has(itemId))delete enhancements[itemId];
 }
 // Loadout names, order, consumables and compatible companions survive; only
 // their old class equipment selections are wiped.
 const savedLoadouts=character.savedLoadouts?.map(preset=>({
  ...preset,classId:newClass.id,equipment:{} as Partial<Record<GearSlot,string>>,
  equipmentInstanceIds:{} as Partial<Record<GearSlot,string>>,
  companionId:preset.companionId&&combatCompanionDef(preset.companionId)?.role!==classCompanionRole(newClass.id)?preset.companionId:undefined,
  updatedAtMs:nowMs,
 }));
 const characterAfter={
  ...character,classId:newClass.id,hp:newClass.hp,attack:newClass.attack,defense:newClass.defense,
  currentHp:Math.max(1,Math.min(newClass.hp,character.currentHp)),
  equipment:{},equipmentInstanceIds:{},gearEnhancements:enhancements,
  classSkills,classSkillRemainders:remainders,
  profileIconId:character.profileIconId?.startsWith('class:')?`class:${newClass.id}`:character.profileIconId,
  equippedCombatCompanionId:nextCompanionId,savedLoadouts,
  activityQueuePausedReason:character.activityQueue?.length?'class_changed_reequip':character.activityQueuePausedReason,
 };
 return {
  state:{...state,character:characterAfter,account:{...state.account,craftedGearInstances:remainingRecords}},
  summary:{characterId:character.id,kind:'class',before:character.classId,after:newClass.id,
   destroyedEquipmentCopies:Object.values(character.equipment).filter(id=>typeof id==='string'&&!!id).length,companionUnequipped},
 };
}

/** Hidden editor: updates only the character's saved preset, not equipped gear.
 * Future authenticated save command must revalidate the same revision. */
import type {GameState,GearSlot,CharacterLoadoutPreset} from './types';
import {ITEMS} from '../content/items';
import {isReleasedEquipmentItemId} from '../content/equipment-release';
import {auditCraftedGearOwnership} from './crafted-gear-ownership';
import {characterLoadoutSlotCount,normalizeCharacterLoadouts} from './character-loadouts';
import {applyActivityLoadoutSelectionsReview,type ActivityLoadoutSelections} from './activity-loadout-transition-review';
export const ACTIVITY_LOADOUT_EDITOR_LIVE=false as const;
export const ACTIVITY_LOADOUT_GEAR_SLOTS:readonly GearSlot[]=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'];
export type ActivityLoadoutDraft=ActivityLoadoutSelections&{
 readonly name:string;readonly equipment:Partial<Record<GearSlot,string>>;
 readonly equipmentInstanceIds:Partial<Record<GearSlot,string>>;
};
export function reviewSaveInactiveLoadout(state:GameState,index:number,draft:ActivityLoadoutDraft,nowMs:number){
 const character=state.character;
 if(!character||!Number.isInteger(index)||index<0||index>=characterLoadoutSlotCount(state)||
 !Number.isSafeInteger(nowMs)||nowMs<0||!draft||typeof draft.name!=='string'||
 !draft.name.trim()||draft.name.trim().length>28)throw Error('loadout_editor_invalid_draft');
 const validMap=(m:unknown)=>!!m&&typeof m==='object'&&!Array.isArray(m)&&
 Object.keys(m).every(key=>ACTIVITY_LOADOUT_GEAR_SLOTS.includes(key as GearSlot));
 if(!validMap(draft.equipment)||!validMap(draft.equipmentInstanceIds))throw Error('loadout_editor_invalid_slots');
 const audit=auditCraftedGearOwnership(state);
 if(audit.problems.length)throw Error('loadout_editor_ownership_conflict');
 const equipment:CharacterLoadoutPreset['equipment']={},equipmentInstanceIds:NonNullable<CharacterLoadoutPreset['equipmentInstanceIds']>={};
 const used=new Set<string>();
 for(const slot of ACTIVITY_LOADOUT_GEAR_SLOTS){
  const itemId=draft.equipment[slot],copyId=draft.equipmentInstanceIds[slot];
  if(itemId===undefined&&copyId===undefined)continue;
  const def=ITEMS.find(row=>row.id===itemId);
  if(!def||def.type!=='gear'||def.slot!==slot||!isReleasedEquipmentItemId(def.id)||
   (def.classRestriction&&def.classRestriction!==character.classId))throw Error('loadout_editor_invalid_item');
  if(copyId!==undefined){
   const loc=audit.linked.find(row=>row.instanceId===copyId);
   if(used.has(copyId)||!loc||loc.itemId!==itemId||
    !['bank','inventory','equipment_pouch','equipped'].includes(loc.place)||
    (loc.place!=='bank'&&loc.holderCharacterId!==character.id))throw Error('loadout_editor_invalid_copy');
   used.add(copyId);equipmentInstanceIds[slot]=copyId;
  }else{
   const has=character.equipment[slot]===itemId&&!character.equipmentInstanceIds?.[slot]||
    [...state.inventory.stacks,...state.bank.stacks,...(character.equipmentPouch?.stacks??[])].some(row=>row.itemId===itemId&&!row.instanceId&&row.quantity>0);
   if(!has)throw Error('loadout_editor_missing_item');
  }
  equipment[slot]=def.id;
 }
 // Validate selections on a detached idle projection only. Never return its
 // modified HP, pet, faith, activity or inventory as a saved game result.
 const selectionProbe={...state,activity:null,character:{...character,classTraining:undefined}};
 applyActivityLoadoutSelectionsReview(selectionProbe,{petId:draft.petId,faithSelections:draft.faithSelections},nowMs);
 const stored=normalizeCharacterLoadouts(character.savedLoadouts,character.classId,5);
 const old=stored.find(row=>row.slotIndex===index);
 const preset:CharacterLoadoutPreset={...old,id:old?.id??'loadout-'+(index+1),slotIndex:index,
  name:draft.name.trim(),classId:character.classId,equipment,equipmentInstanceIds,
  ...(draft.petId!==undefined?{petId:draft.petId}:{}),
  ...(draft.faithSelections!==undefined?{faithSelections:{...draft.faithSelections}}:{}),
  createdAtMs:old?.createdAtMs??nowMs,updatedAtMs:nowMs};
 const savedLoadouts=[...stored.filter(row=>row.slotIndex!==index),preset].sort((a,b)=>a.slotIndex-b.slotIndex);
 return {state:{...state,character:{...character,savedLoadouts}},preset,applied:false as const,persisted:false as const,releaseReady:false as const};
}

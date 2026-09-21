import {ITEMS,itemDef} from '../content/items';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import type {CharacterLoadoutPreset,GameState,GearSlot} from './types';
import {effectiveStats} from './game';
import {equipCombatCompanion,unequipCombatCompanion} from './combat-companions';
import {GEAR_SLOTS,migrateToPerInstanceGear} from './gear-instances';

export const CHARACTER_LOADOUT_SLOT_COUNT=3;
const slots:GearSlot[]=GEAR_SLOTS;
const cleanName=(value:unknown,fallback:string)=>typeof value==='string'&&value.trim()?value.trim().slice(0,28):fallback;
export function normalizeCharacterLoadouts(value:any,classId:string):CharacterLoadoutPreset[]{
  if(!Array.isArray(value))return [];const bySlot=new Map<number,CharacterLoadoutPreset>();
  value.slice(0,12).forEach((raw:any,index)=>{
    if(!raw||typeof raw!=='object'||raw.classId!==classId)return;
    const slotIndex=Number.isInteger(raw.slotIndex)&&raw.slotIndex>=0&&raw.slotIndex<CHARACTER_LOADOUT_SLOT_COUNT?raw.slotIndex:index;if(slotIndex<0||slotIndex>=CHARACTER_LOADOUT_SLOT_COUNT||bySlot.has(slotIndex))return;
    const equipment:Partial<Record<GearSlot,string>>={},equipmentInstanceIds:Partial<Record<GearSlot,string>>={};
    for(const slot of slots){
      const id=raw.equipment?.[slot],def=typeof id==='string'?ITEMS.find(item=>item.id===id):undefined;
      if(def?.type==='gear'&&def.slot===slot&&(!def.classRestriction||def.classRestriction===classId)){equipment[slot]=id;if(typeof raw.equipmentInstanceIds?.[slot]==='string')equipmentInstanceIds[slot]=raw.equipmentInstanceIds[slot].slice(0,180);}
    }
    const foodId=typeof raw.foodId==='string'&&ITEMS.some(item=>item.id===raw.foodId&&item.type==='food')?raw.foodId:undefined;
    const companionId=typeof raw.companionId==='string'&&COMBAT_COMPANIONS.some(def=>def.id===raw.companionId)?raw.companionId:undefined;
    bySlot.set(slotIndex,{id:typeof raw.id==='string'&&raw.id?raw.id:`loadout-${slotIndex+1}`,slotIndex,name:cleanName(raw.name,`Loadout ${slotIndex+1}`),classId:classId as any,equipment,equipmentInstanceIds,foodId,companionId,createdAtMs:Number.isFinite(raw.createdAtMs)?raw.createdAtMs:0,updatedAtMs:Number.isFinite(raw.updatedAtMs)?raw.updatedAtMs:0});
  });
  return [...bySlot.values()].sort((a,b)=>a.slotIndex-b.slotIndex);
}
export function saveCharacterLoadout(state:GameState,index:number,name?:string,nowMs=Date.now()):GameState{
  const projected=migrateToPerInstanceGear(state);if(!projected.character)throw new Error('Create a character first.');if(index<0||index>=CHARACTER_LOADOUT_SLOT_COUNT)throw new Error('Invalid loadout slot.');
  const current=normalizeCharacterLoadouts(projected.character.savedLoadouts,projected.character.classId),existing=current.find(entry=>entry.slotIndex===index);
  const preset:CharacterLoadoutPreset={id:existing?.id??`loadout-${index+1}`,slotIndex:index,name:cleanName(name,existing?.name??`Loadout ${index+1}`),classId:projected.character.classId,equipment:{...projected.character.equipment},equipmentInstanceIds:{...(projected.character.equipmentInstanceIds??{})},foodId:projected.character.equippedFoodId,companionId:projected.character.equippedCombatCompanionId,createdAtMs:existing?.createdAtMs??nowMs,updatedAtMs:nowMs};
  return {...projected,character:{...projected.character,savedLoadouts:[...current.filter(entry=>entry.slotIndex!==index),preset].sort((a,b)=>a.slotIndex-b.slotIndex)}};
}
export function renameCharacterLoadout(state:GameState,id:string,name:string,nowMs=Date.now()):GameState{if(!state.character)throw new Error('Create a character first.');const list=normalizeCharacterLoadouts(state.character.savedLoadouts,state.character.classId),index=list.findIndex(entry=>entry.id===id);if(index<0)throw new Error('Loadout not found.');const next=[...list];next[index]={...next[index],name:cleanName(name,next[index].name),updatedAtMs:nowMs};return {...state,character:{...state.character,savedLoadouts:next}};}
export function deleteCharacterLoadout(state:GameState,id:string):GameState{return !state.character?state:{...state,character:{...state.character,savedLoadouts:normalizeCharacterLoadouts(state.character.savedLoadouts,state.character.classId).filter(entry=>entry.id!==id)}};}

const qty=(stacks:{itemId:string;quantity:number}[],id:string)=>stacks.reduce((sum,row)=>sum+(row.itemId===id?row.quantity:0),0);
const take=(stacks:{itemId:string;quantity:number}[],id:string)=>{if(qty(stacks,id)<1)throw new Error(`MISSING:${id}`);let used=false;return stacks.map(row=>{if(row.itemId!==id||used)return {...row};used=true;return {...row,quantity:row.quantity-1};}).filter(row=>row.quantity>0);};
const put=(stacks:{itemId:string;quantity:number}[],capacity:number,id:string)=>{const index=stacks.findIndex(row=>row.itemId===id);if(index>=0){const next=stacks.map(row=>({...row}));next[index].quantity+=1;return next;}if(stacks.length>=capacity)throw new Error('STORAGE_FULL');return [...stacks.map(row=>({...row})),{itemId:id,quantity:1}];};

export function applyCharacterLoadout(state:GameState,id:string):GameState{
  let next=migrateToPerInstanceGear(state);if(!next.character)throw new Error('Create a character first.');if(next.activity?.kind==='combat')throw new Error('Stop combat before changing loadouts.');
  const preset=normalizeCharacterLoadouts(next.character.savedLoadouts,next.character.classId).find(entry=>entry.id===id);if(!preset)throw new Error('Loadout not found.');
  let inventory=next.inventory.stacks.map(row=>({...row})),bank=next.bank.stacks.map(row=>({...row})),equipment={...next.character.equipment},equipmentInstanceIds={...(next.character.equipmentInstanceIds??{})},instances=(next.account.gearInstances??[]).map(row=>({...row,enhancement:{...row.enhancement}}));
  const setInstanceLocation=(instanceId:string,location:'inventory'|'bank'|'equipped')=>{const index=instances.findIndex(row=>row.id===instanceId);if(index<0)throw new Error('Saved equipment copy no longer exists.');instances[index]={...instances[index],location,ownerCharacterId:location==='bank'?instances[index].ownerCharacterId:next.character!.id};};
  for(const slot of slots){
    const wantedItem=preset.equipment[slot],wantedInstanceId=preset.equipmentInstanceIds?.[slot],oldItem=equipment[slot],oldInstanceId=equipmentInstanceIds[slot];
    if(wantedItem){
      const def=itemDef(wantedItem);if(def.type!=='gear'||def.slot!==slot||def.classRestriction&&def.classRestriction!==next.character.classId)throw new Error(`${def.name} is not valid for this loadout.`);
      if(!wantedInstanceId)throw new Error(`${def.name} loadout predates exact-copy equipment. Save this loadout again.`);
      const wanted=instances.find(row=>row.id===wantedInstanceId);if(!wanted||wanted.itemId!==wantedItem)throw new Error(`${def.name} exact copy is no longer available.`);
      if(oldInstanceId===wantedInstanceId)continue;
      if(wanted.location==='inventory'&&wanted.ownerCharacterId===next.character.id)inventory=take(inventory,wantedItem);
      else if(wanted.location==='bank')bank=take(bank,wantedItem);
      else throw new Error(`${def.name} exact copy is equipped elsewhere or unavailable.`);
    }
    if(oldItem&&oldInstanceId&&oldInstanceId!==wantedInstanceId){
      try{inventory=put(inventory,next.inventory.capacity,oldItem);setInstanceLocation(oldInstanceId,'inventory');}
      catch(error){if(error instanceof Error&&error.message==='STORAGE_FULL'){bank=put(bank,next.bank.capacity,oldItem);setInstanceLocation(oldInstanceId,'bank');}else throw error;}
    }
    if(wantedItem&&wantedInstanceId){equipment[slot]=wantedItem;equipmentInstanceIds[slot]=wantedInstanceId;setInstanceLocation(wantedInstanceId,'equipped');}
    else{delete equipment[slot];delete equipmentInstanceIds[slot];}
  }
  if(preset.foodId&&!inventory.some(entry=>entry.itemId===preset.foodId&&entry.quantity>0))throw new Error(`${itemDef(preset.foodId).name} must be carried in Inventory before this loadout can use it.`);
  next={...next,inventory:{...next.inventory,stacks:inventory},bank:{...next.bank,stacks:bank},account:{...next.account,gearInstances:instances},character:{...next.character,equipment,equipmentInstanceIds,equippedFoodId:preset.foodId}};
  next=preset.companionId?equipCombatCompanion(next,preset.companionId):unequipCombatCompanion(next);next.character!.currentHp=Math.min(next.character!.currentHp,effectiveStats(next).hp);return next;
}

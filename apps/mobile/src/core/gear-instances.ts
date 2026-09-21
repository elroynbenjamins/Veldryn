import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';
import type {CharacterState,GameState,GearEnhancementState,GearInstance,GearInstanceLocation,GearSlot,InventoryState,OverflowState} from './types';

export const MAX_GEAR_INSTANCES=1200;
export const GEAR_SLOTS:GearSlot[]=['weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring'];

const EMPTY_ENHANCEMENT:GearEnhancementState={rank:0,failures:0,gemIds:[]};
const LOCATIONS:GearInstanceLocation[]=['inventory','bank','overflow','equipped'];
function normalizedEnhancement(raw:any):GearEnhancementState{
  const statGemId=typeof raw?.statGemId==='string'?raw.statGemId:undefined,effectGemId=typeof raw?.effectGemId==='string'?raw.effectGemId:undefined;
  const legacy=Array.isArray(raw?.gemIds)?raw.gemIds.filter((id:any)=>typeof id==='string').slice(0,2):[];
  const gemIds=[statGemId,effectGemId,...legacy].filter((id,index,list):id is string=>Boolean(id)&&list.indexOf(id)===index).slice(0,2);
  return {rank:Math.max(0,Math.min(10,Math.floor(Number(raw?.rank)||0))),failures:Math.max(0,Math.floor(Number(raw?.failures)||0)),statGemId,effectGemId,gemIds};
}
function enhanced(value:GearEnhancementState){return value.rank>0||value.failures>0||value.gemIds.length>0||Boolean(value.statGemId)||Boolean(value.effectGemId);}
export function normalizeGearInstances(raw:unknown):GearInstance[]{
  if(!Array.isArray(raw))return [];
  const seen=new Set<string>(),result:GearInstance[]=[];
  for(const row of raw as any[]){
    if(!row||typeof row!=='object'||typeof row.id!=='string'||typeof row.itemId!=='string'||typeof row.ownerCharacterId!=='string'||seen.has(row.id))continue;
    try{
      const item=itemDef(row.itemId);if(item.type!=='gear')continue;
      const rarity=(['common','uncommon','rare','epic','legendary','mythic'].includes(row.rarity)?row.rarity:itemRarity(item)) as ItemRarity;
      const location=LOCATIONS.includes(row.location)?row.location:'inventory';
      seen.add(row.id);result.push({
        id:String(row.id).slice(0,180),itemId:item.id,ownerCharacterId:String(row.ownerCharacterId).slice(0,120),rarity,
        acquireSource:row.acquireSource==='craft'?'craft':'legacy',sourceReceiptKey:String(row.sourceReceiptKey??row.id).slice(0,200),
        createdAtMs:Math.max(0,Math.floor(Number(row.createdAtMs)||0)),location,enhancement:normalizedEnhancement(row.enhancement),
      });
    }catch{}
  }
  return result.slice(-MAX_GEAR_INSTANCES);
}

interface CopySlot{itemId:string;location:GearInstanceLocation;ownerCharacterId:string;slot?:GearSlot;ordinal:number;}
function gearUnits(stacks:InventoryState['stacks'],location:GearInstanceLocation,ownerCharacterId:string,start:number){
  const result:CopySlot[]=[];let ordinal=start;
  for(const stack of stacks){
    let gear=false;try{gear=itemDef(stack.itemId).type==='gear'}catch{}
    if(!gear)continue;
    for(let count=0;count<Math.max(0,Math.floor(stack.quantity));count++)result.push({itemId:stack.itemId,location,ownerCharacterId,ordinal:ordinal++});
  }
  return {result,next:ordinal};
}
function copySlots(state:GameState){
  const result:CopySlot[]=[];let ordinal=0;
  const addCharacter=(character:CharacterState,inventory:InventoryState,overflow:OverflowState)=>{
    for(const slot of GEAR_SLOTS){const itemId=character.equipment[slot];if(itemId)result.push({itemId,location:'equipped',ownerCharacterId:character.id,slot,ordinal:ordinal++});}
    const inv=gearUnits(inventory.stacks,'inventory',character.id,ordinal);result.push(...inv.result);ordinal=inv.next;
    const over=gearUnits(overflow.stacks,'overflow',character.id,ordinal);result.push(...over.result);ordinal=over.next;
  };
  if(state.character)addCharacter(state.character,state.inventory,state.overflow);
  for(const entry of state.otherCharacters??[])addCharacter(entry.character,entry.inventory,entry.overflow);
  const bank=gearUnits(state.bank.stacks,'bank',state.character?.id??'account-bank',ordinal);result.push(...bank.result);
  return result;
}
const rarityWeight:Record<ItemRarity,number>={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5};
function candidateScore(instance:GearInstance,copy:CopySlot){
  let score=0;
  if(instance.location===copy.location)score+=120;
  if(instance.ownerCharacterId===copy.ownerCharacterId)score+=80;
  if(copy.location==='equipped'&&instance.ownerCharacterId===copy.ownerCharacterId)score+=220;
  if(copy.location==='equipped')score+=rarityWeight[instance.rarity]*12+instance.enhancement.rank*2+Math.min(9,instance.enhancement.gemIds.length*3);
  return score;
}
function syntheticSerial(instances:GearInstance[],hint:number|undefined){
  let serial=Math.max(1,Math.floor(Number(hint)||1));
  for(const instance of instances){const match=/^gear:legacy:(\d+)$/.exec(instance.id);if(match)serial=Math.max(serial,Number(match[1])+1);}
  return serial;
}
function copyEnhancementMap(character:CharacterState|undefined){return (character?.gearEnhancements??{}) as Record<string,GearEnhancementState>;}

export function migrateToPerInstanceGear(state:GameState):GameState{
  const primary=normalizeGearInstances(state.account.gearInstances);
  const legacy=normalizeGearInstances(state.account.craftedGearInstances).filter(row=>!primary.some(existing=>existing.id===row.id));
  const pool=[...primary,...legacy],copies=copySlots(state),unused=new Set(pool.map(row=>row.id)),assigned:GearInstance[]=[];
  let serial=syntheticSerial(pool,state.account.nextGearInstanceSerial);
  const explicitByOwner=new Map<string,Partial<Record<GearSlot,string>>>();
  if(state.character)explicitByOwner.set(state.character.id,state.character.equipmentInstanceIds??{});
  for(const entry of state.otherCharacters??[])explicitByOwner.set(entry.character.id,entry.character.equipmentInstanceIds??{});
  for(const copy of copies){
    let chosen:GearInstance|undefined;
    const explicitId=copy.slot?explicitByOwner.get(copy.ownerCharacterId)?.[copy.slot]:undefined;
    if(explicitId){const exact=pool.find(row=>row.id===explicitId&&row.itemId===copy.itemId&&unused.has(row.id));if(exact)chosen=exact;}
    if(!chosen){
      chosen=pool.filter(row=>unused.has(row.id)&&row.itemId===copy.itemId)
        .sort((a,b)=>candidateScore(b,copy)-candidateScore(a,copy)||b.createdAtMs-a.createdAtMs||a.id.localeCompare(b.id))[0];
    }
    if(chosen)unused.delete(chosen.id);
    else{
      const id=`gear:legacy:${serial++}`;
      chosen={id,itemId:copy.itemId,ownerCharacterId:copy.ownerCharacterId,rarity:itemRarity(itemDef(copy.itemId)),acquireSource:'legacy',sourceReceiptKey:`legacy:${copy.ownerCharacterId}:${copy.location}:${copy.itemId}:${copy.ordinal}`,createdAtMs:state.createdAtMs+copy.ordinal,location:copy.location,enhancement:{...EMPTY_ENHANCEMENT}};
    }
    assigned.push({...chosen,ownerCharacterId:copy.location==='bank'?(chosen.ownerCharacterId||copy.ownerCharacterId):copy.ownerCharacterId,location:copy.location});
  }
  const equipmentIdsByOwner=new Map<string,Partial<Record<GearSlot,string>>>();
  copies.forEach((copy,index)=>{if(!copy.slot)return;const map=equipmentIdsByOwner.get(copy.ownerCharacterId)??{};map[copy.slot]=assigned[index].id;equipmentIdsByOwner.set(copy.ownerCharacterId,map);});
  const applyLegacyEnhancements=(character:CharacterState)=>{
    const legacyMap=copyEnhancementMap(character);
    for(const [itemId,raw] of Object.entries(legacyMap)){
      const value=normalizedEnhancement(raw);if(!enhanced(value))continue;
      const equippedIndex=copies.findIndex(copy=>copy.ownerCharacterId===character.id&&copy.location==='equipped'&&copy.itemId===itemId);
      let index=equippedIndex>=0?equippedIndex:copies.findIndex(copy=>copy.ownerCharacterId===character.id&&copy.location==='inventory'&&copy.itemId===itemId);
      if(index<0)index=assigned.findIndex(instance=>instance.itemId===itemId&&instance.ownerCharacterId===character.id&&instance.location==='bank');
      if(index>=0&&!enhanced(assigned[index].enhancement))assigned[index]={...assigned[index],enhancement:value};
    }
  };
  if(state.character)applyLegacyEnhancements(state.character);
  for(const entry of state.otherCharacters??[])applyLegacyEnhancements(entry.character);
  const withLoadoutInstances=(character:CharacterState)=>{
    const equipped=equipmentIdsByOwner.get(character.id)??{};
    const savedLoadouts=character.savedLoadouts?.map(preset=>{
      const ids={...(preset.equipmentInstanceIds??{})};
      for(const slot of GEAR_SLOTS){
        const itemId=preset.equipment[slot];if(!itemId)continue;
        const valid=ids[slot]&&assigned.some(instance=>instance.id===ids[slot]&&instance.itemId===itemId);
        if(valid)continue;
        const current=character.equipment[slot]===itemId?equipped[slot]:undefined;
        const fallback=assigned.filter(instance=>instance.itemId===itemId&&(instance.ownerCharacterId===character.id||instance.location==='bank'))
          .sort((a,b)=>(a.location==='inventory'?0:a.location==='equipped'?1:2)-(b.location==='inventory'?0:b.location==='equipped'?1:2)||a.createdAtMs-b.createdAtMs||a.id.localeCompare(b.id))[0]?.id;
        if(current||fallback)ids[slot]=current??fallback;
      }
      return {...preset,equipmentInstanceIds:ids};
    });
    return {...character,equipmentInstanceIds:equipped,gearEnhancements:undefined,savedLoadouts};
  };
  const active=state.character?withLoadoutInstances(state.character):null;
  const others=(state.otherCharacters??[]).map(entry=>({...entry,character:withLoadoutInstances(entry.character)}));
  return {...state,character:active,otherCharacters:others,account:{...state.account,gearInstances:assigned.slice(-MAX_GEAR_INSTANCES),craftedGearInstances:undefined,nextGearInstanceSerial:serial}};
}
export const ensureGearInstances=migrateToPerInstanceGear;
export function gearInstances(state:GameState){return migrateToPerInstanceGear(state).account.gearInstances??[];}
export function gearInstanceById(state:GameState,id:string){return gearInstances(state).find(row=>row.id===id);}
export function gearInstancesForItem(state:GameState,itemId:string,ownerCharacterId?:string){return gearInstances(state).filter(row=>row.itemId===itemId&&(!ownerCharacterId||row.ownerCharacterId===ownerCharacterId));}
export function gearInstancesForStorage(state:GameState,location:'inventory'|'bank'|'overflow',itemId?:string,ownerCharacterId?:string){
  return gearInstances(state).filter(row=>row.location===location&&(!itemId||row.itemId===itemId)&&(!ownerCharacterId||row.ownerCharacterId===ownerCharacterId));
}
export function equippedGearInstance(state:GameState,slot:GearSlot){
  const projected=migrateToPerInstanceGear(state),id=projected.character?.equipmentInstanceIds?.[slot];return id?(projected.account.gearInstances??[]).find(row=>row.id===id):undefined;
}
export function updateGearInstance(state:GameState,id:string,update:(value:GearInstance)=>GearInstance):GameState{
  const projected=migrateToPerInstanceGear(state),instances=projected.account.gearInstances??[],index=instances.findIndex(row=>row.id===id);if(index<0)throw new Error('Equipment copy not found');
  const next=[...instances];next[index]=update(next[index]);return {...projected,account:{...projected.account,gearInstances:next}};
}
export function removeGearInstance(state:GameState,id:string):GameState{
  const projected=migrateToPerInstanceGear(state);if(!(projected.account.gearInstances??[]).some(row=>row.id===id))throw new Error('Equipment copy not found');
  return {...projected,account:{...projected.account,gearInstances:(projected.account.gearInstances??[]).filter(row=>row.id!==id)}};
}
export function upsertGearInstance(state:GameState,instance:GearInstance):GameState{
  const projected=migrateToPerInstanceGear(state),instances=projected.account.gearInstances??[];
  const next=[...instances.filter(row=>row.id!==instance.id&&row.sourceReceiptKey!==instance.sourceReceiptKey),instance].slice(-MAX_GEAR_INSTANCES);
  return {...projected,account:{...projected.account,gearInstances:next}};
}

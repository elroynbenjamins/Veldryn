import type {CraftedGearInstance,GameState,GearEnhancementState,GearSlot} from './types';
import {craftedGearRarity,craftedRarityStatMultiplier,deterministicCraftRarityRoll} from './crafted-gear-rarity';
import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';

export const MAX_CRAFTED_GEAR_INSTANCES=500;
const GEAR_SLOTS:readonly GearSlot[]=['weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring'];
const RARITY_ORDER:Record<ItemRarity,number>={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5};

const emptyEnhancement=():GearEnhancementState=>({rank:0,failures:0,gemIds:[]});
function normalizeEnhancement(raw:any):GearEnhancementState{
  const statGemId=typeof raw?.statGemId==='string'?raw.statGemId:undefined;
  const effectGemId=typeof raw?.effectGemId==='string'?raw.effectGemId:undefined;
  const gemIds=[statGemId,effectGemId,...(Array.isArray(raw?.gemIds)?raw.gemIds.filter((x:any)=>typeof x==='string'):[])].filter((id,index,all):id is string=>Boolean(id)&&all.indexOf(id)===index).slice(0,2);
  return {rank:Math.max(0,Math.min(10,Math.floor(Number(raw?.rank)||0))),failures:Math.max(0,Math.floor(Number(raw?.failures)||0)),statGemId,effectGemId,gemIds};
}
function location(value:unknown):CraftedGearInstance['location']{return value==='bank'||value==='equipped'?'bank'===value?'bank':'equipped':'inventory';}
function syntheticId(ownerCharacterId:string,itemId:string,index:number){return `gearcopy:${encodeURIComponent(ownerCharacterId)}:${encodeURIComponent(itemId)}:${index}`;}
function parseSyntheticId(id:string){
  const match=/^gearcopy:([^:]+):([^:]+):(\d+)$/.exec(id);if(!match)return undefined;
  try{return {ownerCharacterId:decodeURIComponent(match[1]),itemId:decodeURIComponent(match[2]),index:Math.max(0,Number(match[3])||0)}}catch{return undefined}
}
function virtualInstance(ownerCharacterId:string,itemId:string,index:number):CraftedGearInstance{
  const item=itemDef(itemId);
  return {id:syntheticId(ownerCharacterId,itemId,index),itemId,ownerCharacterId,rarity:itemRarity(item),acquireSource:'migration',sourceReceiptKey:`migration:${ownerCharacterId}:${itemId}:${index}`,createdAtMs:0,location:'inventory',enhancement:emptyEnhancement()};
}

export function normalizeCraftedGearInstances(raw:unknown):CraftedGearInstance[]{
  if(!Array.isArray(raw))return [];
  return raw.filter((row:any)=>row&&typeof row==='object'&&typeof row.id==='string'&&typeof row.itemId==='string'&&typeof row.ownerCharacterId==='string')
    .flatMap((row:any)=>{
      try{
        const item=itemDef(String(row.itemId));if(item.type!=='gear')return [];
        const rarity=(['common','uncommon','rare','epic','legendary','mythic'].includes(row.rarity)?row.rarity:itemRarity(item)) as ItemRarity;
        const acquireSource=(['craft','loot','starting','migration'].includes(row.acquireSource)?row.acquireSource:'migration') as CraftedGearInstance['acquireSource'];
        const equippedSlot=GEAR_SLOTS.includes(row.equippedSlot)?row.equippedSlot as GearSlot:undefined;
        return [{
          id:String(row.id).slice(0,180),itemId:item.id,ownerCharacterId:String(row.ownerCharacterId).slice(0,120),rarity,
          acquireSource,sourceReceiptKey:String(row.sourceReceiptKey??row.id).slice(0,200),
          createdAtMs:Math.max(0,Math.floor(Number(row.createdAtMs)||0)),location:location(row.location),
          equippedSlot,enhancement:normalizeEnhancement(row.enhancement),
        }];
      }catch{return []}
    }).slice(-MAX_CRAFTED_GEAR_INSTANCES);
}

export function craftedGearInstances(state:GameState){return normalizeCraftedGearInstances(state.account.craftedGearInstances);}
export function craftedGearInstanceById(state:GameState,instanceId:string){return craftedGearInstances(state).find(row=>row.id===instanceId);}
export function craftedInstancesForItem(state:GameState,itemId:string,ownerCharacterId=state.character?.id){return craftedGearInstances(state).filter(row=>row.itemId===itemId&&(!ownerCharacterId||row.ownerCharacterId===ownerCharacterId));}
export function equippedGearInstanceId(state:GameState,itemId?:string){
  if(!state.character)return undefined;
  for(const slot of GEAR_SLOTS){
    const equippedItemId=state.character.equipment[slot],instanceId=state.character.equippedGearInstanceIds?.[slot];
    if(instanceId&&(!itemId||equippedItemId===itemId))return instanceId;
  }
  return undefined;
}
export function exactGearInstance(state:GameState,itemId:string,instanceId?:string){
  const id=instanceId??equippedGearInstanceId(state,itemId);if(!id)return undefined;
  const row=craftedGearInstanceById(state,id);return row?.itemId===itemId?row:undefined;
}
export function effectiveOwnedGearRarity(state:GameState,itemId:string,instanceId?:string):ItemRarity{
  return exactGearInstance(state,itemId,instanceId)?.rarity??itemRarity(itemDef(itemId));
}
export function gearInstanceEnhancement(state:GameState,itemId:string,instanceId?:string):GearEnhancementState|undefined{
  return exactGearInstance(state,itemId,instanceId)?.enhancement;
}
export function updateGearInstanceEnhancement(state:GameState,instanceId:string,enhancement:GearEnhancementState){
  const instances=craftedGearInstances(state),index=instances.findIndex(row=>row.id===instanceId);if(index<0)throw new Error('Equipment instance not found');
  const next=instances.slice();next[index]={...next[index],enhancement:normalizeEnhancement(enhancement)};
  return {...state,account:{...state.account,craftedGearInstances:next}} as GameState;
}
export function removeGearInstance(state:GameState,instanceId:string){
  return {...state,account:{...state.account,craftedGearInstances:craftedGearInstances(state).filter(row=>row.id!==instanceId)}} as GameState;
}
export function moveGearInstance(state:GameState,instanceId:string,nextLocation:CraftedGearInstance['location'],equippedSlot?:GearSlot){
  const instances=craftedGearInstances(state),index=instances.findIndex(row=>row.id===instanceId);if(index<0)return state;
  const next=instances.slice();next[index]={...next[index],location:nextLocation,equippedSlot:nextLocation==='equipped'?equippedSlot:undefined};
  return {...state,account:{...state.account,craftedGearInstances:next}} as GameState;
}
export function inventoryGearCopies(state:GameState,itemId:string){
  if(!state.character)return [] as CraftedGearInstance[];
  const quantity=state.inventory.stacks.find(row=>row.itemId===itemId)?.quantity??0;
  const owner=state.character.id,equippedIds=new Set(Object.values(state.character.equippedGearInstanceIds??{}).filter((id):id is string=>typeof id==='string'));
  const persisted=craftedInstancesForItem(state,itemId,owner).filter(row=>row.location==='inventory'&&!equippedIds.has(row.id)).sort((a,b)=>b.enhancement.rank-a.enhancement.rank||RARITY_ORDER[b.rarity]-RARITY_ORDER[a.rarity]||b.createdAtMs-a.createdAtMs||a.id.localeCompare(b.id));
  const result=persisted.slice(0,quantity),used=new Set(result.map(row=>row.id));
  for(let index=0;result.length<quantity;index++){const row=virtualInstance(owner,itemId,index);if(used.has(row.id)||craftedGearInstanceById(state,row.id))continue;result.push(row);used.add(row.id);}
  return result;
}
export function resolveGearSelection(state:GameState,ref:string){
  const persisted=craftedGearInstanceById(state,ref);if(persisted)return {itemId:persisted.itemId,instance:persisted,synthetic:false};
  const synthetic=parseSyntheticId(ref);
  if(synthetic&&state.character?.id===synthetic.ownerCharacterId){const item=itemDef(synthetic.itemId);if(item.type==='gear')return {itemId:item.id,instance:virtualInstance(synthetic.ownerCharacterId,item.id,synthetic.index),synthetic:true};}
  try{const item=itemDef(ref);if(item.type==='gear')return {itemId:item.id,instance:undefined,synthetic:false};}catch{}
  return undefined;
}
export function materializeGearSelection(state:GameState,ref:string){
  const resolved=resolveGearSelection(state,ref);if(!resolved)throw new Error('Equipment copy not found');
  if(resolved.instance&&!resolved.synthetic)return {state,instance:resolved.instance};
  if(!state.character)throw new Error('No character');
  const source=resolved.instance??inventoryGearCopies(state,resolved.itemId)[0]??virtualInstance(state.character.id,resolved.itemId,0);
  const instance:{[K in keyof CraftedGearInstance]:CraftedGearInstance[K]}={...source,ownerCharacterId:state.character.id,location:'inventory',acquireSource:source.acquireSource??'migration',enhancement:normalizeEnhancement(source.enhancement)};
  const instances=craftedGearInstances(state).filter(row=>row.id!==instance.id);
  const next={...state,account:{...state.account,craftedGearInstances:[...instances,instance].slice(-MAX_CRAFTED_GEAR_INSTANCES)}} as GameState;
  return {state:next,instance};
}

export function createCraftedGearInstance(state:GameState,args:{itemId:string;ownerCharacterId:string;jobId:string;createdAtMs:number;roll:number;location?:CraftedGearInstance['location']}){
  const rarity=craftedGearRarity(args.itemId,args.roll);
  const instance:CraftedGearInstance={
    id:`gear:${args.ownerCharacterId}:${args.jobId}`,itemId:args.itemId,ownerCharacterId:args.ownerCharacterId,rarity,
    acquireSource:'craft',sourceReceiptKey:args.jobId,createdAtMs:args.createdAtMs,location:args.location??'inventory',enhancement:emptyEnhancement(),
  };
  const existing=craftedGearInstances(state).filter(row=>row.sourceReceiptKey!==args.jobId);
  return {state:{...state,account:{...state.account,craftedGearInstances:[...existing,instance].slice(-MAX_CRAFTED_GEAR_INSTANCES)}},instance};
}

export function migrateLegacyEquipmentInstances(state:GameState):GameState{
  let instances=craftedGearInstances(state);
  const migrateCharacter=(character:NonNullable<GameState['character']>)=>{
    const legacy=character.gearEnhancements??{},mapped:{[K in GearSlot]?:string}={...character.equippedGearInstanceIds},used=new Set<string>();
    const upsert=(instance:CraftedGearInstance)=>{const index=instances.findIndex(row=>row.id===instance.id);if(index>=0)instances[index]=instance;else instances.push(instance);used.add(instance.id);return instance;};
    for(const slot of GEAR_SLOTS){
      const itemId=character.equipment[slot];if(!itemId)continue;
      let instance=mapped[slot]?instances.find(row=>row.id===mapped[slot]&&row.ownerCharacterId===character.id&&row.itemId===itemId):undefined;
      if(!instance){
        instance=instances.filter(row=>row.ownerCharacterId===character.id&&row.itemId===itemId&&!used.has(row.id)).sort((a,b)=>RARITY_ORDER[b.rarity]-RARITY_ORDER[a.rarity]||b.enhancement.rank-a.enhancement.rank||b.createdAtMs-a.createdAtMs)[0];
      }
      if(!instance){
        instance={id:`gear:migration:${encodeURIComponent(character.id)}:${slot}:${encodeURIComponent(itemId)}`,itemId,ownerCharacterId:character.id,rarity:itemRarity(itemDef(itemId)),acquireSource:'migration',sourceReceiptKey:`migration:equipped:${character.id}:${slot}:${itemId}`,createdAtMs:state.createdAtMs,location:'equipped',equippedSlot:slot,enhancement:emptyEnhancement()};
      }
      const legacyEnhancement=legacy[itemId];
      instance=upsert({...instance,location:'equipped',equippedSlot:slot,enhancement:legacyEnhancement?normalizeEnhancement(legacyEnhancement):instance.enhancement});
      mapped[slot]=instance.id;
    }
    for(const [itemId,enhancement] of Object.entries(legacy)){
      if(GEAR_SLOTS.some(slot=>character.equipment[slot]===itemId))continue;
      let instance=instances.find(row=>row.ownerCharacterId===character.id&&row.itemId===itemId&&!used.has(row.id));
      if(!instance)instance={id:`gear:migration:${encodeURIComponent(character.id)}:inventory:${encodeURIComponent(itemId)}`,itemId,ownerCharacterId:character.id,rarity:itemRarity(itemDef(itemId)),acquireSource:'migration',sourceReceiptKey:`migration:inventory:${character.id}:${itemId}`,createdAtMs:state.createdAtMs,location:'inventory',enhancement:emptyEnhancement()};
      upsert({...instance,location:instance.location==='bank'?'bank':'inventory',equippedSlot:undefined,enhancement:normalizeEnhancement(enhancement)});
    }
    return {...character,equippedGearInstanceIds:mapped,gearEnhancements:{}};
  };
  const character=state.character?migrateCharacter(state.character):null;
  const otherCharacters=(state.otherCharacters??[]).map(entry=>({...entry,character:migrateCharacter(entry.character)}));
  instances=instances.slice(-MAX_CRAFTED_GEAR_INSTANCES);
  return {...state,character,otherCharacters,account:{...state.account,craftedGearInstances:instances}};
}

export function reconcileActiveEquippedGearInstances(state:GameState,preferred?:Partial<Record<GearSlot,string>>):GameState{
  if(!state.character)return state;
  let instances=craftedGearInstances(state),mapped:Partial<Record<GearSlot,string>>={},used=new Set<string>();
  const current={...(state.character.equippedGearInstanceIds??{})};
  for(const slot of GEAR_SLOTS){
    const itemId=state.character.equipment[slot];if(!itemId)continue;
    const wanted=preferred?.[slot]??current[slot];
    let instance=wanted?instances.find(row=>row.id===wanted&&row.ownerCharacterId===state.character!.id&&row.itemId===itemId):undefined;
    if(!instance)instance=instances.find(row=>row.ownerCharacterId===state.character!.id&&row.itemId===itemId&&!used.has(row.id)&&row.location!=='equipped');
    if(!instance)instance=instances.find(row=>row.ownerCharacterId===state.character!.id&&row.itemId===itemId&&!used.has(row.id));
    if(!instance){
      instance={id:`gear:reconcile:${encodeURIComponent(state.character.id)}:${slot}:${encodeURIComponent(itemId)}:${state.createdAtMs}`,itemId,ownerCharacterId:state.character.id,rarity:itemRarity(itemDef(itemId)),acquireSource:'migration',sourceReceiptKey:`reconcile:${state.character.id}:${slot}:${itemId}`,createdAtMs:state.createdAtMs,location:'equipped',equippedSlot:slot,enhancement:emptyEnhancement()};
      instances.push(instance);
    }
    const index=instances.findIndex(row=>row.id===instance!.id);instances[index]={...instance,location:'equipped',equippedSlot:slot};mapped[slot]=instance.id;used.add(instance.id);
  }
  instances=instances.map(row=>row.ownerCharacterId===state.character!.id&&row.location==='equipped'&&!used.has(row.id)?{...row,location:'inventory' as const,equippedSlot:undefined}:row);
  return {...state,character:{...state.character,equippedGearInstanceIds:mapped},account:{...state.account,craftedGearInstances:instances.slice(-MAX_CRAFTED_GEAR_INSTANCES)}};
}

export function craftClaimSubRoll(trustedRoll:number,jobId:string){
  if(trustedRoll<0||trustedRoll>=1)throw new Error('Invalid crafted rarity roll');
  return deterministicCraftRarityRoll(`${trustedRoll.toFixed(12)}:${jobId}`);
}

export function craftedInstanceResult(state:GameState,instance:CraftedGearInstance){
  const copies=craftedInstancesForItem(state,instance.itemId,instance.ownerCharacterId),baseRarity=itemRarity(itemDef(instance.itemId));
  return {
    instanceId:instance.id,itemId:instance.itemId,rarity:instance.rarity,baseRarity,
    qualityProc:instance.rarity!==baseRarity,duplicateCount:Math.max(0,copies.length-1),
    statMultiplier:craftedRarityStatMultiplier(instance.itemId,instance.rarity),
  };
}

import {itemDef} from '../content/items';
import {equipmentSetDef} from '../content/equipment-sets';
import {itemRarity,type ItemRarity} from './item-rarity';
import type {GameState,GearEnhancementState,GearInstanceState,GearSlot} from './types';

export const CRAFTED_GEAR_RARITY_CHANCES:Readonly<Record<ItemRarity,number>>={
  common:.89,uncommon:.07,rare:.03,epic:.006,legendary:.003,mythic:.001,
};
export const CRAFTED_GEAR_RARITY_ORDER:ItemRarity[]=['common','uncommon','rare','epic','legendary','mythic'];
export const CRAFTED_GEAR_STAT_MULTIPLIER:Record<ItemRarity,number>={common:1,uncommon:1.03,rare:1.06,epic:1.10,legendary:1.14,mythic:1.18};

export function rollCraftedGearRarity(roll:number):ItemRarity{
  if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Invalid crafted rarity roll');
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic)return 'mythic';
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic+CRAFTED_GEAR_RARITY_CHANCES.legendary)return 'legendary';
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic+CRAFTED_GEAR_RARITY_CHANCES.legendary+CRAFTED_GEAR_RARITY_CHANCES.epic)return 'epic';
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic+CRAFTED_GEAR_RARITY_CHANCES.legendary+CRAFTED_GEAR_RARITY_CHANCES.epic+CRAFTED_GEAR_RARITY_CHANCES.rare)return 'rare';
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic+CRAFTED_GEAR_RARITY_CHANCES.legendary+CRAFTED_GEAR_RARITY_CHANCES.epic+CRAFTED_GEAR_RARITY_CHANCES.rare+CRAFTED_GEAR_RARITY_CHANCES.uncommon)return 'uncommon';
  return 'common';
}
export function derivedCraftRarityRoll(seed:number,key:string){
  let hash=Math.floor(seed*0x100000000)>>>0;
  for(const char of key)hash=(Math.imul(hash^char.charCodeAt(0),1664525)+1013904223)>>>0;
  return hash/0x100000000;
}
export function emptyEnhancement():GearEnhancementState{return {rank:0,failures:0,gemIds:[]};}

const validRarity=(value:unknown):value is ItemRarity=>['common','uncommon','rare','epic','legendary','mythic'].includes(String(value));
const validStorage=(value:unknown):value is GearInstanceState['storage']=>['inventory','bank','equipped'].includes(String(value));
export function normalizeGearInstances(raw:unknown):GearInstanceState[]{
  if(!Array.isArray(raw))return [];
  const seen=new Set<string>(),out:GearInstanceState[]=[];
  for(const row of raw as any[]){
    if(!row||typeof row!=='object'||typeof row.id!=='string'||seen.has(row.id)||typeof row.itemId!=='string'||typeof row.ownerCharacterId!=='string')continue;
    let item;try{item=itemDef(row.itemId)}catch{continue}
    if(item.type!=='gear'||!validRarity(row.craftedRarity)||!validStorage(row.storage))continue;
    seen.add(row.id);
    const enhancement=row.enhancement&&typeof row.enhancement==='object'?row.enhancement:{};
    const statGemId=typeof enhancement.statGemId==='string'?enhancement.statGemId:undefined,effectGemId=typeof enhancement.effectGemId==='string'?enhancement.effectGemId:undefined;
    out.push({
      id:row.id.slice(0,180),itemId:row.itemId,ownerCharacterId:row.ownerCharacterId,
      craftedRarity:row.craftedRarity,acquireSource:['craft','legacy_conversion','admin_repair','quest_grant'].includes(row.acquireSource)?row.acquireSource:'craft',
      createdAtMs:Math.max(0,Math.floor(Number(row.createdAtMs)||0)),storage:row.storage,
      equippedSlot:row.storage==='equipped'&&item.slot&&row.equippedSlot===item.slot?item.slot:undefined,
      enhancement:{rank:Math.max(0,Math.min(10,Math.floor(Number(enhancement.rank)||0))),failures:Math.max(0,Math.floor(Number(enhancement.failures)||0)),statGemId,effectGemId,gemIds:[statGemId,effectGemId].filter(Boolean) as string[]},
    });
  }
  return out.slice(-500);
}
export function gearInstances(state:GameState){return normalizeGearInstances(state.account.gearInstances);}
export function instancesForItem(state:GameState,itemId:string,storage?:GearInstanceState['storage']){
  return gearInstances(state).filter(row=>row.itemId===itemId&&(!storage||row.storage===storage));
}
export function equippedGearInstance(state:GameState,itemId:string){
  if(!state.character)return undefined;
  const id=Object.values(state.character.equippedGearInstanceIds??{}).find(instanceId=>gearInstances(state).some(row=>row.id===instanceId&&row.itemId===itemId));
  return id?gearInstances(state).find(row=>row.id===id):undefined;
}
export function rarityRank(rarity:ItemRarity){return CRAFTED_GEAR_RARITY_ORDER.indexOf(rarity);}
export function bestInventoryGearInstance(state:GameState,itemId:string){
  const characterId=state.character?.id;
  return instancesForItem(state,itemId,'inventory').filter(row=>!characterId||row.ownerCharacterId===characterId)
    .sort((a,b)=>rarityRank(b.craftedRarity)-rarityRank(a.craftedRarity)||b.enhancement.rank-a.enhancement.rank||a.createdAtMs-b.createdAtMs)[0];
}
export function gearInstanceRarityMultiplier(instance:GearInstanceState|undefined){return instance?CRAFTED_GEAR_STAT_MULTIPLIER[instance.craftedRarity]:1;}
export function addCraftedGearInstance(state:GameState,args:{itemId:string;ownerCharacterId:string;storage:'inventory'|'bank';createdAtMs:number;roll:number;instanceId?:string}){
  const item=itemDef(args.itemId);if(item.type!=='gear')throw new Error('Only equipment can have gear instances');
  const rarity=rollCraftedGearRarity(args.roll),existing=gearInstances(state),id=args.instanceId??`gear:${args.ownerCharacterId}:${args.itemId}:${args.createdAtMs}:${existing.length}`;
  if(existing.some(row=>row.id===id))throw new Error('Duplicate gear instance');
  const instance:GearInstanceState={id,itemId:args.itemId,ownerCharacterId:args.ownerCharacterId,craftedRarity:rarity,acquireSource:'craft',createdAtMs:args.createdAtMs,storage:args.storage,enhancement:emptyEnhancement()};
  return {state:{...state,account:{...state.account,gearInstances:[...existing,instance]}} as GameState,instance};
}
export function updateGearInstance(state:GameState,instanceId:string,patch:(instance:GearInstanceState)=>GearInstanceState){
  let found=false;
  const next=gearInstances(state).map(row=>row.id===instanceId?(found=true,patch(row)):row);
  if(!found)throw new Error('Gear instance not found');
  return {...state,account:{...state.account,gearInstances:next}} as GameState;
}
export function moveGearInstance(state:GameState,instanceId:string,storage:GearInstanceState['storage'],ownerCharacterId?:string,equippedSlot?:GearSlot){
  return updateGearInstance(state,instanceId,row=>({...row,storage,ownerCharacterId:ownerCharacterId??row.ownerCharacterId,equippedSlot:storage==='equipped'?equippedSlot:undefined}));
}
export function rarityBreakdownForItem(state:GameState,itemId:string,storage:'inventory'|'bank'){
  const rows=instancesForItem(state,itemId,storage),counts=new Map<ItemRarity,number>();
  for(const row of rows)counts.set(row.craftedRarity,(counts.get(row.craftedRarity)??0)+1);
  return CRAFTED_GEAR_RARITY_ORDER.slice().reverse().map(rarity=>({rarity,count:counts.get(rarity)??0})).filter(row=>row.count>0);
}

export function gearInstanceById(state:GameState,instanceId:string){return gearInstances(state).find(row=>row.id===instanceId);}
export function legacyStoredGearCount(state:GameState,itemId:string,storage:'inventory'|'bank'){
  const stack=state[storage].stacks.filter(row=>row.itemId===itemId).reduce((sum,row)=>sum+row.quantity,0);
  return Math.max(0,stack-instancesForItem(state,itemId,storage).length);
}
export function bestStoredGearInstance(state:GameState,itemId:string,storage:'inventory'|'bank'){
  return instancesForItem(state,itemId,storage).slice().sort((a,b)=>rarityRank(b.craftedRarity)-rarityRank(a.craftedRarity)||b.enhancement.rank-a.enhancement.rank||a.createdAtMs-b.createdAtMs)[0];
}
export function lowestStoredGearInstance(state:GameState,itemId:string,storage:'inventory'|'bank',requireDisposable=false){
  return instancesForItem(state,itemId,storage).filter(row=>!requireDisposable||!(row.enhancement.rank>0||row.enhancement.statGemId||row.enhancement.effectGemId))
    .slice().sort((a,b)=>rarityRank(a.craftedRarity)-rarityRank(b.craftedRarity)||a.enhancement.rank-b.enhancement.rank||a.createdAtMs-b.createdAtMs)[0];
}
export function removeGearInstance(state:GameState,instanceId:string){
  return {...state,account:{...state.account,gearInstances:gearInstances(state).filter(row=>row.id!==instanceId)}} as GameState;
}
export function moveStoredGearInstances(state:GameState,itemId:string,from:'inventory'|'bank',to:'inventory'|'bank',count:number){
  if(count<=0)return state;
  const candidates=instancesForItem(state,itemId,from).slice().sort((a,b)=>from==='inventory'
    ?rarityRank(a.craftedRarity)-rarityRank(b.craftedRarity)||a.createdAtMs-b.createdAtMs
    :rarityRank(b.craftedRarity)-rarityRank(a.craftedRarity)||a.createdAtMs-b.createdAtMs).slice(0,count);
  if(!candidates.length)return state;
  const ids=new Set(candidates.map(row=>row.id));
  return {...state,account:{...state.account,gearInstances:gearInstances(state).map(row=>ids.has(row.id)?{...row,storage:to}:row)}} as GameState;
}
export function rarityBreakdownForStack(state:GameState,itemId:string,storage:'inventory'|'bank',stackQuantity:number){
  const rows=rarityBreakdownForItem(state,itemId,storage),instanceCount=rows.reduce((sum,row)=>sum+row.count,0),legacy=Math.max(0,stackQuantity-instanceCount);
  const counts=new Map<ItemRarity,number>(rows.map(row=>[row.rarity,row.count]));
  if(legacy){const legacyRarity=itemRarity(itemDef(itemId));counts.set(legacyRarity,(counts.get(legacyRarity)??0)+legacy);}
  return CRAFTED_GEAR_RARITY_ORDER.slice().reverse().map(rarity=>({rarity,count:counts.get(rarity)??0})).filter(row=>row.count>0);
}
export function bestRarityForStack(state:GameState,itemId:string,storage:'inventory'|'bank',stackQuantity:number):ItemRarity{
  return rarityBreakdownForStack(state,itemId,storage,stackQuantity)[0]?.rarity??'common';
}

function legacyEnhancementProtected(state:GameState,itemId:string){
  const row=state.character?.gearEnhancements?.[itemId];
  return Boolean(row&&(row.rank>0||row.statGemId||row.effectGemId||row.gemIds?.length));
}
export function disposableStoredGearCount(state:GameState,itemId:string,storage:'inventory'|'bank'){
  const legacy=legacyStoredGearCount(state,itemId,storage),protectedLegacy=storage==='inventory'&&legacy>0&&legacyEnhancementProtected(state,itemId)?1:0;
  const instances=instancesForItem(state,itemId,storage).filter(row=>!(row.enhancement.rank>0||row.enhancement.statGemId||row.enhancement.effectGemId));
  return Math.max(0,legacy-protectedLegacy)+instances.length;
}
export function removeDisposableStoredGearCopies(state:GameState,itemId:string,storage:'inventory'|'bank',count:number){
  if(count<=0)return state;
  const legacy=legacyStoredGearCount(state,itemId,storage),protectedLegacy=storage==='inventory'&&legacy>0&&legacyEnhancementProtected(state,itemId)?1:0,disposableLegacy=Math.max(0,legacy-protectedLegacy),instanceNeeded=Math.max(0,count-disposableLegacy);
  if(instanceNeeded===0)return state;
  const candidates=instancesForItem(state,itemId,storage)
    .filter(row=>!(row.enhancement.rank>0||row.enhancement.statGemId||row.enhancement.effectGemId))
    .sort((a,b)=>rarityRank(a.craftedRarity)-rarityRank(b.craftedRarity)||a.createdAtMs-b.createdAtMs);
  if(candidates.length<instanceNeeded)throw new Error('Enhanced equipment is protected. Extract its gems before disposal; upgraded ranks cannot be recovered.');
  const removeIds=new Set(candidates.slice(0,instanceNeeded).map(row=>row.id));
  return {...state,account:{...state.account,gearInstances:gearInstances(state).filter(row=>!removeIds.has(row.id))}} as GameState;
}

export function ownedGearCopyCount(state:GameState,itemId:string,ownerCharacterId?:string){
  const owner=ownerCharacterId??state.character?.id;
  let count=state.inventory.stacks.filter(row=>row.itemId===itemId).reduce((sum,row)=>sum+row.quantity,0)+state.bank.stacks.filter(row=>row.itemId===itemId).reduce((sum,row)=>sum+row.quantity,0);
  if(state.character&&(!owner||state.character.id===owner)&&Object.values(state.character.equipment).includes(itemId))count++;
  for(const entry of state.otherCharacters??[])if((!owner||entry.character.id===owner)&&Object.values(entry.character.equipment).includes(itemId))count++;
  return count;
}
export function ownedSetPieceProgress(state:GameState,setId:string,ownerCharacterId?:string){
  const set=equipmentSetDef(setId);if(!set)return undefined;
  const owned=set.itemIds.filter(itemId=>ownedGearCopyCount(state,itemId,ownerCharacterId)>0).length;
  return {setId:set.id,setName:set.name,owned,required:set.itemIds.length,complete:owned>=set.itemIds.length};
}
export function craftedGearResultSummary(state:GameState,instance:GearInstanceState){
  const item=itemDef(instance.itemId),setProgress=item.equipmentSetId?ownedSetPieceProgress(state,item.equipmentSetId,instance.ownerCharacterId):undefined;
  return {
    instanceId:instance.id,itemId:item.id,name:item.name,rarity:instance.craftedRarity,
    statMultiplier:CRAFTED_GEAR_STAT_MULTIPLIER[instance.craftedRarity],
    statBonusPct:Math.round((CRAFTED_GEAR_STAT_MULTIPLIER[instance.craftedRarity]-1)*100),
    ownedCopies:ownedGearCopyCount(state,item.id,instance.ownerCharacterId),
    setProgress,
  };
}

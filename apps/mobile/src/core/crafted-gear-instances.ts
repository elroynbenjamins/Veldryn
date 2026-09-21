import {itemDef} from '../content/items';
import {rarityMeta,type ItemRarity} from './item-rarity';
import type {GameState,GearEnhancementState,GearInstanceState,GearSlot} from './types';

export const CRAFTED_GEAR_RARITY_CHANCES:Readonly<Record<Exclude<ItemRarity,'legendary'>,number>>={
  common:.893,uncommon:.07,rare:.03,epic:.006,mythic:.001,
};
export const CRAFTED_GEAR_RARITY_ORDER:ItemRarity[]=['common','uncommon','rare','epic','mythic'];

export function rollCraftedGearRarity(roll:number):Exclude<ItemRarity,'legendary'>{
  if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Invalid crafted rarity roll');
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic)return 'mythic';
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic+CRAFTED_GEAR_RARITY_CHANCES.epic)return 'epic';
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic+CRAFTED_GEAR_RARITY_CHANCES.epic+CRAFTED_GEAR_RARITY_CHANCES.rare)return 'rare';
  if(roll<CRAFTED_GEAR_RARITY_CHANCES.mythic+CRAFTED_GEAR_RARITY_CHANCES.epic+CRAFTED_GEAR_RARITY_CHANCES.rare+CRAFTED_GEAR_RARITY_CHANCES.uncommon)return 'uncommon';
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
export function gearInstanceRarityMultiplier(instance:GearInstanceState|undefined){return instance?rarityMeta(instance.craftedRarity).statMultiplier:1;}
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

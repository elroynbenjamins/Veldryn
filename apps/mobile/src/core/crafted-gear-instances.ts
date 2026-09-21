import type {CraftedGearInstance,GameState,GearEnhancementState} from './types';
import {craftedGearRarity,craftedRarityStatMultiplier,deterministicCraftRarityRoll} from './crafted-gear-rarity';
import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';

export const MAX_CRAFTED_GEAR_INSTANCES=500;

const emptyEnhancement=():GearEnhancementState=>({rank:0,failures:0,gemIds:[]});

export function normalizeCraftedGearInstances(raw:unknown):CraftedGearInstance[]{
  if(!Array.isArray(raw))return [];
  return raw.filter((row:any)=>row&&typeof row==='object'&&typeof row.id==='string'&&typeof row.itemId==='string'&&typeof row.ownerCharacterId==='string')
    .flatMap((row:any)=>{
      try{
        const item=itemDef(String(row.itemId));if(item.type!=='gear')return [];
        const rarity=(['common','uncommon','rare','epic','legendary','mythic'].includes(row.rarity)?row.rarity:itemRarity(item)) as ItemRarity;
        const enhancement=row.enhancement&&typeof row.enhancement==='object'?row.enhancement:{};
        return [{
          id:String(row.id).slice(0,180),itemId:item.id,ownerCharacterId:String(row.ownerCharacterId).slice(0,120),rarity,
          acquireSource:'craft' as const,sourceReceiptKey:String(row.sourceReceiptKey??row.id).slice(0,200),
          createdAtMs:Math.max(0,Math.floor(Number(row.createdAtMs)||0)),
          enhancement:{rank:Math.max(0,Math.min(10,Math.floor(Number(enhancement.rank)||0))),failures:Math.max(0,Math.floor(Number(enhancement.failures)||0)),statGemId:typeof enhancement.statGemId==='string'?enhancement.statGemId:undefined,effectGemId:typeof enhancement.effectGemId==='string'?enhancement.effectGemId:undefined,gemIds:Array.isArray(enhancement.gemIds)?enhancement.gemIds.filter((x:any)=>typeof x==='string').slice(0,2):[]},
        }];
      }catch{return []}
    }).slice(-MAX_CRAFTED_GEAR_INSTANCES);
}

export function craftedGearInstances(state:GameState){return normalizeCraftedGearInstances(state.account.craftedGearInstances);}
export function craftedInstancesForItem(state:GameState,itemId:string,ownerCharacterId=state.character?.id){return craftedGearInstances(state).filter(row=>row.itemId===itemId&&(!ownerCharacterId||row.ownerCharacterId===ownerCharacterId));}
export function bestCraftedInstanceForItem(state:GameState,itemId:string,ownerCharacterId=state.character?.id){
  return craftedInstancesForItem(state,itemId,ownerCharacterId).slice().sort((a,b)=>craftedRarityStatMultiplier(itemId,b.rarity)-craftedRarityStatMultiplier(itemId,a.rarity)||b.enhancement.rank-a.enhancement.rank||b.createdAtMs-a.createdAtMs)[0];
}
export function effectiveOwnedGearRarity(state:GameState,itemId:string,ownerCharacterId=state.character?.id):ItemRarity{
  return bestCraftedInstanceForItem(state,itemId,ownerCharacterId)?.rarity??itemRarity(itemDef(itemId));
}

export function createCraftedGearInstance(state:GameState,args:{itemId:string;ownerCharacterId:string;jobId:string;createdAtMs:number;roll:number}){
  const rarity=craftedGearRarity(args.itemId,args.roll);
  const instance:CraftedGearInstance={
    id:`gear:${args.ownerCharacterId}:${args.jobId}`,itemId:args.itemId,ownerCharacterId:args.ownerCharacterId,rarity,
    acquireSource:'craft',sourceReceiptKey:args.jobId,createdAtMs:args.createdAtMs,enhancement:emptyEnhancement(),
  };
  const existing=craftedGearInstances(state).filter(row=>row.sourceReceiptKey!==args.jobId);
  return {state:{...state,account:{...state.account,craftedGearInstances:[...existing,instance].slice(-MAX_CRAFTED_GEAR_INSTANCES)}},instance};
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

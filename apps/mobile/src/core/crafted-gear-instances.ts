import type {GearInstance,GameState,GearInstanceLocation} from './types';
import {craftedGearRarity,craftedRarityStatMultiplier,deterministicCraftRarityRoll} from './crafted-gear-rarity';
import {itemDef} from '../content/items';
import {itemRarity} from './item-rarity';
import {gearInstances,gearInstancesForItem,normalizeGearInstances,upsertGearInstance} from './gear-instances';

/** Legacy deserializer kept for saves written by the transitional Forge pass. */
export function normalizeCraftedGearInstances(raw:unknown){return normalizeGearInstances(raw).filter(row=>row.acquireSource==='craft');}
export function craftedGearInstances(state:GameState){return gearInstances(state).filter(row=>row.acquireSource==='craft');}
export function craftedInstancesForItem(state:GameState,itemId:string,ownerCharacterId=state.character?.id){
  return gearInstancesForItem(state,itemId,ownerCharacterId).filter(row=>row.acquireSource==='craft');
}

export function createCraftedGearInstance(state:GameState,args:{itemId:string;ownerCharacterId:string;jobId:string;createdAtMs:number;roll:number;location?:GearInstanceLocation}){
  const rarity=craftedGearRarity(args.itemId,args.roll);
  const instance:GearInstance={
    id:`gear:${args.ownerCharacterId}:${args.jobId}`,itemId:args.itemId,ownerCharacterId:args.ownerCharacterId,rarity,
    acquireSource:'craft',sourceReceiptKey:args.jobId,createdAtMs:args.createdAtMs,location:args.location??'inventory',
    enhancement:{rank:0,failures:0,gemIds:[]},
  };
  return {state:upsertGearInstance(state,instance),instance};
}

export function craftClaimSubRoll(trustedRoll:number,jobId:string){
  if(trustedRoll<0||trustedRoll>=1)throw new Error('Invalid crafted rarity roll');
  return deterministicCraftRarityRoll(`${trustedRoll.toFixed(12)}:${jobId}`);
}

export function craftedInstanceResult(state:GameState,instance:GearInstance){
  const copies=gearInstancesForItem(state,instance.itemId,instance.ownerCharacterId),baseRarity=itemRarity(itemDef(instance.itemId));
  return {
    instanceId:instance.id,itemId:instance.itemId,rarity:instance.rarity,baseRarity,
    qualityProc:instance.rarity!==baseRarity,duplicateCount:Math.max(0,copies.length-1),
    statMultiplier:craftedRarityStatMultiplier(instance.itemId,instance.rarity),
  };
}

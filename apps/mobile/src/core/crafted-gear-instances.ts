import type {CraftedGearInstance,GameState,GearEnhancementState,GearSlot,ItemStack} from './types';
import {craftedGearRarity,craftedRarityStatMultiplier,deterministicCraftRarityRoll} from './crafted-gear-rarity';
import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';

export const MAX_CRAFTED_GEAR_INSTANCES=500;
/** Existing Forge records have no quality roll. Show them at the neutral midpoint without rewriting their receipts or treating them as safe auto-sale candidates. */
export const CRAFTED_GEAR_QUALITY_MIN=0;
export const CRAFTED_GEAR_QUALITY_MAX=100;
export const LEGACY_CRAFTED_GEAR_QUALITY=50;
/** Gentle high-roll scarcity: Q90+ drops from about 10.9% to 8.8%; Q0–Q100 stay reachable. */
export const CRAFTED_GEAR_QUALITY_POWER=1.25;
export function isValidCraftedGearQuality(quality:unknown):quality is number{
  return typeof quality==='number'&&Number.isInteger(quality)
    &&quality>=CRAFTED_GEAR_QUALITY_MIN&&quality<=CRAFTED_GEAR_QUALITY_MAX;
}
export function craftedGearDisplayQuality(instance:Pick<CraftedGearInstance,'quality'>):number{
  return instance.quality??LEGACY_CRAFTED_GEAR_QUALITY;
}
/** Proposed account-wide, per-base-item copy limit. Do not enforce until per-copy disposal is available. */
export const TARGET_CRAFTED_GEAR_COPIES_PER_ITEM=7;

/** Quality is persisted on each instance; new rolls gently favor lower grades. */
export function craftedGearQualityFromUnitRoll(roll:number){
  if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Invalid crafted quality roll');
  return Math.min(CRAFTED_GEAR_QUALITY_MAX,Math.floor(Math.pow(roll,CRAFTED_GEAR_QUALITY_POWER)*(CRAFTED_GEAR_QUALITY_MAX+1)));
}
/** Approximate probability for the player-facing odds guide (the seeded RNG has 1,000,000 discrete values). */
export function craftedGearQualityChanceAtLeast(quality:number){
  if(!isValidCraftedGearQuality(quality))throw new Error('Invalid quality threshold');
  return 1-Math.pow(quality/(CRAFTED_GEAR_QUALITY_MAX+1),1/CRAFTED_GEAR_QUALITY_POWER);
}
export function craftedGearQualityRoll(trustedRoll:number,jobId:string){
  if(!Number.isFinite(trustedRoll)||trustedRoll<0||trustedRoll>=1)throw new Error('Invalid crafted quality roll');
  return craftedGearQualityFromUnitRoll(deterministicCraftRarityRoll(`quality:${trustedRoll.toFixed(12)}:${jobId}`));
}
/** Forge quality modifies base equipment stats from 75% (Q0) to 125% (Q100). */
export function craftedGearQualityMultiplier(quality:number){
  if(!isValidCraftedGearQuality(quality))throw new Error('Invalid crafted quality');
  return 0.75+quality*0.005;
}

/** Retain already-persisted stat variance from the previous forge system. */
export const CRAFTED_STAT_VARIANCE=0.15;
function clampStatRoll(raw:unknown):number|undefined{
 return typeof raw==='number'&&Number.isFinite(raw)&&raw>=0&&raw<1?raw:undefined;
}
export function craftedInstanceStatVarianceMultiplier(instance:Pick<CraftedGearInstance,'statRoll'>|undefined):number{
 return typeof instance?.statRoll==='number'?1-CRAFTED_STAT_VARIANCE+instance.statRoll*CRAFTED_STAT_VARIANCE*2:1;
}

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
          // Preserve absence as a legacy marker. In particular, do not invent an authoritative Forge roll.
          quality:isValidCraftedGearQuality(row.quality)?row.quality:undefined,
          locked:row.locked===true,
          statRoll:clampStatRoll(row.statRoll),
          acquireSource:'craft' as const,sourceReceiptKey:String(row.sourceReceiptKey??row.id).slice(0,200),
          createdAtMs:Math.max(0,Math.floor(Number(row.createdAtMs)||0)),
          enhancement:{rank:Math.max(0,Math.min(4,Math.floor(Number(enhancement.rank)||0))),failures:Math.max(0,Math.floor(Number(enhancement.failures)||0)),statGemId:typeof enhancement.statGemId==='string'?enhancement.statGemId:undefined,effectGemId:typeof enhancement.effectGemId==='string'?enhancement.effectGemId:undefined,gemIds:Array.isArray(enhancement.gemIds)?enhancement.gemIds.filter((x:any)=>typeof x==='string').slice(0,2):[]},
        }];
      }catch{return []}
    }); // Never silently discard existing equipment while loading an older or oversized save.
}

export function craftedGearInstances(state:GameState){return normalizeCraftedGearInstances(state.account.craftedGearInstances);}
export function craftedInstancesForItem(state:GameState,itemId:string,ownerCharacterId=state.character?.id){return craftedGearInstances(state).filter(row=>row.itemId===itemId&&(!ownerCharacterId||row.ownerCharacterId===ownerCharacterId));}
/** Read-only capacity projection until inventory/bank/equipped items select instance IDs for safe disposal. */
export function craftedGearCopyCapacity(state:GameState,itemId:string){
  // Existing equipment may predate unique Forge instances or originate from
  // non-Forge rewards. Never undercount those physical copies while projecting
  // the eventual seven-copy account-wide cap.
  const audit=craftedGearLegacyOwnershipAudit(state,itemId);
  const count=Math.max(audit.physicalCopies,audit.recordedCraftedCopies);
  return {count,limit:TARGET_CRAFTED_GEAR_COPIES_PER_ITEM,remaining:Math.max(0,TARGET_CRAFTED_GEAR_COPIES_PER_ITEM-count),verified:false as const};
}
/** Account-wide legacy ownership audit before any item-ID -> instance-ID migration.
 * Counts every physical location without guessing which identical copy it holds.
 * A balanced count is NOT proof of ownership, locks, socketing or loadout safety.
 */
export function craftedGearLegacyOwnershipAudit(state:GameState,itemId:string){
  const count=(stacks:readonly {itemId:string;quantity:number}[]|undefined)=>
    (stacks??[]).reduce((sum,stack)=>sum+(stack.itemId===itemId&&Number.isSafeInteger(stack.quantity)&&stack.quantity>0?stack.quantity:0),0);
  const equipped=(equipment:object|undefined)=>
    Object.values(equipment??{}).filter(id=>id===itemId).length;
  const characterInventory=count(state.inventory.stacks)
    +(state.otherCharacters??[]).reduce((sum,entry)=>sum+count(entry.inventory.stacks),0);
  const characterOverflow=count(state.overflow.stacks)
    +(state.otherCharacters??[]).reduce((sum,entry)=>sum+count(entry.overflow.stacks),0);
  const equippedCopies=equipped(state.character?.equipment)
    +(state.otherCharacters??[]).reduce((sum,entry)=>sum+equipped(entry.character.equipment),0);
  const bankCopies=count(state.bank.stacks);
  const physicalCount=characterInventory+characterOverflow+equippedCopies+bankCopies;
  const instances=craftedGearInstances(state).filter(row=>row.itemId===itemId);
  return {
    itemId,
    recordedCraftedCopies:instances.length,
    physicalCopies:physicalCount,
    inventoryCopies:characterInventory,
    bankCopies,
    overflowCopies:characterOverflow,
    equippedCopies,
    /** Physical stacks may also contain uncrafted gear, hence this is only a lower-bound warning. */
    minimumUnlocatedInstanceCount:Math.max(0,instances.length-physicalCount),
    possibleUntrackedCopies:Math.max(0,physicalCount-instances.length),
    /** No copy-specific ownership evidence exists in legacy itemId-only slots. */
    verifiedForAutoSell:false as const,
  };
}

export function bestCraftedInstanceForItem(state:GameState,itemId:string,ownerCharacterId=state.character?.id){
  return craftedInstancesForItem(state,itemId,ownerCharacterId).slice().sort((a,b)=>craftedRarityStatMultiplier(itemId,b.rarity)-craftedRarityStatMultiplier(itemId,a.rarity)||b.enhancement.rank-a.enhancement.rank||craftedGearDisplayQuality(b)-craftedGearDisplayQuality(a)||b.createdAtMs-a.createdAtMs)[0];
}
/** A visual rarity must belong to the exact physical copy, not the strongest copy elsewhere. */
export function craftedGearStackRarity(state:GameState,stack:Pick<ItemStack,'itemId'|'instanceId'>):ItemRarity{
  const base=itemRarity(itemDef(stack.itemId));
  if(!stack.instanceId)return base;
  const instance=craftedGearInstances(state).find(row=>row.id===stack.instanceId&&row.itemId===stack.itemId);
  return instance?.rarity??base;
}

/** The current character's equipped slot has its own unique receipt. */
export function equippedCraftedGearRarity(state:GameState,slot:GearSlot):ItemRarity|undefined{
  const itemId=state.character?.equipment?.[slot];
  if(!itemId)return undefined;
  return craftedGearStackRarity(state,{itemId,instanceId:state.character?.equipmentInstanceIds?.[slot]});
}

export function effectiveOwnedGearRarity(state:GameState,itemId:string,ownerCharacterId=state.character?.id):ItemRarity{
  return bestCraftedInstanceForItem(state,itemId,ownerCharacterId)?.rarity??itemRarity(itemDef(itemId));
}

export function draftCraftedGearInstance(args:{itemId:string;ownerCharacterId:string;jobId:string;createdAtMs:number;roll:number}):CraftedGearInstance{
  return {
    id:`gear:${args.ownerCharacterId}:${args.jobId}`,itemId:args.itemId,ownerCharacterId:args.ownerCharacterId,
    rarity:craftedGearRarity(args.itemId,args.roll),quality:craftedGearQualityRoll(args.roll,args.jobId),
    locked:false,statRoll:deterministicCraftRarityRoll(`stat:${args.jobId}:${args.ownerCharacterId}`),acquireSource:'craft',sourceReceiptKey:args.jobId,createdAtMs:args.createdAtMs,enhancement:emptyEnhancement(),
  };
}
export function createCraftedGearInstance(state:GameState,args:{itemId:string;ownerCharacterId:string;jobId:string;createdAtMs:number;roll:number}){
  const previous=craftedGearInstances(state);
  if(previous.some(row=>row.sourceReceiptKey===args.jobId))throw new Error('Crafting receipt has already been claimed');
  if(previous.length>=MAX_CRAFTED_GEAR_INSTANCES)throw new Error('Crafted equipment storage is full; existing equipment was not removed');
  const instance=draftCraftedGearInstance(args);
  return {state:{...state,account:{...state.account,craftedGearInstances:[...previous,instance]}},instance};
}

export function craftClaimSubRoll(trustedRoll:number,jobId:string){
  if(trustedRoll<0||trustedRoll>=1)throw new Error('Invalid crafted rarity roll');
  return deterministicCraftRarityRoll(`${trustedRoll.toFixed(12)}:${jobId}`);
}

export function craftedInstanceResult(state:GameState,instance:CraftedGearInstance){
  const copies=craftedInstancesForItem(state,instance.itemId,instance.ownerCharacterId),baseRarity=itemRarity(itemDef(instance.itemId));
  return {
    instanceId:instance.id,itemId:instance.itemId,rarity:instance.rarity,quality:instance.quality,baseRarity,
    qualityProc:instance.rarity!==baseRarity,duplicateCount:Math.max(0,copies.length-1),
    statMultiplier:craftedRarityStatMultiplier(instance.itemId,instance.rarity)*(instance.quality===undefined?1:craftedGearQualityMultiplier(instance.quality)),
    autoSold:undefined as 'incoming'|'existing'|undefined,saleGold:0,
  };
}

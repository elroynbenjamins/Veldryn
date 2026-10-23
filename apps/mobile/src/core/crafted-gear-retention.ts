import type {CraftedGearInstance} from './types';
import {TARGET_CRAFTED_GEAR_COPIES_PER_ITEM} from './crafted-gear-instances';
import {rarityMeta} from './item-rarity';

/**
 * Preview-only settlement policy for future instance-aware Forge claims.
 * NEVER use this decision to remove an item from the legacy itemId-only stacks.
 * The authoritative caller must resolve exact instance locations and commit the
 * sale, Gold credit, Forge receipt and new copy together in one transaction.
 */
export type CraftedGearAutoSellMode='off'|'keep_best_seven';
export type CraftedGearInstanceLocation='inventory'|'bank'|'equipped'|'unknown';

export interface CraftedGearRetentionEntry {
  instance:CraftedGearInstance;
  /** Must be verified by the server; never inferred from itemId-only stacks. */
  location:CraftedGearInstanceLocation;
  /** Current character carrying this item, not necessarily the original crafter. */
  holderCharacterId?:string;
  /** Explicitly resolved by the authoritative account snapshot, never inferred from itemId. */
  ownershipVerified?:boolean;
  /** Includes every character's equipment, Favorites, locks, sockets and loadouts. */
  protectionsVerified?:boolean;
  locked?:boolean;
  favorite?:boolean;
  savedLoadout?:boolean;
}

export type CraftedGearRetentionDecision=
  |{action:'keep';reason:'under_limit'}
  |{action:'sell_incoming';reason:'incoming_is_weakest';instanceId:string}
  |{action:'sell_existing';reason:'replace_weaker_unprotected';instanceId:string}
  |{action:'manual_review';reason:'disabled'|'over_limit'|'inconsistent_instances'|'legacy_unknown_quality'|'incoming_protected'|'no_eligible_copy'};

/** Base rarity and quality both matter; a higher tier dominates the <=10% quality spread. */
export function craftedGearRetentionPower(instance:CraftedGearInstance){
  if(instance.quality===undefined||!Number.isInteger(instance.quality)||instance.quality<1||instance.quality>100)throw new Error('Unrolled crafted quality');
  const quality=.95+(instance.quality-1)/99*.1;
  return rarityMeta(instance.rarity).statMultiplier*quality;
}

export function compareCraftedGearRetentionPower(a:CraftedGearInstance,b:CraftedGearInstance){
  const delta=craftedGearRetentionPower(a)-craftedGearRetentionPower(b);
  return Math.abs(delta)<1e-9?0:delta<0?-1:1;
}

export function craftedGearCanAutoSell(entry:CraftedGearRetentionEntry){
  const gear=entry.instance,enhancement=gear.enhancement;
  return (entry.location==='inventory'||entry.location==='bank')
    &&(entry.location==='bank'||(typeof entry.holderCharacterId==='string'&&entry.holderCharacterId.length>0))
    &&entry.ownershipVerified===true&&entry.protectionsVerified===true
    &&entry.locked===false&&entry.favorite===false&&entry.savedLoadout===false
    &&enhancement.rank===0
    &&!enhancement.statGemId&&!enhancement.effectGemId
    &&enhancement.gemIds.length===0;
}

/**
 * Decide whether the newest roll or an existing *unprotected* instance is the
 * weakest disposable copy. Equal rolls retain the older owned item.
 *
 * This does NOT mutate state. In particular, claim-time money/storage effects
 * and receipt fencing must happen in a server-owned transaction after exact
 * per-copy inventory/equipment identity has been migrated.
 */
export function planCraftedGearRetention(
  existing:readonly CraftedGearRetentionEntry[],
  incoming:CraftedGearInstance,
  mode:CraftedGearAutoSellMode,
):CraftedGearRetentionDecision{
  if(existing.length>TARGET_CRAFTED_GEAR_COPIES_PER_ITEM)return {action:'manual_review',reason:'over_limit'};
  if(existing.some(row=>row.instance.itemId!==incoming.itemId)||new Set([...existing.map(row=>row.instance.id),incoming.id]).size!==existing.length+1)
    return {action:'manual_review',reason:'inconsistent_instances'};
  // Copies may be legacy/unrolled while there is still room. Do not require
  // a quality ranking before the item reaches its seven-copy pool limit.
  if(existing.length<TARGET_CRAFTED_GEAR_COPIES_PER_ITEM)return {action:'keep',reason:'under_limit'};
  if(mode==='off')return {action:'manual_review',reason:'disabled'};
  const validQuality=(quality:number|undefined)=>quality!==undefined&&Number.isInteger(quality)&&quality>=1&&quality<=100;
  if(existing.some(row=>!validQuality(row.instance.quality))||!validQuality(incoming.quality))
    return {action:'manual_review',reason:'legacy_unknown_quality'};
  // Newly minted gear has not entered any storage location; inspect its actual
  // enhancement instead of pretending it already has verified Inventory ownership.
  const enhancement=incoming.enhancement;
  if(enhancement.rank!==0||enhancement.statGemId||enhancement.effectGemId||enhancement.gemIds.length>0)
    return {action:'manual_review',reason:'incoming_protected'};
  const weakestOverall=existing.slice().sort((a,b)=>compareCraftedGearRetentionPower(a.instance,b.instance)||a.instance.id.localeCompare(b.instance.id))[0];
  if(compareCraftedGearRetentionPower(incoming,weakestOverall.instance)<=0)
    return {action:'sell_incoming',reason:'incoming_is_weakest',instanceId:incoming.id};
  const eligible=existing.filter(craftedGearCanAutoSell)
    .sort((a,b)=>compareCraftedGearRetentionPower(a.instance,b.instance)||a.instance.id.localeCompare(b.instance.id));
  if(!eligible.length)return {action:'manual_review',reason:'no_eligible_copy'};
  const weakestEligible=eligible[0];
  // Do not sacrifice an older, stronger piece when the new roll cannot improve it.
  if(compareCraftedGearRetentionPower(incoming,weakestEligible.instance)<=0)
    return {action:'sell_incoming',reason:'incoming_is_weakest',instanceId:incoming.id};
  return {action:'sell_existing',reason:'replace_weaker_unprotected',instanceId:weakestEligible.instance.id};
}

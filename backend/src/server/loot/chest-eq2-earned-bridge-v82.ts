/**
 * V82 hidden claim-side parity: no player or newer catalogue can replace the
 * *earned* table, tier, boss or receipt before the real EQ2 physical issuer.
 *
 * This returns a blocked V71 candidate only. NO stats rolled, item minted,
 * inventory mutated, currency paid, event started or chest opened.
 */
import type {FrozenChestReceiptV69} from './chest-reward-settlement-v69';
import type {EarnedChestEntitlementV80} from './chest-earned-entitlement-v80';
import {planChestEquipmentV71,
 type ChestEquipmentCandidateV71} from './chest-equipment-bridge-v71';
import {defineChestLootTableV67} from './chest-loot-engine-v67';

export const CHEST_EARNED_EQ2_BRIDGE_V82_RELEASED=false;
export const CHEST_EARNED_EQ2_BRIDGE_V82_VERSION='chest-earned-eq2-v82' as const;
export interface FrozenEarnedGearCandidateV82{
 readonly item:ChestEquipmentCandidateV71;
 readonly sourceTier:number;
 readonly phase:'unissued_t1_to_t5'|'deferred_future_tier';
 readonly claimEnabled:false;
 readonly safeToMint:false;
}
export function planFrozenEarnedChestGearV82(
 receipt:FrozenChestReceiptV69,
 dropIndex:number,
 earned:EarnedChestEntitlementV80,
):FrozenEarnedGearCandidateV82|null{
 if(!receipt||!earned||receipt.committed!==true||
  earned.paid!==false||earned.opened!==false||
  earned.equipmentRolled!==false||earned.claimEnabled!==false||
  receipt.sourceKey!==earned.sourceKey||
  receipt.accountId!==earned.accountId||
  receipt.proofVersion!==earned.proofVersion||
  receipt.tableId!==earned.tableId||
  receipt.tableVersion!==earned.tableVersion||
  !Number.isSafeInteger(earned.tier)||earned.tier<1||earned.tier>9)
  throw Error('chest_v82_forged_earned_equipment_identity');
 const table=defineChestLootTableV67(earned.frozenLootTable);
 if(table.tableId!==earned.tableId||table.version!==earned.tableVersion||
  receipt.guaranteed.length!==table.guarantees.length||
  receipt.guaranteed.some((g,i)=>g.id!==table.guarantees[i]?.id||
   g.quantity!==table.guarantees[i]?.quantity)||
  receipt.groups.length!==table.groups.length||
  receipt.groups.some((g,i)=>{
   const frozen=table.groups[i];
   return !frozen||g.groupId!==frozen.id||
    g.type!==frozen.type||g.chanceBps!==frozen.chanceBps||
    (g.entryId!==null&&!frozen.entries.some(e=>
     e.id===g.entryId&&e.quantity===g.quantity));
  })||
  receipt.drops.some(drop=>{
   const group=table.groups.find(g=>g.id===drop.groupId);
   return !group||group.type!==drop.type||
    !group.entries.some(e=>
     e.id===drop.entryId&&e.quantity===drop.quantity);
  }))
  throw Error('chest_v82_earned_loot_table_changed');
 // A frozen hit group must correspond exactly once to an issued drop.
 // Checking membership alone could accidentally authorize an invented second
 // equipment drop even when the canonical group missed.
 const projected=receipt.groups.filter(g=>g.entryId!==null);
 if(projected.length!==receipt.drops.length||
  projected.some((g,i)=>g.entryId!==receipt.drops[i]?.entryId||
   g.groupId!==receipt.drops[i]?.groupId||
   g.quantity!==receipt.drops[i]?.quantity||
   g.type!==receipt.drops[i]?.type)||
  receipt.groups.some(g=>g.entryId===null&&
   (g.quantity!==0||g.hit!==false)))
  throw Error('chest_v82_forged_group_drop_pairing');
 if(dropIndex<0||!Number.isInteger(dropIndex)||
  dropIndex>=receipt.drops.length)
  throw Error('chest_v82_invalid_drop_index');
 if(receipt.drops[dropIndex]?.type!=='equipment')return null;
 const world=earned.family==='world_boss';
 if((world&&(
   !earned.bossId||receipt.tableId!=='world_boss_chest'||
   receipt.equipmentDeliveryMode!=='account_unclaimed'||
   receipt.recipientCharacterId!==null))||
  (!world&&(
   earned.bossId!==null||receipt.tableId!=='party_event_chest'||
   receipt.equipmentDeliveryMode!=='character'||
   !receipt.recipientCharacterId)))
  throw Error('chest_v82_wrong_account_custody');
 const candidate=planChestEquipmentV71(receipt,dropIndex,{
  tier:earned.tier as 1|2|3|4|5|6|7|8|9,
  ...(world?{bossId:earned.bossId as 'hollowroot'|'sunscar'|'frostmarch'}:{}),
 });
 if(candidate.readyForIssuance!==false||candidate.tier!==earned.tier||
  candidate.accountId!==earned.accountId)
  throw Error('chest_v82_unregistered_item_issuance');
 return {item:candidate,sourceTier:earned.tier,
  phase:earned.tier<=5?'unissued_t1_to_t5':'deferred_future_tier',
  claimEnabled:false,safeToMint:false};
}

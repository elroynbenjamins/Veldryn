/**
 * World Boss V62 — hidden Equipment 2.0 gathering-item issuance boundary.
 *
 * This is a strict data contract for a future transaction-local equipment
 * issuer, NOT a function that inserts inventory. World Boss gear is separate
 * from the older combat-only EquipmentItemInstanceV26 schema: that schema
 * cannot express a 10-slot, quality/affix, gathering-only item.
 */
import {
 validateWorldBossGatheringRollV65,worldBossGatheringSetV64,
 type WorldBossGatheringRolledGearV65,
 type WorldBossGatheringBossV64,
} from './world-boss-gathering-loot-v64';
import {WORLD_BOSS_GEAR_SLOTS_V58,type WorldBossGearSlotV58} from './world-boss-chests-v58';
import type {EquipmentTierIdV33,EquipmentSlotV33} from '../equipment/equipment-types-v33';
import type {WorldBossChestResolutionV60} from './world-boss-chest-resolution-v60';

export const WORLD_BOSS_GATHERING_INSTANCE_V62_LIVE=false as const;
export const WORLD_BOSS_GATHERING_ISSUER_VERSION_V62='world-boss-gathering-item-v62' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const WORLD_BOSS_TO_EQUIPMENT_SLOT_V62:Readonly<Record<WorldBossGearSlotV58,EquipmentSlotV33>>={
 helmet:'Helmet',chest:'Chest',gloves:'Gloves',legs:'Legs',
 boots:'Boots',weapon:'Weapon',offhand:'Off-hand',cape:'Cape',
 amulet:'Amulet',ring:'Ring',
};
export const WORLD_BOSS_EQUIPMENT_TIERS_V62:readonly EquipmentTierIdV33[]=[
 'T1','T2','T3','T4','T5','T6','T7','T8','T9',
];
export interface WorldBossEquipmentMintRequestV62{
 readonly sourceKey:string;readonly eventId:string;readonly accountId:string;
 readonly bossId:WorldBossGatheringBossV64;
 readonly tier:EquipmentTierIdV33;
 readonly slot:EquipmentSlotV33;
 readonly pieceId:string;readonly setId:string;
 readonly roll:WorldBossGatheringRolledGearV65;
 readonly acquireSource:'world_boss_chest';
 readonly issuerVersion:typeof WORLD_BOSS_GATHERING_ISSUER_VERSION_V62;
}
export interface WorldBossFrozenEquipmentReceiptV62
 extends WorldBossEquipmentMintRequestV62{
 readonly instanceId:string;
 readonly custody:'account_bound_unclaimed_inventory';
 readonly mutable:false;
}
function validTier(tier:unknown):tier is EquipmentTierIdV33{
 return WORLD_BOSS_EQUIPMENT_TIERS_V62.includes(tier as EquipmentTierIdV33);
}
export function makeWorldBossEquipmentMintRequestV62(
 resolution:WorldBossChestResolutionV60,tier:EquipmentTierIdV33,
):WorldBossEquipmentMintRequestV62|null{
 if(!resolution||resolution.mode!=='nonpaying_private_settlement_plan'||
  !UUID.test(resolution.eventId)||!UUID.test(resolution.accountId)||
  !resolution.sourceKey.startsWith('world-boss:'+resolution.eventId+':'+resolution.accountId+':')||
  resolution.worldSigilsGranted!==0||!validTier(tier))
  throw Error('world_boss_v62_invalid_issue_context');
 if(resolution.selectedSlot===null||resolution.gear===null){
  if(resolution.selectedSlot!==null||resolution.gear!==null)
   throw Error('world_boss_v62_partial_gear_hit');
  return null;
 }
 const slot=resolution.selectedSlot;
 if(!WORLD_BOSS_GEAR_SLOTS_V58.includes(slot)||
  !validateWorldBossGatheringRollV65(resolution.gear)||
  resolution.gear.slot!==slot)
  throw Error('world_boss_v62_invalid_item_roll');
 const set=worldBossGatheringSetV64(resolution.bossId as WorldBossGatheringBossV64);
 if(set.setId!==resolution.gear.setId||set.skill!==resolution.gear.skill||
  resolution.gear.combatPowerBonus!==0)
  throw Error('world_boss_v62_wrong_skill_or_set');
 return {
  sourceKey:resolution.sourceKey,eventId:resolution.eventId,
  accountId:resolution.accountId,bossId:set.bossId,tier,
  slot:WORLD_BOSS_TO_EQUIPMENT_SLOT_V62[slot],
  pieceId:resolution.gear.itemId,setId:set.setId,
  roll:resolution.gear,acquireSource:'world_boss_chest',
  issuerVersion:WORLD_BOSS_GATHERING_ISSUER_VERSION_V62,
 };
}
/**
 * Exact equality (including Q, rarity, affixes and tier) is required.
 * The private DB enforces unique(sourceKey) and unique(instanceId) separately.
 */
export function assertWorldBossFrozenItemV62(
 expected:WorldBossEquipmentMintRequestV62,
 actual:WorldBossFrozenEquipmentReceiptV62,
):void{
 if(!actual||typeof actual.instanceId!=='string'||!UUID.test(actual.instanceId)||
  actual.custody!=='account_bound_unclaimed_inventory'||
  actual.mutable!==false||actual.sourceKey!==expected.sourceKey||
  actual.eventId!==expected.eventId||actual.accountId!==expected.accountId||
  actual.bossId!==expected.bossId||actual.tier!==expected.tier||
  actual.slot!==expected.slot||actual.pieceId!==expected.pieceId||
  actual.setId!==expected.setId||actual.acquireSource!=='world_boss_chest'||
  actual.issuerVersion!==WORLD_BOSS_GATHERING_ISSUER_VERSION_V62||
  !validateWorldBossGatheringRollV65(actual.roll)||
  JSON.stringify(actual.roll)!==JSON.stringify(expected.roll))
  throw Error('world_boss_v62_untrusted_issued_item');
}

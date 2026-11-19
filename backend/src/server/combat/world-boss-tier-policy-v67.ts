/**
 * World Boss V67 — hidden, account-level tier parity with Equipment 2.0.
 * Do not hardcode another tier/level curve: the authoritative v33 catalog
 * defines tier unlocks. The caller loads account-owned character levels from
 * committed server saves only; this module never reads mobile state.
 */
import {EQUIPMENT_SETS_V33} from '../equipment/equipment-catalog-v33';
import type {EquipmentTierIdV33} from '../equipment/equipment-types-v33';
import {WORLD_BOSS_EQUIPMENT_TIERS_V62} from './world-boss-gathering-instance-v62';

export const WORLD_BOSS_TIER_POLICY_V67_LIVE=false as const;
export interface WorldBossTierUnlockV67{
 readonly tier:EquipmentTierIdV33;
 readonly minLevel:number;
}
export function worldBossCatalogTierUnlocksV67():readonly WorldBossTierUnlockV67[]{
 const tiers=WORLD_BOSS_EQUIPMENT_TIERS_V62;
 const result:WorldBossTierUnlockV67[]=tiers.map(tier=>{
  const levels=EQUIPMENT_SETS_V33.filter(s=>s.tier===tier)
   .map(s=>s.unlockLevel);
  if(!levels.length||levels.some(n=>!Number.isSafeInteger(n)||n<1||n>200))
   throw Error('world_boss_v67_unverified_equipment_catalog');
  // Every class/path must share the canonical tier unlock. A mismatch is a
  // content-review blocker, not a reason to silently allow early gear.
  const unique=[...new Set(levels)];
  if(unique.length!==1)
   throw Error('world_boss_v67_inconsistent_tier_unlock:'+tier);
  return {tier,minLevel:unique[0]};
 });
 if(result.some((x,i)=>i>0&&x.minLevel<=result[i-1].minLevel))
  throw Error('world_boss_v67_nonmonotonic_tier_unlocks');
 return result;
}
export function worldBossTierForVerifiedAccountLevelV67(input:{
 readonly highestOwnedCharacterLevel:number;
 readonly unlocks?:readonly WorldBossTierUnlockV67[];
}):EquipmentTierIdV33{
 const level=input?.highestOwnedCharacterLevel;
 if(!Number.isSafeInteger(level)||level<1||level>200)
  throw Error('world_boss_v67_invalid_verified_level');
 const unlocks=input.unlocks??worldBossCatalogTierUnlocksV67();
 if(unlocks.length!==9||
  unlocks.some((row,i)=>row.tier!==WORLD_BOSS_EQUIPMENT_TIERS_V62[i]||
   !Number.isSafeInteger(row.minLevel)||row.minLevel<1||
   (i>0&&row.minLevel<=unlocks[i-1].minLevel)))
  throw Error('world_boss_v67_untrusted_tier_policy');
 // Explicitly fail closed before the first real tier can be earned.
 if(level<unlocks[0].minLevel)
  throw Error('world_boss_v67_no_unlocked_equipment_tier');
 for(let i=unlocks.length-1;i>=0;i--)
  if(level>=unlocks[i].minLevel)return unlocks[i].tier;
 throw Error('world_boss_v67_no_eligible_tier');
}

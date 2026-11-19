/**
 * V81: hidden coordination between earned chests, core Equipment 2.0 T1-T5
 * launch, and later T6-T9 content. An earned reward is NEVER automatically
 * rerolled/down-tiered, swapped for dust, or prematurely delivered.
 *
 * All capabilities are release-owned verified facts, NEVER client flags.
 * This is a read-only status/prohibition contract, not an issuer or claim API.
 */
import type {EarnedChestEntitlementV80} from './chest-earned-entitlement-v80';
import {defineChestLootTableV67} from './chest-loot-engine-v67';

export const CHEST_EQ2_RELEASE_GATE_V81_RELEASED=false;
export const CHEST_EQ2_CORE_LAUNCH_MAX_TIER_V81=5 as const;
export const CHEST_EQ2_RELEASE_GATE_VERSION_V81='chest-eq2-gate-v81' as const;
export type ChestReleaseBlockerV81=
 'unapproved_release'|'chest_sql_not_migrated'|'canonical_claim_route_missing'|
 'legacy_receipts_not_reconciled'|'account_erasure_unverified'|
 'reward_wallets_unverified'|'reward_inbox_unverified'|
 'eq2_event_templates_not_registered'|'eq2_physical_issuer_unverified'|
 'eq2_tier_not_yet_supported'|'concurrency_not_verified'|
 'android_claim_qa_not_verified';
/** A release operator supplies these facts only from CI/staging audit. */
export interface ChestReleaseEvidenceV81{
 readonly chestSqlMigrationVerified:boolean;
 readonly authenticatedClaimRouteVerified:boolean;
 readonly legacyV61ReceiptReconciliationVerified:boolean;
 readonly accountErasurePolicyVerified:boolean;
 readonly resourceWalletPhysicalReadbackVerified:boolean;
 readonly durableInboxReadbackVerified:boolean;
 readonly eventOnlyEq2TemplatesVerified:boolean;
 readonly eq2PhysicalWriterVerified:boolean;
 /** Only tiers fully registered and validated in the real installed EQ2
  * manifest count. Zero means no approved event gear at all. */
 readonly maxFullyApprovedEq2Tier:number;
 readonly pg16ConcurrencyVerified:boolean;
 readonly androidClaimAndReconnectQaVerified:boolean;
}
export interface ChestReleaseReadinessV81{
 readonly sourceKey:string;
 readonly accountId:string;
 readonly earned:true;
 readonly claimEnabled:false;
 readonly openingEnabled:false;
 readonly equipmentRngPerformed:false;
 readonly equipmentChanceBps:number;
 readonly preservedTier:number;
 readonly supportedByCoreT1ToT5:boolean;
 readonly status:'earned_waiting_for_equipment_2'|'earned_waiting_for_future_tier';
 readonly reasons:readonly ChestReleaseBlockerV81[];
 readonly noAutomaticTierDowngrade:true;
 readonly guaranteedRewardsPreserved:true;
}
/** Deterministic UI/policy projection. It cannot make an earned chest
 * redeemable even if someone mistakenly passes all capabilities=true. */
export function inspectEarnedChestReleaseV81(
 earned:EarnedChestEntitlementV80,
 capabilities:ChestReleaseEvidenceV81,
):ChestReleaseReadinessV81{
 if(!earned||earned.opened!==false||earned.paid!==false||
  earned.equipmentRolled!==false||earned.claimEnabled!==false||
  !Number.isSafeInteger(earned.tier)||earned.tier<1||earned.tier>9||
  typeof earned.sourceKey!=='string'||typeof earned.accountId!=='string'||
  (earned.family!=='party_event'&&earned.family!=='world_boss')||
  !capabilities||!Number.isSafeInteger(capabilities.maxFullyApprovedEq2Tier)||
  capabilities.maxFullyApprovedEq2Tier<0||
  capabilities.maxFullyApprovedEq2Tier>CHEST_EQ2_CORE_LAUNCH_MAX_TIER_V81)
  throw Error('chest_v81_untrusted_release_evidence');
 const table=defineChestLootTableV67(earned.frozenLootTable);
 if(table.tableId!==earned.tableId||
  table.version!==earned.tableVersion||
  table.tableId!==(earned.family==='world_boss'?
   'world_boss_chest':'party_event_chest')||
  (earned.family==='world_boss'&&
   (!earned.bossId||!table.version.startsWith(
    'world_boss_v58_'+earned.bossId+'_'))))
  throw Error('chest_v81_frozen_item_catalog_mismatch');
 const gear=table.groups.filter(group=>group.type==='equipment');
 if(gear.length!==1||gear[0]!.chanceBps<1)
  throw Error('chest_v81_missing_preserved_equipment_odds');
 const chance=gear[0]!.chanceBps;
 if(earned.family==='world_boss'&&chance!==100)
  throw Error('chest_v81_world_one_percent_odds_changed');
 const reasons:ChestReleaseBlockerV81[]=['unapproved_release'];
 const test=(passed:boolean,reason:ChestReleaseBlockerV81)=>{
  if(passed!==true)reasons.push(reason);
 };
 test(capabilities.chestSqlMigrationVerified,'chest_sql_not_migrated');
 test(capabilities.authenticatedClaimRouteVerified,
  'canonical_claim_route_missing');
 test(capabilities.legacyV61ReceiptReconciliationVerified,
  'legacy_receipts_not_reconciled');
 test(capabilities.accountErasurePolicyVerified,
  'account_erasure_unverified');
 test(capabilities.resourceWalletPhysicalReadbackVerified,
  'reward_wallets_unverified');
 test(capabilities.durableInboxReadbackVerified,
  'reward_inbox_unverified');
 test(capabilities.eventOnlyEq2TemplatesVerified,
  'eq2_event_templates_not_registered');
 test(capabilities.eq2PhysicalWriterVerified,
  'eq2_physical_issuer_unverified');
 if(earned.tier>capabilities.maxFullyApprovedEq2Tier)
  reasons.push('eq2_tier_not_yet_supported');
 test(capabilities.pg16ConcurrencyVerified,'concurrency_not_verified');
 test(capabilities.androidClaimAndReconnectQaVerified,
  'android_claim_qa_not_verified');
 return {
  sourceKey:earned.sourceKey,accountId:earned.accountId,
  earned:true,claimEnabled:false,openingEnabled:false,
  equipmentRngPerformed:false,equipmentChanceBps:chance,
  preservedTier:earned.tier,
  supportedByCoreT1ToT5:earned.tier<=CHEST_EQ2_CORE_LAUNCH_MAX_TIER_V81,
  status:earned.tier<=CHEST_EQ2_CORE_LAUNCH_MAX_TIER_V81?
   'earned_waiting_for_equipment_2':'earned_waiting_for_future_tier',
  reasons:Object.freeze(reasons),
  noAutomaticTierDowngrade:true,guaranteedRewardsPreserved:true,
 };
}

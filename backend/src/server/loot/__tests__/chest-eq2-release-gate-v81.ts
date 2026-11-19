import {
 inspectEarnedChestReleaseV81,CHEST_EQ2_RELEASE_GATE_V81_RELEASED,
 CHEST_EQ2_CORE_LAUNCH_MAX_TIER_V81,type ChestReleaseEvidenceV81,
} from '../chest-eq2-release-gate-v81';
import type {EarnedChestEntitlementV80} from '../chest-earned-entitlement-v80';
import {
 worldBossChestLootTableV68,
 type WorldBossChestKindV58,
} from '../../combat/world-boss-chests-v58';
import {
 partyChestLootTableV68,
 type PartyEventChestKindV51,
} from '../../party/weekly-party-event-chests-v51';

const account='11111111-1111-4111-8111-111111111111';
const event='22222222-2222-4222-8222-222222222222';
const approved:ChestReleaseEvidenceV81={
 chestSqlMigrationVerified:true,authenticatedClaimRouteVerified:true,
 legacyV61ReceiptReconciliationVerified:true,
 accountErasurePolicyVerified:true,
 resourceWalletPhysicalReadbackVerified:true,
 durableInboxReadbackVerified:true,
 eventOnlyEq2TemplatesVerified:true,
 eq2PhysicalWriterVerified:true,
 maxFullyApprovedEq2Tier:5,pg16ConcurrencyVerified:true,
 androidClaimAndReconnectQaVerified:true,
};
function check(condition:unknown,label:string):asserts condition{
 if(!condition)throw Error('chest_v81_test:'+label);
}
function rejects(cb:()=>unknown,expected:string){
 let caught=false;try{cb()}catch(e){caught=String(e).includes(expected)}
 check(caught,'reject_'+expected);
}
function fixture(tier:number,world:boolean,kind:string):
 EarnedChestEntitlementV80{
 const table=world?worldBossChestLootTableV68({
  bossId:'hollowroot',kind:kind as WorldBossChestKindV58,
 }):partyChestLootTableV68({
  family:'broken_caravan',difficulty:'standard',
  kind:kind as PartyEventChestKindV51,
 });
 return {
  sourceKey:world?
   'world-boss:'+event+':'+account+':'+kind:
   'party-event:'+Date.UTC(2026,10,16)+':'+account+':'+kind,
  accountId:account,family:world?'world_boss':'party_event',
  tier,bossId:world?'hollowroot':null,
  proofVersion:'frozen-server-proof-v80',tableId:table.tableId,
  tableVersion:table.version,frozenLootTable:table,
  opened:false,paid:false,equipmentRolled:false,claimEnabled:false,
  alreadyEarned:false,
 };
}
check(CHEST_EQ2_RELEASE_GATE_V81_RELEASED===false,'no_live_claim');
check(CHEST_EQ2_CORE_LAUNCH_MAX_TIER_V81===5,'core_2_0_t1_to_t5');
let worlds=0,parties=0;
for(const kind of ['donations_goal','three_attempts',
 'community_damage_goal'] as const){
 for(let tier=1;tier<=9;tier++){
  const earned=fixture(tier,true,kind);
  const state=inspectEarnedChestReleaseV81(earned,approved);
  check(state.earned&&state.equipmentChanceBps===100&&
   state.preservedTier===tier&&state.guaranteedRewardsPreserved&&
   state.noAutomaticTierDowngrade&&
   !state.claimEnabled&&!state.openingEnabled&&
   !state.equipmentRngPerformed,
   'world_1_percent_frozen_'+kind+'_t'+tier);
  check(state.supportedByCoreT1ToT5===(tier<=5)&&
   (tier>5?state.reasons.includes('eq2_tier_not_yet_supported'):
    !state.reasons.includes('eq2_tier_not_yet_supported')),
   'core_tier_boundary_world_'+tier);
  if(tier>5)check(state.status==='earned_waiting_for_future_tier',
   'future_tier_remains_earned');
  worlds++;
 }
}
for(const kind of ['participation','preparation','finale'] as const){
 for(let tier=1;tier<=9;tier++){
  const earned=fixture(tier,false,kind);
  const state=inspectEarnedChestReleaseV81(earned,approved);
  const group=earned.frozenLootTable.groups[0]!;
  check(state.equipmentChanceBps===group.chanceBps&&
   state.preservedTier===tier&&!state.claimEnabled&&
   !state.equipmentRngPerformed,'party_legacy_odds_'+kind+'_t'+tier);
  parties++;
 }
}
const noCapabilities:ChestReleaseEvidenceV81={
 ...approved,resourceWalletPhysicalReadbackVerified:false,
 durableInboxReadbackVerified:false,
 legacyV61ReceiptReconciliationVerified:false,
 eq2PhysicalWriterVerified:false,maxFullyApprovedEq2Tier:0,
};
const pending=inspectEarnedChestReleaseV81(
 fixture(4,true,'donations_goal'),noCapabilities);
for(const reason of ['reward_wallets_unverified',
 'reward_inbox_unverified','legacy_receipts_not_reconciled',
 'eq2_physical_issuer_unverified','eq2_tier_not_yet_supported',
 'unapproved_release']){
 check(pending.reasons.includes(reason as typeof pending.reasons[number]),
  'fail_closed_'+reason);
}
const allPass=inspectEarnedChestReleaseV81(
 fixture(2,true,'three_attempts'),approved);
check(allPass.reasons.length===1&&allPass.reasons[0]==='unapproved_release'&&
 !allPass.claimEnabled,'boolean_flags_cannot_activate');
const world=fixture(4,true,'donations_goal');
rejects(()=>inspectEarnedChestReleaseV81({
 ...world,frozenLootTable:{
  ...world.frozenLootTable,
  groups:world.frozenLootTable.groups.map(g=>({...g,chanceBps:250})),
 }},approved),'world_one_percent_odds_changed');
rejects(()=>inspectEarnedChestReleaseV81({
 ...world,paid:true,
} as unknown as EarnedChestEntitlementV80,approved),'untrusted_release_evidence');
rejects(()=>inspectEarnedChestReleaseV81(world,{
 ...approved,maxFullyApprovedEq2Tier:6,
}),'untrusted_release_evidence');
rejects(()=>inspectEarnedChestReleaseV81({
 ...world,tableVersion:'forged_version',
},approved),'frozen_item_catalog_mismatch');
console.log('CHEST_EQ2_V81_OK: '+worlds+
 ' World and '+parties+' Party source/tier cases, original gear odds, future T6-T9 deferral, fake readiness and delivery denied');

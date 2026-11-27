/**
 * Isolated World Boss V89 canonical Combat 2.0 bridge preflight.
 * These structural fixtures are NOT equipment ownership or DB proof.
 */
import {assert} from './test-assert';
import {
 WORLD_BOSS_CANONICAL_V89_LIVE,
 WORLD_BOSS_CANONICAL_STATS_V89,WORLD_BOSS_CANONICAL_SIGNALS_V89,
 WORLD_BOSS_CANONICAL_TRAITS_V89,
 auditWorldBossCanonicalRuntimeV89,
 type WorldBossCanonicalEvidenceV89,
 type WorldBossV89Boss,type WorldBossV89Phase,
} from '../../../backend/src/server/combat/world-boss-canonical-runtime-readiness-v89';

const bossIds:WorldBossV89Boss[]=['hollowroot','sunscar','frostmarch'];
const phases:WorldBossV89Phase[]=['armored','exposed','enraged'];
const actors=(n:number)=>Array.from({length:n},(_,i)=>({
 actorId:'actor_'+i,
 characterId:'character_'+i,
 snapshotId:'snapshot_'+i,
 sourceRevision:4,
 sourceHash:(i+1).toString(16).repeat(64),
 compiledCombatantDigest:(i+6).toString(16).repeat(64),
 equippedCopyIds:['copy_'+i],
 activeTraits:i===0?[{instanceId:'copy_0',traitId:'sword_dance'}]:[],
}));
const base=(n=1):WorldBossCanonicalEvidenceV89=>({
 source:'canonical-combat-v2-server-projection',
 eventId:'world_boss_v89_event',accountId:'world_boss_v89_account',
 bossId:'hollowroot',phase:'armored',
 rosterDigest:'a'.repeat(64),bossMaxHp:1_000_000,
 compilerVersion:'review_only_v89',
 actors:actors(n),
 statChannels:[...WORLD_BOSS_CANONICAL_STATS_V89],
 eventSignals:[...WORLD_BOSS_CANONICAL_SIGNALS_V89],
 executableTraits:[...WORLD_BOSS_CANONICAL_TRAITS_V89],
 restorativeBloomOffsetsMs:[1000,2000,3000,4000],
 eventTimeResolutionMs:1000,phaseThresholdsPct:[70,30],
});
const has=(e:WorldBossCanonicalEvidenceV89,code:string)=>{
 const audit=auditWorldBossCanonicalRuntimeV89(e);
 assert.ok(audit.blockers.includes(code),
  'Expected '+code+' but received '+JSON.stringify(audit.blockers));
 assert.equal(audit.structurallyCompatible,false);
 assert.equal(audit.releaseReady,false);
};
assert.equal(WORLD_BOSS_CANONICAL_V89_LIVE,false);
let scenarios=0;
for(const bossId of bossIds)for(const phase of phases)for(let size=1;size<=5;size++){
 const row={...base(size),bossId,phase};
 const before=JSON.stringify(row);
 const report=auditWorldBossCanonicalRuntimeV89(row);
 assert.equal(report.structurallyCompatible,true);
 assert.deepEqual(report.blockers,[]);
 assert.equal(report.releaseReady,false,
  'even full metadata is not server compiler or DB attestation');
 assert.equal(report.note,'source-metadata-only-not-authentication');
 assert.equal(JSON.stringify(row),before,'audit must never mutate frozen sources');
 assert.deepEqual(report,auditWorldBossCanonicalRuntimeV89(row));
 scenarios++;
}
assert.equal(scenarios,45);
const source=base(5);
has({...source,source:'untrusted-client' as never},'invalid_server_scope');
has({...source,rosterDigest:'not-a-digest'},'invalid_server_scope');
has({...source,statChannels:source.statChannels.slice(1)},'stat_channels_not_exact');
has({...source,statChannels:[...source.statChannels,'tenacity_pct']},'stat_channels_not_exact');
has({...source,eventSignals:source.eventSignals.slice(1)},'event_signals_not_exact');
has({...source,executableTraits:source.executableTraits.slice(1)},'trait_set_not_exact');
has({...source,eventTimeResolutionMs:5000},'subsecond_or_1s_timing_required');
has({...source,restorativeBloomOffsetsMs:[5000]},
 'restorative_bloom_four_real_ticks_required');
has({...source,restorativeBloomOffsetsMs:[1000,2000,3000,5000]},
 'restorative_bloom_four_real_ticks_required');
has({...source,phaseThresholdsPct:[70,35]},
 'global_phase_threshold_mismatch');
has({...source,actors:[]},'account_roster_must_have_1_to_5');
has({...source,actors:actors(6)},'account_roster_must_have_1_to_5');
has({...source,actors:[source.actors[0],source.actors[0]]},
 'untrusted_or_duplicate_actor');
has({...source,actors:[source.actors[0],{
 ...source.actors[1],
 equippedCopyIds:['copy_0'],
 activeTraits:[],
 },...source.actors.slice(2)]},'item_copy_reused_across_characters');
has({...source,actors:[{
 ...source.actors[0],sourceHash:'faked',
 },...source.actors.slice(1)]},'untrusted_or_duplicate_actor');
has({...source,actors:[{
 ...source.actors[0],activeTraits:[{instanceId:'copy_1',traitId:'sword_dance'}],
 },...source.actors.slice(1)]},'unowned_or_duplicate_active_trait');
has({...source,actors:[{
 ...source.actors[0],activeTraits:[
 {instanceId:'copy_0',traitId:'sword_dance'},
 {instanceId:'copy_0',traitId:'sword_dance'},
 ],
 },...source.actors.slice(1)]},'unowned_or_duplicate_active_trait');
has({...source,actors:[{
 ...source.actors[0],activeTraits:[{instanceId:'copy_0',traitId:'future_trait'}],
 },...source.actors.slice(1)]},'unowned_or_duplicate_active_trait');
assert.equal(auditWorldBossCanonicalRuntimeV89(undefined as never).blockers[0],
 'missing_evidence');
// V89 is deliberately an integration coverage oracle, NOT an authority issuer.
assert.equal(auditWorldBossCanonicalRuntimeV89(source).releaseReady,false);
console.log('WORLD_BOSS_CANONICAL_V89_STRUCTURAL_OK: 45 boss/phase/roster cases, canonical 16 channels, 5 trait hooks, 1s tick parity, item-copy exclusivity; production gate stays closed');


/** V90A reuses V89 fixtures but compares independently shaped receipt summaries. */
import {reviewWorldBossRosterV90,WORLD_BOSS_ROSTER_V90_LIVE,
 type FrozenWorldBossReservationV90,type WorldBossCompilerProjectionV90,
} from '../../../backend/src/server/combat/world-boss-roster-reconciliation-v90';
const frozen=(runtime:WorldBossCanonicalEvidenceV89):FrozenWorldBossReservationV90=>({
 eventId:runtime.eventId,accountId:runtime.accountId,reservationId:'reservation_1',
 attempt:2,bossId:runtime.bossId,phase:runtime.phase,bossMaxHp:runtime.bossMaxHp,
 rosterDigest:runtime.rosterDigest,contentVersion:'content_2',balanceVersion:'balance_2',
 members:runtime.actors.map((a,i)=>({characterId:a.characterId,snapshotId:a.snapshotId,
 sourceRevision:a.sourceRevision,sourceHash:a.sourceHash,
 equipmentReceiptDigest:(i+10).toString(16).repeat(64),equipmentReceiptRevision:3})),
});
const projected=(runtime:WorldBossCanonicalEvidenceV89,
 reserve:FrozenWorldBossReservationV90):WorldBossCompilerProjectionV90=>({
 reservationId:reserve.reservationId,attempt:reserve.attempt,
 contentVersion:reserve.contentVersion,balanceVersion:reserve.balanceVersion,runtime,
 equipment:runtime.actors.map((a,i)=>({accountId:reserve.accountId,characterId:a.characterId,
 actorId:a.actorId,revision:reserve.members[i].equipmentReceiptRevision,
 equipmentReceiptDigest:reserve.members[i].equipmentReceiptDigest,
 ownedEquippedInstanceIds:[...a.equippedCopyIds],traits:a.activeTraits.map(t=>({...t}))})),
});
let v90Cases=0;
for(const bossId of bossIds)for(const phase of phases)for(let size=1;size<=5;size++){
 const runtime={...base(size),bossId,phase};
 const reserve=frozen(runtime),projection=projected(runtime,reserve);
 const before=JSON.stringify([reserve,projection]);
 const ok=reviewWorldBossRosterV90(reserve,projection);
 assert.equal(ok.structurallyCompatible,true);
 assert.deepEqual(ok.blockers,[]);
 assert.equal(ok.releaseReady,false);
 assert.equal(ok.canAuthorizeCombat,false);
 assert.equal(ok.canGrantRewards,false);
 assert.equal(ok.canPersistState,false);
 assert.equal(JSON.stringify([reserve,projection]),before);
 assert.deepEqual(reviewWorldBossRosterV90(reserve,{
  ...projection,equipment:[...projection.equipment].reverse(),
 }),ok);
 v90Cases++;
}
assert.equal(v90Cases,45);
assert.equal(WORLD_BOSS_ROSTER_V90_LIVE,false);
const r90=frozen(base(3)),p90=projected(base(3),r90);
const bad90=(r:FrozenWorldBossReservationV90,p:WorldBossCompilerProjectionV90,code:string)=>{
 const outcome=reviewWorldBossRosterV90(r,p);
 assert.equal(outcome.structurallyCompatible,false);
 assert.ok(outcome.blockers.includes(code),JSON.stringify(outcome.blockers));
 assert.equal(outcome.canAuthorizeCombat,false);
};
bad90(r90,{...p90,attempt:3},'reservation_scope_mismatch');
bad90({...r90,attempt:4},{...p90,attempt:4},'reservation_scope_mismatch');
bad90(r90,{...p90,balanceVersion:'old'},'reservation_scope_mismatch');
bad90(r90,{...p90,runtime:{...p90.runtime,phase:'exposed'}},'reservation_scope_mismatch');
bad90(r90,{...p90,equipment:p90.equipment.slice(1)},'roster_cardinality_mismatch');
bad90(r90,{...p90,equipment:[p90.equipment[0],p90.equipment[0],p90.equipment[2]]},
 'invalid_or_duplicate_equipment_receipt');
const changeReceipt=(edit:Partial<WorldBossCompilerProjectionV90['equipment'][number]>)=>({
 ...p90,equipment:[{...p90.equipment[0],...edit},...p90.equipment.slice(1)],
});
bad90(r90,changeReceipt({accountId:'foreign'}),'equipment_receipt_scope_mismatch');
bad90(r90,changeReceipt({actorId:'wrong'}),'equipment_receipt_scope_mismatch');
bad90(r90,changeReceipt({revision:2}),'equipment_receipt_scope_mismatch');
bad90(r90,changeReceipt({equipmentReceiptDigest:'f'.repeat(64)}),'equipment_receipt_scope_mismatch');
bad90(r90,changeReceipt({ownedEquippedInstanceIds:['copy_1']}),'equipped_copy_set_mismatch');
bad90(r90,changeReceipt({ownedEquippedInstanceIds:['copy_0','copy_0']}),'equipped_copy_set_mismatch');
bad90(r90,changeReceipt({traits:[]}),'selected_trait_set_mismatch');
bad90(r90,changeReceipt({traits:[{instanceId:'copy_0',traitId:'echoing_strike'}]}),'selected_trait_set_mismatch');
bad90({...r90,members:[{...r90.members[0],sourceRevision:7},...r90.members.slice(1)]},
 p90,'frozen_loadout_mismatch');
bad90({...r90,members:[r90.members[0],r90.members[0],r90.members[2]]},
 p90,'invalid_or_duplicate_reserved_member');
bad90(r90,{...p90,runtime:{...p90.runtime,eventTimeResolutionMs:5000}},'v89:subsecond_or_1s_timing_required');
console.log('WORLD_BOSS_ROSTER_V90A_STRUCTURAL_OK: 45 scope cases and mismatch regressions; no authorization');


import {reviewWorldBossOwnedRosterV90,type WorldBossOwnedRosterSourceV90} from '../../../backend/src/server/combat/world-boss-roster-reconciliation-v90';
const owned90:WorldBossOwnedRosterSourceV90={
 accountId:r90.accountId,reservationId:r90.reservationId,rosterDigest:r90.rosterDigest,
 entitlementRevision:9,unlockedCharacterSlots:3,
 eligibleCharacters:r90.members.map(m=>({...m,accountId:r90.accountId})),
};
const entitled90={...r90,entitlementRevision:9,unlockedCharacterSlots:3};
const goodOwned90=reviewWorldBossOwnedRosterV90(entitled90,p90,owned90);
assert.equal(goodOwned90.structurallyCompatible,true);
assert.equal(goodOwned90.canAuthorizeCombat,false);
assert.equal(goodOwned90.canGrantRewards,false);
const badOwned90=(owned:WorldBossOwnedRosterSourceV90,code:string,reservation=entitled90)=>{
 const result=reviewWorldBossOwnedRosterV90(reservation,p90,owned);
 assert.equal(result.structurallyCompatible,false);
 assert.ok(result.blockers.includes(code),JSON.stringify(result.blockers));
 assert.equal(result.releaseReady,false);
};
badOwned90({...owned90,unlockedCharacterSlots:2},'unlocked_character_slots_exceeded',
 {...entitled90,unlockedCharacterSlots:2});
badOwned90({...owned90,unlockedCharacterSlots:4},'invalid_owned_roster_source');
badOwned90({...owned90,entitlementRevision:10},'invalid_owned_roster_source');
badOwned90({...owned90,unlockedCharacterSlots:0},'invalid_owned_roster_source');
badOwned90({...owned90,unlockedCharacterSlots:6},'invalid_owned_roster_source');
badOwned90({...owned90,entitlementRevision:0},'invalid_owned_roster_source');
badOwned90({...owned90,accountId:'foreign'},'invalid_owned_roster_source');
badOwned90({...owned90,reservationId:'other'},'invalid_owned_roster_source');
badOwned90({...owned90,rosterDigest:'b'.repeat(64)},'invalid_owned_roster_source');
badOwned90({...owned90,eligibleCharacters:owned90.eligibleCharacters.slice(1)},'eligible_roster_not_exact');
badOwned90({...owned90,eligibleCharacters:[owned90.eligibleCharacters[0],owned90.eligibleCharacters[0],
 owned90.eligibleCharacters[2]]},'foreign_or_duplicate_owned_character');
badOwned90({...owned90,eligibleCharacters:[{...owned90.eligibleCharacters[0],accountId:'foreign'},
 ...owned90.eligibleCharacters.slice(1)]},'foreign_or_duplicate_owned_character');
badOwned90({...owned90,eligibleCharacters:[{...owned90.eligibleCharacters[0],sourceRevision:10},
 ...owned90.eligibleCharacters.slice(1)]},'owned_character_snapshot_mismatch');
badOwned90({...owned90,eligibleCharacters:[{...owned90.eligibleCharacters[0],equipmentReceiptRevision:4},
 ...owned90.eligibleCharacters.slice(1)]},'owned_character_snapshot_mismatch');
const sourceSparse={...base(),restorativeBloomOffsetsMs:Array<number>(4)};
has(sourceSparse,'restorative_bloom_four_real_ticks_required');
has({...base(),actors:[{...base().actors[0],equippedCopyIds:Array<string>(1),activeTraits:[]}]},
 'invalid_equipped_copies');
console.log('WORLD_BOSS_V90B_OWNED_ROSTER_REVIEW_OK: frozen slot limits and ownership mismatches; no database or authority');

import {reviewWorldBossRewardHandoffV95,type WorldBossV95SettledAttemptReview} from '../../../backend/src/server/combat/world-boss-v95-reward-handoff-review';
import type {WorldBossCanonicalChestReadV59} from '../../../backend/src/server/combat/world-boss-chest-proof-v59';
const event95='10000000-0000-4000-8000-000000000001',account95='20000000-0000-4000-8000-000000000001';
for(const bossId of bossIds){
 const canonical95:WorldBossCanonicalChestReadV59={eventId:event95,accountId:account95,
  event:{bossId,initialHp:10000,remainingHp:3000},
  warCamp:{eventId:event95,trackTiers:{fortifications:1,fieldProvisions:1,siegecraft:0},
   ownDonationReceipts:[{eventId:event95,accountId:account95,requestId:'donation_01',status:'committed'}]},
  attacks:[1,2,3].map(ordinal=>({eventId:event95,accountId:account95,ordinal,requestId:'attack_00'+ordinal,
   status:'committed' as const,replayProof:'verified' as const}))};
 const receipts95:WorldBossV95SettledAttemptReview[]=canonical95.attacks.map(a=>({
  eventId:a.eventId,accountId:a.accountId,requestId:a.requestId,ordinal:a.ordinal,bossId,
  engineVersion:'canonical-combat-v2',settlementStatus:'committed',
  bindingDigest:'a'.repeat(64),replayDigest:a.ordinal.toString(16).repeat(64),
  settlementReceiptDigest:(a.ordinal+4).toString(16).repeat(64),localHpDamage:1000,committedGlobalHpDamage:900,
 }));
 const result95=reviewWorldBossRewardHandoffV95(canonical95,receipts95,()=>true);
 assert.equal(result95.previews.length,3);assert.equal(result95.verifiedAttempts,3);
 assert.equal(result95.rewardAuthorized,false);assert.equal(result95.impactEnabled,false);
 assert.equal(result95.previews.every(c=>c.gearChanceBps===1000&&c.gearPiecesInSet===10&&!c.claimable),true);
 assert.equal(result95.previews.reduce((sum,c)=>sum+c.guaranteed.gold,0),1350);
 const rejects=(rows:readonly WorldBossV95SettledAttemptReview[],verify:(r:WorldBossV95SettledAttemptReview)=>boolean=()=>true)=>{
  let rejected=false;try{reviewWorldBossRewardHandoffV95(canonical95,rows,verify);}catch{rejected=true;}
  assert.equal(rejected,true);
 };
 rejects(receipts95.slice(1));rejects([receipts95[0],receipts95[0],receipts95[2]]);
 rejects([{...receipts95[0],committedGlobalHpDamage:1001},...receipts95.slice(1)]);
 rejects([{...receipts95[0],accountId:event95},...receipts95.slice(1)]);
 rejects([{...receipts95[0],replayDigest:receipts95[1].replayDigest},...receipts95.slice(1)]);
 rejects(receipts95,()=>false);
 const noAttack={...canonical95,attacks:[]};
 const campOnly=reviewWorldBossRewardHandoffV95(noAttack,[],()=>false);
 assert.equal(campOnly.previews.length,1);assert.equal(campOnly.previews[0].kind,'donations_goal');
}
console.log('WORLD_BOSS_V95A_REWARD_HANDOFF: existing chest rules, canonical-only settlement review, no payout');

import {WORLD_BOSS_CHEST_POLICY_V96,worldBossChestLootTableV96,previewWorldBossChestRollV96} from '../../../backend/src/server/combat/world-boss-chest-policy-v96';
import {worldBossChestLootTableV68} from '../../../backend/src/server/combat/world-boss-chests-v58';
assert.equal(WORLD_BOSS_CHEST_POLICY_V96.sigilGearExchange,false);
assert.equal(WORLD_BOSS_CHEST_POLICY_V96.innateGatheringSpeedBaseBps,1000);
assert.equal(WORLD_BOSS_CHEST_POLICY_V96.luckModifiersAllowed,false);
assert.equal(WORLD_BOSS_CHEST_POLICY_V96.maxDamageChests,3);
for(const bossId of bossIds)for(const kind of ['donations_goal','three_attempts','community_damage_goal','personal_damage'] as const){
 const table=worldBossChestLootTableV96(bossId,kind);
 assert.equal(table.groups[0].chanceBps,1000);
 assert.equal(table.groups[0].entries.length,10);
 {
  assert.equal(table.version,worldBossChestLootTableV96(bossId,'personal_damage').version);
  assert.equal(JSON.stringify(table),JSON.stringify(worldBossChestLootTableV96(bossId,'donations_goal')));
  const expectedMaterial={hollowroot:'IRONWOOD_LOG',sunscar:'SUNSTONE_ORE',frostmarch:'ICEFIN'}[bossId];
  const amounts=new Map(table.guarantees.map(g=>[g.id,g.quantity]));
  assert.equal(amounts.size,5);assert.equal(amounts.get('gold'),450);
  assert.equal(amounts.get('companion_essence'),6);assert.equal(amounts.get('gem_dust'),2);
  assert.equal(amounts.get('tempering_dust'),2);assert.equal(amounts.get(expectedMaterial),8);
 }
 const input={bossId,kind,slotRoll:0,ownedSlots:[] as const};
 const miss=previewWorldBossChestRollV96({...input,hitRoll:1000,nextInt:()=>{throw Error('unexpected entropy');}});
 assert.equal(miss.gear,null);
 const low=previewWorldBossChestRollV96({...input,hitRoll:999,nextInt:max=>max===1_000_000?999999:0});
 assert.equal(low.gear?.rarity,'common');assert.equal(low.gear?.quality,100);
 assert.equal(low.gear?.gatheringSpeedBasisPoints,1250);
 let drawIndex=0;
 const neutral=previewWorldBossChestRollV96({...input,hitRoll:0,nextInt:max=>{
  const i=drawIndex++;return i===0?999999:i===1?Math.floor(Math.pow(50.5/101,.8)*1_000_000):0;
 }});
 assert.equal(neutral.gear?.quality,50);assert.equal(neutral.gear?.gatheringSpeedBasisPoints,1000);
 const high=previewWorldBossChestRollV96({...input,hitRoll:0,nextInt:()=>0});
 assert.equal(high.gear?.rarity,'mythic');assert.equal(high.gear?.quality,0);
 assert.equal(high.gear?.gatheringSpeedBasisPoints,1500);
 assert.equal(high.gear?.primaryStat,'gathering_speed');
 assert.equal(high.gear?.combatPowerBonus,0);
 assert.equal(high.gear?.bonusStats.length,2);
 assert.equal(high.gear?.bonusStats.every(b=>b.skill===high.gear?.skill),true);
 assert.equal(new Set(high.gear?.bonusStats.map(b=>b.stat)).size,2);
 assert.equal(high.gearGranted,false);
 if(kind!=='personal_damage'){
  const legacy=worldBossChestLootTableV68({bossId,kind});
  assert.equal(legacy.groups[0].chanceBps,100);
  assert.ok(legacy.version!==table.version);
 }
}
console.log('WORLD_BOSS_V96: 10% versioned chest boundary, random rarity/quality and skill-exclusive affixes; no gear grant');

import {reviewWorldBossDamageChestsV97,type DamageChestPolicyV97} from '../../../backend/src/server/combat/world-boss-damage-chest-review-v97';
import {buildWorldBossChestOpeningReviewV97,type ChestOpenEntryReviewV97} from '../src/core/world-boss-chest-opening-review-v97';
const damageCanonical97:WorldBossCanonicalChestReadV59={eventId:event95,accountId:account95,
 event:{bossId:'hollowroot',initialHp:100000,remainingHp:20000},
 warCamp:{eventId:event95,trackTiers:{fortifications:0,fieldProvisions:0,siegecraft:0},ownDonationReceipts:[]},
 attacks:[1,2,3].map(ordinal=>({eventId:event95,accountId:account95,ordinal,
 requestId:'attack_00'+ordinal,status:'committed' as const,replayProof:'verified' as const}))};
const damageReceipts97:WorldBossV95SettledAttemptReview[]=damageCanonical97.attacks.map(a=>({
 eventId:a.eventId,accountId:a.accountId,requestId:a.requestId,ordinal:a.ordinal,bossId:'hollowroot',
 engineVersion:'canonical-combat-v2',settlementStatus:'committed',bindingDigest:'a'.repeat(64),
 replayDigest:a.ordinal.toString(16).repeat(64),settlementReceiptDigest:(a.ordinal+4).toString(16).repeat(64),
 localHpDamage:11000,committedGlobalHpDamage:10000,
}));
const damagePolicy97:DamageChestPolicyV97={eventId:event95,accountId:account95,bossId:'hollowroot',
 bracketId:'qa',revision:1,damagePerRoll:100,entropyVersion:'qa'};
const damageInput97={canonical:damageCanonical97,receipts:damageReceipts97,policy:damagePolicy97,
 previous:[],secret:new Uint8Array(32).fill(17),verifyPersistedAttempt:()=>true,verifyFrozenPolicy:()=>true};
const damageFull97=reviewWorldBossDamageChestsV97(damageInput97);
assert.equal(damageFull97.earnedChestCount,3);
assert.equal(damageFull97.capReached,true);
assert.equal(damageFull97.rewardGranted,false);
const damageRetry97=reviewWorldBossDamageChestsV97({...damageInput97,previous:damageFull97.rolls});
assert.equal(damageRetry97.newRolls.length,0);
const damagePartial97=reviewWorldBossDamageChestsV97({...damageInput97,policy:{...damagePolicy97,damagePerRoll:30001}});
assert.equal(damagePartial97.rolls.length,0);assert.equal(damagePartial97.damageToNextRoll,1);
let historyRejected97=false;
try{reviewWorldBossDamageChestsV97({...damageInput97,previous:[{...damageFull97.rolls[0],roll:10000}]});}
catch{historyRejected97=true;}
assert.equal(historyRejected97,true);
const opened97:ChestOpenEntryReviewV97[]=[
 {sourceKey:'chest-a',state:'committed',receipt:{sourceKey:'chest-a',accountId:account95,status:'committed',
 resources:[{itemId:'gold',name:'Gold',quantity:450}],gear:null}},
 {sourceKey:'chest-b',state:'committed',receipt:{sourceKey:'chest-b',accountId:account95,status:'committed',
 resources:[{itemId:'gold',name:'Gold',quantity:650}],gear:{instanceId:'exact-b',name:'Rootbound Grips',rarity:'epic',quality:87,skill:'woodcutting'}}},
 {sourceKey:'chest-c',state:'unknown'},{sourceKey:'chest-d',state:'failed'},
];
const opening97=buildWorldBossChestOpeningReviewV97(account95,opened97);
assert.equal(opening97.opened,2);assert.equal(opening97.resources[0].quantity,1100);
assert.equal(opening97.gear.length,1);assert.equal(opening97.pending.length,1);assert.equal(opening97.retry.length,1);
assert.equal(opening97.complete,false);assert.equal(opening97.claimEnabled,false);
let duplicateRejected97=false;
try{buildWorldBossChestOpeningReviewV97(account95,[opened97[0],opened97[0]]);}catch{duplicateRejected97=true;}
assert.equal(duplicateRejected97,true);
console.log('WORLD_BOSS_V97: damage chest cap, deterministic replay, threshold remainder, bulk receipt presentation');

import {reviewActivityLoadoutRoute,type ActivityLoadoutCategory} from '../src/core/activity-loadout-routing-review';
const activityCategories:ActivityLoadoutCategory[]=['combat','mining','woodcutting','fishing'];
const routeBindings=activityCategories.map((category,slotIndex)=>({category,slotIndex,presetId:'loadout-'+slotIndex}));
const routePresets=routeBindings.map(({slotIndex,presetId})=>({slotIndex,id:presetId}));
for(let slotCount=1;slotCount<=5;slotCount++)for(const [index,activity] of activityCategories.entries()){
 const result=reviewActivityLoadoutRoute({slotCount,autoSwitch:true,activity,bindings:routeBindings,availablePresets:routePresets});
 assert.equal(result.decision,index<slotCount?'candidate':'locked');
 assert.equal(result.presetId,index<slotCount?'loadout-'+index:null);
 assert.equal(result.mayEquip,false);
}
const routeContext={slotCount:3,autoSwitch:true,activity:'mining',bindings:routeBindings,availablePresets:routePresets};
assert.equal(reviewActivityLoadoutRoute({...routeContext,autoSwitch:false}).decision,'manual');
assert.equal(reviewActivityLoadoutRoute({...routeContext,activity:'faith'}).decision,'manual');
assert.equal(reviewActivityLoadoutRoute({...routeContext,activity:'herbalism'}).decision,'manual');
assert.equal(reviewActivityLoadoutRoute({...routeContext,availablePresets:[]}).decision,'missing');
assert.equal(reviewActivityLoadoutRoute({...routeContext,bindings:[]}).decision,'unassigned');
let duplicateRouteRejected=false;
try{reviewActivityLoadoutRoute({...routeContext,bindings:[routeBindings[0],routeBindings[0]]});}catch{duplicateRouteRejected=true;}
assert.equal(duplicateRouteRejected,true);
console.log('ACTIVITY_LOADOUT_REVIEW: four release categories by unlocked slot count, manual/missing/locked states; no auto equip');

import {reviewActivityLoadoutUnlocks,type RegionalLoadoutUnlockProof} from '../src/core/activity-loadout-unlocks-review';
const regionalProof:RegionalLoadoutUnlockProof={accountId:'qa-account',characterId:'qa-character',
 region:'sunscar',encounterId:'qa-sunscar-final',settlementId:'qa-victory-1',
 outcome:'victory',encounterKind:'regional_final_boss',status:'committed'};
const frostProof:RegionalLoadoutUnlockProof={...regionalProof,region:'frostmarch',
 encounterId:'qa-frostmarch-final',settlementId:'qa-victory-2',characterId:'qa-other-character'};
const unlockContext={accountId:'qa-account',premiumSlots:0,
 finalBossIds:{sunscar:'qa-sunscar-final',frostmarch:'qa-frostmarch-final'},verifyPersisted:()=>true};
for(let premiumSlots=0;premiumSlots<=2;premiumSlots++)for(const proofs of [[],[regionalProof],[regionalProof,frostProof]]){
 const result=reviewActivityLoadoutUnlocks({...unlockContext,premiumSlots,proofs});
 assert.equal(result.slotCount,1+premiumSlots+proofs.length);
 assert.equal(result.canGrantSlots,false);
}
assert.equal(reviewActivityLoadoutUnlocks({...unlockContext,proofs:[regionalProof,regionalProof,
 {...regionalProof,settlementId:'qa-victory-3'},frostProof]}).slotCount,3);
for(const invalid of [
 {...unlockContext,proofs:[{...regionalProof,accountId:'foreign'}]},
 {...unlockContext,proofs:[{...regionalProof,encounterId:'qa-dungeon-boss'}]},
 {...unlockContext,proofs:[regionalProof],finalBossIds:{sunscar:null,frostmarch:null}},
 {...unlockContext,proofs:[regionalProof],verifyPersisted:()=>false},
 {...unlockContext,proofs:[regionalProof,{...frostProof,settlementId:regionalProof.settlementId}]},
]){
 let rejected=false;try{reviewActivityLoadoutUnlocks(invalid);}catch{rejected=true;}
 assert.equal(rejected,true);
}
console.log('ACTIVITY_LOADOUT_UNLOCK_REVIEW: 9 progression/entitlement cases, repeated victories, foreign and unverified proof rejected; no grants');

function rejectsGatheringSpeedReview(fn:()=>unknown){let rejected=false;try{fn();}catch{rejected=true;}assert.equal(rejected,true);}
import {reviewGatheringSpeedV2,gatheringSpeedEffectiveRatingV2} from '../src/core/gathering-speed-v2-review';
for(const [raw,effective] of [[0,0],[10000,10000],[15000,13750],[20000,17500],[25000,20000]]){
 assert.equal(gatheringSpeedEffectiveRatingV2(raw),effective);
}
for(const toolTimeMultiplier of [1.15,1,.8,.5,.2])for(const existingRateMultiplier of [1,1.1,1.5,2]){
 let previous=Infinity;
 for(let gearRatingBps=0;gearRatingBps<=30000;gearRatingBps+=100){
  const result=reviewGatheringSpeedV2({baseActionSeconds:10,toolTimeMultiplier,existingRateMultiplier,gearRatingBps,setTimeMultiplier:1});
  assert.ok(result.actionSeconds<previous&&result.actionSeconds>0);
  assert.equal(result.releaseReady,false);
  if(gearRatingBps===0)assert.equal(result.actionSeconds,10*toolTimeMultiplier/existingRateMultiplier);
  previous=result.actionSeconds;
 }
}
const gearPace=reviewGatheringSpeedV2({baseActionSeconds:10,toolTimeMultiplier:.2,existingRateMultiplier:1,gearRatingBps:10000,setTimeMultiplier:.96});
assert.equal(gearPace.setRatingBps,417);
assert.ok(gearPace.actionSeconds<1&&gearPace.actionSeconds>0);
rejectsGatheringSpeedReview(()=>gatheringSpeedEffectiveRatingV2(-1));
rejectsGatheringSpeedReview(()=>reviewGatheringSpeedV2({baseActionSeconds:10,toolTimeMultiplier:0,existingRateMultiplier:1,gearRatingBps:0,setTimeMultiplier:1}));
console.log('GATHERING_SPEED_V2_REVIEW: 6020 monotonic pace cases; preserve legacy tool/buff baseline and positive action times');

import {reviewWorldBossGatheringSpeedV99,type GatheringSpeedCopyV99} from '../../../backend/src/server/combat/world-boss-gathering-speed-v99';
for(const bossId of bossIds){
 const copies:GatheringSpeedCopyV99[]=[];
 const ownedSlots:NonNullable<ReturnType<typeof previewWorldBossChestRollV96>['gear']>['slot'][]=[];
 for(let index=0;index<10;index++){
  let drawIndex=0;
  const g=previewWorldBossChestRollV96({bossId,kind:'personal_damage',hitRoll:0,slotRoll:0,ownedSlots,
   nextInt:()=>{const i=drawIndex++;return i===0?999999:i===1?Math.floor(Math.pow(50.5/101,.8)*1_000_000):0;}}).gear!;
  assert.ok(g);ownedSlots.push(g.slot);
  copies.push({accountId:'qa-account',characterId:'qa-character',instanceId:'qa-copy-'+index,roll:g});
 }
 const input={accountId:'qa-account',characterId:'qa-character',skill:copies[0].roll.skill,copies,
  baseActionSeconds:10,toolTimeMultiplier:.8,existingRateMultiplier:1.1,verifyEquippedCopy:()=>true};
 const full=reviewWorldBossGatheringSpeedV99(input);
 assert.equal(full.pieces,10);assert.equal(full.gearRatingBps,10340);assert.equal(full.setRatingBps,417);
 assert.equal(full.canApply,false);
 assert.equal(full.channels.setXpBps,1500);
 assert.equal(full.set.xpBonusFraction,.15);
 assert.equal(Object.prototype.hasOwnProperty.call(full.set,'yieldBonusFraction'),false);
 const offSkill=reviewWorldBossGatheringSpeedV99({...input,skill:input.skill==='mining'?'woodcutting':'mining'});
 assert.equal(offSkill.gearRatingBps,0);assert.equal(offSkill.actionSeconds,offSkill.existingSeconds);
 rejectsGatheringSpeedReview(()=>reviewWorldBossGatheringSpeedV99({...input,copies:[copies[0],copies[0]]}));
 rejectsGatheringSpeedReview(()=>reviewWorldBossGatheringSpeedV99({...input,copies:[{...copies[0],roll:{...copies[0].roll,gatheringSpeedBasisPoints:9000}}]}));
 rejectsGatheringSpeedReview(()=>reviewWorldBossGatheringSpeedV99({...input,verifyEquippedCopy:()=>false}));
}
console.log('WORLD_BOSS_GATHERING_SPEED_V99: 30 actual roll previews, skill isolation, exact-copy and forged-roll rejection');

for(const bossId of bossIds){
 let drawIndex=0;
 const gear=previewWorldBossChestRollV96({bossId,kind:'personal_damage',hitRoll:0,slotRoll:0,ownedSlots:[],
  nextInt:()=>{const i=drawIndex++;return i===2||i===4?1:0;}}).gear!;
 assert.equal(gear.rarity,'mythic');
 assert.equal(gear.bonusStats.some(row=>row.stat==='skill_xp'),true);
 assert.equal(gear.bonusStats.some(row=>row.stat==='gathering_rarity_chance'),true);
 const input={accountId:'qa-account',characterId:'qa-character',skill:gear.skill,
  copies:[{accountId:'qa-account',characterId:'qa-character',instanceId:'qa-channel-copy',roll:gear}],
  baseActionSeconds:10,toolTimeMultiplier:1,existingRateMultiplier:1,verifyEquippedCopy:()=>true};
 const result=reviewWorldBossGatheringSpeedV99(input);
 assert.equal(result.channels.skillXpAffixBps,120);
 assert.equal(result.channels.rareChanceAffixBps,300);
 assert.equal(result.channels.setXpBps,0);
 const off=reviewWorldBossGatheringSpeedV99({...input,skill:gear.skill==='mining'?'woodcutting':'mining'});
 assert.equal(off.channels.xpMultiplier,1);assert.equal(off.channels.rareChanceMultiplier,1);
}
console.log('WORLD_BOSS_GATHERING_REWARD_CHANNELS: actual rolled XP/rarity affixes, off-skill exclusion');

import {buildGatheringBonusDisplayReview} from '../src/core/gathering-bonus-display-review';
for(const skill of ['mining','woodcutting','fishing'] as const)for(let pieces=0;pieces<=10;pieces++){
 const input={skill,matchingSetPieces:pieces,gearRatingBps:pieces*1000};
 const display=buildGatheringBonusDisplayReview(input);
 const pace=reviewGatheringSpeedV2({baseActionSeconds:1,toolTimeMultiplier:1,existingRateMultiplier:1,gearRatingBps:input.gearRatingBps,setTimeMultiplier:pieces>=8?.96:1});
 assert.equal(display.effectiveSpeedPercent,Math.round(pace.effectiveRatingBps)/100);
 assert.equal(display.rareConsumerAvailable,skill==='mining');
 assert.equal(display.unlockedThresholds.length,Math.floor(pieces/2));
 assert.equal(display.releaseReady,false);
}
const fullDisplay=buildGatheringBonusDisplayReview({skill:'mining',matchingSetPieces:10,gearRatingBps:10000});
assert.equal(fullDisplay.rawSpeedPercent,104.17);
assert.equal(fullDisplay.effectiveSpeedPercent,103.13);
assert.equal(fullDisplay.actionTimeReductionPercent,50.77);
assert.equal(fullDisplay.xpPercent,15);
assert.equal(Object.prototype.hasOwnProperty.call(fullDisplay,'yieldPercent'),false);
assert.equal(fullDisplay.rareRelativePercent,10);
rejectsGatheringSpeedReview(()=>buildGatheringBonusDisplayReview({skill:'mining',matchingSetPieces:1,gearRatingBps:3000}));
console.log('GATHERING_BONUS_DISPLAY: 33 skill/set profiles use same review engine; raw/effective duration and rare-consumer clarity');

import {createCharacter as createSnapshotHero,newGame as newSnapshotGame,startGathering as startSnapshotGather} from '../src/core/game';
import {resolveChestLootV67 as resolveSnapshotChest} from '../../../backend/src/server/loot/chest-loot-engine-v67';
import {reviewWorldBossGatheringSnapshotV100,gatheringSnapshotDigestV100,type GatheringMintReadbackV100} from '../../../backend/src/server/combat/world-boss-gathering-snapshot-v100';
const baseSnapshotHero=createSnapshotHero(newSnapshotGame(1000),'IRONWARDEN','Snapshot QA');
const activeSnapshotHero=startSnapshotGather(baseSnapshotHero,'GREENWOOD_TREE',2000);
const snapAccount=account95,snapCharacter=activeSnapshotHero.character!.id;
const table100=worldBossChestLootTableV96('hollowroot','donations_goal');
const chest100=resolveSnapshotChest(table100,{rolls:[{groupId:'equipment',hitRoll:0,selectionRoll:0}],ownedDropIds:[]});
let draw100=0;
const roll100=previewWorldBossChestRollV96({bossId:'hollowroot',kind:'donations_goal',hitRoll:0,slotRoll:0,ownedSlots:[],
 nextInt:()=>{const i=draw100++;return i===0?999999:i===1?Math.floor(Math.pow(50.5/101,.8)*1_000_000):0;}}).gear!;
assert.ok(roll100);
const mint100:GatheringMintReadbackV100={accountId:snapAccount,characterId:snapCharacter,instanceId:'qa-world-copy',custody:'equipped',
 roll:roll100,rollDigest:gatheringSnapshotDigestV100(roll100),
 originalChest:{rulesVersion:'chest-settlement-v69',sourceKey:'world-boss:'+event95+':'+snapAccount+':donations_goal',accountId:snapAccount,
 recipientCharacterId:null,equipmentDeliveryMode:'account_unclaimed',proofVersion:'qa',tableId:table100.tableId,tableVersion:table100.version,
 guaranteed:chest100.guarantees,groups:chest100.groups,drops:chest100.drops,committed:true}};
const equipped100={...activeSnapshotHero,character:{...activeSnapshotHero.character!,equipment:{...activeSnapshotHero.character!.equipment,[roll100.slot]:roll100.itemId},
 equipmentInstanceIds:{...activeSnapshotHero.character!.equipmentInstanceIds,[roll100.slot]:mint100.instanceId}}};
const input100={accountId:snapAccount,characterId:snapCharacter,sourceRevision:7,activityId:'qa-activity',state:equipped100,
 ownedCharacterIds:[snapCharacter],mintRows:[mint100],
 verifyAccountReadback:(account:string,revision:number,digest:string)=>account===snapAccount&&revision===7&&digest===gatheringSnapshotDigestV100(equipped100),
 verifyMintReadback:(account:string,revision:number,digest:string)=>account===snapAccount&&revision===7&&digest===gatheringSnapshotDigestV100(mint100)};
const frozen100=reviewWorldBossGatheringSnapshotV100(input100);
assert.equal(frozen100.frozen.gearRatingBps,1034);
assert.equal(frozen100.frozen.matchingSetPieces,1);
assert.deepEqual(frozen100.frozen.exactCopyIds,[mint100.instanceId]);
assert.equal(frozen100.frozen.targetId,'GREENWOOD_TREE');
assert.equal(frozen100.canApply,false);
assert.equal(frozen100.persisted,false);
assert.equal(frozen100.digest,reviewWorldBossGatheringSnapshotV100(input100).digest);
for(const changed of [
 {...input100,mintRows:[]},
 {...input100,sourceRevision:8},
 {...input100,ownedCharacterIds:[snapCharacter,'missing-hero']},
 {...input100,mintRows:[{...mint100,custody:'quarantined_unclaimed' as const}],verifyMintReadback:()=>true},
 {...input100,mintRows:[{...mint100,rollDigest:'a'.repeat(64)}],verifyMintReadback:()=>true},
 {...input100,mintRows:[{...mint100,originalChest:{...mint100.originalChest,tableVersion:'world_boss_v58_hollowroot_donations_goal'}}],verifyMintReadback:()=>true},
 {...input100,state:{...equipped100,bank:{...equipped100.bank,stacks:[{itemId:roll100.itemId,instanceId:mint100.instanceId,quantity:1}]}},verifyAccountReadback:()=>true},
 {...input100,verifyMintReadback:()=>false},
 {...input100,state:{...equipped100,activity:{...equipped100.activity!,lastClaimAtMs:3000}},verifyAccountReadback:()=>true},
])rejectsGatheringSpeedReview(()=>reviewWorldBossGatheringSnapshotV100(changed));
console.log('WORLD_BOSS_GATHERING_SNAPSHOT_V100: original chest receipt, full physical roster, exact equipped copy, frozen handoff; quarantined/stale/duplicate/foreign proof rejection');

import {reviewWorldBossGatheringCustodyV101,type GatheringCustodyCopyV101,type GatheringCustodyIntentV101} from '../../../backend/src/server/combat/world-boss-gathering-custody-v101';
assert.equal(roll100.slot,'helmet');
const unclaimed101:GatheringCustodyCopyV101={accountId:snapAccount,instanceId:mint100.instanceId,roll:roll100,rollDigest:mint100.rollDigest,
 originalChest:mint100.originalChest,holderCharacterId:null,location:'unclaimed'};
let custodyState101=baseSnapshotHero,custodyRows101=[unclaimed101],revision101=1;
function runMove101(kind:GatheringCustodyIntentV101['kind']){
 const intent={kind,instanceId:mint100.instanceId,requestId:'qa-move-'+revision101};
 const input={accountId:snapAccount,revision:revision101,state:custodyState101,ownedCharacterIds:[snapCharacter],copies:custodyRows101,intent,
 verifyPersisted:()=>true,verifyMoveAllowed:()=>true};
 const before=gatheringSnapshotDigestV100(input.state);
 const result=reviewWorldBossGatheringCustodyV101(input);
 assert.equal(gatheringSnapshotDigestV100(input.state),before);
 assert.equal(result.persisted,false);assert.equal(result.canCommit,false);
 assert.equal(result.receipt.nextRevision,revision101+1);
 rejectsGatheringSpeedReview(()=>reviewWorldBossGatheringCustodyV101({...input,verifyMoveAllowed:()=>false}));
 custodyState101=result.candidateState;custodyRows101=result.candidateCopies;revision101++;
 return result;
}
const claimed101=runMove101('claim_to_bank');
assert.equal(claimed101.candidateCopies[0].location,'bank');
assert.equal(claimed101.candidateState.bank.stacks.some(x=>x.instanceId===mint100.instanceId),true);
rejectsGatheringSpeedReview(()=>runMove101('claim_to_bank'));
runMove101('withdraw_bank');
const equipped101=runMove101('equip');
assert.equal(equipped101.candidateState.character?.equipmentInstanceIds?.helmet,mint100.instanceId);
assert.equal(equipped101.candidateState.inventory.stacks.some(x=>x.instanceId===mint100.instanceId),false);
const started101=startSnapshotGather(equipped101.candidateState,'GREENWOOD_TREE',4000);
const snap101=reviewWorldBossGatheringSnapshotV100({...input100,state:started101,sourceRevision:revision101,
 verifyAccountReadback:()=>true,verifyMintReadback:()=>true});
assert.equal(snap101.frozen.gearRatingBps,1034);
assert.equal(snap101.frozen.startedAtMs,4000);
runMove101('unequip');runMove101('deposit_bank');
assert.equal(custodyRows101[0].location,'bank');
assert.equal(custodyRows101[0].rollDigest,mint100.rollDigest);
const fullBank101={...baseSnapshotHero,bank:{...baseSnapshotHero.bank,capacity:0,stacks:[]}};
rejectsGatheringSpeedReview(()=>reviewWorldBossGatheringCustodyV101({accountId:snapAccount,revision:1,state:fullBank101,
 copies:[unclaimed101],ownedCharacterIds:[snapCharacter],intent:{kind:'claim_to_bank',requestId:'qa-full',instanceId:mint100.instanceId},
 verifyPersisted:()=>true,verifyMoveAllowed:()=>true}));
console.log('WORLD_BOSS_GATHERING_CUSTODY_V101: unclaimed-to-bank/withdraw/equip/freeze/unequip/deposit; no mutation, duplicate claim and full bank rejection');

import {worldBossMintEntropyV102,issueWorldBossGatheringMintV102} from '../../../backend/src/server/loot/world-boss-gathering-mint-v102';
import {rollWorldBossGatheringSlotV96} from '../../../backend/src/server/combat/world-boss-chest-policy-v96';
import type {ChestSqlV70} from '../../../backend/src/server/loot/chest-postgres-store-v70';
const secret102=new Uint8Array(32).fill(13);
const source102=mint100.originalChest.sourceKey;
const seeded102=()=>rollWorldBossGatheringSlotV96('hollowroot',roll100.slot,worldBossMintEntropyV102(secret102,source102,'qa-v1'));
assert.deepEqual(seeded102(),seeded102());
const draw102=worldBossMintEntropyV102(secret102,source102,'qa-v1');
for(let i=0;i<1000;i++){const value=draw102(1000000);assert.ok(Number.isInteger(value)&&value>=0&&value<1000000);}
rejectsGatheringSpeedReview(()=>worldBossMintEntropyV102(new Uint8Array(1),source102,'qa-v1'));
async function testMint102(){
 let mint:Record<string,unknown>|null=null,custody:Record<string,unknown>|null=null;
 let inserts=0,receipt=mint100.originalChest;
 const instance='30000000-0000-4000-8000-000000000001';
 const tx:ChestSqlV70={
  async query<T extends Record<string,unknown>>(sql:string,params:readonly unknown[]=[]){
   let rows:Record<string,unknown>[]=[];
   if(sql.includes('FROM private.chest_account_fence_v70'))rows=[{account_id:snapAccount}];
   else if(sql.includes('FROM private.chest_reward_receipts_v70'))rows=[{receipt}];
   else if(sql.startsWith('SELECT')&&sql.includes('world_boss_gathering_mints_v102'))rows=mint?[mint]:[];
   else if(sql.startsWith('INSERT INTO private.world_boss_gathering_mints_v102')){
    assert.equal(mint,null);inserts++;
    mint={id:instance,source_key:params[0],account_id:params[1],event_id:params[2],boss_id:params[3],piece_id:params[4],slot:params[5],roll:JSON.parse(String(params[6])),roll_digest:params[7],chest_digest:params[8],entropy_version:params[9]};rows=[mint];
   }else if(sql.startsWith('INSERT INTO private.world_boss_gathering_custody_v102')){
    custody={instance_id:instance,account_id:snapAccount,location:'unclaimed',holder_character_id:null,revision:1};
   }else if(sql.startsWith('SELECT')&&sql.includes('world_boss_gathering_custody_v102'))rows=custody?[custody]:[];
   else throw Error('unexpected V102 SQL '+sql);
   return {rows:rows as T[]};
  },release(){}
 };
 const args={accountId:snapAccount,sourceKey:source102,entropyVersion:'qa-v1',secret:secret102,verifyLockedSource:async()=>true};
 const rejects=async(fn:()=>Promise<unknown>)=>{let failed=false;try{await fn();}catch{failed=true;}assert.equal(failed,true);};
 await rejects(()=>issueWorldBossGatheringMintV102(tx,args));
 await rejects(()=>issueWorldBossGatheringMintV102(tx,{...args,verifyLockedSource:async()=>false},true));
 const fresh=await issueWorldBossGatheringMintV102(tx,args,true);
 assert.equal(fresh.replayed,false);assert.equal(fresh.committed,false);
 assert.equal(fresh.copy.location,'unclaimed');assert.deepEqual(fresh.copy.roll,seeded102());
 const replay=await issueWorldBossGatheringMintV102(tx,{...args,secret:new Uint8Array(32).fill(99),entropyVersion:'qa-v2'},true);
 assert.equal(replay.replayed,true);assert.equal(replay.itemInstanceId,fresh.itemInstanceId);
 assert.deepEqual(replay.copy.roll,fresh.copy.roll);assert.equal(inserts,1);
 receipt={...receipt,tableVersion:'old-table'};
 await rejects(()=>issueWorldBossGatheringMintV102(tx,args,true));
 receipt=mint100.originalChest;custody=null;
 await rejects(()=>issueWorldBossGatheringMintV102(tx,args,true));
 console.log('WORLD_BOSS_GATHERING_MINT_V102: SQL-shaped port fresh/replay, same identity/roll, secret rotation, gate, stale receipt and missing custody rejection');
}
void testMint102().catch(error=>{console.error(error);process.exitCode=1;});

import {WORLD_BOSS_GATHERING_PIECES_V64 as catalogPieces108,WORLD_BOSS_GATHERING_SETS_V64 as catalogSets108,gatheringEquipmentDefinitionReview as catalogDef108} from '../src/content/world-boss-gathering-catalog-review';
import {reviewGatheringLoadoutCatalogV2 as catalogLoadout108,type GatheringLoadoutCopyReview} from '../src/core/gathering-loadout-catalog-review';
assert.equal(catalogPieces108.length,30);
assert.equal(new Set(catalogPieces108.map(x=>x.itemId)).size,30);
for(const set of catalogSets108){
 const pieces=catalogPieces108.filter(x=>x.setId===set.setId);
 assert.equal(pieces.length,10);
 const equipment=Object.fromEntries(pieces.map(p=>[p.slot,p.itemId]));
 const equipmentInstanceIds=Object.fromEntries(pieces.map(p=>[p.slot,'copy-'+p.slot]));
 const copies:GatheringLoadoutCopyReview[]=pieces.map(p=>({instanceId:'copy-'+p.slot,itemId:p.itemId,accountId:'catalog-owner',
 holderCharacterId:p.slot==='weapon'?null:'catalog-hero',location:p.slot==='weapon'?'bank':'inventory'}));
 const input={accountId:'catalog-owner',characterId:'catalog-hero',category:set.skill,equipment,equipmentInstanceIds,copies};
 const ready=catalogLoadout108(input);
 assert.equal(ready.matchingPieces,10);assert.equal(ready.offSkillPieces,0);assert.equal(ready.mayEquip,false);
 assert.equal(ready.requiresMixedEquipmentValidation,false);
 const offSkill=catalogLoadout108({...input,category:set.skill==='mining'?'fishing':'mining'});
 assert.equal(offSkill.matchingPieces,0);assert.equal(offSkill.offSkillPieces,10);
 for(const p of pieces){
  const def=catalogDef108(p.itemId)!;
  assert.equal(def.rollVersion,96);assert.equal(def.releaseReady,false);
  assert.deepEqual(def.combatStats,{attack:0,defense:0,hp:0});
  assert.equal(def.combatPowerBonus,0);
  assert.equal(def.equipRequirementsFinalized,false);
 }
 let rejected=0;
 for(const invalid of [
  {...input,category:'combat' as const},
  {...input,copies:copies.slice(1)},
  {...input,equipmentInstanceIds:{...equipmentInstanceIds,weapon:equipmentInstanceIds.offhand}},
  {...input,copies:copies.map(x=>x.instanceId==='copy-helmet'?{...x,holderCharacterId:'other-hero'}:x)},
  {...input,copies:copies.map(x=>x.instanceId==='copy-helmet'?{...x,location:'unclaimed' as const,holderCharacterId:null}:x)},
  {...input,equipment:{...equipment,helmet:'WB64_UNKNOWN'}},
 ]){try{catalogLoadout108(invalid);}catch{rejected++;}}
 assert.equal(rejected,6);
}
console.log('GATHERING_LOADOUT_CATALOG_V108: 30 gathering-only identities, same-skill/off-skill, exact bank/inventory copy, combat/foreign/unclaimed/duplicate/missing rejection');

import {WORLD_BOSS_GATHERING_PIECES_V64 as serverCatalog108,WORLD_BOSS_GATHERING_SETS_V64 as serverSets108} from '../../../backend/src/server/combat/world-boss-gathering-loot-v64';
assert.deepEqual(catalogPieces108,serverCatalog108);
assert.deepEqual(catalogSets108,serverSets108);

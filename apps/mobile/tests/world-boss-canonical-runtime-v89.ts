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

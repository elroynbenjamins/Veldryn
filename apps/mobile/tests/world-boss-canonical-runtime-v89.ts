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

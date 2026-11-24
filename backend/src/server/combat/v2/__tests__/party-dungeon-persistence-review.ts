import {reserveStagedPartyEncounterV2} from '../party-encounter-reservation-review';
import type {CoopRuntimeState,CoopRuntimeCommit} from '../../../coop/repositories/supabase-runtime';
import {preparePartyRecoverySnapshotV2,reviewStoredPartyRecoveryV2,loadPartyRecoverySnapshotV2} from '../party-encounter-recovery';
import {strict as assert} from 'node:assert';
import type {CombatInput,CombatantDefinition,PersistentActorState} from '../../types';
import type {FrozenLoadoutSnapshot} from '../../../coop/loadout-snapshots';
import type {ReadyCheckRecord,ReadyRosterMember} from '../../../coop/ready-checks';
import {CLASS_NAMES_V2,} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';
import {reviewPartyV2RunBinding,partySyncScopeFromRunBindingV2} from '../party-dungeon-persistence-review';
import {issuePartySyncAuthorityV2,authorizePartySyncV2} from '../party-sync-authority';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';
import {
 EQUIPMENT_V2_TRAIT_ENGINE_POLICY,authorizeEquipmentV2TraitEngine,
 issueEquipmentV2TraitAuthority,issuePersistedPartyEquipmentV2TraitAuthority,
 type VerifiedV2EquipmentEffectSource,
} from '../equipment-trait-engine-authority';

const ids:ClassIdV2[]=['IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER'];
const actors=ids.map((classId,i):CombatantDefinition=>({
 id:'ACTOR_'+i,name:CLASS_NAMES_V2[classId],classId:CLASS_NAMES_V2[classId],
 team:'players',role:CLASS_ROLES_V2[classId],level:35,
 stats:{maxHp:10000,attackPower:1000,healingPower:800,defense:600,
  accuracy:1500,evasion:100,critChance:.05,critMultiplier:1.5,haste:0},
 basicAttackMs:1500,basicAttackCoeff:.4,abilities:[],
 combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[classId],specializationId:'QA'},
}));
const enemy:CombatantDefinition={id:'ENEMY',name:'Enemy',team:'enemies',role:'enemy',level:35,
 stats:{maxHp:10000,attackPower:100,healingPower:0,defense:100,accuracy:1200,
  evasion:50,critChance:0,critMultiplier:1.5,haste:0},basicAttackMs:2000,basicAttackCoeff:.4,abilities:[]};
const roster:ReadyRosterMember[]=ids.map((classId,i)=>({
 accountId:'ACCOUNT_'+i,characterId:'CHAR_'+i,ticketId:'TICKET_'+i,
 role:CLASS_ROLES_V2[classId],originalEnqueuedAtMs:1,
 loadoutId:'LOADOUT_'+i,loadoutRevision:7,loadoutSnapshotHash:'a'.repeat(63)+i,
}));
const check:ReadyCheckRecord={id:'READY_1',partyId:'PARTY_1',rosterRevision:4,
 roster,accepts:Object.fromEntries(roster.map(x=>[x.accountId,true])),
 status:'committed',openedAtMs:1,closesAtMs:1000};
const frozen=ids.map((classId,i)=>({
 accountId:'ACCOUNT_'+i,characterId:'CHAR_'+i,classId:CLASS_NAMES_V2[classId],
 loadoutId:'LOADOUT_'+i,revision:7,snapshotHash:'a'.repeat(63)+i,
 readiness:{role:CLASS_ROLES_V2[classId]},
} as unknown as FrozenLoadoutSnapshot));
const input:CombatInput={seed:'PARTY_BINDING_QA',players:actors,enemies:[enemy],maxDurationMs:1000};
const args={runId:'RUN_1',nodeId:'NODE_1',encounterRevision:2,stateRevision:3,
 contentVersion:'content_v1',balanceVersion:'balance_v1',seed:input.seed,
 readyCheck:check,frozenRoster:frozen,
 actorCharacterIds:Object.fromEntries(actors.map((actor,i)=>[actor.id,'CHAR_'+i])),combatInput:input};
const first=reviewPartyV2RunBinding(args),second=reviewPartyV2RunBinding(args);
assert.deepEqual(first,second);
assert.equal(first.binding.members.length,4);
assert.equal(first.binding.partyId,'PARTY_1');
assert.equal(first.binding.rosterRevision,4);
assert.match(first.binding.combatInputDigest,/^[0-9a-f]{64}$/);
assert.equal(first.releaseEnabled,false);
assert.equal(first.canAuthorizeCombat,false);
assert.equal(first.canGrantRewards,false);
assert.equal(first.canPersistState,false);
assert.deepEqual(first.binding.members.map(m=>m.classId),ids);

assert.throws(()=>reviewPartyV2RunBinding({...args,readyCheck:{...check,status:'open'}}),/invalid_scope/);
assert.throws(()=>reviewPartyV2RunBinding({...args,readyCheck:{...check,
 accepts:{...check.accepts,ACCOUNT_0:false}}}),/invalid_scope/);
assert.throws(()=>reviewPartyV2RunBinding({...args,frozenRoster:frozen.map((x,i)=>i?x:
 ({...x,snapshotHash:'b'.repeat(64)} as FrozenLoadoutSnapshot))}),/roster_snapshot_mismatch/);
assert.throws(()=>reviewPartyV2RunBinding({...args,frozenRoster:frozen.map((x,i)=>i?x:
 ({...x,accountId:'ACCOUNT_1'} as FrozenLoadoutSnapshot))}),/roster_snapshot_mismatch/);
const reorderedInput={...input,players:[actors[1],actors[0],actors[2],actors[3]]};
const reordered=reviewPartyV2RunBinding({...args,combatInput:reorderedInput});
assert.deepEqual(reordered.binding.members.map(m=>m.characterId),['CHAR_1','CHAR_0','CHAR_2','CHAR_3'],
 'combat actor ordering may change without weakening actor-to-character provenance');
assert.notEqual(reordered.binding.combatInputDigest,first.binding.combatInputDigest);
assert.throws(()=>reviewPartyV2RunBinding({...args,frozenRoster:frozen.map((x,i)=>i===2?
 ({...x,classId:'Wayfinder'} as FrozenLoadoutSnapshot):x)}),/class_actor_mismatch/);
assert.throws(()=>reviewPartyV2RunBinding({...args,combatInput:{...input,enemyDamageProfile:'qmode-v1'}}),/invalid_scope/);

const carried=Object.fromEntries(actors.map(a=>[a.id,{
 hp:a.stats.maxHp-100,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0,
} satisfies PersistentActorState]));
const persistedInput={...input,initialPlayerState:carried};
const invalidStates:PersistentActorState[]=[
 {hp:actors[0].stats.maxHp+1,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0},
 {hp:1,downed:true,cooldownRemainingMs:{},basicAttackRemainingMs:0},
 {hp:0,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0},
 {hp:100,downed:false,cooldownRemainingMs:{FOREIGN_SKILL:100},basicAttackRemainingMs:0},
 {hp:100,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:-1},
];
for(const invalidState of invalidStates){
 assert.throws(()=>reviewPartyV2RunBinding({...args,combatInput:{...input,
  initialPlayerState:{...carried,ACTOR_0:invalidState}}}),/invalid_persistent_state/);
}
assert.throws(()=>reviewPartyV2RunBinding({...args,
 readyCheck:{...check,roster:roster.map((r,i)=>i?r:{...r,loadoutRevision:0})},
 frozenRoster:frozen.map((r,i)=>i?r:{...r,revision:0})}),/roster_snapshot_mismatch/);
assert.throws(()=>reviewPartyV2RunBinding({...args,
 readyCheck:{...check,roster:roster.map((r,i)=>i?r:{...r,loadoutSnapshotHash:'invalid'})},
 frozenRoster:frozen.map((r,i)=>i?r:{...r,snapshotHash:'invalid'})}),/roster_snapshot_mismatch/);

const persisted=reviewPartyV2RunBinding({...args,combatInput:persistedInput});
assert.notEqual(persisted.binding.combatInputDigest,first.binding.combatInputDigest,
 'persisted HP/cooldown state must be part of the immutable encounter digest');
const persistedScope=partySyncScopeFromRunBindingV2(persisted);
assert.deepEqual(persistedScope.persistedRun,{
 runId:'RUN_1',nodeId:'NODE_1',readyCheckId:'READY_1',rosterRevision:4,stateRevision:3,
 bindingDigest:enemyV2SnapshotDigest(persisted.binding),
});
const persistedToken=issuePartySyncAuthorityV2(persistedScope,persistedInput,
 (scope,digest)=>scope.persistedRun?.runId===persisted.binding.runId&&
  scope.persistedRun?.nodeId===persisted.binding.nodeId&&
  scope.persistedRun?.stateRevision===persisted.binding.stateRevision&&
  scope.persistedRun?.bindingDigest===enemyV2SnapshotDigest(persisted.binding)&&
  digest===persisted.binding.combatInputDigest);
assert.equal(authorizePartySyncV2(persistedInput,persistedToken).size,4);
 // A pair of internally consistent substituted loadout hashes must NOT
 // look identical to the independently pinned original binding.
const substituted=reviewPartyV2RunBinding({...args,combatInput:persistedInput,
 readyCheck:{...check,roster:roster.map((row,i)=>i?row:
  {...row,loadoutSnapshotHash:'f'.repeat(64)})},
 frozenRoster:frozen.map((row,i)=>i?row:{...row,snapshotHash:'f'.repeat(64)}),
});
assert.equal(substituted.binding.combatInputDigest,persisted.binding.combatInputDigest);
const substitutedScope=partySyncScopeFromRunBindingV2(substituted);
assert.notEqual(substitutedScope.persistedRun!.bindingDigest,persistedScope.persistedRun!.bindingDigest);
assert.throws(()=>issuePartySyncAuthorityV2(substitutedScope,persistedInput,
 (candidate,digest)=>candidate.persistedRun?.bindingDigest===enemyV2SnapshotDigest(persisted.binding)&&
  digest===persisted.binding.combatInputDigest),/unverified_scope/);
assert.throws(()=>issuePartySyncAuthorityV2({...persistedScope,persistedRun:{
 ...persistedScope.persistedRun!,bindingDigest:'invalid',
}},persistedInput,()=>true),/invalid_persisted_scope/);

const sources:VerifiedV2EquipmentEffectSource[]=ids.map((_,i)=>({
 source:'server-persisted-equipment-v2',policy:EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
 revision:1,accountId:'ACCOUNT_'+i,characterId:'CHAR_'+i,actorId:'ACTOR_'+i,
 ownedEquippedInstanceIds:[],equipmentReceiptDigest:'b'.repeat(63)+i,
 basicAttackDamagePct:0,abilityDamagePct:0,reflectDamagePct:0,traits:[],
}));
const partyTraitToken=issuePersistedPartyEquipmentV2TraitAuthority(
 persistedInput,sources,persisted.binding,
 (binding,rows,digest)=>binding.runId==='RUN_1'&&rows.length===4&&
  digest===persisted.binding.combatInputDigest);
assert.equal(authorizeEquipmentV2TraitEngine(persistedInput,partyTraitToken).size,4);
assert.throws(()=>issuePersistedPartyEquipmentV2TraitAuthority(
 persistedInput,sources.map((row,i)=>i<2?{...row,ownedEquippedInstanceIds:['SHARED_COPY']}:row),
 persisted.binding,()=>true),/duplicate_party_equipment_copy/);
const mutableSources=sources.map(row=>({...row}));
assert.throws(()=>issuePersistedPartyEquipmentV2TraitAuthority(
 persistedInput,mutableSources,persisted.binding,()=>{
  mutableSources[0].basicAttackDamagePct=19;
  return true;
 }),/party_persisted_ledger_not_verified/);

assert.throws(()=>issueEquipmentV2TraitAuthority(persistedInput,sources,()=>true),
 /no_legacy_or_inflight_encounter/);
assert.throws(()=>issuePersistedPartyEquipmentV2TraitAuthority(
 persistedInput,sources.map((row,i)=>i?row:{...row,characterId:'CHAR_1'}),
 persisted.binding,()=>true),/party_source_binding_mismatch/);
assert.throws(()=>issuePartySyncAuthorityV2({...persistedScope,persistedRun:undefined},
 persistedInput,()=>true),/input_mismatch/);
assert.throws(()=>issuePartySyncAuthorityV2({...persistedScope,persistedRun:{
  ...persistedScope.persistedRun!,stateRevision:0}},persistedInput,()=>true),
 /invalid_persisted_scope/);
assert.throws(()=>reviewPartyV2RunBinding({...args,combatInput:{...input,initialPlayerState:{
 ...carried,FOREIGN:{hp:1,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0},
}}}),/persistent_state_roster_mismatch/);

const badDpsFrozen=frozen.map((x,i)=>i===2?
 ({...x,classId:'Wayfinder'} as FrozenLoadoutSnapshot):x);
const badDpsActors=[actors[0],actors[1],{...actors[2],classId:'Wayfinder',role:'damage' as const},actors[3]];
assert.throws(()=>reviewPartyV2RunBinding({...args,frozenRoster:badDpsFrozen,
 combatInput:{...input,players:badDpsActors}}),/invalid_dungeon_roles/);

console.log('PASS: committed ready roster + frozen loadout + persistent party run binding review');

async function reviewRecovery(){
 const snapshot=preparePartyRecoverySnapshotV2(args);
 const identity={runId:args.runId,accountId:roster[0].accountId,characterId:roster[0].characterId};
 const runtime:CoopRuntimeState={runId:args.runId,mode:'live',phase:'resolving_node',
  currentNodeId:args.nodeId,stateVersion:args.stateRevision,clearedPreBossCount:0,
  privateState:{combatV2EncounterReview:snapshot},clientProjection:{},eventCursor:1};
 assert.deepEqual(reviewStoredPartyRecoveryV2(runtime,identity),snapshot);
 assert.notEqual(reviewStoredPartyRecoveryV2(runtime,identity),snapshot);
 const detached=structuredClone(args);
 const prepared=preparePartyRecoverySnapshotV2(detached);
 detached.combatInput.players[0].stats.maxHp++;
 assert.equal(prepared.reviewInput.combatInput.players[0].stats.maxHp,actors[0].stats.maxHp);
 assert.throws(()=>reviewStoredPartyRecoveryV2({...runtime,mode:'qmode'},identity),/invalid_runtime_scope/);
 assert.throws(()=>reviewStoredPartyRecoveryV2({...runtime,phase:'completed'},identity),/invalid_runtime_scope/);
 assert.throws(()=>reviewStoredPartyRecoveryV2({...runtime,stateVersion:runtime.stateVersion+1},identity),/stale_snapshot/);
 assert.throws(()=>reviewStoredPartyRecoveryV2({...runtime,currentNodeId:'OTHER'},identity),/stale_snapshot/);
 assert.throws(()=>reviewStoredPartyRecoveryV2({...runtime,privateState:{}},identity),/snapshot_missing/);
 assert.throws(()=>reviewStoredPartyRecoveryV2(runtime,{...identity,accountId:'OUTSIDER'}),/not_frozen_participant/);
 assert.throws(()=>reviewStoredPartyRecoveryV2(runtime,{...identity,characterId:'OTHER_CHAR'}),/not_frozen_participant/);
 const modified={...snapshot,reviewInput:{...snapshot.reviewInput,combatInput:{
  ...snapshot.reviewInput.combatInput,seed:'MODIFIED',
 }}};
 assert.throws(()=>reviewStoredPartyRecoveryV2({...runtime,privateState:{combatV2EncounterReview:modified}},identity),/snapshot_digest_mismatch/);
 const forgedBinding={...snapshot.binding,members:snapshot.binding.members.map((m,i)=>i?m:{...m,loadoutRevision:m.loadoutRevision+1})};
 const {snapshotDigest:_,...originalPayload}=snapshot;
 const forgedPayload={...originalPayload,binding:forgedBinding};
 const forged={...forgedPayload,snapshotDigest:enemyV2SnapshotDigest(forgedPayload)};
 assert.throws(()=>reviewStoredPartyRecoveryV2({...runtime,privateState:{combatV2EncounterReview:forged}},identity),/binding_mismatch/);
 let calls=0;
 const repository={load:async(runId:string,accountId:string)=>{
  calls++;assert.equal(runId,identity.runId);assert.equal(accountId,identity.accountId);
  return runtime;
 }};
 await assert.rejects(()=>loadPartyRecoverySnapshotV2(repository,identity),/disabled/);
 assert.equal(calls,0);
 assert.deepEqual(await loadPartyRecoverySnapshotV2(repository,identity,true),snapshot);
 assert.equal(calls,1);
 await assert.rejects(()=>loadPartyRecoverySnapshotV2({
  load:async()=>{throw Error('NOT_PARTICIPANT');},
 },identity,true),/NOT_PARTICIPANT/);
 console.log('PASS: private party recovery snapshot review and participant-authorized read contract');
}
async function reviewReservation(){
 const snapshot=preparePartyRecoverySnapshotV2({...args,stateRevision:args.stateRevision+1});
 const identity={runId:args.runId,accountId:roster[0].accountId,characterId:roster[0].characterId,
  nodeId:args.nodeId,encounterRevision:args.encounterRevision,snapshotDigest:snapshot.snapshotDigest};
 const initial:CoopRuntimeState={runId:args.runId,mode:'live',phase:'resolving_node',
  currentNodeId:args.nodeId,stateVersion:args.stateRevision,clearedPreBossCount:0,
  privateState:{combatV2PendingEncounterReview:snapshot,other:'preserve'},
  clientProjection:{safe:true},eventCursor:1};
 let row=structuredClone(initial),writes=0,reads=0;
 const events:CoopRuntimeCommit[]=[];
 const repository={
  load:async(runId:string,accountId:string)=>{
   reads++;assert.equal(runId,identity.runId);assert.equal(accountId,identity.accountId);
   return structuredClone(row);
  },
  compareAndSet:async(input:CoopRuntimeCommit)=>{
   writes++;
   if(row.stateVersion!==input.expectedStateVersion)
    throw Object.assign(Error('STALE_STATE'),{code:'stale_state'});
   row={...row,stateVersion:input.expectedStateVersion+1,privateState:structuredClone(input.privateState),
    eventCursor:input.eventCursor};
   events.push(input);
   return {runId:row.runId,stateVersion:row.stateVersion,eventCursor:row.eventCursor};
  },
 };
 await assert.rejects(()=>reserveStagedPartyEncounterV2(repository,identity),/disabled/);
 assert.equal(reads,0);assert.equal(writes,0);
 await assert.rejects(()=>reserveStagedPartyEncounterV2(repository,{...identity,characterId:'OTHER'},true),/not_frozen_participant/);
 assert.equal(writes,0);
 const both=await Promise.all([reserveStagedPartyEncounterV2(repository,identity,true),
  reserveStagedPartyEncounterV2(repository,identity,true)]);
 assert.deepEqual(both,[snapshot,snapshot]);
 assert.equal(writes,2);assert.equal(events.length,1);
 assert.equal(row.stateVersion,args.stateRevision+1);
 assert.deepEqual(row.privateState,{combatV2EncounterReview:snapshot,other:'preserve'});
 assert.deepEqual(events[0].clientProjection,initial.clientProjection);
 assert.deepEqual(events[0].eventPayload,{nodeId:args.nodeId});
 assert.deepEqual(await reserveStagedPartyEncounterV2(repository,identity,true),snapshot);
 assert.equal(writes,2);
 await assert.rejects(()=>reserveStagedPartyEncounterV2({...repository,
  load:async()=>({...initial,mode:'qmode' as const}),
 },identity,true),/invalid_runtime_scope/);
 await assert.rejects(()=>reserveStagedPartyEncounterV2({...repository,
  load:async()=>({...initial,stateVersion:initial.stateVersion+1}),
 },identity,true),/stale_snapshot/);
 await assert.rejects(()=>reserveStagedPartyEncounterV2({...repository,
  load:async()=>({...initial,privateState:{}}),
 },identity,true),/pending_snapshot_missing/);
 await assert.rejects(()=>reserveStagedPartyEncounterV2({...repository,
  load:async()=>initial,
  compareAndSet:async()=>({runId:identity.runId,stateVersion:99,eventCursor:2}),
 },identity,true),/invalid_commit_receipt/);
 // A delayed request from the previous room may not reserve or recover the
 // next room, even for the same authenticated participant.
 const next=preparePartyRecoverySnapshotV2({...args,nodeId:'NEXT_NODE',
  encounterRevision:args.encounterRevision+1,stateRevision:args.stateRevision+3});
 const nextPending:CoopRuntimeState={...initial,currentNodeId:'NEXT_NODE',
  stateVersion:args.stateRevision+2,privateState:{combatV2PendingEncounterReview:next}};
 await assert.rejects(()=>reserveStagedPartyEncounterV2({...repository,
  load:async()=>nextPending,
 },identity,true),/encounter_intent_mismatch/);
 await assert.rejects(()=>reserveStagedPartyEncounterV2({...repository,
  load:async()=>({...nextPending,stateVersion:nextPending.stateVersion+1,
   privateState:{combatV2EncounterReview:next}}),
 },identity,true),/encounter_intent_mismatch/);
 await assert.rejects(()=>reserveStagedPartyEncounterV2({...repository,
  load:async()=>initial,
 },{...identity,snapshotDigest:'f'.repeat(64)},true),/encounter_intent_mismatch/);
 await assert.rejects(()=>reserveStagedPartyEncounterV2({...repository,
  load:async()=>initial,
 },{...identity,encounterRevision:identity.encounterRevision+1},true),/encounter_intent_mismatch/);
 const priorReads=reads;
 await assert.rejects(()=>reserveStagedPartyEncounterV2(repository,
  {...identity,snapshotDigest:'invalid'},true),/invalid_encounter_intent/);
 assert.equal(reads,priorReads);
 assert.equal(writes,2);
 console.log('PASS: private staged encounter reservation review, mock CAS race and intent-bound retry');
}
void reviewRecovery().then(reviewReservation);

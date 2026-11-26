import {strict as assert} from 'node:assert';
import type {CombatInput,PersistentActorState} from '../../types';
import type {FrozenLoadoutSnapshot} from '../../../coop/loadout-snapshots';
import type {ReadyCheckRecord,ReadyRosterMember} from '../../../coop/ready-checks';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import type {PartyV2RunBindingReview} from '../party-dungeon-persistence-review';
import type {VerifiedV2EquipmentEffectSource} from '../equipment-trait-engine-authority';
import {
 simulateUnifiedEquipmentCombatV2,simulateUnifiedEquipmentPersistedPartyCombatV2,
} from '../unified-equipment-encounter';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';
import {preparePartyEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';

const ids:ClassIdV2[]=['IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER'];
const boss=bosses[2];
const fixtures=ids.map(classId=>setup(classId,0,boss,profiles[1]));
const players=fixtures.map(x=>x.actor);
const builds=fixtures.map(x=>x.build);
const runtime=fixtures.map(x=>x.runtime);
const traitPorts=fixtures.map(x=>x.signedPort);
const seed='QA_PERSISTED_10S_PARTY';
const input:CombatInput={seed,players,enemies:[fixtures[0].input.enemies[0]],maxDurationMs:7000,tickMs:100};
const enemyKitFor=(kitSeed:string)=>{
 const candidate=preparePartyEnemyKitsV2(input.enemies,{
  ruleset:ENEMY_V2_RULESET,serverSeed:kitSeed,
  encounterId:'RUN_10S:NODE_10S',region:boss.region,
  equipmentTier:boss.tier,eliteEnemyIds:[],
 });
 const snapshot:PersistedEnemyKitV2={...candidate,source:'server-persisted-v2',revision:3};
 return {snapshot,verifyPersisted:(_row:PersistedEnemyKitV2,digest:string)=>
  /^[0-9a-f]{64}$/.test(digest)};
};

const roster:ReadyRosterMember[]=ids.map((classId,i)=>({
 accountId:traitPorts[i].accountId,characterId:runtime[i].characterId,
 ticketId:'TICKET_'+i,role:CLASS_ROLES_V2[classId],originalEnqueuedAtMs:1,
 loadoutId:'LOADOUT_'+i,loadoutRevision:11,loadoutSnapshotHash:'c'.repeat(63)+i,
}));
const readyCheck:ReadyCheckRecord={id:'READY_10S',partyId:'PARTY_10S',rosterRevision:5,
 roster,accepts:Object.fromEntries(roster.map(r=>[r.accountId,true])),
 status:'committed',openedAtMs:1,closesAtMs:1000};
const frozenRoster=ids.map((classId,i)=>({
 accountId:roster[i].accountId,characterId:roster[i].characterId,
 classId:classId,loadoutId:roster[i].loadoutId,revision:roster[i].loadoutRevision,
 snapshotHash:roster[i].loadoutSnapshotHash,readiness:{role:CLASS_ROLES_V2[classId]},
} as unknown as FrozenLoadoutSnapshot));
const party={
 runId:'RUN_10S',nodeId:'NODE_10S',encounterRevision:3,stateRevision:7,
 contentVersion:'content_v2',balanceVersion:'balance_v2',
 readyCheck,frozenRoster,traitPorts,enemyKit:enemyKitFor(seed),
 verifyPersisted:(binding:PartyV2RunBindingReview,
  _sources:readonly VerifiedV2EquipmentEffectSource[],digest:string)=>
   binding.runId==='RUN_10S'&&digest===binding.combatInputDigest,
};

const baseline=simulateUnifiedEquipmentCombatV2(input,builds,runtime,true);
const first=simulateUnifiedEquipmentPersistedPartyCombatV2(input,builds,runtime,party,true);
const repeat=simulateUnifiedEquipmentPersistedPartyCombatV2(input,builds,runtime,party,true);
assert.deepEqual(first,repeat);
const shuffled=simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,[builds[2],builds[0],builds[3],builds[1]],
 [runtime[3],runtime[1],runtime[0],runtime[2]],
 {...party,traitPorts:[traitPorts[1],traitPorts[3],traitPorts[0],traitPorts[2]]},true);
assert.deepEqual(shuffled,first,
 'persisted party execution must bind builds, gear and trait receipts by identity rather than array order');
 // Arrival order of independent trusted snapshots must not change the combat digest,
 // source ordering, equipment evidence, or output. Combat actor order remains fixed.
 const permute=<T>(xs:readonly T[],order:readonly number[])=>order.map(i=>xs[i]);
 const shuffledBuilds=permute(builds,[2,0,3,1]);
 const shuffledGear=permute(runtime,[1,3,0,2]);
 const shuffledPorts=permute(traitPorts,[3,2,1,0]);
 assert.deepEqual(baseline,simulateUnifiedEquipmentCombatV2(
  input,shuffledBuilds,shuffledGear,true));
 assert.deepEqual(first,simulateUnifiedEquipmentPersistedPartyCombatV2(
  input,shuffledBuilds,shuffledGear,{...party,traitPorts:shuffledPorts},true));
 assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
  input,builds,runtime,{...party,traitPorts:[traitPorts[0],traitPorts[0],...traitPorts.slice(2)]},true),
  /duplicate_or_invalid_trait_port_character/);
 assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
  input,builds,runtime,{...party,traitPorts:[{...traitPorts[0],characterId:'FOREIGN_CHARACTER'},...traitPorts.slice(1)]},true),
  /missing_trait_port_for_character/);
 assert.throws(()=>simulateUnifiedEquipmentCombatV2(
  {...input,players:[players[0],players[0],...players.slice(2)]},builds,runtime,true),
  /duplicate_encounter_actor/);
 assert.throws(()=>simulateUnifiedEquipmentCombatV2(
  input,builds,[runtime[0],{...runtime[1],characterId:runtime[0].characterId},...runtime.slice(2)],true),
  /duplicate_or_missing_equipment_character/);

assert.deepEqual(first.equipmentEvidence,baseline.equipmentEvidence);
assert.equal(first.equipmentEvidence.length,4);
assert.ok(first.equipmentEvidence.every(e=>
 e.baseSources.length===10&&e.setEffects.length===3&&e.affixSources.length===9));
assert.equal(first.synchronizationReview?.active.length,3);
assert.equal(first.partyPersistenceReview?.binding.partyId,'PARTY_10S');
assert.equal(first.partyPersistenceReview?.binding.rosterRevision,5);
assert.equal(first.partyPersistenceReview?.canAuthorizeCombat,false);
assert.ok(first.enemyMechanicLabels.some(label=>label.includes('Sunfall')),
 'party-mode persisted boss kit should supply the authored Sunfall mechanic');
assert.ok(first.combat.events.some(e=>e.type==='equipment_trait_trigger'),
 'persisted four-player exact-copy traits should execute in the hidden wrapper');
assert.deepEqual(first.combat.players.map(p=>p.definition.stats),
 baseline.combat.players.map(p=>p.definition.stats),
 'party authorities must not rewrite compiled personal stats');

const carried=Object.fromEntries(players.map(p=>[p.id,{
 hp:Math.max(1,p.stats.maxHp-50),downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0,
} satisfies PersistentActorState]));
const carriedInput={...input,seed:'QA_PERSISTED_10S_PARTY_CARRIED',initialPlayerState:carried};
const carriedParty={...party,enemyKit:enemyKitFor(carriedInput.seed),verifyPersisted:(
 binding:PartyV2RunBindingReview,_sources:readonly VerifiedV2EquipmentEffectSource[],
 digest:string,
 )=>binding.runId==='RUN_10S'&&digest===binding.combatInputDigest};
const carriedFirst=simulateUnifiedEquipmentPersistedPartyCombatV2(
 carriedInput,builds,runtime,carriedParty,true);
assert.deepEqual(carriedFirst,simulateUnifiedEquipmentPersistedPartyCombatV2(
 carriedInput,builds,runtime,carriedParty,true));
assert.equal(carriedFirst.partyPersistenceReview?.binding.stateRevision,7);

assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,frozenRoster:frozenRoster.map((x,i)=>i?x:
  ({...x,snapshotHash:'d'.repeat(64)} as FrozenLoadoutSnapshot))},true),
 /roster_snapshot_mismatch/);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,traitPorts:traitPorts.map((x,i)=>i?x:
  ({...x,accountId:traitPorts[1].accountId}))},true),
 /party_source_binding_mismatch/);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,encounterRevision:4},true),/party_enemy_kit_revision_mismatch/);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,nodeId:'OTHER_NODE'},true),/party_enemy_kit_revision_mismatch/);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,enemyKit:fixtures[0].trustedKit},true),
 /invalid_stored_kit/);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,enemyKit:undefined},true),/party_enemy_kit_required/);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,traitPorts:traitPorts.map((port,i)=>i?port:
  {...port,verifyPersisted:()=>false})},true),/party_persisted_ledger_not_verified/);
let verificationCount=0;
const once=simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,verifyPersisted:(binding,rows,digest)=>{
  verificationCount++;
  return party.verifyPersisted(binding,rows,digest);
 }},true);
assert.equal(verificationCount,1);
assert.deepEqual(once,first);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,enemyKit:{...party.enemyKit,
  verifyPersisted:()=>false}},true),/unverified_party_persisted_scope/);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,{...party,verifyPersisted:()=>false},true),
 /party_persisted_ledger_not_verified|unverified_scope/);
assert.throws(()=>simulateUnifiedEquipmentPersistedPartyCombatV2(
 input,builds,runtime,party,false),/persisted_party_disabled/);

console.log(JSON.stringify({kind:'PERSISTED_PARTY_10S_TRAITS_SYNC_REHEARSAL_NOT_LIVE',
 players:4,gearCopies:40,setThresholds:12,ordinaryAffixSources:36,
 synchronizationLinks:first.synchronizationReview?.active.length,
 traitEvents:first.combat.events.filter(e=>e.type==='equipment_trait_trigger').length,
 persistentState:'BOUND_TO_RUN_DIGEST',authoredPartyEnemyKit:'BOUND_AND_EXECUTED'}));

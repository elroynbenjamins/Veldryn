import {strict as assert} from 'node:assert';
import type {CombatInput,CombatantDefinition,PersistentActorState} from '../../types';
import type {FrozenLoadoutSnapshot} from '../../../coop/loadout-snapshots';
import type {ReadyCheckRecord,ReadyRosterMember} from '../../../coop/ready-checks';
import {CLASS_NAMES_V2,} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';
import {reviewPartyV2RunBinding} from '../party-dungeon-persistence-review';

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
 readyCheck:check,frozenRoster:frozen,combatInput:input};
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
assert.throws(()=>reviewPartyV2RunBinding({...args,combatInput:{...input,
 players:[actors[1],actors[0],actors[2],actors[3]]}}),/class_actor_mismatch|roster_snapshot_mismatch/);
assert.throws(()=>reviewPartyV2RunBinding({...args,frozenRoster:frozen.map((x,i)=>i===2?
 ({...x,classId:'Wayfinder'} as FrozenLoadoutSnapshot):x)}),/class_actor_mismatch/);
assert.throws(()=>reviewPartyV2RunBinding({...args,combatInput:{...input,enemyDamageProfile:'qmode-v1'}}),/invalid_scope/);

const carried=Object.fromEntries(actors.map(a=>[a.id,{
 hp:a.stats.maxHp-100,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0,
} satisfies PersistentActorState]));
const persisted=reviewPartyV2RunBinding({...args,combatInput:{...input,initialPlayerState:carried}});
assert.notEqual(persisted.binding.combatInputDigest,first.binding.combatInputDigest,
 'persisted HP/cooldown state must be part of the immutable encounter digest');
assert.throws(()=>reviewPartyV2RunBinding({...args,combatInput:{...input,initialPlayerState:{
 ...carried,FOREIGN:{hp:1,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0},
}}}),/persistent_state_roster_mismatch/);

const badDpsFrozen=frozen.map((x,i)=>i===2?
 ({...x,classId:'Wayfinder'} as FrozenLoadoutSnapshot):x);
const badDpsActors=[actors[0],actors[1],{...actors[2],classId:'Wayfinder',role:'damage' as const},actors[3]];
assert.throws(()=>reviewPartyV2RunBinding({...args,frozenRoster:badDpsFrozen,
 combatInput:{...input,players:badDpsActors}}),/invalid_dungeon_roles/);

console.log('PASS: committed ready roster + frozen loadout + persistent party run binding review');

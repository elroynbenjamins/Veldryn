import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatInput,CombatantDefinition} from '../../types';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';
import {PARTY_SYNCHRONIZATION_RULESET_V2} from '../party-synchronization';
import {issuePartySyncAuthorityV2,authorizePartySyncV2,type PartySyncAuthorityV2,type PartySyncScopeV2} from '../party-sync-authority';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';
const stats={maxHp:100000,attackPower:1000,healingPower:1000,defense:0,accuracy:10000,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
function player(c:ClassIdV2):CombatantDefinition{
 return {id:c,name:CLASS_NAMES_V2[c],classId:CLASS_NAMES_V2[c],team:'players',role:CLASS_ROLES_V2[c],level:35,
  stats:{...stats},basicAttackMs:100000,basicAttackCoeff:.1,abilities:[],
  combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[c],specializationId:'QA'}};
}
const enemy:CombatantDefinition={id:'enemy',name:'QA',team:'enemies',role:'enemy',level:35,
 stats:{...stats},basicAttackMs:100000,basicAttackCoeff:.8,abilities:[]};
const input:CombatInput={seed:'SYNC_QA_1',players:[player('BASTION'),player('DAWNKEEPER')],enemies:[enemy],maxDurationMs:100};
const scope:PartySyncScopeV2={ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,encounterId:'enc1',partyId:'party1',revision:1,seed:input.seed,mode:'party_contract',
 members:[{actorId:'BASTION',characterId:'char1',classId:'BASTION'},{actorId:'DAWNKEEPER',characterId:'char2',classId:'DAWNKEEPER'}]};
const pinned=enemyV2SnapshotDigest(input);
const scopeDigest=enemyV2SnapshotDigest(scope);
const verify=(s:PartySyncScopeV2,d:string)=>d===pinned&&enemyV2SnapshotDigest(s)===scopeDigest;
const token=issuePartySyncAuthorityV2(scope,input,verify);
assert.equal(authorizePartySyncV2(input,token).get('BASTION')?.damage_reduction_pct,300);
assert.equal(authorizePartySyncV2(input,token).has('enemy'),false);
assert.equal(authorizePartySyncV2(input).size,0);
assert.throws(()=>issuePartySyncAuthorityV2(scope,input,()=>false),/unverified_scope/);
assert.throws(()=>issuePartySyncAuthorityV2({...scope,revision:2},input,verify),/unverified_scope/);
assert.throws(()=>issuePartySyncAuthorityV2({...scope,mode:'dungeon'},input,()=>true),/dungeon_roles/);
assert.throws(()=>issuePartySyncAuthorityV2({...scope,members:[scope.members[0],{...scope.members[1],characterId:'char1'}]},input,()=>true),/member_mismatch/);
assert.throws(()=>issuePartySyncAuthorityV2({...scope,members:[scope.members[0],{...scope.members[1],classId:'HEXWEAVER'}]},input,()=>true),/member_mismatch/);
assert.throws(()=>authorizePartySyncV2({...input,seed:'different'},token),/input_mismatch/);
assert.throws(()=>authorizePartySyncV2({...input,players:[...input.players].reverse()},token),/input_mismatch/);
assert.throws(()=>authorizePartySyncV2({...input,players:[{...input.players[0],stats:{...stats,maxHp:200000}},input.players[1]]},token),/input_mismatch/);
assert.throws(()=>simulateCombat(input,undefined,undefined,{} as PartySyncAuthorityV2),/not_issued/);
const base=simulateCombat(input),boosted=simulateCombat(input,undefined,undefined,token);
assert.deepEqual(boosted,simulateCombat(input,undefined,undefined,token));
assert.deepEqual(input.players.map(p=>p.stats),boosted.players.map(p=>p.definition.stats));
const hit=(r:typeof base)=>r.events.find(e=>e.type==='damage'&&e.actorId==='enemy')?.amount??0;
assert.ok(hit(base)>0);
assert.ok(Math.abs(hit(boosted)-hit(base)*.97)<.03,'Radiant incoming reduction once');
const shieldInput:CombatInput={...input,players:input.players.map((p,i)=>i===0?{...p,abilities:[
 {id:'QA_SHIELD',name:'QA shield',cooldownMs:99999,castTimeMs:0,target:'self',priority:100,effects:[{kind:'shield',coeff:1}]}]}:p)};
const shieldToken=issuePartySyncAuthorityV2(scope,shieldInput,()=>true); // synthetic QA only
const shield=(r:typeof base)=>r.events.find(e=>e.type==='shield'&&e.abilityId==='QA_SHIELD')?.amount??0;
assert.equal(shield(simulateCombat(shieldInput)),1000);
assert.equal(shield(simulateCombat(shieldInput,undefined,undefined,shieldToken)),1040);
console.log('Party Synchronization private authority, replay, damage reduction and shield hooks');

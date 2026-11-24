import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {AbilityDefinition,CombatInput,CombatantDefinition,CombatResult} from '../../types';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';
import {PARTY_SYNCHRONIZATION_RULESET_V2} from '../party-synchronization';
import {issuePartySyncAuthorityV2,type PartySyncAuthorityV2,type PartySyncModeV2,type PartySyncScopeV2} from '../party-sync-authority';

const baseStats={maxHp:100000,attackPower:1000,healingPower:1000,defense:100,
 accuracy:10000,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
function actor(classId:ClassIdV2,index:number,abilities:AbilityDefinition[]=[]):CombatantDefinition{
 return {id:'P'+index+'_'+classId,name:CLASS_NAMES_V2[classId],classId:CLASS_NAMES_V2[classId],
  team:'players',role:CLASS_ROLES_V2[classId],level:35,stats:{...baseStats},
  basicAttackMs:100000,basicAttackCoeff:.1,abilities,
  combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[classId],specializationId:'QA'}};
}
function foe(abilities:AbilityDefinition[]=[]):CombatantDefinition{
 return {id:'QA_ENEMY',name:'QA Enemy',team:'enemies',role:'enemy',level:35,
  stats:{...baseStats,attackPower:800,accuracy:10000},basicAttackMs:100000,basicAttackCoeff:.1,abilities};
}
let scopeSeq=0;
function tokenFor(input:CombatInput,classes:ClassIdV2[],mode:PartySyncModeV2='party_event'):PartySyncAuthorityV2{
 const scope:PartySyncScopeV2={ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,
  encounterId:'QA_SYNC_'+(++scopeSeq),partyId:'QA_PARTY',revision:1,seed:input.seed,mode,
  members:classes.map((classId,i)=>({actorId:input.players[i].id,characterId:'CHAR_'+scopeSeq+'_'+i,classId}))};
 return issuePartySyncAuthorityV2(scope,input,()=>true);
}
const amount=(r:CombatResult,type:'dot_tick'|'shield',abilityId:string)=>
 r.events.find(e=>e.type===type&&e.abilityId===abilityId)?.amount??0;

// Mystic Harmony: +10% discrete resource generation. Ten legitimate gains
// produce one extra stack via deterministic credit; there is no random proc.
const spender:AbilityDefinition={id:'QA_RESONANCE_LOOP',name:'QA Resonance Loop',cooldownMs:100,
 castTimeMs:0,target:'self',priority:100,combatV2:{spend:'all'},
 effects:[{kind:'shield',coeff:.01}]};
const resourceClasses:ClassIdV2[]=['DAWNKEEPER','STONECALLER'];
const resourceInput:CombatInput={seed:'SYNC_RESOURCE',players:[
 actor('DAWNKEEPER',0),actor('STONECALLER',1,[spender])],enemies:[foe()],maxDurationMs:1200,tickMs:100};
const resourceToken=tokenFor(resourceInput,resourceClasses);
const resourceBase=simulateCombat(resourceInput);
const resourceSync=simulateCombat(resourceInput,undefined,undefined,resourceToken);
assert.equal(resourceBase.events.filter(e=>e.detail==='party_sync_bonus').length,0);
assert.ok(resourceSync.events.filter(e=>e.detail==='party_sync_bonus').length>=1);
assert.deepEqual(resourceSync,simulateCombat(resourceInput,undefined,undefined,resourceToken));

// Harmful-effect resistance reduces potency, not duration. This avoids a 5%
// duration change accidentally deleting a whole 1-second DoT tick.
const pressure:AbilityDefinition={id:'QA_HARM',name:'QA Harm',cooldownMs:99999,castTimeMs:0,
 target:'all_enemies',priority:100,effects:[
  {kind:'dot',tag:'qa_dot',coeff:.1,damageType:'shadow',durationMs:3000,tickMs:1000},
  {kind:'debuff',tag:'damage_done',value:-.20,durationMs:3000},
 ]};
const harmInput:CombatInput={seed:'SYNC_HARM',players:[
 actor('DAWNKEEPER',0),actor('STONECALLER',1)],enemies:[foe([pressure])],
 maxDurationMs:1100,tickMs:100};
const harmBase=simulateCombat(harmInput);
const harmSync=simulateCombat(harmInput,undefined,undefined,tokenFor(harmInput,resourceClasses));
assert.ok(amount(harmBase,'dot_tick','QA_HARM')>0);
assert.ok(Math.abs(amount(harmSync,'dot_tick','QA_HARM')/amount(harmBase,'dot_tick','QA_HARM')-.95)<.002);
const debuffBase=harmBase.players[0].modifiers.find(m=>m.tag==='damage_done')?.value;
const debuffSync=harmSync.players[0].modifiers.find(m=>m.tag==='damage_done')?.value;
assert.equal(debuffBase,-.20);
assert.ok(Math.abs((debuffSync??0)-(-.19))<1e-9);
assert.equal(harmSync.events.find(e=>e.type==='status_apply'&&e.statusTag==='qa_dot')?.expiresAtMs,
 harmBase.events.find(e=>e.type==='status_apply'&&e.statusTag==='qa_dot')?.expiresAtMs);

// Shattering Force uses interrupt recovery rather than inventing a new stagger
// subsystem. A 3% bonus extends the interrupted ability's existing cooldown.
const interrupt:AbilityDefinition={id:'QA_INTERRUPT',name:'QA Interrupt',cooldownMs:100,castTimeMs:0,
 target:'interruptible_casting_enemy',priority:100,effects:[{kind:'interrupt'}]};
const longCast:AbilityDefinition={id:'QA_LONG_CAST',name:'QA Long Cast',cooldownMs:10000,castTimeMs:1000,
 target:'all_enemies',priority:100,interruptible:true,effects:[{kind:'damage',coeff:.2,damageType:'fire'}]};
const interruptClasses:ClassIdV2[]=['RAVAGER','STONECALLER'];
const interruptInput:CombatInput={seed:'SYNC_INTERRUPT',players:[
 actor('RAVAGER',0,[interrupt]),actor('STONECALLER',1)],enemies:[foe([longCast])],
 maxDurationMs:10400,tickMs:100};
const interruptBase=simulateCombat(interruptInput);
const interruptSync=simulateCombat(interruptInput,undefined,undefined,tokenFor(interruptInput,interruptClasses));
const starts=(r:CombatResult)=>r.events.filter(e=>e.type==='cast_start'&&e.abilityId==='QA_LONG_CAST').map(e=>e.atMs);
assert.deepEqual(starts(interruptBase).slice(0,2),[0,10000]);
assert.deepEqual(starts(interruptSync).slice(0,2),[0,10300]);
assert.equal(interruptSync.events.filter(e=>e.type==='interrupt').length>=1,true);

// No token must preserve previous replay byte-for-byte for all three fixtures.
assert.deepEqual(resourceBase,simulateCombat(resourceInput));
assert.deepEqual(harmBase,simulateCombat(harmInput));
assert.deepEqual(interruptBase,simulateCombat(interruptInput));
console.log('PASS: resource generation, harmful resistance and interrupt recovery synchronization mechanics');

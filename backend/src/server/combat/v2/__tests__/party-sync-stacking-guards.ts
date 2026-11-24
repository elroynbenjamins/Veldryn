import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {AbilityDefinition,CombatInput,CombatV2EquipmentEffects,CombatantDefinition,CombatResult} from '../../types';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';
import {PARTY_SYNCHRONIZATION_RULESET_V2} from '../party-synchronization';
import {issuePartySyncAuthorityV2,type PartySyncScopeV2} from '../party-sync-authority';
const zeroGear:CombatV2EquipmentEffects={accuracyPp:0,evasionPp:0,penetrationPp:0,wardPp:0,
 shieldStrengthPct:0,hexPotencyPct:0};
const baseStats={maxHp:1e6,attackPower:1000,healingPower:1000,defense:500,
 accuracy:10000,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
function p(c:ClassIdV2,i:number,abilities:AbilityDefinition[]=[],gear:CombatV2EquipmentEffects=zeroGear,
 stats:Partial<typeof baseStats>={}):CombatantDefinition{
 return {id:'P'+i+'_'+c,name:CLASS_NAMES_V2[c],classId:CLASS_NAMES_V2[c],team:'players',
  role:CLASS_ROLES_V2[c],level:50,stats:{...baseStats,...stats},basicAttackMs:100000,basicAttackCoeff:.1,
  abilities,combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[c],specializationId:'QA',equipmentEffects:{...gear}}};
}
function enemy(abilities:AbilityDefinition[]=[]):CombatantDefinition{
 return {id:'E',name:'Enemy',team:'enemies',role:'enemy',level:50,
  stats:{...baseStats,maxHp:1e9,attackPower:1000,defense:3000},basicAttackMs:100000,basicAttackCoeff:.1,abilities};
}
let seq=0;
function sync(input:CombatInput,classes:ClassIdV2[]){
 const scope:PartySyncScopeV2={ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,
  encounterId:'STACK_'+(++seq),partyId:'PARTY',revision:1,seed:input.seed,mode:'party_event',
  members:classes.map((classId,i)=>({actorId:input.players[i].id,characterId:'C'+seq+'_'+i,classId}))};
 return issuePartySyncAuthorityV2(scope,input,()=>true);
}
const dmg=(r:CombatResult,actor:string,target?:string)=>
 r.events.find(e=>e.type==='damage'&&e.actorId===actor&&(!target||e.targetId===target))?.amount??0;
const shield=(r:CombatResult,id:string)=>r.events.find(e=>e.type==='shield'&&e.abilityId===id)?.amount??0;

// Runebound Ward is an effectiveness multiplier: zero existing Ward stays zero.
const fire:AbilityDefinition={id:'FIRE',name:'Fire',cooldownMs:99999,castTimeMs:0,target:'all_enemies',
 priority:100,effects:[{kind:'damage',coeff:.5,damageType:'fire'}]};
let classes:ClassIdV2[]=['IRONWARDEN','STONECALLER'];
let input:CombatInput={seed:'NO_FREE_WARD',players:[p(classes[0],0),p(classes[1],1)],enemies:[enemy([fire])],maxDurationMs:100};
const noWardBase=simulateCombat(input),noWardSync=simulateCombat(input,undefined,undefined,sync(input,classes));
assert.equal(dmg(noWardSync,'E','P0_IRONWARDEN'),dmg(noWardBase,'E','P0_IRONWARDEN'));
const wardGear={...zeroGear,wardPp:.10};
input={...input,seed:'EXISTING_WARD',players:[p(classes[0],0,[],wardGear),p(classes[1],1)]};
const wardBase=simulateCombat(input),wardSync=simulateCombat(input,undefined,undefined,sync(input,classes));
assert.ok(dmg(wardSync,'E','P0_IRONWARDEN')<dmg(wardBase,'E','P0_IRONWARDEN'));

// Independent Equipment shield strength and Synchronization multiply at action resolution.
const selfShield:AbilityDefinition={id:'SELF_SHIELD',name:'Shield',cooldownMs:99999,castTimeMs:0,target:'self',
 priority:100,effects:[{kind:'shield',coeff:1}]};
classes=['BASTION','DAWNKEEPER'];
input={seed:'SHIELD_STACK',players:[p('BASTION',0,[selfShield],{...zeroGear,shieldStrengthPct:.10}),p('DAWNKEEPER',1)],
 enemies:[enemy()],maxDurationMs:100};
assert.equal(shield(simulateCombat(input),'SELF_SHIELD'),1100);
assert.equal(shield(simulateCombat(input,undefined,undefined,sync(input,classes)),'SELF_SHIELD'),1144);

// Synchronization may strengthen authored lifesteal but must never create it.
const plainHit:AbilityDefinition={id:'PLAIN',name:'Plain',cooldownMs:99999,castTimeMs:0,target:'current_target',
 priority:100,effects:[{kind:'damage',coeff:.5,damageType:'physical'}]};
classes=['DREADGUARD','HEXWEAVER'];
input={seed:'NO_FREE_LIFESTEAL',players:[p('DREADGUARD',0,[plainHit]),p('HEXWEAVER',1)],enemies:[enemy()],maxDurationMs:100};
const noSteal=simulateCombat(input,undefined,undefined,sync(input,classes));
assert.equal(noSteal.events.filter(e=>e.abilityId?.startsWith('V2_LIFESTEAL:')).length,0);

// Synchronization penetration joins equipment/effect sources under the existing 100% clamp.
const penetrate=(value:number):AbilityDefinition=>({id:'PEN',name:'Pen',cooldownMs:99999,castTimeMs:0,
 target:'current_target',priority:100,effects:[{kind:'damage',coeff:.5,damageType:'physical',penetrationPct:value}]});
classes=['RAVAGER','HEXWEAVER'];
const penGear={...zeroGear,penetrationPp:.03};
input={seed:'PEN_CAP',players:[p('RAVAGER',0,[penetrate(.94)],penGear),p('HEXWEAVER',1)],enemies:[enemy()],maxDurationMs:100};
const penSync=simulateCombat(input,undefined,undefined,sync(input,classes));
const control:CombatInput={...input,players:[p('RAVAGER',0,[penetrate(.97)],penGear),p('HEXWEAVER',1)]};
assert.equal(dmg(penSync,'P0_RAVAGER'),dmg(simulateCombat(control),'P0_RAVAGER'));

// Predator's Instinct adds 2 percentage points but cannot exceed engine's 75% crit cap.
// Compare only crit decisions because the same Synchronization also increases crit damage.
classes=['WAYFINDER','KNIFE_DANCER'];
const critInput:CombatInput={seed:'CRIT_CAP',players:[
 p('WAYFINDER',0,[],zeroGear,{critChance:.74}),p('KNIFE_DANCER',1,[],zeroGear,{critChance:.74})],
 enemies:[enemy()],maxDurationMs:5000,tickMs:100};
for(const x of critInput.players)x.basicAttackMs=100;
const cappedControl:CombatInput={...critInput,players:[
 p('WAYFINDER',0,[],zeroGear,{critChance:.75}),p('KNIFE_DANCER',1,[],zeroGear,{critChance:.75})]};
for(const x of cappedControl.players)x.basicAttackMs=100;
const critSync=simulateCombat(critInput,undefined,undefined,sync(critInput,classes));
const critControl=simulateCombat(cappedControl);
const critFlags=(r:CombatResult)=>r.events.filter(e=>e.type==='damage'&&e.actorId?.startsWith('P')).map(e=>Boolean(e.critical));
assert.deepEqual(critFlags(critSync),critFlags(critControl));
console.log('PASS: Synchronization cross-system no-free-effect and final clamp guards');

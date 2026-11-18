import {strict as assert} from 'node:assert';
import type {AbilityDefinition,CombatantDefinition,CombatantState,CombatV2Resource} from '../../types';
import {RESOURCE_CAP_V2,RESOURCE_BY_CLASS_V2,RESOURCE_NAME_V2,
 initCombatResourceV2,awardCombatResourceV2,spendCombatResourceV2} from '../resource-runtime';
const classes=Object.entries(RESOURCE_BY_CLASS_V2);
assert.equal(classes.length,9);
assert.equal(new Set(classes.map(x=>x[1])).size,9);
for(const [classId,res] of classes){
 const resource=res as CombatV2Resource;
 const actor:CombatantDefinition={
  id:'P',classId,name:classId,team:'players',role:'damage',level:50,
  combatV2:{version:2,resource,specializationId:'test'},
  stats:{maxHp:1000,attackPower:150,healingPower:100,defense:10,accuracy:500,evasion:5,
    critChance:0,critMultiplier:1.5,haste:0},
  basicAttackMs:2000,basicAttackCoeff:1,abilities:[],
 };
 const v2=initCombatResourceV2(actor);
 assert.ok(v2);
 assert.equal(v2.stacks,0);
 assert.equal(v2.maxStacks,RESOURCE_CAP_V2[resource]);
 assert.ok(RESOURCE_NAME_V2[resource].length>0);
 const state:CombatantState={
  definition:actor,hp:1000,shield:0,alive:true,downed:false,threat:{},cooldownReadyAt:{},
  nextBasicAt:0,periodic:[],modifiers:[],damageDone:0,healingDone:0,damageTaken:0,
  interrupts:0,triggeredPhases:[],combatV2:v2,
 };
 const trigger:Record<CombatV2Resource,Parameters<typeof awardCombatResourceV2>[1]>={
  guard:'taunt',barrier:'shield_absorb',dread:'damage_taken',focus:'direct_hit',
  fury:'direct_hit',threads:'periodic_hit',rhythm:'direct_hit',
  radiance:'effective_heal',resonance:'shield_granted',
 };
 const first=awardCombatResourceV2(state,trigger[resource],0,'SKILL');
 assert.ok(first);
 assert.equal(first.type,'resource_gain');
 assert.equal(first.resourceAfter,1);
 assert.equal(awardCombatResourceV2(state,trigger[resource],0,'SKILL'),undefined,'cannot duplicate same source per tick');
 assert.equal(awardCombatResourceV2(state,trigger[resource],1,'GEM_BONUS'),undefined,'gems cannot trigger class resources');
 for(let i=1;i<10;i++)awardCombatResourceV2(state,trigger[resource],i*1000,'SKILL');
 assert.equal(state.combatV2?.stacks,RESOURCE_CAP_V2[resource],'resource always capped');
 const ability:AbilityDefinition={
  id:'SKILL',name:'Spender',cooldownMs:2000,castTimeMs:0,target:'current_target',priority:50,
  effects:[{kind:'damage',coeff:1}],combatV2:{spend:'all',bonusPerStack:.07},
 };
 const before=JSON.stringify(ability);
 const spent=spendCombatResourceV2(state,ability,12_000);
 assert.ok(spent.event);
 assert.equal(spent.event.resourceBefore,RESOURCE_CAP_V2[resource]);
 assert.equal(spent.event.resourceAfter,0);
 assert.equal(state.combatV2?.stacks,0);
 assert.ok((spent.ability.effects[0].coeff??0)>1);
 assert.equal(JSON.stringify(ability),before,'authoritative ability must not mutate');
 assert.equal(spendCombatResourceV2(state,ability,13_000).event,undefined,'cannot spend nonexistent stacks');
 assert.equal(initCombatResourceV2({...actor,team:'enemies'}),undefined,'enemies cannot inherit class resource');
 assert.equal(initCombatResourceV2({...actor,combatV2:undefined}),undefined,'legacy actor unchanged');
}
console.log('PASS: nine deterministic bounded resources, trigger safety, deduplication and spending');

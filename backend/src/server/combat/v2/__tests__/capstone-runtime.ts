import {strict as assert} from 'node:assert';
import type {CombatantDefinition,CombatantState,CombatV2Resource} from '../../types';
import {capstoneIdV2,CLASS_NAMES_V2,SPECIALIZATIONS_V2} from '../skill-catalog';
import {RESOURCE_BY_CLASS_V2,initCombatResourceV2} from '../resource-runtime';
import {triggerCapstoneV2,type CapstoneTriggerV2} from '../capstone-runtime';
import type {ClassIdV2} from '../build-contract';

type Scenario={classId:ClassIdV2;capstone:string;trigger:CapstoneTriggerV2;
  stacks?:number;spentTotal?:number;repeats?:number;ctx?:{spent?:number;amount?:number;healedAlly?:boolean;isPartyShield?:boolean};expects:boolean};
const tests:Scenario[]=[
 {classId:'IRONWARDEN',capstone:'Oathkeeper',trigger:'spend',spentTotal:3,ctx:{spent:3},expects:true},
 {classId:'IRONWARDEN',capstone:'Runic Retribution',trigger:'interrupt',expects:true},
 {classId:'BASTION',capstone:'Immovable',trigger:'shield',stacks:3,ctx:{amount:100},expects:true},
 {classId:'BASTION',capstone:'Sheltering Wall',trigger:'shield',ctx:{amount:100,isPartyShield:true},expects:true},
 {classId:'DREADGUARD',capstone:'Blood Oath',trigger:'spend',ctx:{spent:3},expects:true},
 {classId:'DREADGUARD',capstone:'Dread Dominion',trigger:'gain',stacks:5,expects:true},
 {classId:'WAYFINDER',capstone:'Perfect Aim',trigger:'spend',ctx:{spent:3},expects:true},
 {classId:'WAYFINDER',capstone:'Unbroken Trail',trigger:'hit',repeats:5,expects:true},
 {classId:'RAVAGER',capstone:'Final Verdict',trigger:'hit',expects:false},
 {classId:'RAVAGER',capstone:'Unbound Fury',trigger:'gain',stacks:5,expects:true},
 {classId:'HEXWEAVER',capstone:'Endless Weave',trigger:'hit',expects:false},
 {classId:'HEXWEAVER',capstone:'Void Surge',trigger:'spend',ctx:{spent:5},expects:true},
 {classId:'KNIFE_DANCER',capstone:'Scarlet Crescendo',trigger:'hit',repeats:5,expects:true},
 {classId:'KNIFE_DANCER',capstone:'Silent Answer',trigger:'evade',expects:true},
 {classId:'DAWNKEEPER',capstone:'Dawn Renewal',trigger:'heal',repeats:5,expects:true},
 {classId:'DAWNKEEPER',capstone:'Solar Covenant',trigger:'heal',ctx:{healedAlly:true},expects:true},
 {classId:'STONECALLER',capstone:'Living Mountain',trigger:'shield',repeats:3,expects:true},
 {classId:'STONECALLER',capstone:'Ritual Surge',trigger:'totem_expires',expects:true},
];
assert.equal(tests.length,18);
for(const spec of SPECIALIZATIONS_V2){
 assert.ok(tests.some(x=>capstoneIdV2(x.classId,x.capstone)===spec.capstoneId),
   'All registered capstones must have an executable behavior contract: '+spec.capstoneId);
}
for(const scenario of tests){
 const actor:CombatantDefinition={
  id:'P',classId:CLASS_NAMES_V2[scenario.classId],name:'Tester',team:'players',
  role:'tank',level:50,
  combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[scenario.classId],
    specializationId:'test',capstoneId:capstoneIdV2(scenario.classId,scenario.capstone)},
  stats:{maxHp:2000,attackPower:200,healingPower:200,defense:150,accuracy:800,
    evasion:100,critChance:.1,critMultiplier:1.5,haste:.1},
  basicAttackMs:2000,basicAttackCoeff:1,abilities:[],
 };
 const state:CombatantState={
  definition:actor,combatV2:initCombatResourceV2(actor),hp:1200,shield:0,alive:true,
  downed:false,threat:{},cooldownReadyAt:{},nextBasicAt:0,periodic:[],modifiers:[],
  damageDone:0,healingDone:0,damageTaken:0,interrupts:0,triggeredPhases:[],
 };
 state.combatV2!.stacks=scenario.stacks??0;
 state.combatV2!.spentTotal=scenario.spentTotal??0;
 let event;
 for(let i=0;i<(scenario.repeats??1);i++){
  const result=triggerCapstoneV2(state,scenario.trigger,1000+i*1000,scenario.ctx);
  event=result.event??event;
  assert.ok(result.actions.every(a=>a.target&&a.effect.kind));
 }
 assert.equal(Boolean(event),scenario.expects,scenario.capstone);
 if(event)assert.equal(event.type,'capstone_trigger');
 if(scenario.capstone==='Perfect Aim')assert.equal(state.combatV2?.pendingCritMultiplierBonus,.25);
 if(scenario.capstone==='Void Surge')assert.equal(state.combatV2?.pendingDamageBonus,.25);
 if(scenario.capstone==='Dawn Renewal')assert.equal(state.combatV2?.pendingHealingBonus,.2);
 // A capped cooldown must prevent spamming at the same timestamp.
 if(event&&scenario.repeats!==5){
  const next=triggerCapstoneV2(state,scenario.trigger,1000,scenario.ctx);
  assert.equal(next.event,undefined,scenario.capstone+' proc must not duplicate at same time');
  if(scenario.capstone==='Sheltering Wall')assert.equal(next.actions.length,1,
    'same party-wide cast still shields every recipient');
 }
}
console.log('PASS: all 18 capstone triggers, threshold counters, cooldowns and queued effects');

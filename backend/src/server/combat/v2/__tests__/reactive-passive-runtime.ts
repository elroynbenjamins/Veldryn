import {strict as assert} from 'node:assert';
import type {CombatantDefinition,CombatantState,CombatRole} from '../../types';
import {CLASS_NAMES_V2,passiveIdV2,PASSIVES_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {RESOURCE_BY_CLASS_V2,initCombatResourceV2} from '../resource-runtime';
import {
 REACTIVE_PASSIVES_V2,REACTIVE_PASSIVE_COUNT_V2,passiveRankV2,
 triggerReactivePassiveV2,incomingReactiveMultiplierV2,outgoingReactiveMultiplierV2,
 reactiveDamageFlatReductionV2,reactiveHasteV2,reactiveResourceSpendMultiplierV2,
 reactiveHealingMultiplierV2,reactiveShieldMultiplierV2,defensiveReactiveTriggerV2,
} from '../reactive-passive-runtime';

const total=Object.values(REACTIVE_PASSIVES_V2).reduce((n,row)=>n+row.length,0);
assert.equal(total,31);
assert.equal(REACTIVE_PASSIVE_COUNT_V2,31);
const unique=new Set<string>();
for(const [classId,nodes] of Object.entries(REACTIVE_PASSIVES_V2)){
 for(const node of nodes){
  const id=passiveIdV2(classId as ClassIdV2,node);
  assert.ok(!unique.has(id),'Duplicate reactive passive: '+id);
  unique.add(id);
  assert.ok(PASSIVES_V2.some(passive=>passive.id===id),'Noncanonical passive '+id);
 }
}
function actor(classId:ClassIdV2,node:string):CombatantState {
 const definition:CombatantDefinition={
  id:'P',name:CLASS_NAMES_V2[classId],classId:CLASS_NAMES_V2[classId],
  team:'players',role:CLASS_ROLES_V2[classId] as CombatRole,level:50,
  combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[classId],specializationId:'test',
    passiveRanks:{[passiveIdV2(classId,node)]:3}},
  stats:{maxHp:1000,attackPower:200,healingPower:100,defense:100,accuracy:900,
    evasion:120,critChance:.05,critMultiplier:1.5,haste:0},
  basicAttackMs:2000,basicAttackCoeff:1,abilities:[],
 };
 return {
  definition,combatV2:initCombatResourceV2(definition),
  hp:1000,shield:0,alive:true,downed:false,threat:{},cooldownReadyAt:{},
  nextBasicAt:0,periodic:[],modifiers:[],damageDone:0,healingDone:0,
  damageTaken:0,interrupts:0,triggeredPhases:[],
 };
}
function enemy():CombatantState {
 const e=actor('RAVAGER','Scarred');
 return {...e,definition:{...e.definition,id:'E',team:'enemies',role:'enemy',combatV2:undefined},
   combatV2:undefined,threat:{}};
}
function testRule(classId:ClassIdV2,node:string):void{
 const p=actor(classId,node),e=enemy();
 const now=1000;
 assert.equal(passiveRankV2(p,node),3);
 const event=(name:Parameters<typeof triggerReactivePassiveV2>[1],ctx:Parameters<typeof triggerReactivePassiveV2>[3]={})=>
  triggerReactivePassiveV2(p,name,now,ctx);
 const actions=(name:Parameters<typeof triggerReactivePassiveV2>[1],ctx:Parameters<typeof triggerReactivePassiveV2>[3]={})=>
  event(name,ctx).length;
 switch(node){
  case 'Steady Guard':
   p.shield=200;assert.ok(incomingReactiveMultiplierV2(p,e,now)<1);break;
  case 'Last Bastion':
   p.hp=300;assert.equal(defensiveReactiveTriggerV2(p,now).length,1);
   assert.equal(defensiveReactiveTriggerV2(p,now).length,0);break;
  case 'Stand Together':assert.ok(event('taunt').some(x=>x.target==='all_allies'));break;
  case 'Vengeful Rhythm':
   assert.equal(actions('hit',{abilityName:'Iron Riposte'}),0);
   assert.equal(actions('hit',{abilityName:'Iron Riposte'}),0);
   assert.ok(actions('hit',{abilityName:'Iron Riposte'})>0);break;
  case 'Immovability':assert.ok(incomingReactiveMultiplierV2(p,e,now)<1);break;
  case 'Last Refuge':
   e.definition.team='players';e.hp=200;
   assert.ok(reactiveShieldMultiplierV2(p,e,now)>1);
   assert.equal(reactiveShieldMultiplierV2(p,e,now),1);break;
  case 'Seismic Guard':assert.ok(event('interrupt').some(x=>x.effect.kind==='debuff'));break;
  case 'Unbroken Line':assert.ok(event('taunt').some(x=>x.target==='self'));break;
  case 'Pain Dividend':
   assert.ok(actions('damage_taken',{amount:150})>0);
   assert.equal(actions('damage_taken',{amount:150}),0);break;
  case 'Scar Pact':
   p.hp=300;assert.ok(reactiveDamageFlatReductionV2(p,250)>0);
   assert.equal(reactiveDamageFlatReductionV2(p,5),5);break;
  case 'Oppressive Gaze':
   p.combatV2!.stacks=4;assert.ok(incomingReactiveMultiplierV2(p,e,now)<1);break;
  case 'Predator':
   e.threat.P=500;assert.ok(outgoingReactiveMultiplierV2(p,e,now)>1);break;
  case 'Unbroken Will':assert.ok(actions('interrupt')>0);break;
  case 'Relentless Arrows':
   for(let i=0;i<4;i++)triggerReactivePassiveV2(p,'hit',i*1000,{});
   assert.ok(outgoingReactiveMultiplierV2(p,e,5000)>1);
   triggerReactivePassiveV2(p,'hit',5000,{});
   assert.equal(outgoingReactiveMultiplierV2(p,e,6000),1);break;
  case 'Trail Sense':
   e.modifiers.push({sourceId:'P',tag:'damage_taken',value:.04,expiresAt:9000,kind:'debuff'});
   assert.ok(incomingReactiveMultiplierV2(p,e,now)<1);break;
  case 'Second Wind':
   p.hp=300;assert.ok(event('damage_taken',{amount:150,previousHpPct:.45}).some(x=>x.effect.kind==='heal'));
   assert.equal(actions('damage_taken',{amount:150,previousHpPct:.45}),0);break;
  case 'Adrenaline':
   p.combatV2!.stacks=1;assert.ok(reactiveHasteV2(p)>0);
   p.combatV2!.stacks=0;assert.equal(reactiveHasteV2(p),0);break;
  case 'Relentless':case 'Thread Focus':case 'Echo Flow':
   assert.ok(reactiveResourceSpendMultiplierV2(p)>1);break;
  case 'Unchained':
   p.combatV2!.stacks=p.combatV2!.maxStacks;
   assert.ok(event('gain').some(x=>x.effect.tag==='damage_done'));break;
  case 'Kill Sustain':
   p.hp=600;assert.ok(event('kill').some(x=>x.effect.kind==='heal'));
   assert.equal(actions('kill'),0);break;
  case 'Void Memory':
   assert.ok(event('spend',{spent:3}).some(x=>x.effect.tag==='haste'));break;
  case 'Calm Mind':
   assert.equal(actions('damage_taken',{amount:150}),0);
   assert.ok(p.combatV2!.pendingDamageBonus>0);
   p.combatV2!.pendingDamageBonus=0;
   actions('damage_taken',{amount:150});
   assert.equal(p.combatV2!.pendingDamageBonus,0);break;
  case 'Endless Dance':
   p.combatV2!.stacks=4;
   assert.ok(outgoingReactiveMultiplierV2(p,e,now)>1);break;
  case 'Critical Tempo':assert.ok(event('hit',{critical:true}).some(x=>x.effect.tag==='haste'));break;
  case 'Countercraft':
   assert.ok(event('evade').some(x=>x.effect.kind==='damage'));
   assert.equal(actions('evade'),0);break;
  case 'Exit Wound':
   event('evade');
   assert.ok(outgoingReactiveMultiplierV2(p,e,now)>1);
   assert.equal(outgoingReactiveMultiplierV2(p,e,now),1);break;
  case 'Last Light':
   e.definition.team='players';e.hp=250;
   assert.ok(reactiveHealingMultiplierV2(p,e,now)>1);
   assert.equal(reactiveHealingMultiplierV2(p,e,now),1);break;
  case 'Grace':assert.ok(event('cleanse').some(x=>x.effect.tag==='damage_taken'));break;
  case 'Harmonic Circle':
   assert.ok(event('spend',{spent:4}).some(x=>x.target==='all_allies'));break;
  default:assert.fail('No regression scenario for '+classId+':'+node);
 }
 // Client-shaped legacy actor without verified 2.0 state must have no effects.
 const legacy={...p,definition:{...p.definition,combatV2:undefined},combatV2:undefined};
 assert.equal(passiveRankV2(legacy,node),0);
 assert.deepEqual(triggerReactivePassiveV2(legacy,'hit',now,{}),[]);
}
for(const [classId,nodes] of Object.entries(REACTIVE_PASSIVES_V2))
 for(const node of nodes)testRule(classId as ClassIdV2,node);
console.log('PASS: all 31 reactive passives, role conditions, capped cooldowns and legacy isolation');

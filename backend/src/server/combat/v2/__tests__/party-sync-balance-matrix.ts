import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {AbilityDefinition,CombatInput,CombatantDefinition,CombatResult} from '../../types';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {RESOURCE_BY_CLASS_V2} from '../resource-runtime';
import {PARTY_SYNCHRONIZATION_RULESET_V2,planPartySynchronizationV2} from '../party-synchronization';
import {issuePartySyncAuthorityV2,type PartySyncModeV2,type PartySyncScopeV2} from '../party-sync-authority';

const classes=Object.keys(CLASS_ROLES_V2) as ClassIdV2[];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const dps=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
const stats={maxHp:30000,attackPower:900,healingPower:700,defense:500,
 accuracy:10000,evasion:50,critChance:.05,critMultiplier:1.5,haste:0};
function skill(classId:ClassIdV2):AbilityDefinition{
 const role=CLASS_ROLES_V2[classId];
 const effects:AbilityDefinition['effects']=[{kind:'damage',coeff:.55,damageType:
   classId==='HEXWEAVER'?'shadow':classId==='STONECALLER'?'nature':'physical'}];
 if(classId==='HEXWEAVER')effects.push({kind:'dot',coeff:.08,damageType:'shadow',durationMs:3000,tickMs:1000});
 if(role==='tank')effects.push({kind:'shield',target:'self',coeff:.20});
 if(role==='support')effects.push({kind:'heal',target:'lowest_hp_ally',coeff:.25});
 return {id:'QA_SKILL_'+classId,name:'QA '+classId,cooldownMs:1000,castTimeMs:0,
  target:'current_target',priority:100,effects};
}
function player(classId:ClassIdV2,i:number):CombatantDefinition{
 return {id:'QA_P'+i+'_'+classId,name:CLASS_NAMES_V2[classId],classId:CLASS_NAMES_V2[classId],
  team:'players',role:CLASS_ROLES_V2[classId],level:50,stats:{...stats},basicAttackMs:1200,
  basicAttackCoeff:.35,abilities:[skill(classId)],
  combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[classId],specializationId:'QA'}};
}
const pressure:Record<string,AbilityDefinition[]>={
 physical:[],
 shadow:[{id:'QA_SHADOW',name:'Shadow pressure',cooldownMs:1800,castTimeMs:0,target:'all_enemies',
  priority:100,effects:[{kind:'dot',coeff:.06,damageType:'shadow',durationMs:3000,tickMs:1000}]}],
 debuff:[{id:'QA_DEBUFF',name:'Weakening pressure',cooldownMs:1800,castTimeMs:0,target:'all_enemies',
  priority:100,effects:[{kind:'debuff',tag:'damage_done',value:-.15,durationMs:1600}]}],
 fire:[{id:'QA_FIRE',name:'Fire cast',cooldownMs:1800,castTimeMs:500,target:'all_enemies',
  priority:100,interruptible:true,effects:[{kind:'damage',coeff:.18,damageType:'fire'}]}],
 shield:[{id:'QA_SHIELD',name:'Enemy shield',cooldownMs:1800,castTimeMs:0,target:'self',
  priority:100,effects:[{kind:'shield',flat:100000}]}],
 mixed:[{id:'QA_MIXED',name:'Mixed pressure',cooldownMs:1800,castTimeMs:0,target:'all_enemies',
  priority:100,effects:[{kind:'damage',coeff:.08,damageType:'physical'},
   {kind:'debuff',tag:'damage_done',value:-.10,durationMs:1500},
   {kind:'dot',coeff:.03,damageType:'nature',durationMs:2000,tickMs:1000}]}],
};
function enemy(profile:string):CombatantDefinition{
 return {id:'QA_ENEMY',name:'QA '+profile,team:'enemies',role:'enemy',level:50,
  stats:{maxHp:1e9,attackPower:650,healingPower:1000,defense:profile==='physical'?900:500,
   accuracy:10000,evasion:0,critChance:0,critMultiplier:1.5,haste:0},
  basicAttackMs:1000,basicAttackCoeff:.10,abilities:pressure[profile]};
}
let sequence=0;
function make(classesIn:ClassIdV2[],profile:string,mode:PartySyncModeV2){
 const players=classesIn.map(player),input:CombatInput={seed:'SYNC_MATRIX_'+sequence++,
  players,enemies:[enemy(profile)],maxDurationMs:2100,tickMs:100};
 const scope:PartySyncScopeV2={ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,
  encounterId:'QA_M_'+sequence,partyId:'QA_PARTY',revision:1,seed:input.seed,mode,
  members:classesIn.map((classId,i)=>({actorId:players[i].id,characterId:'QA_C_'+sequence+'_'+i,classId}))};
 return {input,token:issuePartySyncAuthorityV2(scope,input,()=>true),
  plan:planPartySynchronizationV2(mode,scope.members)};
}
const damage=(r:CombatResult)=>r.players.reduce((n,p)=>n+p.damageDone,0);
let dungeonCases=0,flexCases=0,maxRatio=1,maxLinks=0;
const profiles=Object.keys(pressure);
for(const tank of tanks)for(const support of supports)
 for(let a=0;a<dps.length;a++)for(let b=a+1;b<dps.length;b++)for(const profile of profiles){
  const {input,token,plan}=make([tank,dps[a],dps[b],support],profile,'dungeon');
  const frozen=JSON.stringify(input);
  const base=simulateCombat(input),sync=simulateCombat(input,undefined,undefined,token);
  assert.equal(JSON.stringify(input),frozen);
  assert.equal(base.reason,'timeout');assert.equal(sync.reason,'timeout');
  assert.ok(sync.players.every((p,i)=>JSON.stringify(p.definition.stats)===JSON.stringify(input.players[i].stats)));
  assert.ok(Number.isFinite(damage(sync))&&damage(sync)+.01>=damage(base),
   [tank,dps[a],dps[b],support,profile,damage(base),damage(sync)].join(':'));
  const ratio=damage(base)>0?damage(sync)/damage(base):1;
  maxRatio=Math.max(maxRatio,ratio);maxLinks=Math.max(maxLinks,plan.active.length);
  assert.ok(ratio<1.35,'Synchronization damage outlier '+ratio);
  dungeonCases++;
 }
// Every unordered four-class multiset gets a real engine pass in flexible mode.
for(let a=0;a<classes.length;a++)for(let b=a;b<classes.length;b++)
 for(let c=b;c<classes.length;c++)for(let d=c;d<classes.length;d++){
  const ids=[classes[a],classes[b],classes[c],classes[d]];
  const {input,token,plan}=make(ids,'mixed','party_event');
  const base=simulateCombat(input),sync=simulateCombat(input,undefined,undefined,token);
  assert.equal(base.reason,'timeout');assert.equal(sync.reason,'timeout');
  assert.ok(damage(sync)+.01>=damage(base),ids.join(':'));
  const ratio=damage(base)>0?damage(sync)/damage(base):1;
  maxRatio=Math.max(maxRatio,ratio);maxLinks=Math.max(maxLinks,plan.active.length);
  assert.ok(ratio<1.35,'Flexible Synchronization damage outlier '+ids.join(':')+':'+ratio);
  flexCases++;
 }
assert.equal(dungeonCases,36*profiles.length);
assert.equal(flexCases,495);
assert.ok(maxLinks<=6);
console.log(JSON.stringify({kind:'PARTY_SYNC_PRIVATE_BALANCE_SANITY',dungeonCompositions:36,
 profiles:profiles.length,dungeonCases,flexCases,maxDamageRatio:Number(maxRatio.toFixed(4)),maxLinks}));

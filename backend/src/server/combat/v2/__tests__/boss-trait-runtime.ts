/**
 * PRIVATE Combat/Enemies V2 QA. These are not final boss stat budgets.
 * Exercises six real authored boss-trait mechanics under the actual
 * server-authorized, snapshot-bound combat engine.
 */
import {strict as assert} from 'node:assert';
import type {CombatantDefinition,CombatEvent,CombatInput,CombatResult} from '../../types';
import {simulateCombat} from '../../engine';
import {prepareSoloEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {issueEnemyV2EngineAuthority,enemyV2SnapshotDigest} from '../enemy-engine-authority';
import {projectPersistedBossCounterplayV2} from '../boss-counterplay-contract';

const bosses=[
 {id:'BOSS_EXP_ROOT',name:'Rootbound Heart',region:'asterfall',tier:2,trait:'reflective_bark'},
 {id:'BOSS_EXP_BELL',name:'Bell-Warden',region:'asterfall',tier:2,trait:'weakening_hex'},
 {id:'BOSS_EXP_SOLAR',name:'The Buried Heliarch',region:'sunscar',tier:3,trait:'searing_exposure'},
 {id:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',region:'sunscar',tier:3,trait:'mirage_reflection'},
 {id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',region:'frostmarch',tier:5,trait:'rending_frost'},
 {id:'BOSS_EXP_CANTOR',name:'The Frozen Cantor',region:'frostmarch',tier:5,trait:'chilling_dissonance'},
] as const;
const stats={
 maxHp:4500,attackPower:50,healingPower:0,defense:100,
 accuracy:1100,evasion:80,critChance:0,critMultiplier:1.5,haste:0,
};
const player:CombatantDefinition={
 id:'QA_TRAIT_HERO',name:'QA Trait Hero',team:'players',role:'damage',level:55,
 stats:{...stats,maxHp:50000,attackPower:850,defense:300},
 basicAttackMs:2400,basicAttackCoeff:.85,abilities:[],
 combatV2:{version:2,resource:'focus',specializationId:'QA_TRAIT_HERO_SPEC'},
};
type Outcome={bossId:string;trait:string;events:number;casts:number;
 observed:string[];phase70:boolean;phase35:boolean;reflectDamage:number;};
const outcomes:Outcome[]=[];
for(const config of bosses){
 const base:CombatantDefinition={
  id:config.id,name:config.name,team:'enemies',role:'enemy',boss:true,level:55,
  stats:{...stats},basicAttackMs:2900,basicAttackCoeff:.6,
  abilities:[],phases:[],tags:[],
 };
 const seed='QA_TRAIT_RUNTIME_SEED_'+config.id;
 const candidate=prepareSoloEnemyKitsV2([base],{
  ruleset:'enemy-v2-prototype-1',serverSeed:seed,
  encounterId:'QA_TRAIT_ENCOUNTER_'+config.id,
  region:config.region,equipmentTier:config.tier,eliteEnemyIds:[],
 });
 const stored:PersistedEnemyKitV2={
  ...candidate,source:'server-persisted-v2',revision:1,
 };
 const preview=projectPersistedBossCounterplayV2([base],stored);
 assert.equal(preview.length,1);
 assert.deepEqual(preview[0].traits.map(t=>t.id),[config.trait]);
 const input:CombatInput={
  seed,players:[player],enemies:[...stored.preparedEnemies],
  maxDurationMs:22000,tickMs:100,
 };
 const digest=enemyV2SnapshotDigest(input);
 const scope={
  source:'server-persisted-v2' as const,version:2 as const,
  ruleset:stored.ruleset,mode:'solo' as const,
  encounterId:stored.encounterId,revision:stored.revision,seed,
  playerIds:[player.id],enemyIds:[base.id],bossIds:[base.id],
 };
 const authority=issueEnemyV2EngineAuthority(scope,input,(_snapshot,value)=>value===digest);
 const result:CombatResult=simulateCombat(input,authority);
 assert.deepEqual(simulateCombat(input,authority),result,
  'Six authored trait runs must remain deterministic and snapshot bound');
 assert.ok(result.events.length<10000,'Bounded boss proc and periodic event count');
 const applied=(tag:string,kind:'buff'|'debuff'|'dot')=>
  result.events.some(e=>e.type==='status_apply'&&
   e.actorId===base.id&&e.targetId===player.id&&
   e.statusTag===tag&&e.statusKind===kind);
 const hits=(abilityId:string):CombatEvent[]=>result.events.filter(e=>
  e.type==='damage'&&e.actorId===base.id&&e.targetId===player.id&&
  e.abilityId===abilityId&&(e.amount??0)>0);
 const observed:string[]=[];
 switch(config.trait){
  case 'reflective_bark':
  case 'mirage_reflection':{
   // The engine currently uses a legacy ability ID for reflection events.
   // We assert the player took finite, non-recursive reflected shield damage.
   const hitsOnHero=hits('COMPANION_REFLECT');
   assert.ok(hitsOnHero.length>0,'Boss reflective shield must resolve in combat');
   assert.ok(hitsOnHero.every(e=>(e.amount??0)>0&&e.amount!<=stats.maxHp*.01),
    'Short boss shield reflections must remain small, not burst damage');
   observed.push('bounded_reflection');
   break;
  }
  case 'weakening_hex':
   assert.ok(applied('healing_received','debuff'),
    'Bell-Warden should temporarily reduce incoming heals');
   observed.push('healing_reduction');
   break;
  case 'searing_exposure':
   assert.ok(applied('burn','dot'),'Sunfall should apply an actual fire DoT');
   assert.ok(applied('damage_taken','debuff'),
    'Sunfall should apply its brief vulnerable mark');
   observed.push('burn','exposure');
   break;
  case 'rending_frost':
   assert.ok(applied('bleed','dot'),
    'Glacial Shatter should apply a short physical bleed');
   observed.push('physical_bleed');
   break;
  case 'chilling_dissonance':
   assert.ok(applied('haste','debuff'),
    'Cantor 70% phase should apply a short haste reduction');
   assert.ok(applied('dissonance','dot'),
    'Cantor 70% phase should apply the actual ice DoT');
   observed.push('slow','ice_dot');
   break;
 }
 const phaseIds=preview[0].phases.map(p=>p.phaseId);
 const phases=result.events.filter(e=>e.type==='phase'&&
  e.actorId===base.id&&phaseIds.includes(e.abilityId??''));
 assert.ok(phases.length<=2,'Authored phases must not repeat');
 const reflectDamage=result.events.filter(e=>e.type==='damage'&&
  e.actorId===base.id&&e.targetId===player.id&&
  e.abilityId==='COMPANION_REFLECT')
  .reduce((sum,e)=>sum+(e.amount??0),0);
 assert.ok(Number.isFinite(reflectDamage)&&reflectDamage>=0);
 outcomes.push({
  bossId:base.id,trait:config.trait,events:result.events.length,
  casts:result.events.filter(e=>e.actorId===base.id&&e.type==='cast_start').length,
  observed,phase70:phases.some(e=>e.abilityId===phaseIds[0]),
  phase35:phases.some(e=>e.abilityId===phaseIds[1]),
  reflectDamage:Math.round(reflectDamage*100)/100,
 });
}
assert.equal(outcomes.length,6);
assert.ok(outcomes.every(row=>row.observed.length>0));
console.log(JSON.stringify({type:'QA_ONLY_AUTHORED_BOSS_TRAITS',outcomes}));
console.log('PASS: six authored traits execute with real engine authority; bounded reflect, hex, burn/exposure, bleed, slow and ice DOT remain deterministic');

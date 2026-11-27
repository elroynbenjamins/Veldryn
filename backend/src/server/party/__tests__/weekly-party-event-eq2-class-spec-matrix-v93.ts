/**
 * Party Events V93. Hidden FULL-SOURCE class/spec/party-size matrix.
 * Each Party member is built through the real V2 class/skill/item/affix
 * pipeline and the existing exact-copy trait receipt compiler.
 *
 * Synthetic game policies, source witnesses and loadouts. NOT player data,
 * approved 2.0 balance, a victory certificate, or production DB authority.
 */
import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../combat/content/launch-combat';
import type {CombatantDefinition,CombatInput,CombatResult,CombatStats} from '../../combat/types';
import type {VerifiedSkillBuildV2} from '../../combat/v2/skill-effects';
import {
 CLASS_ROLES_V2,type ClassIdV2,type GearSlotV2,
} from '../../combat/v2/build-contract';
import {
 CLASS_NAMES_V2,SKILL_IDENTITIES_V2,SKILLS_V2,SPECIALIZATIONS_V2,
} from '../../combat/v2/skill-catalog';
import {equipmentQualityMultiplierV2} from '../../combat/v2/equipment-scaling-policy';
import type {TrustedEquipmentRuntimeV2} from '../../combat/v2/unified-equipment-encounter';
import {
 EQ2_REVIEW_ROLL_POLICY,
 type FrozenEquipmentTraitItemReceiptV2,
 type TrustedEquipmentTraitReceiptPortV2,
} from '../../combat/v2/equipment-trait-exact-copy-adapter';
import {
 enemyV2SnapshotDigest,
} from '../../combat/v2/enemy-engine-authority';
import {
 preparePartyEventBossTraitKitV90,PARTY_EVENT_BOSS_TRAITS_V90_VERSION,
} from '../weekly-party-boss-traits-v90';
import type {WeeklyPartyFamily,WeeklyPartyDifficulty} from '../weekly-party-events-v2';
import {
 PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
 prepareFullyEquippedPartyV92,
 simulateFrozenPartyEventEquipmentV92,
 simulateCompiledPartyEventEquipmentV92,
 type TrustedPartyV92BuildInput,
 type FrozenPartyEventV92Witness,
} from '../weekly-party-event-eq2-traits-v92';

const classIds=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
const families:readonly WeeklyPartyFamily[]=[
 'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary',
];
const names:Record<WeeklyPartyFamily,string>={
 broken_caravan:'Roadbreaker Captain',nightfall_hunt:'Nightfall Alpha',
 broken_wards:'The Unbound Guardian',lost_reliquary:'Reliquary Sentinel',
};
const diffs:readonly WeeklyPartyDifficulty[]=['standard','veteran','heroic'];
const difficultyScale:Record<WeeklyPartyDifficulty,number>={
 standard:1,veteran:1.20,heroic:1.40,
};
const tierOptions=[1,4,8,12] as const;
const weekStartsAtMs=Date.UTC(2026,10,9);
const weekEndsAtMs=weekStartsAtMs+7*86400000;
const keys:(keyof CombatStats)[]=[
 'maxHp','attackPower','healingPower','defense','accuracy','evasion',
 'critChance','critMultiplier','haste',
];
const ceilings=Object.fromEntries(keys.map(k=>[k,100000000])) as
 Record<keyof CombatStats,number>;
const affixIds=[
 'attack_pct','defense_pct','max_hp_pct','haste_pp','crit_rate_pp',
 'crit_damage_pct','accuracy_pp','evasion_pp','penetration_pp','ward_pp',
 'shield_strength_pct','class_healing_pct','hex_potency_pct',
];
const limits=Object.fromEntries(affixIds.map(id=>[id,{min:0,max:.10}])) as
 TrustedEquipmentRuntimeV2['affixPolicy']['limits'];

function member(classId:ClassIdV2,specIndex:0|1,index:number,
 gearTier:'T1'|'T4',traitActive:boolean):TrustedPartyV92BuildInput{
 const role=CLASS_ROLES_V2[classId];
 const actor={...launchPlayer(CLASS_NAMES_V2[classId],25),
  id:'QA_V93_ACTOR_'+index};
 const selectedSpec=SPECIALIZATIONS_V2.filter(s=>s.classId===classId)[specIndex];
 assert.ok(selectedSpec,'all nine classes must have two specializations');
 const available=SKILL_IDENTITIES_V2.filter(s=>s.classId===classId&&
  SKILLS_V2.some(skill=>skill.id===s.id&&skill.unlockLevel<=25)).slice(0,2);
 const slot:GearSlotV2=role==='tank'?'offhand':'weapon';
 const id='QA_V93_ITEM_'+index,itemId='QA_V93_DEF_'+index;
 const characterId='QA_V93_CHAR_'+index;
 const build:VerifiedSkillBuildV2={
  actor,verified:{classId,level:25,ownedInstanceIds:new Set([id])},
  selected:{
   specializationId:selectedSpec.id,equipment:{[slot]:id},
   activeSkills:available.map(skill=>({
    skillId:skill.id,variantId:skill.variants[0].id,
   })),
   talentRanks:{},signaturePassiveIds:[],capstoneId:null,
  },
  ownedItemsById:{[id]:{
   instanceId:id,slot,tier:gearTier,eligibleRoles:[role],requiredLevel:1,
  }},setsById:{},
 };
 const classStats={...actor.stats};
 const equipment:TrustedEquipmentRuntimeV2={
  actorId:actor.id,characterId,
  classBaselinePolicy:{version:'QA_V93_CLASS_POLICY',profiles:{
   [classId]:{classId,minLevel:1,maxLevel:75,
    statsAtLevel:()=>({...classStats}),basicAttackMs:actor.basicAttackMs,
    basicAttackCoeff:actor.basicAttackCoeff,abilities:actor.abilities},
  }},
  instancesById:{[id]:{
   id,itemId,ownerCharacterId:characterId,tier:gearTier,
   rarity:'epic',quality:65,
  }},
  definitionsByItemId:{[itemId]:{
   itemId,tier:gearTier,slot,
   primaryStats:role==='tank'?{defense:gearTier==='T1'?20:90}:
    role==='support'?{healingPower:gearTier==='T1'?20:90}:
    {attackPower:gearTier==='T1'?20:90},
  }},
  affixesByInstanceId:{[id]:{
   instanceId:id,slot,tier:gearTier,rarity:'epic',
   quality:65,affixes:[],
  }},
  basePolicy:{rarityMultipliers:{common:1,epic:1.2},
   qualityMultiplier:equipmentQualityMultiplierV2,ceilings},
  rarityPolicy:{version:'QA_V93_RARITY_POLICY',
   order:['common','epic'],multipliers:{common:1,epic:1.2}},
  setsPolicy:{effectsByThreshold:{},ceilings},
  affixPolicy:{limits,countsByTierRarity:{
   [gearTier+':epic']:0,
  },maxFinalHaste:10,maxFinalCritChance:10,maxFinalCritMultiplier:10},
 };
 const traitId=role==='tank'?'thornbound_riposte':
  role==='support'?'mending_echo':'echoing_strike';
 const acquisition=role==='tank'?'dungeon_boss_chest':
  'rare_blueprint_craft';
 const rollKind=role==='tank'?'reflect_damage_pct':
  'ability_damage_pct';
 const rollValue=rollKind==='reflect_damage_pct'?
  (gearTier==='T1'?.5:1.4):(gearTier==='T1'?1.2:3.5);
 const receipt:FrozenEquipmentTraitItemReceiptV2={
  source:'server-persisted-exact-copy-v2',
  policy:EQ2_REVIEW_ROLL_POLICY,
  instanceId:id,itemId,ownerCharacterId:characterId,slot,
  tier:gearTier,rarity:'epic',quality:65,acquisition,
  newAffixRolls:[{id:rollKind,percent:rollValue}],
  signatureTraitId:traitId,
 };
 const exactTraitReceipts:TrustedEquipmentTraitReceiptPortV2={
  accountId:'QA_V93_ACCOUNT_'+index,characterId,receiptRevision:1,
  receiptsByInstanceId:{[id]:receipt},
  selectedTraitInstanceIds:traitActive?[id]:[],
  // The Party V92 battle requires a separately authorized full roster source.
  // This local adapter does NOT claim an independent trusted storage reader.
  verifyPersisted:()=>false,
 };
 return {actor,build,equipment,exactTraitReceipts};
}
function boss(family:WeeklyPartyFamily,diff:WeeklyPartyDifficulty,
 size:number,tier:number):CombatantDefinition{
 const scale=difficultyScale[diff],hp=Math.round(size*5400*
  Math.pow(1.42,tier-1)*scale);
 return preparePartyEventBossTraitKitV90({
  id:'PARTY_EVENT_BOSS',name:names[family],team:'enemies',
  role:'enemy',boss:true,level:25+2*(tier-1),
  stats:{
   maxHp:hp,
   attackPower:Math.round(355*Math.pow(1.20,tier-1)*scale),
   healingPower:0,
   defense:Math.round(520*Math.pow(1.16,tier-1)*scale),
   accuracy:750,evasion:110,critChance:.045,critMultiplier:1.4,haste:.03,
  },
  basicAttackMs:2700,basicAttackCoeff:.8,
  abilities:[
   {id:'PE_BOSS_SLAM',name:'Overwhelming Strike',cooldownMs:6900,
    castTimeMs:400,target:'current_target',priority:80,
    effects:[{kind:'damage',coeff:1.15}]},
   {id:'PE_BOSS_PULSE',name:'Rising Threat',cooldownMs:12000,
    castTimeMs:900,target:'all_enemies',priority:85,interruptible:true,
    effects:[{kind:'damage',coeff:.38+Math.min(.3,.03*tier)}]},
  ],
  phases:[{
   id:'ENRAGE',hpPct:.35,target:'self',
   effects:[{kind:'buff',tag:'damage_done',
    value:Math.min(.35,.07+.015*tier),durationMs:90000}],
  }],
 },family,tier,true);
}
interface Metrics{
 fights:number;victories:number;wipes:number;timeouts:number;
 totalDurationMs:number;damageTaken:number;
 healing:number;interrupts:number;traitTriggers:number;
 phase70:number;phase35:number;
}
const metrics=new Map<string,Metrics>();
interface TuningBucket{
 fights:number;victories:number;wipes:number;timeouts:number;
 phase70:number;phase35:number;healing:number;shields:number;
 interrupts:number;damageTaken:number;traitEvents:number;
 allDurationsMs:number[];victoryDurationsMs:number[];
}
const tuning=new Map<string,TuningBucket>();
function recordTuning(key:string,fight:CombatResult,traits:number){
 const bucket=tuning.get(key)??{
  fights:0,victories:0,wipes:0,timeouts:0,phase70:0,phase35:0,
  healing:0,shields:0,interrupts:0,damageTaken:0,traitEvents:0,
  allDurationsMs:[],victoryDurationsMs:[],
 };
 bucket.fights++;
 if(fight.reason==='victory'){
  bucket.victories++;bucket.victoryDurationsMs.push(fight.durationMs);
 }
 if(fight.reason==='wipe')bucket.wipes++;
 if(fight.reason==='timeout')bucket.timeouts++;
 bucket.allDurationsMs.push(fight.durationMs);
 const phases=fight.enemies[0].triggeredPhases;
 if(phases.includes(fight.enemies[0].definition.phases![0].id))
  bucket.phase70++;
 if(phases.includes(fight.enemies[0].definition.phases![1].id))
  bucket.phase35++;
 bucket.healing+=fight.players.reduce((n,p)=>n+p.healingDone,0);
 bucket.damageTaken+=fight.players.reduce((n,p)=>n+p.damageTaken,0);
 bucket.interrupts+=fight.players.reduce((n,p)=>n+p.interrupts,0);
 bucket.shields+=fight.events.filter(e=>e.type==='shield'&&
  fight.players.some(p=>p.definition.id===e.actorId))
  .reduce((n,e)=>n+(e.amount??0),0);
 bucket.traitEvents+=traits;
 tuning.set(key,bucket);
}
const percentile=(values:readonly number[],q:number):number|null=>{
 if(!values.length)return null;
 const ordered=[...values].sort((a,b)=>a-b);
 return ordered[Math.min(ordered.length-1,Math.max(0,Math.ceil(q*ordered.length)-1))];
};
const summarize=(rows:readonly string[])=>Object.fromEntries(
 rows.map(key=>{
  const b=tuning.get(key);
  assert.ok(b,'missing tuning bucket: '+key);
  return [key,{
   fights:b.fights,victories:b.victories,wipes:b.wipes,
   timeouts:b.timeouts,phase70:b.phase70,phase35:b.phase35,
   p50AllDurationMs:percentile(b.allDurationsMs,.5),
   p95AllDurationMs:percentile(b.allDurationsMs,.95),
   p50VictoryMs:percentile(b.victoryDurationsMs,.5),
   p95VictoryMs:percentile(b.victoryDurationsMs,.95),
   avgHealing:Math.round(b.healing/b.fights),
   avgShields:Math.round(b.shields/b.fights),
   avgDamageTaken:Math.round(b.damageTaken/b.fights),
   avgInterrupts:Math.round(100*b.interrupts/b.fights)/100,
   traitEvents:b.traitEvents,
  }];
 }));
let fights=0,replayed=0,sourceBuilt=0,triggered=0;
const classesWithSource=new Set<string>();
const specsWithSource=new Set<string>();
const roleMixesBySize=new Map<number,Set<string>>();
const rosterModeCounts:Record<string,number>={};
for(let ci=0;ci<classIds.length;ci++){
 const classId=classIds[ci];
 for(const spec of [0,1] as const)
 for(let fi=0;fi<families.length;fi++)
 for(let di=0;di<diffs.length;di++)
 for(const size of [2,3,4] as const){
  const family=families[fi],difficulty=diffs[di];
  const tier=tierOptions[(ci+spec+fi+di)%tierOptions.length];
  const tierGear: 'T1'|'T4'=tier===1?'T1':'T4';
  // Preserve the original encounter count while widening roster shapes.
  // Mode selection is deterministic across class, spec, family, difficulty.
  const rosterMode=(ci+spec+fi+di)%4;
  const sameRole=classIds.filter(id=>CLASS_ROLES_V2[id]===CLASS_ROLES_V2[classId]);
  const heroClasses:ClassIdV2[]=rosterMode===0?
   [classId,'IRONWARDEN','DAWNKEEPER','WAYFINDER']:
   rosterMode===1?[classId,...[1,2,3].map(offset=>sameRole[(sameRole.indexOf(classId)+offset)%sameRole.length]!)]:
   rosterMode===2?[classId,classId,classId,classId]:
   [classId,...[1,2,3].map(offset=>classIds[(ci+offset)%classIds.length]!)];
  rosterModeCounts[String(rosterMode)]=(rosterModeCounts[String(rosterMode)]??0)+1;
  const roles=heroClasses.slice(0,size).map(id=>CLASS_ROLES_V2[id]).sort().join('+');
  const roleMixes=roleMixesBySize.get(size)??new Set<string>();
  roleMixes.add(roles);roleMixesBySize.set(size,roleMixes);
  const party=heroClasses.slice(0,size).map((id,i)=>member(
   id,i===0?spec:0,i,tierGear,true));
  const prepared=prepareFullyEquippedPartyV92(party,true);
  assert.equal(prepared.sources.length,size);
  assert.equal(prepared.evidence.length,size);
  assert.ok(prepared.evidence.every(e=>e.baseSources.length===1));
  assert.ok(prepared.players.every(p=>p.combatV2?.version===2));
  classesWithSource.add(classId);
  specsWithSource.add(classId+':'+spec);
  sourceBuilt+=prepared.players.length;
  const seed=['QA_V93',classId,spec,family,difficulty,size,tier].join('_');
  const combat:CombatInput={
   seed,players:[...prepared.players],
   enemies:[boss(family,difficulty,size,tier)],
   maxDurationMs:90000,
  };
  const witness:FrozenPartyEventV92Witness={
   source:'server-persisted-party-boss-v92',
   ruleset:PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
   phaseKitVersion:PARTY_EVENT_BOSS_TRAITS_V90_VERSION,
   mode:'new-run-only',encounterId:seed,eventId:'QA_V93_EVENT',
   partyId:'QA_V93_PARTY',family,difficulty,tier,revision:1,seed,
   weekStartsAtMs,weekEndsAtMs,
   frozenAtMs:weekEndsAtMs-1000,
   settlementAtMs:weekEndsAtMs+3600000,
   roster:prepared.sources.map(s=>({
    accountId:s.accountId,characterId:s.characterId,
    actorId:s.actorId,receiptRevision:s.revision,
    equipmentReceiptDigest:s.equipmentReceiptDigest,
   })),
  };
  const request={
   witness,combat,sources:prepared.sources,
   // Disposable QA fixture only; NEVER authorized persisted ownership.
   ports:{verifyPersisted:(w:FrozenPartyEventV92Witness,
    sources:typeof prepared.sources,digest:string)=>
    digest===enemyV2SnapshotDigest({
     witness:w,combatDigest:enemyV2SnapshotDigest(combat),sources,
    })},
  };
  if(fights===0){
   const fake={...prepared};
   assert.throws(()=>simulateCompiledPartyEventEquipmentV92({
    prepared:fake,witness,boss:combat.enemies[0],ports:request.ports,
   },true),/unsealed_equipment_party/);
   const modified=prepareFullyEquippedPartyV92(party,true);
   modified.players[0].stats.attackPower+=1;
   assert.throws(()=>simulateCompiledPartyEventEquipmentV92({
    prepared:modified,witness,boss:combat.enemies[0],ports:request.ports,
   },true),/compiled_equipment_party_tampered/);
  }
  const strictRequest={prepared,witness,boss:combat.enemies[0],
   ports:request.ports};
  const first=simulateCompiledPartyEventEquipmentV92(strictRequest,true);
  const second=simulateCompiledPartyEventEquipmentV92(strictRequest,true);
  assert.deepEqual(first,second,'same frozen full-EQ2 Party replay');
  replayed++;
  assert.ok(first.durationMs<=90000);
  assert.equal(first.enemies[0]?.definition.name,names[family]);
  assert.equal(first.players.length,size);
  assert.ok(first.events.every(e=>Number.isFinite(e.atMs)&&
   (e.amount===undefined||Number.isFinite(e.amount))));
  const triggers=first.events.filter(e=>e.type==='equipment_trait_trigger');
  triggered+=triggers.length;
  const phases=first.enemies[0].triggeredPhases;
  assert.ok(!phases.includes(first.enemies[0].definition.phases![1].id)||
    phases.includes(first.enemies[0].definition.phases![0].id));
  const key=classId+':spec'+spec+':'+family+':'+difficulty;
  const m=metrics.get(key)??{
   fights:0,victories:0,wipes:0,timeouts:0,
   totalDurationMs:0,damageTaken:0,healing:0,interrupts:0,
   traitTriggers:0,phase70:0,phase35:0,
  };
  m.fights++;m.totalDurationMs+=first.durationMs;
  m.damageTaken+=first.players.reduce((n,p)=>n+p.damageTaken,0);
  m.healing+=first.players.reduce((n,p)=>n+p.healingDone,0);
  m.interrupts+=first.players.reduce((n,p)=>n+p.interrupts,0);
  m.traitTriggers+=triggers.length;
  if(phases.includes(first.enemies[0].definition.phases![0].id))m.phase70++;
  if(phases.includes(first.enemies[0].definition.phases![1].id))m.phase35++;
  if(first.reason==='victory')m.victories++;
  if(first.reason==='wipe')m.wipes++;
  if(first.reason==='timeout')m.timeouts++;
  metrics.set(key,m);
  for(const diagnosticKey of [
   'tier='+tier,
   'tierDifficulty='+tier+':'+difficulty,
   'partySize='+size,
   'primaryRole='+CLASS_ROLES_V2[classId],
  ])recordTuning(diagnosticKey,first,triggers.length);
  fights++;
 }
}
assert.equal(classIds.length,9);
assert.equal(classesWithSource.size,9);
assert.equal(specsWithSource.size,18);
assert.equal(fights,9*2*4*3*3);
for(const size of [2,3,4]){
 const mixes=roleMixesBySize.get(size);
 assert.ok(mixes&&mixes.size>=3,'flexible roster composition diversity');
 for(const role of ['tank','damage','support'])
  assert.ok(mixes.has(Array(size).fill(role).join('+')),'homogeneous '+role+' size '+size);
}
assert.equal(Object.values(rosterModeCounts).reduce((a,b)=>a+b,0),fights);
assert.equal(replayed,fights);
assert.equal(metrics.size,9*2*4*3);
assert.equal(tierOptions.reduce((sum,tier)=>sum+
  (tuning.get('tier='+tier)?.fights??0),0),fights);
assert.ok(triggered>0,'actual equipped trait actions must occur');
assert.ok([...metrics.values()].every(m=>m.fights===3&&
 m.victories+m.wipes+m.timeouts===3));
const summary={version:'v93',releaseReady:false,
 caveat:'synthetic level25 class/item policies and fake storage, not certified balance',
 classes:classesWithSource.size,specializations:specsWithSource.size,
 encounters:fights,deterministicReplays:replayed,
 rosterModeCounts,roleMixesBySize:Object.fromEntries([...roleMixesBySize].map(([size,mixes])=>[size,[...mixes].sort()])),
 fullyCompiledMemberSnapshots:sourceBuilt,traitTriggers:triggered,
 totals:[...metrics.values()].reduce((x,r)=>({
  victories:x.victories+r.victories,wipes:x.wipes+r.wipes,
  timeouts:x.timeouts+r.timeouts,
 }),{victories:0,wipes:0,timeouts:0}),
 byTier:summarize(tierOptions.map(tier=>'tier='+tier)),
 byTierDifficulty:summarize(tierOptions.flatMap(tier=>
  diffs.map(difficulty=>'tierDifficulty='+tier+':'+difficulty))),
 byPartySize:summarize([2,3,4].map(size=>'partySize='+size)),
 byPrimaryRole:summarize(['tank','damage','support'].map(role=>
  'primaryRole='+role)),
 byFamilyDifficulty:Object.fromEntries(families.flatMap(f=>diffs.map(d=>{
  const rows=[...metrics].filter(([key])=>key.endsWith(':'+f+':'+d)).map(([,m])=>m);
  return [f+':'+d,rows.reduce((n,m)=>({
   fights:n.fights+m.fights,victories:n.victories+m.victories,
   wipes:n.wipes+m.wipes,timeouts:n.timeouts+m.timeouts,
   totalDurationMs:n.totalDurationMs+m.totalDurationMs,
   phase70:n.phase70+m.phase70,phase35:n.phase35+m.phase35,
   traitTriggers:n.traitTriggers+m.traitTriggers,
  }),{fights:0,victories:0,wipes:0,timeouts:0,
   totalDurationMs:0,phase70:0,phase35:0,traitTriggers:0})];
 }))),
};
console.log('PARTY_EVENT_V93_FULL_EQ2_CLASS_SPEC_MATRIX='+JSON.stringify(summary));

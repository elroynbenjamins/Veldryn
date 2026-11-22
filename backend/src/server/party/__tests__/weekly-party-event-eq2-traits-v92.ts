import {strict as assert} from 'node:assert';
import type {CombatantDefinition,CombatInput,CombatV2Resource} from '../../combat/types';
import {launchPlayer} from '../../combat/content/launch-combat';
import {
 EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
 type VerifiedV2EquipmentEffectSource,
} from '../../combat/v2/equipment-trait-engine-authority';
import {enemyV2SnapshotDigest} from '../../combat/v2/enemy-engine-authority';
import {
 PARTY_EVENT_BOSS_TRAITS_V90_VERSION,
 preparePartyEventBossTraitKitV90,
} from '../weekly-party-boss-traits-v90';
import type {WeeklyPartyFamily,WeeklyPartyDifficulty} from '../weekly-party-events-v2';
import {
 PARTY_EVENT_EQ2_TRAIT_V92_RELEASED,
 PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
 PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS,
 simulateFrozenPartyEventEquipmentV92,
 type FrozenPartyEventV92Witness,
 type VerifiedPartyEventV92Ports,
} from '../weekly-party-event-eq2-traits-v92';

const families:readonly WeeklyPartyFamily[]=[
 'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary',
];
const names:Record<WeeklyPartyFamily,string>={
 broken_caravan:'Roadbreaker Captain',nightfall_hunt:'Nightfall Alpha',
 broken_wards:'The Unbound Guardian',lost_reliquary:'Reliquary Sentinel',
};
const difficulties:readonly WeeklyPartyDifficulty[]=['standard','veteran','heroic'];
const difficultyScales:Record<WeeklyPartyDifficulty,number>={
 standard:1,veteran:1.2,heroic:1.4,
};
const players:[string,CombatV2Resource][]=[
 ['Ironwarden','guard'],['Dawnkeeper','radiance'],
 ['Wayfinder','focus'],['Ravager','fury'],
];
const weekStartsAtMs=Date.UTC(2026,10,9,0,0,0);
const weekEndsAtMs=weekStartsAtMs+7*86400000;

function legacyBoss(family:WeeklyPartyFamily,difficulty:WeeklyPartyDifficulty,
 size:number,tier:number):CombatantDefinition{
 const scale=difficultyScales[difficulty];
 return {
  id:'PARTY_EVENT_BOSS',name:names[family],team:'enemies',role:'enemy',
  boss:true,level:25+2*(tier-1),
  stats:{
   maxHp:Math.round(size*5400*Math.pow(1.42,tier-1)*scale),
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
  phases:[{id:'ENRAGE',hpPct:.35,target:'self',
   effects:[{kind:'buff',tag:'damage_done',
    value:Math.min(.35,.07+.015*tier),durationMs:90_000}]}],
 };
}
function fixture(
 family:WeeklyPartyFamily,difficulty:WeeklyPartyDifficulty,
 partySize:number,tier:number,traits=true,
){
 const heroes=players.slice(0,partySize).map(([classId,resource],i)=>{
  const actor=launchPlayer(classId,25);
  return {...actor,id:'QA_V92_ACTOR_'+i,
   combatV2:{version:2 as const,resource,specializationId:'QA_V92_SPEC_'+classId}};
 });
 const sources:VerifiedV2EquipmentEffectSource[]=heroes.map((actor,i)=>({
  source:'server-persisted-equipment-v2',policy:EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
  revision:3,accountId:'QA_ACCOUNT_'+i,characterId:'QA_CHAR_'+i,
  actorId:actor.id,ownedEquippedInstanceIds:['QA_COPY_'+i],
  equipmentReceiptDigest:(i+1).toString(16).repeat(64),
  basicAttackDamagePct:traits?2.5:0,
  abilityDamagePct:traits?3.5:0,
  reflectDamagePct:traits&&i===0?1.2:0,
  traits:traits?[{instanceId:'QA_COPY_'+i,traitId:
   i===0?'thornbound_riposte':i===1?'mending_echo':'sword_dance'}]:[],
 }));
 const boss=preparePartyEventBossTraitKitV90(
  legacyBoss(family,difficulty,partySize,tier),family,tier,true);
 const eventId='QA_EVENT_'+family;
 const seed=['QA_V92',family,difficulty,partySize,tier,traits?'trait':'plain'].join('_');
 const combat:CombatInput={
  seed,players:heroes,enemies:[boss],maxDurationMs:PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS,
 };
 const witness:FrozenPartyEventV92Witness={
  source:'server-persisted-party-boss-v92',
  ruleset:PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
  phaseKitVersion:PARTY_EVENT_BOSS_TRAITS_V90_VERSION,
  mode:'new-run-only',encounterId:seed,
  eventId,partyId:'QA_PARTY_1',family,difficulty,tier,
  revision:2,seed,weekStartsAtMs,weekEndsAtMs,
  frozenAtMs:weekEndsAtMs-3600000,
  settlementAtMs:weekEndsAtMs+3600000,
  roster:sources.map(source=>({
   accountId:source.accountId,characterId:source.characterId,
   actorId:source.actorId,receiptRevision:source.revision,
   equipmentReceiptDigest:source.equipmentReceiptDigest,
  })),
 };
 // QA fixture only! Real deployment MUST independently load and lock these
 // records from V11/V18/V23/V87 and equipped-item storage. This fake callback
 // is *never* an approved persistence or victory source.
 const ports:VerifiedPartyEventV92Ports={verifyPersisted:(w,s,d)=>
  d===enemyV2SnapshotDigest({
   witness:w,combatDigest:enemyV2SnapshotDigest(combat),sources:s,
  })};
 return {witness,combat,sources,ports};
}
function denied(fn:()=>unknown,needle:string){
 assert.throws(fn,e=>String(e).includes(needle));
}
assert.equal(PARTY_EVENT_EQ2_TRAIT_V92_RELEASED,false);
let scenarios=0,traitEvents=0,baselineEvents=0;
let totalReflect=0,phases70=0,phases35=0,losses=0,timeouts=0;
const rows:Record<string,{
 scenarios:number;victories:number;wipes:number;timeouts:number;
 durationMs:number;damageTaken:number;traitEvents:number;
}>={};
for(const family of families)for(const difficulty of difficulties)
 for(const partySize of [2,3,4])for(const tier of [1,4,8,12]){
  const pair=fixture(family,difficulty,partySize,tier);
  const before=enemyV2SnapshotDigest({witness:pair.witness,
   combat:pair.combat,sources:pair.sources});
  const result=simulateFrozenPartyEventEquipmentV92(pair,true);
  const replay=simulateFrozenPartyEventEquipmentV92(pair,true);
  assert.deepEqual(result,replay,'full V2 equipment trait replay: '+pair.witness.seed);
  assert.equal(enemyV2SnapshotDigest({witness:pair.witness,
   combat:pair.combat,sources:pair.sources}),before,'never mutate frozen input');
  assert.equal(result.durationMs<=PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS,true);
  assert.ok(result.events.some(e=>e.type==='combat_start'));
  assert.equal(result.enemies[0].definition.name,names[family]);
  assert.ok(result.events.every(e=>Number.isFinite(e.atMs)&&
   (e.amount===undefined||Number.isFinite(e.amount))));
  assert.ok(result.players.every(p=>
   Number.isFinite(p.damageDone)&&Number.isFinite(p.damageTaken)));
  const hits=result.enemies[0].triggeredPhases;
  assert.ok(!hits.includes(result.enemies[0].definition.phases![1].id)||
   hits.includes(result.enemies[0].definition.phases![0].id));
  if(hits.includes(result.enemies[0].definition.phases![0].id))phases70++;
  if(hits.includes(result.enemies[0].definition.phases![1].id))phases35++;
  const triggers=result.events.filter(e=>e.type==='equipment_trait_trigger');
  traitEvents+=triggers.length;
  const reflect=triggers.filter(e=>e.abilityId==='V2_EQUIPMENT_TRAIT:reflect_damage_affix'||
   e.abilityId==='V2_EQUIPMENT_TRAIT:thornbound_riposte');
  totalReflect+=reflect.length;
  // Shared 0.1% boss max HP per 5 s across defenders, not per defender.
  for(const event of reflect){
   const last5s=reflect.filter(e=>e.atMs<=event.atMs&&
    event.atMs-e.atMs<5000);
   const amount=last5s.reduce((sum,e)=>sum+(e.amount??0),0);
   assert.ok(amount<=result.enemies[0].definition.stats.maxHp*.001+.001,
    'shared boss reflect budget cannot be bypassed by a party');
  }
  const row=rows[family+':'+difficulty]??={
   scenarios:0,victories:0,wipes:0,timeouts:0,
   durationMs:0,damageTaken:0,traitEvents:0,
  };
  row.scenarios++;row.durationMs+=result.durationMs;row.traitEvents+=triggers.length;
  row.damageTaken+=result.players.reduce((n,p)=>n+p.damageTaken,0);
  if(result.reason==='victory')row.victories++;
  if(result.reason==='wipe'){row.wipes++;losses++;}
  if(result.reason==='timeout'){row.timeouts++;timeouts++;}
  rows[family+':'+difficulty]=row;
  scenarios++;
 }
assert.equal(scenarios,144);
assert.equal(Object.keys(rows).length,12);
assert.ok(phases35<=phases70);
assert.ok(traitEvents>0,'must execute at least one REAL equipment trait hook');
// A matched optional no-trait equipment configuration retains canonical party
// boss mechanics but cannot fabricate a trait event.
for(const family of families){
 const clean=fixture(family,'standard',4,1,false);
 const result=simulateFrozenPartyEventEquipmentV92(clean,true);
 assert.equal(result.events.filter(e=>e.type==='equipment_trait_trigger').length,0);
 baselineEvents+=result.events.length;
}
// Every caller must be refused unless independently authenticated, versioned
// and bound to the frozen account/character/item snapshot.
const original=fixture('broken_caravan','standard',4,1);
denied(()=>simulateFrozenPartyEventEquipmentV92(original),
 'party_event_v92_unreleased');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,ports:{verifyPersisted:()=>false}},true),
 'persisted_ledger_not_verified');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,combat:{...original.combat,seed:'FORGED'}},true),
 'party_equipment_snapshot_mismatch');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,sources:[{...original.sources[0],
  characterId:'QA_CHAR_FORGED'},...original.sources.slice(1)]},true),
 'party_equipment_snapshot_mismatch');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,sources:[{...original.sources[0],
  reflectDamagePct:80},...original.sources.slice(1)]},true),
 'combat_v2_equipment_trait_invalid_persisted_source');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,sources:[{...original.sources[0],
  traits:[{instanceId:'QA_COPY_0',traitId:'thornbound_riposte'},
   {instanceId:'QA_COPY_0',traitId:'sword_dance'}]},
  ...original.sources.slice(1)]},true),
 'combat_v2_equipment_trait_trait_not_owned_selected_or_supported');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,witness:{...original.witness,mode:'legacy' as 'new-run-only'}},true),
 'invalid_frozen_new_run_witness');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,combat:{...original.combat,
  initialPlayerState:{QA_V92_ACTOR_0:{hp:1,downed:false,
   cooldownRemainingMs:{},basicAttackRemainingMs:0}}}},true),
 'party_equipment_snapshot_mismatch');
denied(()=>simulateFrozenPartyEventEquipmentV92({
 ...original,combat:{...original.combat,
  enemies:[{...original.combat.enemies[0],name:'FAKE BOSS'}]}},true),
 'untrusted_or_unbounded_v90_boss');
const env=process.env.NODE_ENV;
try{
 process.env.NODE_ENV='production';
 denied(()=>simulateFrozenPartyEventEquipmentV92(original,true),
  'party_event_v92_unreleased');
}finally{process.env.NODE_ENV=env}
console.log('PARTY_EVENT_V92_EQ2_TRAIT_MATRIX='+JSON.stringify({
 releaseReady:false,qaOnly:true,scenarios,traitEvents,totalReflect,
 phases70,phases35,losses,timeouts,baselineEvents,
 sample:'level-25 synthetic actor/gear fixtures, real V2 trait engine, 90s',
 rows,
}));

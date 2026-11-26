/**
 * Direct real-build coverage for every one of the 18 Synchronization pairs.
 *
 * Uses a two-player [A,B] flexible Party Event party so each case has exactly
 * one distinct class link at 100% strength. This intentionally covers same-role
 * links such as Dawnkeeper + Stonecaller that cannot coexist in a strict
 * 1 Tank / 2 Damage / 1 Support dungeon roster.
 */
import {strict as assert} from 'node:assert';
import type {CombatInput} from '../../types';
import {listPartySynchronizationsV2} from '../party-synchronization';
import {simulateUnifiedEquipmentCombatV2,type TrustedPartySyncRehearsalV2} from '../unified-equipment-encounter';
import {PARTY_SYNCHRONIZATION_RULESET_V2} from '../party-synchronization';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';

const links=listPartySynchronizationsV2();
assert.equal(links.length,18);
let cases=0;
const changedByPair=new Map<string,number>();
const ratiosByPair=new Map<string,number[]>();

for(const specIndex of [0,1] as const)
 for(const link of links)
  for(const boss of bosses){
   const ids=[link.classes[0],link.classes[1]] as const;
   const fixtures=ids.map(classId=>setup(classId,specIndex,boss,profiles[1]));
   const builds=fixtures.map(x=>x.build);
   const runtime=fixtures.map(x=>x.runtime);
   const players=fixtures.map(x=>x.actor);
   const input:CombatInput={seed:'SYNC_PAIR_'+link.id+'_'+specIndex+'_'+boss.id,
    players,enemies:[fixtures[0].input.enemies[0]],maxDurationMs:9000,tickMs:100};
   const scope:TrustedPartySyncRehearsalV2['scope']={
    ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,
    encounterId:'SYNC_PAIR_ENC_'+cases,partyId:'SYNC_PAIR_PARTY',
    revision:1,seed:input.seed,mode:'party_event' as const,
    members:ids.map((classId,i)=>({
      actorId:players[i].id,characterId:runtime[i].characterId,classId,
    })),
   };
   const rehearsal:TrustedPartySyncRehearsalV2={scope,verifyPersisted:()=>true};
   const base=simulateUnifiedEquipmentCombatV2(input,builds,runtime,true);
   const sync=simulateUnifiedEquipmentCombatV2(
    input,builds,runtime,true,undefined,undefined,'party_event',rehearsal);
   assert.equal(sync.synchronizationReview?.active.length,1,link.id);
   assert.equal(sync.synchronizationReview?.active[0].id,link.id);
   assert.equal(sync.synchronizationReview?.scalePercent,100);
   assert.deepEqual(sync.equipmentEvidence,base.equipmentEvidence);
   assert.deepEqual(sync.combat.players.map(p=>p.definition.stats),
    base.combat.players.map(p=>p.definition.stats));
   assert.deepEqual(sync,simulateUnifiedEquipmentCombatV2(
    input,builds,runtime,true,undefined,undefined,'party_event',rehearsal));
   const changed=JSON.stringify(sync.combat.events)!==JSON.stringify(base.combat.events)||
    sync.combat.players.some((p,i)=>p.hp!==base.combat.players[i].hp||
      p.damageDone!==base.combat.players[i].damageDone||
      p.healingDone!==base.combat.players[i].healingDone);
   changedByPair.set(link.id,(changedByPair.get(link.id)??0)+Number(changed));
   const baseDamage=base.combat.players.reduce((n,p)=>n+p.damageDone,0);
   const syncDamage=sync.combat.players.reduce((n,p)=>n+p.damageDone,0);
   const ratio=baseDamage>0?syncDamage/baseDamage:1;
   assert.ok(Number.isFinite(ratio)&&ratio>=.85&&ratio<1.50,
    'pair integration damage outlier '+link.id+':'+ratio);
   ratiosByPair.set(link.id,[...(ratiosByPair.get(link.id)??[]),ratio]);
   cases++;
  }

assert.equal(cases,18*2*6);
// Mystic Harmony is a conditional support link: short low-pressure bruiser
// encounters may have no heal, harmful status or ten resource gains. Keep
// the original observations intact and separately exercise a genuine engine
// harmful-status window using the same compiled ten-slot support builds.
const mysticClasses=['DAWNKEEPER','STONECALLER'] as const;
const mysticFixtures=mysticClasses.map(c=>setup(c,0,bosses[0],profiles[1]));
const mysticBuilds=mysticFixtures.map(f=>f.build);
const mysticRuntime=mysticFixtures.map(f=>f.runtime);
const mysticPlayers=mysticFixtures.map(f=>f.actor);
const mysticEnemy=mysticFixtures[0].input.enemies[0];
const mysticInput:CombatInput={seed:'QA_MYSTIC_HARMFUL_PRESSURE',
 players:mysticPlayers,enemies:[{...mysticEnemy,abilities:[{
  id:'QA_MYSTIC_PRESSURE',name:'QA Mystic Pressure',cooldownMs:99999,
  castTimeMs:0,target:'all_enemies',priority:100,effects:[
   {kind:'debuff',tag:'damage_done',value:-.20,durationMs:3000},
  ],
 }]}],maxDurationMs:1100,tickMs:100};
const mysticScope:TrustedPartySyncRehearsalV2['scope']={
 ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,encounterId:'QA_MYSTIC_PRESSURE_ENC',
 partyId:'QA_MYSTIC_PARTY',revision:1,seed:mysticInput.seed,mode:'party_event',
 members:mysticClasses.map((classId,i)=>({classId,actorId:mysticPlayers[i].id,
  characterId:mysticRuntime[i].characterId})),
};
const mysticBase=simulateUnifiedEquipmentCombatV2(mysticInput,mysticBuilds,mysticRuntime,true);
const runMystic=()=>simulateUnifiedEquipmentCombatV2(mysticInput,mysticBuilds,mysticRuntime,true,
 undefined,undefined,'party_event',{scope:mysticScope,verifyPersisted:()=>true});
const mysticSync=runMystic();
assert.deepEqual(mysticSync,runMystic());
assert.deepEqual(mysticSync.equipmentEvidence,mysticBase.equipmentEvidence);
assert.equal(mysticSync.synchronizationReview?.active[0].id,'mystic_harmony');
for(let i=0;i<mysticPlayers.length;i++){
 const prior=mysticBase.combat.players[i].modifiers.find(m=>m.kind==='debuff'&&m.tag==='damage_done');
 const next=mysticSync.combat.players[i].modifiers.find(m=>m.kind==='debuff'&&m.tag==='damage_done');
 assert.equal(prior?.value,-.20);
 assert.ok(next&&Math.abs(next.value-(-.19))<1e-9,'Mystic Harmony must reduce actual harmful potency');
}
// Sanctified Hunt needs an actual shielded target, rather than a generic
// bruiser with no shield and already high hit chance. Preserve original rows.
const huntClasses=['BASTION','WAYFINDER'] as const;
const huntFixtures=huntClasses.map(c=>setup(c,0,bosses[0],profiles[1]));
const huntBuilds=huntFixtures.map(f=>f.build);
const huntRuntime=huntFixtures.map(f=>f.runtime);
const huntPlayers=huntFixtures.map(f=>f.actor);
const huntEnemy=huntFixtures[0].input.enemies[0];
const huntInput:CombatInput={seed:'QA_SANCTIFIED_SHIELD_PRESSURE',players:huntPlayers,
 enemies:[{...huntEnemy,abilities:[{
  id:'QA_SANCTIFIED_SHIELD',name:'QA Shield Pressure',cooldownMs:99999,
  castTimeMs:0,target:'self',priority:100,effects:[{kind:'shield',flat:1000000}],
 }]}],maxDurationMs:9000,tickMs:100};
const huntScope:TrustedPartySyncRehearsalV2['scope']={
 ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,encounterId:'QA_SANCTIFIED_PRESSURE_ENC',
 partyId:'QA_SANCTIFIED_PARTY',revision:1,seed:huntInput.seed,mode:'party_event',
 members:huntClasses.map((classId,i)=>({classId,actorId:huntPlayers[i].id,
  characterId:huntRuntime[i].characterId})),
};
const huntBase=simulateUnifiedEquipmentCombatV2(huntInput,huntBuilds,huntRuntime,true);
const runHunt=()=>simulateUnifiedEquipmentCombatV2(huntInput,huntBuilds,huntRuntime,true,
 undefined,undefined,'party_event',{scope:huntScope,verifyPersisted:()=>true});
const huntSync=runHunt();
assert.deepEqual(huntSync,runHunt());
assert.deepEqual(huntSync.equipmentEvidence,huntBase.equipmentEvidence);
assert.equal(huntSync.synchronizationReview?.active[0].id,'sanctified_hunt');
assert.ok(huntBase.combat.events.some(e=>e.type==='shield'&&e.abilityId==='QA_SANCTIFIED_SHIELD'));
assert.ok(huntBase.combat.enemies[0].shield>0&&huntSync.combat.enemies[0].shield>0,
 'shield must remain active in both arms');
assert.ok(huntSync.combat.enemies[0].shield<huntBase.combat.enemies[0].shield,
 'Sanctified Hunt must increase actual shield depletion');
// Twilight Accord needs an injured source or a non-overhealing heal.
const twilightClasses=['DREADGUARD','DAWNKEEPER'] as const;
const twilightFixtures=twilightClasses.map(c=>setup(c,0,bosses[0],profiles[1]));
const twilightBuilds=twilightFixtures.map(f=>f.build);
const twilightRuntime=twilightFixtures.map(f=>f.runtime);
const twilightPlayers=twilightFixtures.map(f=>f.actor);
const twilightEnemy=twilightFixtures[0].input.enemies[0];
const twilightSeed='QA_TWILIGHT_CRITICAL_PRESSURE';
// Measure the actual compiled tank HP instead of guessing a raw class budget.
const twilightProbe=simulateUnifiedEquipmentCombatV2({
 seed:twilightSeed,players:twilightPlayers,enemies:[twilightEnemy],maxDurationMs:100,tickMs:100,
},twilightBuilds,twilightRuntime,true);
const tankHp=twilightProbe.combat.players[0].definition.stats.maxHp;
const twilightInput:CombatInput={seed:twilightSeed,players:twilightPlayers,
 enemies:[{...twilightEnemy,stats:{...twilightEnemy.stats,accuracy:100000,critChance:0},
  abilities:[{id:'QA_TWILIGHT_PRESSURE',name:'QA Critical Pressure',cooldownMs:99999,
   castTimeMs:0,target:'current_target',priority:100,effects:[
    {kind:'damage',damageType:'true',flat:tankHp*.70,coeff:0},
   ],
  }]}],maxDurationMs:9000,tickMs:100};
const twilightScope:TrustedPartySyncRehearsalV2['scope']={
 ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,encounterId:'QA_TWILIGHT_PRESSURE_ENC',
 partyId:'QA_TWILIGHT_PARTY',revision:1,seed:twilightInput.seed,mode:'party_event',
 members:twilightClasses.map((classId,i)=>({classId,actorId:twilightPlayers[i].id,
  characterId:twilightRuntime[i].characterId})),
};
const twilightBase=simulateUnifiedEquipmentCombatV2(twilightInput,twilightBuilds,twilightRuntime,true);
const runTwilight=()=>simulateUnifiedEquipmentCombatV2(twilightInput,twilightBuilds,twilightRuntime,true,
 undefined,undefined,'party_event',{scope:twilightScope,verifyPersisted:()=>true});
const twilightSync=runTwilight();
assert.deepEqual(twilightSync,runTwilight());
assert.deepEqual(twilightSync.equipmentEvidence,twilightBase.equipmentEvidence);
assert.equal(twilightSync.synchronizationReview?.active[0].id,'twilight_accord');
assert.ok(twilightBase.combat.events.some(e=>e.type==='damage'&&e.abilityId==='QA_TWILIGHT_PRESSURE'&&
 e.targetId===twilightPlayers[0].id&&(e.amount??0)>tankHp*.5),'fixture must injure the tank below half health');
assert.ok(twilightBase.combat.players[0].alive&&twilightSync.combat.players[0].alive,
 'both arms must survive the pressure window');
assert.ok(twilightSync.combat.players[0].damageDone>twilightBase.combat.players[0].damageDone||
 twilightSync.combat.players.reduce((n,p)=>n+p.healingDone,0)>
 twilightBase.combat.players.reduce((n,p)=>n+p.healingDone,0),
 'Twilight Accord must improve actual low-HP damage or effective healing');
// Emit the original observations before the gate, so future conditional
// gaps can be audited together, not discovered one at a time.
const uncovered=links.filter(link=>!['mystic_harmony','sanctified_hunt','twilight_accord'].includes(link.id)&&
 (changedByPair.get(link.id)??0)===0).map(link=>link.id);


console.log(JSON.stringify({
 kind:'PARTY_SYNC_ALL_18_REAL_BUILD_PAIR_COVERAGE',
 cases,pairs:18,bosses:6,specializationBands:2,
 supplementalMysticPressureCases:1,mysticHarmfulPotencyVerified:true,
 supplementalSanctifiedPressureCases:1,sanctifiedShieldDepletionVerified:true,
 supplementalTwilightPressureCases:1,twilightCriticalPressureVerified:true,
 uncovered,
 pairsWithObservedCombatEffect:[...changedByPair.values()].filter(n=>n>0).length,
 byPair:Object.fromEntries(links.map(link=>{
  const ratios=ratiosByPair.get(link.id)??[1];
  return [link.id,{
   changedCases:changedByPair.get(link.id)??0,
   minDamageRatio:Number(Math.min(...ratios).toFixed(4)),
   avgDamageRatio:Number((ratios.reduce((a,b)=>a+b,0)/ratios.length).toFixed(4)),
   maxDamageRatio:Number(Math.max(...ratios).toFixed(4)),
  }];
 })),
 caveat:'flexible party_event review fixture; changedCases covers original low-pressure matrix only; Mystic Harmony, Sanctified Hunt and Twilight Accord have separate synthetic pressure cases; persisted party traits covered separately',
}));
assert.deepEqual(uncovered,[],'remaining links lack observed ten-slot combat effects');

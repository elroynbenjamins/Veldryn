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
for(const link of links)
 assert.ok((changedByPair.get(link.id)??0)>0,
  'real ten-slot pair never affected any authored boss encounter: '+link.id);

console.log(JSON.stringify({
 kind:'PARTY_SYNC_ALL_18_REAL_BUILD_PAIR_COVERAGE',
 cases,pairs:18,bosses:6,specializationBands:2,
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
 caveat:'flexible party_event review fixture; exact-copy persisted party traits are covered separately',
}));

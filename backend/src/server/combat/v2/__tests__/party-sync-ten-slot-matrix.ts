/**
 * Hidden Skills + Equipment + Party Synchronization integration matrix.
 *
 * Uses the #1700 synthetic TEN-SLOT source fixture: real class Skills 2.0,
 * all ten Equipment slots, 2/4/6 set thresholds and verified affix compiler.
 * Signed Equipment traits and persisted authored boss authority remain SOLO-only
 * and are deliberately NOT supplied here. No CP/balance/release approval.
 */
import {strict as assert} from 'node:assert';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {simulateUnifiedEquipmentCombatV2,type TrustedPartySyncRehearsalV2} from '../unified-equipment-encounter';
import {PARTY_SYNCHRONIZATION_RULESET_V2,planPartySynchronizationV2} from '../party-synchronization';
import {bosses,profiles,setup} from './ten-slot-boss-fixture';

const classes=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const dps=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
const partyDamage=(result:ReturnType<typeof simulateUnifiedEquipmentCombatV2>)=>
 result.combat.players.reduce((sum,p)=>sum+p.damageDone,0);
const partyHp=(result:ReturnType<typeof simulateUnifiedEquipmentCombatV2>)=>
 result.combat.players.reduce((sum,p)=>sum+p.hp,0);

let cases=0,maxLinks=0,minDamageRatio=Infinity,maxDamageRatio=0;
let improvedDamage=0,improvedSurvival=0,identicalCombat=0;
const perBoss=new Map<string,{cases:number;min:number;max:number;damageImproved:number;survivalImproved:number}>();

for(const specIndex of [0,1] as const){
 for(const tank of tanks)for(const support of supports)
  for(let a=0;a<dps.length;a++)for(let b=a+1;b<dps.length;b++)
   for(const boss of bosses){
    const ids:[ClassIdV2,ClassIdV2,ClassIdV2,ClassIdV2]=[tank,dps[a],dps[b],support];
    const fixtures=ids.map(classId=>setup(classId,specIndex,boss,profiles[1]));
    const builds=fixtures.map(x=>x.build);
    const runtimes=fixtures.map(x=>x.runtime);
    const players=fixtures.map(x=>x.actor);
    const enemy=fixtures[0].input.enemies[0];
    const input={seed:'QA_10S_SYNC_'+specIndex+'_'+boss.id+'_'+ids.join('_'),
      players,enemies:[enemy],maxDurationMs:9000,tickMs:100};
    const scope:TrustedPartySyncRehearsalV2['scope']={ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,
      encounterId:'QA_10S_SYNC_ENC_'+cases,partyId:'QA_10S_SYNC_PARTY',
      revision:1,seed:input.seed,mode:'dungeon' as const,
      members:ids.map((classId,i)=>({actorId:players[i].id,
        characterId:runtimes[i].characterId,classId}))};
    const rehearsal:TrustedPartySyncRehearsalV2={scope,verifyPersisted:()=>true};
    const plan=planPartySynchronizationV2('dungeon',scope.members);
    const frozen=JSON.stringify({
      input,
      gear:runtimes.map(r=>({instances:r.instancesById,affixes:r.affixesByInstanceId})),
      selected:builds.map(b=>b.selected),
    });
    const baseline=simulateUnifiedEquipmentCombatV2(input,builds,runtimes,true);
    const synced=simulateUnifiedEquipmentCombatV2(
      input,builds,runtimes,true,undefined,undefined,'dungeon',rehearsal);
    const replay=simulateUnifiedEquipmentCombatV2(
      input,builds,runtimes,true,undefined,undefined,'dungeon',rehearsal);
    assert.deepEqual(replay,synced,'ten-slot synchronized party replay must be deterministic');
    assert.equal(JSON.stringify({
      input,
      gear:runtimes.map(r=>({instances:r.instancesById,affixes:r.affixesByInstanceId})),
      selected:builds.map(b=>b.selected),
    }),frozen,'party synchronization must not mutate source gear/build/input');
    assert.deepEqual(synced.equipmentEvidence,baseline.equipmentEvidence,
      'Synchronization must never alter personal equipment compilation');
    assert.equal(synced.equipmentEvidence.length,4);
    for(const e of synced.equipmentEvidence){
      assert.equal(e.baseSources.length,10);
      assert.equal(e.setEffects.length,3);
      assert.equal(e.affixSources.length,9);
    }
    assert.equal(synced.synchronizationReview?.active.length,plan.active.length);
    assert.equal(synced.synchronizationReview?.scalePercent,plan.scalePercent);
    assert.equal(synced.synchronizationRehearsal?.releaseEnabled,false);
    assert.deepEqual(synced.synchronizationRehearsal?.unsupported,[]);
    assert.deepEqual(
      synced.combat.players.map(p=>p.definition.stats),
      baseline.combat.players.map(p=>p.definition.stats),
      'party modifier layer must not rewrite compiled personal stat snapshots');
    assert.ok(synced.combat.events.every(e=>Number.isFinite(e.atMs)));
    assert.ok(synced.combat.players.every(p=>Number.isFinite(p.hp)&&Number.isFinite(p.damageDone)&&Number.isFinite(p.healingDone)));

    const baseDamage=partyDamage(baseline),syncDamage=partyDamage(synced);
    const ratio=baseDamage>0?syncDamage/baseDamage:1;
    // Diagnostic only: no approved tuning threshold. Catch catastrophic
    // integration mistakes while retaining legitimate defensive-only parties.
    assert.ok(ratio>=.90&&ratio<1.50,
      'ten-slot synchronization integration outlier '+ids.join(':')+' '+boss.id+' '+ratio);
    const hpBase=partyHp(baseline),hpSync=partyHp(synced);
    improvedDamage+=Number(syncDamage>baseDamage+.01);
    improvedSurvival+=Number(hpSync>hpBase+.01);
    identicalCombat+=Number(JSON.stringify(synced.combat.events)===JSON.stringify(baseline.combat.events));
    minDamageRatio=Math.min(minDamageRatio,ratio);maxDamageRatio=Math.max(maxDamageRatio,ratio);
    maxLinks=Math.max(maxLinks,plan.active.length);
    const row=perBoss.get(boss.id)??{cases:0,min:Infinity,max:0,damageImproved:0,survivalImproved:0};
    row.cases++;row.min=Math.min(row.min,ratio);row.max=Math.max(row.max,ratio);
    row.damageImproved+=Number(syncDamage>baseDamage+.01);
    row.survivalImproved+=Number(hpSync>hpBase+.01);
    perBoss.set(boss.id,row);
    cases++;
   }
}
assert.equal(cases,36*6*2);
assert.ok([...perBoss.values()].every(x=>x.cases===72));
assert.ok(maxLinks<=6);
assert.ok(improvedDamage+improvedSurvival>0,'Synchronization must have observable real-build effects');
console.log(JSON.stringify({kind:'PARTY_SYNC_TEN_SLOT_INTEGRATION_NOT_EQUAL_CP',
 cases,standardDungeonCompositions:36,bossIdentities:6,specBands:2,
 minDamageRatio:Number(minDamageRatio.toFixed(4)),
 maxDamageRatio:Number(maxDamageRatio.toFixed(4)),maxLinks,
 improvedDamage,improvedSurvival,identicalCombat,
 signedEquipmentTraits:'SOLO_ONLY_NOT_SUPPLIED',
 persistedAuthoredBossAuthority:'SOLO_ONLY_NOT_SUPPLIED',
 byBoss:Object.fromEntries([...perBoss.entries()].sort(([a],[b])=>a.localeCompare(b))
  .map(([id,x])=>[id,{...x,min:Number(x.min.toFixed(4)),max:Number(x.max.toFixed(4))}]))}));

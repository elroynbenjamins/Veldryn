/**
 * Hidden Guild PvE V17 stress / counterplay survey.
 * Deliberately synthetic regional fixtures. No observed players/win forecasts.
 * Prints one audit summary; tests invariants rather than prescribing HP or rates.
 */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {GuildPveV12VerifiedActorLoader} from '../../../backend/online/guild-pve-verified-loader-v12';
import {GUILD_PVE_V7_PHASES,makeGuildPveReferenceV7}
 from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';
import {previewGuildPveV17EffectfulAttempt,
 type GuildPveV17ServerTactics} from '../../../backend/src/server/combat/guild-pve-effects-v17';

const reference=makeGuildPveReferenceV7('T2',{
 attack:1000,defense:650,maxHp:4500,
});
const baseline:GuildPveV17ServerTactics={
 clearedNodes:{'C1-01':true},pressure:0,shrineChoice:null,
 protectionCharges:0,cleanseCharges:0,insightCharges:0,
};
const prepared:GuildPveV17ServerTactics={
 clearedNodes:{
  'C1-01':true,'C1-04':true,'C1-06':true,'C2-01':true,
  'C2-02':true,'C2-03':true,'C2-04':true,'C2-05':true,
  'C2-06':true,'C3-01':true,'C3-04':true,'C3-05':true,
 },
 pressure:75,shrineChoice:'warding',protectionCharges:1,
 cleanseCharges:0,insightCharges:0,
};
const BASE=REGIONAL_COMBAT_FIXTURES.find(f=>f.regionId==='IRONWOOD')!;
async function run(){
 let scenarios=0,boonScenarios=0;
 let hardest=0,peakHealing=0,peakShield=0,peakCleanses=0;
 let assaultDamage=0,guardDefense=0,rallyHeal=0;
 let totalDamage=0,classes=0;
 for(const cls of CLASSES){
  const char='GX_V17_MATRIX_'+classes,account='GX_V17_MATRIX_ACCOUNT_'+classes;
  const state=regionalCombatFixture({...BASE,tier:'T2',level:15},'prepared',cls.id);
  state.character={...state.character!,id:char};
  const actor=(await new GuildPveV12VerifiedActorLoader({
   async readOwnedState(){return{
    ownerAccountId:account,characterId:char,revision:3,state,
   }},
  }).resolveOwnedActor(account,char)).actor;
  classes++;
  for(const difficulty of ['Scout','Veteran','Mythic'] as const){
   for(const stance of ['Assault','Guard','Rally'] as const){
    for(const boss of ['gatekeeper','seer','warden'] as const){
     for(const phase of GUILD_PVE_V7_PHASES[boss]){
      const result=previewGuildPveV17EffectfulAttempt({
       player:actor,boss,phase,stance,difficulty,reference,
       tactics:baseline,seed:'GX_V17_MATRIX_FIXED_'+classes,
      });
      const repeat=previewGuildPveV17EffectfulAttempt({
       player:actor,boss,phase,stance,difficulty,reference,
       tactics:baseline,seed:'GX_V17_MATRIX_FIXED_'+classes,
      });
      assert.equal(result.deterministicEvidenceHash,repeat.deterministicEvidenceHash);
      assert.equal(result.rawPlayerDamage,repeat.rawPlayerDamage);
      assert.ok(result.rawPlayerDamage>=0&&Number.isFinite(result.rawPlayerDamage));
      assert.ok(result.bossHpRemoved>=0&&Number.isFinite(result.bossHpRemoved));
      assert.ok(result.playerHpLost>=0&&Number.isFinite(result.playerHpLost));
      assert.ok(result.effectiveHealing>=0&&Number.isFinite(result.effectiveHealing));
      assert.ok(result.absorbedShield>=0&&Number.isFinite(result.absorbedShield));
      assert.ok(result.cleanseEvents>=0&&Number.isSafeInteger(result.cleanseEvents));
      assert.equal(result.rewardMinted,false);
      assert.equal(result.inventorySpent,false);
      assert.equal(result.serverPersisted,false);
      assert.equal(result.proposedChargeUses.protection,0);
      assert.equal(result.proposedChargeUses.cleanse,0);
      assert.equal(result.proposedChargeUses.insight,0);
      peakHealing=Math.max(peakHealing,result.effectiveHealing);
      peakShield=Math.max(peakShield,result.absorbedShield);
      peakCleanses=Math.max(peakCleanses,result.cleanseEvents);
      hardest=Math.max(hardest,result.playerHpLost);
      totalDamage+=result.rawPlayerDamage;
      if(stance==='Assault')assaultDamage+=result.rawPlayerDamage;
      if(stance==='Guard')guardDefense+=result.absorbedShield;
      if(stance==='Rally')rallyHeal+=result.effectiveHealing;
      scenarios++;
     }
    }
   }
  }
  // Separate final-guardian prepared battle across all nine combat identities.
  const boon=previewGuildPveV17EffectfulAttempt({
   player:actor,boss:'warden',phase:'exposed_core',
   stance:'Guard',difficulty:'Veteran',reference,
   tactics:prepared,seed:'GX_V17_BOON_MATRIX_'+classes,
  });
  assert.equal(boon.proposedChargeUses.protection,1);
  assert.ok(boon.appliedTactics.includes('armoury_armour_proxy'));
  assert.ok(boon.appliedTactics.includes('shrine_warding'));
  assert.ok(boon.appliedTactics.includes('pressure_attack_risk'));
  assert.equal(boon.rewardMinted,false);
  boonScenarios++;
 }
 assert.equal(classes,CLASSES.length);
 assert.equal(scenarios,CLASSES.length*3*3*9);
 assert.equal(boonScenarios,CLASSES.length);
 assert.ok(assaultDamage>0&&totalDamage>0);
 assert.ok(guardDefense>=0&&rallyHeal>=0);
 console.log(JSON.stringify({
  fixtureOnly:true,scenarios,boonScenarios,
  maxObservedHpLoss:hardest,maxObservedHealing:peakHealing,
  maxObservedShield:peakShield,maxObservedCleanses:peakCleanses,
  aggregateAssaultDamage:Math.round(assaultDamage),
  aggregateGuardShield:Math.round(guardDefense),
  aggregateRallyHealing:Math.round(rallyHeal),
 }));
}
run().catch(e=>{console.error(e);process.exitCode=1});

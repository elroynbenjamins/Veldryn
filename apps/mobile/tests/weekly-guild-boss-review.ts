import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from '../src/core/regional-combat-fixtures';
import {effectiveStats} from '../src/core/game';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {deriveOnlineCoopLoadout} from '../../../backend/online/coop-loadout';
import {verifyPartyEventEquippedCopyOwnershipV4} from '../../../backend/online/party-event-loadout-v4';
import {deriveRole} from '../../../backend/src/server/coop/role-readiness';
import {combatantFromVerifiedSnapshot} from '../../../backend/src/server/combat/snapshot-adapter';
import {previewWeeklyGuildCombat,previewLegacyWeeklyScore,reviewWeeklyContribution,weeklyGuildBossProfile,WEEKLY_GUILD_BOSSES,WEEKLY_GUILD_ENGINE_RELEASED,WEEKLY_GUILD_ATTEMPT_MS} from '../../../backend/src/server/combat/weekly-guild-boss-review';
assert.equal(WEEKLY_GUILD_ENGINE_RELEASED,false);
const get=(id:string)=>REGIONAL_COMBAT_FIXTURES.find(r=>r.regionId===id)!;
const tiers=[{...get('GREENFIELDS'),tier:'T1',level:8},{...get('IRONWOOD'),tier:'T2',level:15},{...get('SUNSCAR'),tier:'T3',level:30},{...get('SUNSCAR'),tier:'T4',level:45},{...get('FROSTMARCH'),tier:'T5',level:66}];
const variants=['none','UNIT_001','UNIT_002','UNIT_003'] as const;
const recipeTier=new Map(V33_EQUIPMENT_RECIPES.map(r=>[r.output.itemId,r.v33EquipmentTier]));
const mean=(a:number[])=>a.reduce((x,y)=>x+y,0)/a.length;
const cohorts=tiers.map(def=>{
 const actors=CLASSES.flatMap(cls=>variants.map(variant=>{
  const state=regionalCombatFixture(def,'prepared',cls.id);
  state.character={...state.character!,id:'WG_REVIEW_'+def.tier+'_'+cls.id,equippedCombatCompanionId:variant==='none'?undefined:variant};
  state.account={...state.account,unlockedCombatCompanionIds:variant==='none'?[]:[variant],combatCompanionProgress:variant==='none'?{}:{[variant]:{level:10,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false}}};
  verifyPartyEventEquippedCopyOwnershipV4(state);
  const loadout=deriveOnlineCoopLoadout('WG_SYNTH_'+def.tier+'_'+cls.id,state,1);
  assert.equal(loadout.legalEquipment,true);
  const player=combatantFromVerifiedSnapshot({...loadout.stats,role:deriveRole(cls.id),level:loadout.combatScalingLevel??loadout.characterLevel},loadout.abilities);
  const stats=effectiveStats(state),actualTier=recipeTier.get(state.character!.equipment.weapon!);
  const assists=player.abilities.filter(a=>a.tags?.includes('combat_companion'));
  assert.equal(assists.length,variant==='none'?0:1);
  if(variant!=='none')assert.ok(assists[0].tags?.includes(variant));
  return {player,variant,stats,actualTier,level:state.character!.level};
 }));
 const bare=actors.filter(a=>a.variant==='none');
 assert.equal(bare.length,9);
 const reference={attack:mean(bare.map(a=>a.player.stats.attackPower)),defense:mean(bare.map(a=>a.player.stats.defense)),maxHp:mean(bare.map(a=>a.player.stats.maxHp))};
 console.log('WEEKLY_GUILD_GEAR_COVERAGE '+JSON.stringify({requestedTier:def.tier,weaponTiers:bare.map(a=>({classId:a.player.classId,actualTier:a.actualTier??'noncatalog'}))}));
 return {tier:def.tier,actors,reference};
});
const {player}=cohorts[1].actors[0],reference=cohorts[1].reference;
const input={boss:WEEKLY_GUILD_BOSSES[0],reference,player,seed:'WG_replay_001'};
const before=JSON.stringify(player);
assert.deepEqual(previewWeeklyGuildCombat(input),previewWeeklyGuildCombat(input));
assert.equal(JSON.stringify(player),before);
let battles=0,assistDamage=0,assistHealing=0,assistShield=0;
for(const cohort of cohorts)for(const boss of WEEKLY_GUILD_BOSSES){
 const profile=weeklyGuildBossProfile(boss,cohort.reference);
 const results=cohort.actors.flatMap(a=>[0,1].map(seed=>{
  const r=previewWeeklyGuildCombat({boss,reference:cohort.reference,player:a.player,seed:'WG_'+a.player.classId+'_'+seed});
  const old=previewLegacyWeeklyScore({boss,role:a.player.role as 'tank'|'damage'|'support',attack:a.stats.attack,defense:a.stats.defense,hp:a.stats.hp,level:a.level,sharedMaxHp:1000000,personalAlready:0,...(a.variant==='none'?{}:{companionLevel:10,companionBond:1})});
  assert.ok(old.factor>=.82&&old.factor<=1.18&&old.capped<=old.perAttempt&&old.capped<=old.personalCap);
  assert.ok(r.durationMs<=WEEKLY_GUILD_ATTEMPT_MS&&r.durationMs>=0);
  assert.ok(r.actualBossHpRemoved>=0&&r.actualBossHpRemoved<=profile.stats.maxHp);
  for(const metric of [r.rawDamage,r.damageTaken,r.effectiveHealing,r.shieldAbsorbed,r.interrupts,r.cleanses,r.companionDirectDamage,r.companionEffectiveHealing,r.companionShieldGranted])assert.ok(Number.isFinite(metric)&&metric>=0);
  assert.equal(r.rewardGranted,false);assert.equal(r.attemptConsumed,false);assert.equal(r.sharedHpWritten,false);assert.equal(r.contribution,null);
  assert.ok(r.events.every(e=>e.atMs>=0&&e.atMs<=WEEKLY_GUILD_ATTEMPT_MS));
  if(a.variant==='none')assert.equal(r.companionAbilityEvents,0);
  assistDamage+=r.companionDirectDamage;assistHealing+=r.companionEffectiveHealing;assistShield+=r.companionShieldGranted;
  return {r,old,variant:a.variant};
 }));
 assert.ok(results.some(({r})=>r.bossCastWarnings>0));
 assert.ok(results.some(({r})=>r.actualBossHpRemoved>0));
 for(const role of ['tank','damage','support'])for(const variant of variants){
  const group=results.filter(({r,variant:v})=>r.role===role&&v===variant);
  assert.ok(group.length>0);
  const bare=results.filter(({r,variant:v})=>r.role===role&&v==='none');
  const hp=mean(group.map(({r})=>r.actualBossHpRemoved)),baseHp=mean(bare.map(({r})=>r.actualBossHpRemoved));
  console.log('WEEKLY_GUILD_COHORT '+JSON.stringify({tier:cohort.tier,boss,role,variant,runs:group.length,meanHpRemoved:hp,deltaVsBareHp:hp-baseHp,meanHeal:mean(group.map(({r})=>r.effectiveHealing)),meanShieldAbsorbed:mean(group.map(({r})=>r.shieldAbsorbed)),meanSurvivalMs:mean(group.map(({r})=>r.durationMs)),meanLegacyProxyScore:mean(group.map(({old})=>old.capped)),meanLegacyRoleFactor:mean(group.map(({old})=>old.factor)),companionDirectDamage:mean(group.map(({r})=>r.companionDirectDamage)),companionEffectiveHealing:mean(group.map(({r})=>r.companionEffectiveHealing)),companionShieldGranted:mean(group.map(({r})=>r.companionShieldGranted))}));
 }
 battles+=results.length;
}
assert.equal(battles,1080);
assert.ok(assistDamage>0&&assistHealing>0&&assistShield>0,'all three actual assist effects must occur');
// Same fixed T2 reference across all tiers: expose progression separately from cohort tuning.
let fixedBattles=0;
for(const cohort of cohorts)for(const boss of WEEKLY_GUILD_BOSSES){
 const group=cohort.actors.filter(a=>a.variant==='none').map(a=>previewWeeklyGuildCombat({boss,reference,player:a.player,seed:'WG_fixed_'+a.player.classId}));
 console.log('WEEKLY_GUILD_FIXED_REFERENCE '+JSON.stringify({tier:cohort.tier,boss,meanHpRemoved:mean(group.map(r=>r.actualBossHpRemoved)),meanDuration:mean(group.map(r=>r.durationMs)),clears:group.filter(r=>r.reason==='victory').length}));
 fixedBattles+=group.length;
}
assert.equal(fixedBattles,135);
const capped=previewLegacyWeeklyScore({boss:WEEKLY_GUILD_BOSSES[0],role:'tank',attack:100,defense:100,hp:1000,level:15,sharedMaxHp:1000000,personalAlready:1000000});
assert.equal(capped.capReached,true);assert.equal(capped.capped,0);
let rejected=false;try{weeklyGuildBossProfile(WEEKLY_GUILD_BOSSES[0],{...reference,attack:0})}catch{rejected=true}assert.ok(rejected);
console.log('PASS 1215 synthetic weekly guild battles; no settlement');

 // Matched baseline vs tuning: same seed, class, gear, companion and reference.
 // The following diagnostics intentionally do not certify final role fairness.
 let paired=0;
 for(const cohort of cohorts)for(const boss of WEEKLY_GUILD_BOSSES){
  const pairs=cohort.actors.flatMap(a=>[0,1].map(seed=>{
   const input={boss,reference:cohort.reference,player:a.player,seed:'WG_'+a.player.classId+'_'+seed};
   const baseline=previewWeeklyGuildCombat({...input,tuning:'baseline'});
   const candidate=previewWeeklyGuildCombat({...input,tuning:'candidate'});
   const score=reviewWeeklyContribution({result:candidate,reference:cohort.reference,sharedMaxHp:1000000,sharedRemainingHp:500000,personalAlready:0});
   assert.ok(score.sharedHpCredit<=candidate.actualBossHpRemoved&&score.sharedHpCredit<=110000);
   assert.ok(score.utility<=score.attackWork*.50&&score.utility<=cohort.reference.attack*20);
   assert.equal(score.rewardGranted,false);assert.equal(score.payableScore,null);
   return {baseline,candidate,score,variant:a.variant};
  }));
  paired+=pairs.length;
  for(const role of ['tank','damage','support']){
   const group=pairs.filter(p=>p.candidate.role===role&&p.variant==='none');
   console.log('WEEKLY_GUILD_TUNING '+JSON.stringify({tier:cohort.tier,boss,role,runs:group.length,
    baselineHp:mean(group.map(p=>p.baseline.actualBossHpRemoved)),candidateHp:mean(group.map(p=>p.candidate.actualBossHpRemoved)),
    baselineDuration:mean(group.map(p=>p.baseline.durationMs)),candidateDuration:mean(group.map(p=>p.candidate.durationMs)),
    baselineWipes:group.filter(p=>p.baseline.reason==='wipe').length,candidateWipes:group.filter(p=>p.candidate.reason==='wipe').length,
    candidateScore:mean(group.map(p=>p.score.score)),candidateUtility:mean(group.map(p=>p.score.utility))}));
  }
 }
 assert.equal(paired,1080);
 const example=previewWeeklyGuildCombat(input);
 const budget={reference,sharedMaxHp:1000000,sharedRemainingHp:1,personalAlready:0};
 assert.ok(reviewWeeklyContribution({...budget,result:example}).sharedHpCredit<=1);
 assert.equal(reviewWeeklyContribution({...budget,sharedRemainingHp:0,result:example}).sharedHpCredit,0);
 assert.equal(reviewWeeklyContribution({...budget,personalAlready:280000,result:example}).sharedHpCredit,0);
 const zero={...example,actualBossHpRemoved:0,bossShieldAbsorbed:0,effectiveHealing:1e7,shieldAbsorbed:1e7,interrupts:1000,cleanses:1000};
 assert.equal(reviewWeeklyContribution({...budget,result:zero}).score,0);
 const utility={...zero,actualBossHpRemoved:1000};
 const bounded=reviewWeeklyContribution({...budget,result:utility});
 assert.ok(bounded.utility<=500&&bounded.score<=1500);assert.equal(bounded.sharedHpCredit,1);
 let bad=false;try{reviewWeeklyContribution({...budget,result:{...example,effectiveHealing:NaN}})}catch{bad=true}assert.ok(bad);
 console.log('PASS 1080 matched baseline/candidate pairs and bounded contribution invariants');

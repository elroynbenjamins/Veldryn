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

import {WeeklyRaidReviewStore,WEEKLY_RAID_TRANSACTION_RELEASED,type WeeklyReviewPrincipal} from '../../../backend/src/server/combat/weekly-guild-raid-transaction-review';
assert.equal(WEEKLY_RAID_TRANSACTION_RELEASED,false);
const week=Date.UTC(2026,10,23),weekMs=7*24*60*60*1000;
const accounts=Array.from({length:12},(_,i)=>'account_'+i);
const principal=(i:number):WeeklyReviewPrincipal=>({accountId:accounts[i],guildId:'guild_review'});
let actorRevision=1,loads=0,member=true,foreign=false;
const authority={
 currentMember:()=>member,
 loadActor:(p:WeeklyReviewPrincipal,characterId:string)=>{
  loads++;
  return {accountId:foreign?'foreign':p.accountId,characterId,revision:actorRevision,player:{...structuredClone(player),id:characterId}};
 }
};
const encounter={id:'weekly_review',guildId:'guild_review',boss:WEEKLY_GUILD_BOSSES[0],startMs:week,endMs:week+weekMs,maxHp:1000000,reference,roster:accounts};
const make=(maxHp=encounter.maxHp)=>new WeeklyRaidReviewStore({...encounter,maxHp},authority,'private-synthetic-test-seed-key-0000001');
const expectReject=(fn:()=>unknown,needle:string)=>{let thrown=false;try{fn()}catch(e){thrown=String(e).includes(needle)}assert.ok(thrown,needle)};
const raid=make(),cmd={characterId:'hero_a',nonce:'nonce_00001'};
const first=raid.start(principal(0),cmd,week+1);
assert.equal(first.replay,null);assert.equal(first.attemptNumber,1);assert.equal(first.resolvesMs,week+1+180000);
assert.equal(raid.snapshot().remainingHp,encounter.maxHp);
actorRevision=2;
assert.deepEqual(raid.start(principal(0),cmd,week+10),first);assert.equal(loads,1);
expectReject(()=>raid.start(principal(0),{...cmd,characterId:'hero_b'},week+10),'nonce_conflict');
expectReject(()=>raid.start(principal(0),{characterId:'hero_b',nonce:'nonce_00002'},week+10),'pending');
expectReject(()=>raid.start({...principal(0),guildId:'wrong'},cmd,week+10),'membership');
member=false;expectReject(()=>raid.read(principal(0),cmd.nonce),'membership');member=true;
assert.equal(raid.read(principal(1),cmd.nonce),null);
assert.equal(raid.settleDue(first.resolvesMs-1).settled,0);
assert.equal(raid.settleDue(first.resolvesMs).settled,1);
const settled=raid.read(principal(0),cmd.nonce)!;
assert.equal(settled.actorRevision,1);assert.ok(settled.replay!==null);
assert.equal(settled.rewardGranted,false);assert.equal(settled.claimable,false);
const after=raid.snapshot();
assert.equal(after.remainingHp,encounter.maxHp-(settled.sharedHpCredit??0));
assert.equal(raid.settleDue(first.resolvesMs+1).settled,0);assert.deepEqual(raid.snapshot(),after);
assert.deepEqual(raid.start(principal(0),cmd,week+weekMs+1),settled);
const next=raid.start(principal(0),{characterId:'hero_b',nonce:'nonce_00002'},first.resolvesMs+1);
assert.equal(next.attemptNumber,2);assert.equal(next.actorRevision,2);
raid.settleDue(next.resolvesMs);
const third=raid.start(principal(0),{characterId:'hero_c',nonce:'nonce_00003'},next.resolvesMs+1);
raid.settleDue(third.resolvesMs);
expectReject(()=>raid.start(principal(0),{characterId:'hero_d',nonce:'nonce_00004'},third.resolvesMs+1),'attempt_cap');
const beforeForeign=raid.snapshot();foreign=true;
expectReject(()=>raid.start(principal(1),cmd,week+5),'actor_mismatch');
foreign=false;assert.deepEqual(raid.snapshot(),beforeForeign);
const late=raid.start(principal(1),cmd,week+weekMs-1);
assert.equal(raid.settleDue(late.resolvesMs).settled,1);
expectReject(()=>raid.start(principal(2),cmd,week+weekMs),'closed');
const small=make(100);
for(let i=0;i<12;i++)small.start(principal(i),{characterId:'hero_'+i,nonce:'nonce_shared'},week+1);
const batch=small.settleDue(week+180001);
assert.equal(batch.settled,12);assert.equal(batch.remainingHp,0);
const credits=accounts.map((_,i)=>small.read(principal(i),'nonce_shared')!.sharedHpCredit??0);
assert.equal(credits.reduce((n,x)=>n+x,0),100);assert.ok(credits.every(x=>x>=0&&x<=11));
assert.equal(small.settleDue(week+180002).settled,0);
console.log('PASS private weekly transaction reference: frozen replay, account caps, nonce conflicts, late settlement, shared HP conservation');

import {weeklyReviewSurvivalBuild} from '../../../backend/src/server/combat/weekly-guild-survival-review';
import {weeklyRaidReplayFrame} from '../src/core/weekly-guild-raid-replay-review';
let survivalRuns=0;
for(const cohort of cohorts)for(const boss of WEEKLY_GUILD_BOSSES)for(const choice of ['current','guarded','resilient'] as const){
 const group=cohort.actors.filter(a=>a.variant==='none'&&a.player.role==='damage').flatMap(a=>[0,1].map(seed=>{
  const actor=weeklyReviewSurvivalBuild(a.player,choice);
  return previewWeeklyGuildCombat({boss,reference:cohort.reference,player:actor,seed:'WG_survival_'+a.player.classId+'_'+seed});
 }));
 survivalRuns+=group.length;
 console.log('WEEKLY_GUILD_SURVIVAL '+JSON.stringify({tier:cohort.tier,boss,choice,runs:group.length,meanDuration:mean(group.map(r=>r.durationMs)),meanHpRemoved:mean(group.map(r=>r.actualBossHpRemoved)),wipes:group.filter(r=>r.reason==='wipe').length}));
}
assert.equal(survivalRuns,360);
const replaySource=settled.replay!;
assert.equal(weeklyRaidReplayFrame(null,1000,0,false).state,'pending');
const full=weeklyRaidReplayFrame(replaySource,180000,null,false);
assert.equal(full.state,'complete');assert.equal(full.events.length,replaySource.events.length);assert.equal(full.effects.length,0);
assert.equal(weeklyRaidReplayFrame(replaySource,30000,0,false).effects.length,0);
assert.equal(weeklyRaidReplayFrame(replaySource,1000,0,true).effects.length,0);
assert.equal(weeklyRaidReplayFrame(replaySource,500,1000,false).effects.length,0);
const cue=replaySource.events.find(e=>e.atMs>0&&['damage','cast_start'].includes(e.type))!;
assert.ok(weeklyRaidReplayFrame(replaySource,cue.atMs,Math.max(0,cue.atMs-100),false).effects.some(e=>e===cue));
expectReject(()=>weeklyRaidReplayFrame({...replaySource,events:[{type:'damage',atMs:10},{type:'damage',atMs:5}]},1000,0,false),'invalid_raid_replay_order');
console.log('PASS 360 survival trade-off scenarios and settled-only replay seek contracts');

import {freezeWeeklyGuildSkills,applyWeeklyGuildSkills} from '../../../backend/src/server/combat/weekly-guild-skills-review';
import {weeklyGuildReviewCommand,WEEKLY_GUILD_COMMAND_RELEASED} from '../../../backend/src/server/combat/weekly-guild-command-review';
const maxProjection={schemaVersion:1,guildId:'guild_review',guildBossDamageBps:600,guildDefenceBps:600,guildSupportBps:600};
const bonuses=freezeWeeklyGuildSkills('guild_review',maxProjection);
assert.deepEqual(bonuses,{damageBps:600,defenceBps:600,supportBps:600});
assert.deepEqual(freezeWeeklyGuildSkills('other',maxProjection),{damageBps:0,defenceBps:0,supportBps:0});
assert.deepEqual(freezeWeeklyGuildSkills('guild_review',{...maxProjection,schemaVersion:2}),{damageBps:0,defenceBps:0,supportBps:0});
assert.deepEqual(freezeWeeklyGuildSkills('guild_review',{...maxProjection,guildBossDamageBps:99999,guildDefenceBps:-1,guildSupportBps:NaN}),{damageBps:600,defenceBps:0,supportBps:0});
const assisted=cohorts[1].actors.find(a=>a.variant==='UNIT_001')!.player;
const original=JSON.stringify(assisted),buffed=applyWeeklyGuildSkills(assisted,bonuses);
assert.equal(JSON.stringify(assisted),original);
assert.equal(buffed.stats.attackPower,assisted.stats.attackPower*1.06);
assert.equal(buffed.stats.defense,assisted.stats.defense*1.06);
for(const a of assisted.abilities){
 const b=buffed.abilities.find(x=>x.id===a.id)!;
 if(!a.tags?.includes('combat_companion'))assert.deepEqual(b,a);
 else for(let i=0;i<a.effects.length;i++){
  if(a.effects[i].kind==='damage'&&a.effects[i].coeff!==undefined)assert.equal(b.effects[i].coeff,a.effects[i].coeff!*1.06);
 }
}
expectReject(()=>applyWeeklyGuildSkills(buffed,bonuses),'already_applied');
let skillProjection=maxProjection;
const frozenSkillRaid=new WeeklyRaidReviewStore(encounter,{...authority,loadActor:(p,characterId)=>({...authority.loadActor(p,characterId),guildSkills:skillProjection})},'private-synthetic-test-seed-key-0000002');
const skillStart=frozenSkillRaid.start(principal(0),cmd,week+1);
skillProjection={...maxProjection,guildSupportBps:0};
assert.deepEqual(frozenSkillRaid.start(principal(0),cmd,week+2).guildSkills,bonuses);
frozenSkillRaid.settleDue(skillStart.resolvesMs);
assert.deepEqual(frozenSkillRaid.read(principal(0),cmd.nonce)!.guildSkills,bonuses);
let skillRuns=0;
for(const cohort of cohorts)for(const boss of WEEKLY_GUILD_BOSSES){
 const pair=cohort.actors.map(a=>{
  const seed='WG_skill_'+a.player.classId;
  const baseline=previewWeeklyGuildCombat({boss,reference:cohort.reference,player:a.player,seed});
  const candidate=previewWeeklyGuildCombat({boss,reference:cohort.reference,player:applyWeeklyGuildSkills(a.player,bonuses),seed});
  return {baseline,candidate,variant:a.variant};
 });
 skillRuns+=pair.length*2;
 console.log('WEEKLY_GUILD_SKILLS '+JSON.stringify({tier:cohort.tier,boss,runs:pair.length,meanBaseHp:mean(pair.map(p=>p.baseline.actualBossHpRemoved)),meanBuffedHp:mean(pair.map(p=>p.candidate.actualBossHpRemoved)),meanBaseDuration:mean(pair.map(p=>p.baseline.durationMs)),meanBuffedDuration:mean(pair.map(p=>p.candidate.durationMs))}));
}
assert.equal(skillRuns,1080);
// Canonical disruptor and cleanser companions, not synthetic extra abilities.
let counterRuns=0,totalInterrupts=0,totalCleanses=0;
for(const cohort of cohorts){
 const def=tiers.find(x=>x.tier===cohort.tier)!;
 for(const cls of CLASSES){
  for(const variant of ['UNIT_005','UNIT_008'] as const){
   const state=regionalCombatFixture(def,'prepared',cls.id);
   state.character={...state.character!,id:'WG_COUNTER_'+def.tier+'_'+cls.id,equippedCombatCompanionId:variant};
   state.account={...state.account,unlockedCombatCompanionIds:[variant],combatCompanionProgress:{[variant]:{level:10,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false}}};
   verifyPartyEventEquippedCopyOwnershipV4(state);
   const loadout=deriveOnlineCoopLoadout('WG_COUNTER_'+cls.id,state,1);
   const actor=combatantFromVerifiedSnapshot({...loadout.stats,role:deriveRole(cls.id),level:loadout.combatScalingLevel??loadout.characterLevel},loadout.abilities);
   for(const boss of WEEKLY_GUILD_BOSSES){
    const seed='WG_counter_'+cls.id;
    const result=previewWeeklyGuildCombat({boss,reference:cohort.reference,player:actor,seed});
    const bare=cohort.actors.find(a=>a.variant==='none'&&a.player.classId===cls.id)!.player;
    const baseline=previewWeeklyGuildCombat({boss,reference:cohort.reference,player:{...bare,id:actor.id},seed});
    counterRuns+=2;totalInterrupts+=result.companionInterrupts;totalCleanses+=result.companionCleanses;
    console.log('WEEKLY_GUILD_COUNTER '+JSON.stringify({tier:cohort.tier,boss,classId:cls.id,variant,baseHp:baseline.actualBossHpRemoved,assistedHp:result.actualBossHpRemoved,baseDuration:baseline.durationMs,assistedDuration:result.durationMs,interrupts:result.companionInterrupts,cleanses:result.companionCleanses}));
   }
  }
 }
}
assert.equal(counterRuns,540);
console.log('WEEKLY_GUILD_COUNTER_TOTAL '+JSON.stringify({totalInterrupts,totalCleanses,counterRuns}));
assert.equal(WEEKLY_GUILD_COMMAND_RELEASED,false);
async function commandChecks(){
 const privateRaid=make();
 const services={authenticate:async(token:string)=>token==='valid'?'account_0':null,resolveGuild:async()=>encounter.guildId,resolveStore:async()=>privateRaid,now:()=>week+1};
 const request={action:'start',encounterId:encounter.id,characterId:'hero_a',nonce:'nonce_auth'};
 const reject=async(fn:()=>Promise<unknown>,needle:string)=>{let error=false;try{await fn()}catch(e){error=String(e).includes(needle)}assert.ok(error,needle)};
 await reject(()=>weeklyGuildReviewCommand(services,undefined,request),'auth_required');
 await reject(()=>weeklyGuildReviewCommand(services,'Bearer invalid',request),'invalid_session');
 await reject(()=>weeklyGuildReviewCommand(services,'Bearer valid',{...request,accountId:'account_1'}),'invalid_weekly_review_command');
 await reject(()=>weeklyGuildReviewCommand(services,'Bearer valid',{...request,now:week+100}),'invalid_weekly_review_command');
 await reject(()=>weeklyGuildReviewCommand(services,'Bearer valid',{...request,damage:9999}),'invalid_weekly_review_command');
 await reject(()=>weeklyGuildReviewCommand(services,'Bearer valid',{...request,encounterId:'wrong'}),'encounter_unavailable');
 assert.equal(privateRaid.snapshot().reservedAttempts,0);
 const started=await weeklyGuildReviewCommand(services,'Bearer valid',request);
 assert.ok(started!==null&&started.accountId==='account_0'&&started.replay===null);
 assert.deepEqual(await weeklyGuildReviewCommand(services,'Bearer valid',request),started);
 assert.deepEqual(await weeklyGuildReviewCommand(services,'Bearer valid',{action:'read',encounterId:encounter.id,nonce:request.nonce}),started);
 console.log('PASS private bearer-auth command contract, trusted clock, ownership and rejected extra fields');
}
void commandChecks().catch(error=>{console.error(error);process.exitCode=1});

import {weeklyRaidPresentationFrame,weeklyRaidBattleSummary,WEEKLY_RAID_SCREEN_RELEASED} from '../src/core/weekly-guild-raid-replay-review';
assert.equal(WEEKLY_RAID_SCREEN_RELEASED,false);
assert.equal(weeklyRaidBattleSummary(first),null);
const settledReplay=settled.replay!;
const endFrame=weeklyRaidPresentationFrame(settledReplay,180000,null,false);
assert.equal(endFrame.bossHp,settledReplay.presentation.boss.finalHp);
assert.equal(endFrame.heroHp,settledReplay.presentation.hero.finalHp);
assert.equal(endFrame.approximateHp,false);
assert.equal(endFrame.cue,null);
const summary=weeklyRaidBattleSummary(settled)!;
assert.equal(summary.sharedHpCredit,settled.sharedHpCredit!);
assert.equal(summary.localBossHpDamage,settledReplay.actualBossHpRemoved);
assert.equal(summary.claimable,false);
assert.ok(endFrame.log.length<=5);
const castEvent=settledReplay.events.find(e=>e.type==='cast_start'&&e.actorId===settledReplay.presentation.boss.id);
if(castEvent){
 const castFrame=weeklyRaidPresentationFrame(settledReplay,castEvent.atMs,null,false);
 assert.ok(castFrame.events.every(e=>e.atMs<=castEvent.atMs));
 assert.equal(castFrame.approximateHp,true);
 assert.equal(castFrame.cue,null);
}
const seekFrame=weeklyRaidPresentationFrame(settledReplay,1000,15000,false);
assert.equal(seekFrame.cue,null);
assert.equal(weeklyRaidBattleSummary({...settled,sharedHpCredit:0})!.sharedHpCredit,0);
assert.equal(weeklyRaidBattleSummary({nonce:'missing',replay:settledReplay})!.sharedHpCredit,null);
console.log('PASS review UI presentation: exact terminal HP, event log, separate contribution and seek safety');

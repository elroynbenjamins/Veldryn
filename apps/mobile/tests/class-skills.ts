import {CLASSES} from '../src/content/classes';
import {createCharacter,newGame,startCombat,startClassTraining,claimActivity,effectiveStats,previewActivityReward,offlineCapSeconds,startGathering} from '../src/core/game';
import {characterClassSkills,CLASS_DRILL_BASE_XP,normalizeClassDrills,normalizeClassSkills,MAX_CLASS_SKILL_XP,awardClassSkillXp,awardCombatClassXp,settleClassDrills} from '../src/core/class-skills';
import {classSkillAffinityLabel} from '../src/core/class-skill-affinities';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {classSkillsFor} from '../src/content/class-skills';
import {huntClassSurvivalEvents} from '../src/core/hunt-class-identity';
import {monsterMasteryKillsForRank} from '../src/core/monster-mastery';
import {reconcileCombatCompanionUnlocks} from '../src/core/combat-companions';
import {createSaveBackup,parseSaveBackup} from '../src/core/save-transfer';
import {settleStartupActivity} from '../src/core/playability';
import {skillTrainingFocus} from '../src/core/skill-milestones';
import type {ClassId,GameState} from '../src/core/types';
let checks=0;const ok=(v:unknown,m:string)=>{checks++;if(!v)throw new Error(m);};const rejects=(f:()=>unknown,m:string)=>{let threw=false;try{f();}catch{threw=true;}ok(threw,m);};
const now=Date.UTC(2026,8,13),fresh=(id:ClassId='IRONWARDEN')=>createCharacter(newGame(now),id,'Skill Test');
const total=(s:GameState)=>characterClassSkills(s.character!).reduce((n,r)=>n+r.xp,0);
const hubFocus=skillTrainingFocus(fresh());ok(!!hubFocus&&hubFocus.nextLevel>hubFocus.currentLevel&&hubFocus.milestoneCount>=1,'skill hub recommends a real upcoming authored milestone');
for(const cls of CLASSES){let s=startCombat(fresh(cls.id),'MOSS_RAT',now);const snap=JSON.stringify(s),preview=previewActivityReward(s,now+60000);ok(preview.classSkillXp?.every(a=>a.xp>0),'both skills gain '+cls.id);ok(JSON.stringify(s)===snap,'preview pure');s=claimActivity(s,now+60000).state;ok(total(s)>0,'combat XP applied');ok(total(claimActivity(s,now+60000).state)===total(s),'no replay');
const base=fresh(cls.id),before=effectiveStats(base);for(let i=0;i<2;i++){const c=structuredClone(base);c.character!.classSkills=classSkillsFor(cls.id).map((d,j)=>({skillId:d.id,xp:i===j?MAX_CLASS_SKILL_XP:0,level:1}));const after=effectiveStats(c);ok(after.hp>before.hp||after.attack>before.attack||after.defense>before.defense||after.accuracy>before.accuracy||after.evasion>before.evasion||after.haste>before.haste||after.ward>before.ward||after.potency>before.potency||after.penetration>before.penetration||after.classHealing>before.classHealing,'each class discipline improves a real runtime stat '+cls.id);}}
// Precision now increases real hit/dodge chances instead of Attack/Defense.
const knifeBase=fresh('KNIFE_DANCER'),knifeMastered=structuredClone(knifeBase);
knifeMastered.character!.classSkills=classSkillsFor('KNIFE_DANCER').map((skill)=>({skillId:skill.id,xp:skill.id==='precision'?MAX_CLASS_SKILL_XP:0,level:1}));
const knifeBefore=effectiveStats(knifeBase),knifeAfter=effectiveStats(knifeMastered);
ok(Math.abs((knifeAfter.accuracy-knifeBefore.accuracy)-.03)<1e-9,'Precision grants +3 percentage points of accuracy at level 100');
ok(Math.abs((knifeAfter.evasion-knifeBefore.evasion)-.06)<1e-9,'Precision grants +6 percentage points of evasion at level 100');
ok(knifeAfter.attack===knifeBefore.attack&&knifeAfter.defense===knifeBefore.defense,'Precision does not grant misleading Attack/Defense bonuses');

// Class training must not mutate base equipment or create negative stats.
for(const cls of CLASSES){
 const untrained=fresh(cls.id),before=effectiveStats(untrained),trained=structuredClone(untrained);
 trained.character!.classSkills=classSkillsFor(cls.id).map(d=>({skillId:d.id,xp:MAX_CLASS_SKILL_XP,level:100}));
 const buffed=effectiveStats(trained);
 ok(buffed.hp>=before.hp&&buffed.attack>=before.attack&&buffed.defense>=before.defense,'specialist class stats never penalize base equipment: '+cls.id);
 ok([buffed.accuracy,buffed.evasion,buffed.haste,buffed.ward,buffed.potency,buffed.penetration,buffed.classHealing].every(Number.isFinite),'specialist secondary ratings remain finite: '+cls.id);
}
// Both support classes have real, deterministic restorative improvements.
const incomingHit=[{fraction:.5,actor:'enemy' as const,damage:100,healing:0,critical:false,index:0}];
for(const [id,skillHealing] of [['DAWNKEEPER',1.10],['STONECALLER',1.08]] as const){
 const options={classId:id,classSkillLevel:1,combatStartedAtMs:0,encounterStartedAtMs:0,cycleSeconds:10};
 const basic=huntClassSurvivalEvents(incomingHit,{...options,classHealingMultiplier:1});
 const trained=huntClassSurvivalEvents(incomingHit,{...options,classHealingMultiplier:skillHealing});
 const healed=(hits:typeof basic)=>hits.reduce((sum,hit)=>sum+hit.healing,0);
 ok(healed(trained)>healed(basic),id+' class specialization improves real landed-hit healing');
 ok(incomingHit[0].healing===0,'class heal simulation never mutates the source encounter');
}
let train=startClassTraining(fresh(),now);train.character!.currentHp=5;const inventory=JSON.stringify(train.inventory);const first=claimActivity(train,now+60000);ok(first.reward.trainingActions===1&&total(first.state)===CLASS_DRILL_BASE_XP,'24 XP per drill');ok(first.state.character!.currentHp===5&&JSON.stringify(first.state.inventory)===inventory,'drills do not heal or spend food');ok(first.reward.xp===0&&first.reward.gold===0&&first.reward.kills===0&&!first.reward.eventDrops,'no unrelated rewards');
let chunks=train;for(let sec=10;sec<=600;sec+=10)chunks=claimActivity(chunks,now+sec*1000).state;const long=claimActivity(train,now+600000).state;ok(JSON.stringify(chunks.character)===JSON.stringify(long.character),'drills independent of claim chunking');
let focused=executeGameCommand(train,{type:'class_focus',args:{focus:'primary'}},now+30000).state;focused=claimActivity(focused,now+60000).state;ok(characterClassSkills(focused.character!).every(s=>s.xp===12),'partial drill keeps old focus');focused=claimActivity(focused,now+120000).state;ok(characterClassSkills(focused.character!)[0].xp===30&&characterClassSkills(focused.character!)[1].xp===18,'next drill uses focus');
const capped=claimActivity(train,now+10*86400000);ok(capped.reward.trainingActions===offlineCapSeconds(train)/60,'offline cap');ok(total(claimActivity(capped.state,now+10*86400000).state)===total(capped.state),'no old excess replay');
const saved=parseSaveBackup(createSaveBackup(focused));ok(total(saved)===total(focused)&&saved.character!.classTraining?.progressMs===0,'save round trip');ok(settleStartupActivity(train,now+60000).reward?.classSkillXp?.length===2,'startup training settlement');
ok(!startCombat(train,'MOSS_RAT',now+60000).character!.classTraining,'combat replaces drills');ok(!startGathering(train,'GREENWOOD_TREE',now+60000).character!.classTraining,'gathering replaces drills');
const gathering=claimActivity(startGathering(fresh(),'GREENWOOD_TREE',now),now+60000).state;ok(total(gathering)===0,'gathering gives no class XP');
let maximum=fresh();maximum.character!.classSkills=classSkillsFor('IRONWARDEN').map(d=>({skillId:d.id,xp:MAX_CLASS_SKILL_XP-1,level:99}));maximum=claimActivity(startClassTraining(maximum,now),now+60000).state;ok(characterClassSkills(maximum.character!).every(s=>s.level===100)&&!maximum.character!.classTraining,'drills stop at cap');rejects(()=>startClassTraining(maximum,now+60000),'cannot restart maxed');
let shade=fresh('KNIFE_DANCER');shade.character!.classSkills=classSkillsFor('KNIFE_DANCER').map(d=>({skillId:d.id,xp:MAX_CLASS_SKILL_XP,level:100}));shade=reconcileCombatCompanionUnlocks(shade,now);ok(!shade.account.unlockedCombatCompanionIds?.includes('UNIT_007'),'Knife Dancer class training alone cannot unlock Gloamknife Shade');
shade.character!.monsterMasteryPoints={...(shade.character!.monsterMasteryPoints??{}),GLOAM_MITE:monsterMasteryKillsForRank(20)};shade=reconcileCombatCompanionUnlocks(shade,now);ok(shade.account.unlockedCombatCompanionIds?.includes('UNIT_007'),'Gloam Mite mastery unlocks Shade without class exclusivity');
const normalized=normalizeClassSkills('IRONWARDEN',[{skillId:'guardcraft',xp:NaN,level:100},{skillId:'spellcraft',xp:MAX_CLASS_SKILL_XP}]);ok(normalized.every(s=>s.level===1),'invalid XP and cross-class skills discarded');
const legacyDrill=normalizeClassDrills({lastClaimAtMs:now,progressMs:0,focus:'balanced',xpPerDrill:8});ok(legacyDrill?.xpPerDrill===CLASS_DRILL_BASE_XP,'legacy slow drill snapshots upgrade to the current baseline');
const a=awardClassSkillXp(fresh().character!,14,'primary');const b=awardClassSkillXp(a.character,14,'primary');ok(b.character.classSkills![0].xp===21&&b.character.classSkills![1].xp===7,'fractional focus XP retained');
rejects(()=>validateGameCommand({type:'class_focus',args:{focus:'primary',xp:1000}}),'forged XP rejected');rejects(()=>executeGameCommand(fresh(),{type:'class_focus',args:{focus:'fake'}},now),'invalid focus rejected');
const nearCap=fresh();nearCap.character!.classSkills=classSkillsFor('IRONWARDEN').map(d=>({skillId:d.id,xp:MAX_CLASS_SKILL_XP-1,level:99}));const capClaim=claimActivity(startClassTraining(nearCap,now),now+3600000);ok(capClaim.reward.trainingActions===1,'stop counting drills when both skills cap');
// Each displayed ratio preserves class skill order and survives a save/load.
for(const [focus,primary,secondary] of [['secondary',25,75],['balanced',50,50],['primary',75,25]] as const){
 const selected=executeGameCommand(fresh(),{type:'class_focus',args:{focus}},now).state;
 const restored=parseSaveBackup(createSaveBackup(selected));
 ok(restored.character!.trainingFocus===focus,'XP split persists: '+focus);
 const earned=awardClassSkillXp(restored.character!,100);
 ok(earned.awards[0].xp===primary&&earned.awards[1].xp===secondary,'Skill-order XP split: '+primary+'/'+secondary);
 const hunting=startCombat(restored,'MOSS_RAT',now);
 ok(hunting.activity!.classFocus===focus,'New fight snapshots the selected XP split: '+focus);
}
{
 // Corrupt inputs never write NaN XP into a save.
 const fresh=createCharacter(newGame(0),'RAVAGER','Finite XP').character!;
 for(const pool of [Number.NaN,Number.POSITIVE_INFINITY]){
  const awarded=awardClassSkillXp(fresh,pool);
  ok(characterClassSkills(awarded.character).every(row=>row.xp===0)&&awarded.awards.every(row=>row.xp===0),'Non-finite XP pool must award nothing');
  ok(Object.values(awarded.character.classSkillRemainders??{}).every(Number.isFinite),'Remainders must stay finite');
 }
 const combat=awardCombatClassXp(fresh,3,Number.NaN);
 ok(combat.awards.every(row=>row.xp===0),'Non-finite per-kill XP must award nothing');
 const partial=awardCombatClassXp(fresh,2.9,10);
 ok(partial.awards.reduce((sum,row)=>sum+row.xp,0)===20,'Fractional kill counts round down to whole kills');
 // Drill settlement ignores a non-finite clock.
 const drilling={...createCharacter(newGame(0),'RAVAGER','Clock'),};
 const withDrill={...drilling,character:{...drilling.character!,classTraining:{lastClaimAtMs:0,progressMs:0,focus:'balanced' as const,xpPerDrill:CLASS_DRILL_BASE_XP}}};
 ok(settleClassDrills(withDrill,Number.NaN,3600).state===withDrill,'NaN clock must not settle drills');
 ok(classSkillAffinityLabel('IRONWARDEN')==='Smithing · +5% XP · +3% speed','Affinity label must reflect the applied multipliers');
}
console.log(`PASS class skills: ${checks} checks`);

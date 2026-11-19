import {createCharacter,newGame,startCombat,claimActivity,previewActivityReward} from '../src/core/game';
import {monsterMastery,recordMonsterMastery,normalizeMonsterMastery,monsterMasteryCombatBonuses,monsterMasteryKillsForRank,monsterMasteryRankFromKills,MONSTER_MASTERY_MAX_KILLS} from '../src/core/monster-mastery';
import {ENEMY_FAMILIES,enemyFamilyForMonster} from '../src/content/enemy-families';
import {MONSTERS} from '../src/content/monsters';
import {enemyFamilyMastery,normalizeEnemyFamilyMastery,backfillEnemyFamilyMastery,ENEMY_FAMILY_MASTERY_MILESTONES,recordEnemyFamilyMastery,enemyFamilyMasteryPointsPerKill,familyMasteryPointsForRank,FAMILY_MASTERY_MAX_POINTS,enemyFamilyMasteryGuidance} from '../src/core/enemy-family-mastery';
import {MONSTER_MASTERY_MILESTONES,monsterMasteryGuidance,nextMasteryMilestone} from '../src/core/monster-mastery-presentation';
import {activityCycleSeconds} from '../src/core/dashboard';
import {masteryRewardBonuses} from '../src/core/mastery-rewards';
import {MASTERY_ANTICIPATION_MILESTONES,masteryMilestoneAnticipation} from '../src/core/progress-anticipation';
import {combatCompanionDef} from '../src/content/combat-companions';
import {companionUnlockRequirementMet} from '../src/core/combat-companions';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {createSaveBackup,parseSaveBackup} from '../src/core/save-transfer';
import {itemDef} from '../src/content/items';
let checks=0;const ok=(v:unknown,m:string)=>{checks++;if(!v)throw new Error(m);};const now=Date.UTC(2026,8,13);
let s=createCharacter(newGame(now),'WAYFINDER','Mastery Test');s=startCombat(s,'MOSS_RAT',now);
const claimed=claimActivity(s,now+60000);ok(monsterMastery(claimed.state,'MOSS_RAT').points===claimed.reward.kills,'one point per verified kill');ok(monsterMastery(claimActivity(claimed.state,now+60000).state,'MOSS_RAT').points===claimed.reward.kills,'no repeat points');
ok(enemyFamilyMastery(claimed.state,'BEAST').points===claimed.reward.kills,'each verified kill also advances the matching enemy family');
ok(enemyFamilyMastery(claimActivity(claimed.state,now+60000).state,'BEAST').points===claimed.reward.kills,'reclaim cannot repeat family mastery points');
for(const rank of [0,1,4,5,10,15,20,25,29,30]){
 const threshold=monsterMasteryKillsForRank(rank),x=structuredClone(s);
 x.character!.monsterMasteryPoints={MOSS_RAT:threshold};
 const m=monsterMastery(x,'MOSS_RAT'),expected=masteryRewardBonuses(rank);
 ok(m.rank===rank&&Math.abs(m.damageBonus-expected.damageBonus)<1e-12&&Math.abs(m.materialBonus-expected.materialBonus)<1e-12,'species mastery rank and rewards at '+rank);
 if(rank>0){
  x.character!.monsterMasteryPoints={MOSS_RAT:threshold-1};
  ok(monsterMastery(x,'MOSS_RAT').rank===rank-1,'one kill short of species Rank '+rank);
 }
}
ok(MONSTER_MASTERY_MAX_KILLS===1500&&monsterMasteryKillsForRank(30)===1500,'species mastery caps at 1500 kills');
ok(monsterMasteryKillsForRank(1)===20&&monsterMasteryKillsForRank(5)===121&&monsterMasteryKillsForRank(10)===293&&monsterMasteryKillsForRank(15)===517&&monsterMasteryKillsForRank(20)===793,'species reward milestones use progressive kill thresholds');
for(let rank=1;rank<=30;rank++){
 const previous=monsterMasteryKillsForRank(rank-1),next=monsterMasteryKillsForRank(rank);
 ok(next>previous,'species ranks increase strictly');
 if(rank>=2)ok(next-previous>=previous-monsterMasteryKillsForRank(rank-2),'later species ranks do not become cheaper');
 const earned=masteryRewardBonuses(rank),earlier=masteryRewardBonuses(rank-1);
 ok(earned.damageBonus>=earlier.damageBonus&&earned.materialBonus>=earlier.materialBonus,'every gained species rank preserves or improves its bonuses');
}
ok(Math.abs(masteryRewardBonuses(30).damageBonus-.02)<1e-12&&Math.abs(masteryRewardBonuses(30).materialBonus-.05)<1e-12,'rank 30 retains controlled passive caps');
ok(MONSTER_MASTERY_MILESTONES.some(row=>row.rank===5&&row.label==='Hunter Instinct')&&MONSTER_MASTERY_MILESTONES.some(row=>row.rank===15&&row.label==='Material Expertise')&&MONSTER_MASTERY_MILESTONES.some(row=>row.rank===30&&row.label==='Perfect Study'),'Canonical mastery milestones must appear on the Mastery ladder');
const guidance4=(()=>{const x=structuredClone(s);x.character!.monsterMasteryPoints={MOSS_RAT:100};return monsterMasteryGuidance(x,'MOSS_RAT')})();ok(guidance4.rank===4&&guidance4.next?.rank===5&&guidance4.killsToNextMilestone===21,'Rank 4 guidance should point to Rank 5 combat milestone');const guidance10=(()=>{const x=structuredClone(s);x.character!.monsterMasteryPoints={MOSS_RAT:monsterMasteryKillsForRank(10)};return monsterMasteryGuidance(x,'MOSS_RAT')})();ok(guidance10.dropKnowledge&&nextMasteryMilestone(10)?.rank===15,'Rank 10 should reveal drop knowledge and point to Rank 15');
const completeGuidance=(()=>{const x=structuredClone(s);x.character!.monsterMasteryPoints={MOSS_RAT:1500};return monsterMasteryGuidance(x,'MOSS_RAT')})();ok(!completeGuidance.next&&completeGuidance.killsToNextMilestone===0,'Rank 30 mastery should complete the canonical milestone ladder');
ok(completeGuidance.currentRankTarget>0&&completeGuidance.currentRankProgress===completeGuidance.currentRankTarget,'Rank 30 species bar is fully filled, never zero-width');
// Every ordinary enemy belongs to exactly one family. Bosses cannot grant family progress.
const ordinary=MONSTERS.filter(m=>!m.boss);
const assigned=ENEMY_FAMILIES.flatMap(f=>f.monsterIds);
ok(ordinary.length===49&&assigned.length===ordinary.length&&new Set(assigned).size===assigned.length,'all 49 ordinary monsters have exactly one unique enemy type');
ok(ordinary.every(m=>!!enemyFamilyForMonster(m.id))&&assigned.every(id=>ordinary.some(m=>m.id===id)),'type taxonomy fully covers catalogue without unknown IDs');
ok(enemyFamilyForMonster('FALLEN_KNIGHT')===undefined,'story bosses do not award normal family mastery');
ok(ENEMY_FAMILIES.find(f=>f.id==='ORC')?.monsterIds.length===0,'future Orc family exists but has no fabricated enemies');
ok(enemyFamilyForMonster('IRONWOOD_WOLF')?.id==='BEAST'&&enemyFamilyForMonster('OATHGLASS_REVENANT')?.id==='UNDEAD','distinct biological families map correctly');
ok(enemyFamilyForMonster('SAFFRON_MARAUDER')?.id==='HUMAN','human combatants are separately classified from undead');

for(const [points,rank] of [[2442,4],[2443,5],[7241,10],[14397,15],[50000,30]]){
 const x=structuredClone(s);
 x.character!.familyMasteryPoints={BEAST:points};
 const p=enemyFamilyMastery(x,'BEAST');
 const expected=masteryRewardBonuses(rank);
 ok(p.rank===rank&&Math.abs(p.damageBonus-expected.damageBonus)<1e-12&&Math.abs(p.materialBonus-expected.materialBonus)<1e-12,'family rank milestones '+rank);
}
ok(ENEMY_FAMILY_MASTERY_MILESTONES.length===6,'type mastery mirrors all six species milestone levels');
ok(MASTERY_ANTICIPATION_MILESTONES.every(m=>m.points===monsterMasteryKillsForRank(m.rank)),'combat previews use the same 1500-kill species milestones');
ok(masteryMilestoneAnticipation(monsterMasteryKillsForRank(5)-1)?.remaining===1,'encounter hint anticipates the correct species milestone boundary');
ok(monsterMasteryRankFromKills(750)<30&&monsterMasteryRankFromKills(1500)===30,'legacy 750 kills retain progress but are not reinterpreted as 1500');
ok(normalizeMonsterMastery({MOSS_RAT:1500,IRONWOOD_WOLF:2000}).MOSS_RAT===1500&&normalizeMonsterMastery({IRONWOOD_WOLF:2000}).IRONWOOD_WOLF===1500,'species normalization accepts 1500 earned kills and clamps excess');
ok(FAMILY_MASTERY_MAX_POINTS===50000&&familyMasteryPointsForRank(30)===50000,'maximum family mastery requires exactly 50000 points');
const completedFamily=structuredClone(s);
completedFamily.character!.familyMasteryPoints={BEAST:50000};
const familyComplete=enemyFamilyMasteryGuidance(completedFamily,'BEAST');
ok(familyComplete.currentRankTarget>0&&familyComplete.currentRankProgress===familyComplete.currentRankTarget&&familyComplete.pointsToNextRank===0,'Rank 30 family bar is filled without division by zero');
for(const rank of [1,5,10,15,20,25,29,30]){
 const threshold=familyMasteryPointsForRank(rank);
 const exactly=structuredClone(s);
 exactly.character!.familyMasteryPoints={BEAST:threshold};
 ok(enemyFamilyMastery(exactly,'BEAST').rank===rank,'family exact threshold reaches Rank '+rank);
 exactly.character!.familyMasteryPoints={BEAST:threshold-1};
 ok(enemyFamilyMastery(exactly,'BEAST').rank===rank-1,'family one point short stays at previous rank '+rank);
}
for(let rank=1;rank<=30;rank++){
 const a=masteryRewardBonuses(rank-1),b=masteryRewardBonuses(rank);
 ok(b.damageBonus>=a.damageBonus&&b.materialBonus>=a.materialBonus,'family and species reward curve grows without regressions');
}
ok(familyMasteryPointsForRank(1)===300&&familyMasteryPointsForRank(5)===2443&&familyMasteryPointsForRank(10)===7241,'early family ranks use progressively higher requirements');
for(let rank=1;rank<=30;rank++)ok(familyMasteryPointsForRank(rank)>familyMasteryPointsForRank(rank-1),'every successive rank threshold increases');
for(let rank=2;rank<=30;rank++)ok(
 familyMasteryPointsForRank(rank)-familyMasteryPointsForRank(rank-1)>=familyMasteryPointsForRank(rank-1)-familyMasteryPointsForRank(rank-2),
 'later family ranks never become cheaper'
);
// Verify exact thresholds at milestone and last-rank boundaries; avoid silent cap drift.
for(const rank of [1,5,10,15,20,25,29,30]){
 const boundary=structuredClone(s);
 boundary.character!.familyMasteryPoints={BEAST:familyMasteryPointsForRank(rank)};
 ok(enemyFamilyMastery(boundary,'BEAST').rank===rank,'exact threshold unlocks Rank '+rank);
 if(rank>0){
  boundary.character!.familyMasteryPoints={BEAST:familyMasteryPointsForRank(rank)-1};
  ok(enemyFamilyMastery(boundary,'BEAST').rank===rank-1,'one point below threshold keeps previous rank '+rank);
 }
}
const rankFour=structuredClone(s);
rankFour.character!.familyMasteryPoints={BEAST:familyMasteryPointsForRank(4)+25};
const familyGuide=enemyFamilyMasteryGuidance(rankFour,'BEAST');
ok(familyGuide.rank===4&&familyGuide.currentRankProgress===25&&familyGuide.pointsToNextRank===familyMasteryPointsForRank(5)-familyMasteryPointsForRank(4)-25,'progress bar follows rising per-rank thresholds');
ok(familyGuide.next?.rank===5&&familyGuide.pointsToNextMilestone===familyGuide.pointsToNextRank,'milestone requirements use the same rank curve');
const masteryValueSamples=[
 ['MOSS_RAT',1],['IRONWOOD_WOLF',1],['GLOAM_MITE',2],
 ['FALLEN_SENTINEL',2],['SUNSCAR_SCORPION',3],['ROYAL_SANDGUARD',3],
 ['FROSTWOLF',4],['BELLWRAITH',4],['ASHEN_REVENANT',6],
 ['FALLEN_KNIGHT',0],['UNKNOWN_MONSTER',0],
] as const;
for(const [id,points] of masteryValueSamples){
 ok(enemyFamilyMasteryPointsPerKill(id)===points,'weighted enemy type points by real monster region and level: '+id);
}
ok(ordinary.every(m=>enemyFamilyMasteryPointsPerKill(m.id)>=1&&enemyFamilyMasteryPointsPerKill(m.id)<=6),'each ordinary monster grants from one to six type points');
const sunscarMaster=recordMonsterMastery(s,'SUNSCAR_SCORPION',10);
ok(enemyFamilyMastery(sunscarMaster,'VERMIN').points===30,'ten Sunscar kills grant three points each');
const frostMaster=recordMonsterMastery(s,'FROSTWOLF',10);
ok(enemyFamilyMastery(frostMaster,'BEAST').points===40,'Frostmarch earns four points per kill');
const ashMaster=recordMonsterMastery(s,'ASHEN_REVENANT',10);
ok(enemyFamilyMastery(ashMaster,'UNDEAD').points===60,'Ashlands earns six points per kill');
const wolfAndRat=recordMonsterMastery(recordMonsterMastery(s,'MOSS_RAT',600),'IRONWOOD_WOLF',500);
ok(enemyFamilyMastery(wolfAndRat,'BEAST').points===1100,'different species contribute to the same family');
ok(monsterMastery(wolfAndRat,'MOSS_RAT').points===600&&monsterMastery(wolfAndRat,'IRONWOOD_WOLF').points===500,'species tracks remain separate');
const postSpeciesCap=recordMonsterMastery(recordMonsterMastery(s,'MOSS_RAT',1000),'MOSS_RAT',1000);
ok(monsterMastery(postSpeciesCap,'MOSS_RAT').points===1500&&enemyFamilyMastery(postSpeciesCap,'BEAST').points===2000,'family progress continues after species Rank 30');
const excluded=recordEnemyFamilyMastery(s,'FALLEN_KNIGHT',1500);
ok(!excluded.character?.familyMasteryPoints,'boss kill bypasses family mastery');
const backfill=backfillEnemyFamilyMastery({MOSS_RAT:750,IRONWOOD_WOLF:750,FIELD_WISP:125,FALLEN_KNIGHT:9999});
ok(backfill.BEAST===1500&&backfill.ELEMENTAL===125&&!('UNDEAD' in backfill),'legacy species progress backfills the right families once');
ok(Object.keys(normalizeEnemyFamilyMastery({UNKNOWN:25,BEAST:Infinity,HUMAN:10200,UNDEAD:-1})).join(',')==='HUMAN','family progress normalization rejects fake/invalid counters');
ok(normalizeEnemyFamilyMastery({HUMAN:80000}).HUMAN===50000,'family progress is capped at 50000');
const stacked=structuredClone(s);stacked.character!.monsterMasteryPoints={MOSS_RAT:1500};stacked.character!.familyMasteryPoints={BEAST:50000};
const bonus=monsterMasteryCombatBonuses(stacked,'MOSS_RAT');
ok(Math.abs(bonus.damageMultiplier-1.02*1.02)<1e-12&&Math.abs(bonus.materialBonus-.10)<1e-12,'species and family bonuses stack multiplicatively for damage and additively for materials');
ok(monsterMasteryCombatBonuses(stacked,'FIELD_WISP').damageMultiplier===1&&monsterMasteryCombatBonuses(stacked,'FALLEN_KNIGHT').damageMultiplier===1,'family effects apply only against a qualifying family');
const master=recordMonsterMastery(s,'MOSS_RAT',10000);ok(monsterMastery(master,'MOSS_RAT').points===1500,'species kill cap');ok(monsterMastery(master,'FIELD_WISP').damageBonus===0&&monsterMastery(master,'FALLEN_KNIGHT').damageBonus===0,'species only, excludes boss');
// Early regions now resolve real landed strikes instead of dividing an authored
// timer, so mastery damage reaches the hunt through huntBasePlayerHit. A +2% bonus
// is too small to remove a whole strike from an early hunt, so the shown cycle can
// legitimately stay flat; what must hold is that mastery never slows the hunt and
// that a maxed rank still grants its damage bonus.
ok(activityCycleSeconds(master)<=activityCycleSeconds(s),'dashboard must never slow the hunt cycle as mastery grows');
ok(monsterMastery(master,'MOSS_RAT').damageBonus>0,'maxed mastery must still grant a damage bonus the hunt can use');
const sampleAtKills=(game:typeof s,target:number)=>{
 let left=now,right=now+4*3600*1000;
 for(let i=0;i<30&&right-left>1000;i++){
  const mid=left+Math.floor((right-left)/2000)*1000;
  if(previewActivityReward(game,mid).kills>=target)right=mid;else left=mid;
 }
 return previewActivityReward(game,right);
};
const speciesOnly=structuredClone(s);
speciesOnly.character!.monsterMasteryPoints={MOSS_RAT:1500};
speciesOnly.character!.familyMasteryPoints={};
const before=sampleAtKills(s,20),after=sampleAtKills(speciesOnly,20);
ok(before.kills===20&&after.kills===20,'compare identical verified kill counts, not fixed-time random encounters');const material=before.items.find(i=>i.itemId==='MOSS_FIBER')!;ok(after.items.find(i=>i.itemId==='MOSS_FIBER')!.quantity===material.quantity+Math.floor(material.quantity*.05),'5% actual normal material yield');
const combinedRewards=sampleAtKills(stacked,20);
ok(combinedRewards.items.find(i=>i.itemId==='MOSS_FIBER')!.quantity===material.quantity+Math.floor(material.quantity*.10),'both masteries grant 10% real normal material yield without double rounding');
ok(before.items.every(item=>itemDef(item.itemId).type!=='gear')&&after.items.every(item=>itemDef(item.itemId).type!=='gear'),'Normal monster rewards should feed crafting rather than drop legacy finished gear');
let forest=createCharacter(newGame(now),'WAYFINDER','Forest Test');forest.character!.level=25;forest.character!.hp=10000;forest.character!.currentHp=10000;forest.character!.monsterMasteryPoints={FOREST_TROLL:monsterMasteryKillsForRank(20)-1};forest.currentRegionId='IRONWOOD';forest.unlockedMonsterIds.push('FOREST_TROLL');forest=startCombat(forest,'FOREST_TROLL',now);forest=claimActivity(forest,now+600000).state;
ok(forest.account.unlockedCombatCompanionIds?.includes('UNIT_004'),'real Forest Troll combat unlocks Briarhorn Cub');
const saved=parseSaveBackup(createSaveBackup(forest));ok(monsterMastery(saved,'FOREST_TROLL').points===monsterMastery(forest,'FOREST_TROLL').points,'save keeps mastery');
ok(enemyFamilyMastery(saved,'GIANT').points===enemyFamilyMastery(forest,'GIANT').points,'save keeps independent family progression');
const legacy=structuredClone(forest);
delete legacy.character!.familyMasteryPoints;
const restored=parseSaveBackup(createSaveBackup(legacy));
ok(enemyFamilyMastery(restored,'GIANT').points===monsterMastery(restored,'FOREST_TROLL').points,'older character saves backfill credited species kills');
const savedAgain=parseSaveBackup(createSaveBackup(saved));
ok(enemyFamilyMastery(savedAgain,'GIANT').points===enemyFamilyMastery(saved,'GIANT').points,'subsequent saves do not reapply family backfill');
const backfillWeighted=backfillEnemyFamilyMastery({SUNSCAR_SCORPION:100,FROSTWOLF:100,ASHEN_REVENANT:100});
ok(backfillWeighted.VERMIN===300&&backfillWeighted.BEAST===400&&backfillWeighted.UNDEAD===600,'historical kills receive the same region/level weights as new kills');
const newerBackfill=backfillEnemyFamilyMastery({MOSS_RAT:1500,IRONWOOD_WOLF:1500});
ok(newerBackfill.BEAST===3000,'new 1500-kill species saves are fully credited during the one-time family migration');
const cub=combatCompanionDef('UNIT_004')!;
const cubMasteryRequirement=cub.unlockRequirements.find(row=>row.type==='monster_mastery')!;
const unreached=structuredClone(s);
unreached.character!.monsterMasteryPoints={FOREST_TROLL:monsterMasteryKillsForRank(20)-1};
unreached.account.companionUnlockProgress={...unreached.account.companionUnlockProgress,FOREST_TROLL:0};
ok(!companionUnlockRequirementMet(unreached,cubMasteryRequirement),'new companion Rank 20 uses the progressive species threshold');
unreached.character!.monsterMasteryPoints={FOREST_TROLL:monsterMasteryKillsForRank(20)};
ok(companionUnlockRequirementMet(unreached,cubMasteryRequirement),'companion unlock becomes eligible at exact new Rank 20');
const historical=structuredClone(s);
historical.character!.monsterMasteryPoints={FOREST_TROLL:500};
historical.account.companionUnlockProgress={...historical.account.companionUnlockProgress,FOREST_TROLL:20,ASTERFALL_MASTERY_20_ALL:3};
ok(companionUnlockRequirementMet(historical,cubMasteryRequirement),'already earned pre-rebalance companion entitlement remains valid');
const retained=recordMonsterMastery(historical,'FOREST_TROLL',1);
ok(retained.account.companionUnlockProgress?.FOREST_TROLL===20&&retained.account.companionUnlockProgress?.ASTERFALL_MASTERY_20_ALL===3,'new combat never rolls back older account mastery entitlements');
ok(Object.keys(normalizeMonsterMastery({FALLEN_KNIGHT:750,MOSS_RAT:NaN,fake:99})).length===0,'invalid and boss points rejected');
let rejected=false;try{validateGameCommand({type:'mastery',args:{rank:30}});}catch{rejected=true;}ok(rejected,'no client rank grants');
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const screen=fs.readFileSync('src/screens/CombatScreen.tsx','utf8');
const familyUi=fs.readFileSync('src/components/EnemyFamilyMasteryPanel.tsx','utf8');
ok(screen.includes('<EnemyFamilyMasteryPanel state={state}/>')&&familyUi.includes('ENEMY_FAMILY_MASTERY_MILESTONES'),'type mastery appears next to species mastery');
ok(familyUi.includes('m.dropKnowledge')&&familyUi.includes('m.badgeUnlocked'),'family knowledge and cosmetic milestone are visible');
ok(familyUi.includes('m.currentRankProgress')&&familyUi.includes('m.currentRankTarget'),'family progress bar tracks the variable rank threshold');
ok(familyUi.includes('m.pointsToNextRank')&&!familyUi.includes('kills to next rank'),'family progress labels count earned points rather than incorrectly estimating kills');
ok(familyUi.includes('enemyFamilyMasteryPointsPerKill')&&familyUi.includes('expandedFamilyId'),'family summary displays real per-monster point scaling and compact expandable details');

const speciesUi=fs.readFileSync('src/components/MonsterMasteryPanel.tsx','utf8');
ok(speciesUi.includes('p.dropKnowledge||familyKnowledge'),'family Rank 10 knowledge unlocks drop tables in the species panel too');
ok(speciesUi.includes('p.currentRankProgress')&&speciesUi.includes('p.currentRankTarget'),'species progress uses nonlinear 1500-kill rank bands');
ok(speciesUi.includes('expandedSpeciesId')&&speciesUi.includes('percent(p.damageBonus)'),'species UI stays compact and shows fractional rank-to-rank bonuses');
ok(familyUi.includes('percent(m.damageBonus)')&&familyUi.includes('percent(m.materialBonus)'),'family UI shows accurate fractional rewards rather than misleading whole-number rounding');
console.log(`PASS monster and enemy-family mastery: ${checks} checks`);

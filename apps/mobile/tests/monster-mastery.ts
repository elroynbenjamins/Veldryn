import {createCharacter,newGame,startCombat,claimActivity,previewActivityReward} from '../src/core/game';
import {monsterMastery,recordMonsterMastery,normalizeMonsterMastery,monsterMasteryCombatBonuses} from '../src/core/monster-mastery';
import {ENEMY_FAMILIES,enemyFamilyForMonster} from '../src/content/enemy-families';
import {MONSTERS} from '../src/content/monsters';
import {enemyFamilyMastery,normalizeEnemyFamilyMastery,backfillEnemyFamilyMastery,ENEMY_FAMILY_MASTERY_MILESTONES,recordEnemyFamilyMastery} from '../src/core/enemy-family-mastery';
import {MONSTER_MASTERY_MILESTONES,monsterMasteryGuidance,nextMasteryMilestone} from '../src/core/monster-mastery-presentation';
import {activityCycleSeconds} from '../src/core/dashboard';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {createSaveBackup,parseSaveBackup} from '../src/core/save-transfer';
import {itemDef} from '../src/content/items';
let checks=0;const ok=(v:unknown,m:string)=>{checks++;if(!v)throw new Error(m);};const now=Date.UTC(2026,8,13);
let s=createCharacter(newGame(now),'WAYFINDER','Mastery Test');s=startCombat(s,'MOSS_RAT',now);
const claimed=claimActivity(s,now+60000);ok(monsterMastery(claimed.state,'MOSS_RAT').points===claimed.reward.kills,'one point per verified kill');ok(monsterMastery(claimActivity(claimed.state,now+60000).state,'MOSS_RAT').points===claimed.reward.kills,'no repeat points');
ok(enemyFamilyMastery(claimed.state,'BEAST').points===claimed.reward.kills,'each verified kill also advances the matching enemy family');
ok(enemyFamilyMastery(claimActivity(claimed.state,now+60000).state,'BEAST').points===claimed.reward.kills,'reclaim cannot repeat family mastery points');
for(const [points,rank,damage,yieldBonus] of [[124,4,0,0],[125,5,.01,0],[250,10,.01,0],[375,15,.01,.03],[750,30,.02,.05]]){const x=structuredClone(s);x.character!.monsterMasteryPoints={MOSS_RAT:points};const m=monsterMastery(x,'MOSS_RAT');ok(m.rank===rank&&m.damageBonus===damage&&m.materialBonus===yieldBonus,'rank bonuses '+rank);}
ok(MONSTER_MASTERY_MILESTONES.some(row=>row.rank===5&&row.label==='Hunter Instinct')&&MONSTER_MASTERY_MILESTONES.some(row=>row.rank===15&&row.label==='Material Expertise')&&MONSTER_MASTERY_MILESTONES.some(row=>row.rank===30&&row.label==='Perfect Study'),'Canonical mastery milestones must appear on the Mastery ladder');
const guidance4=(()=>{const x=structuredClone(s);x.character!.monsterMasteryPoints={MOSS_RAT:100};return monsterMasteryGuidance(x,'MOSS_RAT')})();ok(guidance4.rank===4&&guidance4.next?.rank===5&&guidance4.killsToNextMilestone===25,'Rank 4 guidance should point to Rank 5 combat milestone');const guidance10=(()=>{const x=structuredClone(s);x.character!.monsterMasteryPoints={MOSS_RAT:250};return monsterMasteryGuidance(x,'MOSS_RAT')})();ok(guidance10.dropKnowledge&&nextMasteryMilestone(10)?.rank===15,'Rank 10 should reveal drop knowledge and point to Rank 15');
const completeGuidance=(()=>{const x=structuredClone(s);x.character!.monsterMasteryPoints={MOSS_RAT:750};return monsterMasteryGuidance(x,'MOSS_RAT')})();ok(!completeGuidance.next&&completeGuidance.killsToNextMilestone===0,'Rank 30 mastery should complete the canonical milestone ladder');
// Every ordinary enemy belongs to exactly one family. Bosses cannot grant family progress.
const ordinary=MONSTERS.filter(m=>!m.boss);
const assigned=ENEMY_FAMILIES.flatMap(f=>f.monsterIds);
ok(ordinary.length===41&&assigned.length===ordinary.length&&new Set(assigned).size===assigned.length,'all 41 ordinary monsters have one unique enemy type');
ok(ordinary.every(m=>!!enemyFamilyForMonster(m.id))&&assigned.every(id=>ordinary.some(m=>m.id===id)),'type taxonomy fully covers catalogue without unknown IDs');
ok(enemyFamilyForMonster('FALLEN_KNIGHT')===undefined,'story bosses do not award normal family mastery');
ok(ENEMY_FAMILIES.find(f=>f.id==='ORC')?.monsterIds.length===0,'future Orc family exists but has no fabricated enemies');
ok(enemyFamilyForMonster('IRONWOOD_WOLF')?.id==='BEAST'&&enemyFamilyForMonster('OATHGLASS_REVENANT')?.id==='UNDEAD','distinct biological families map correctly');
ok(enemyFamilyForMonster('SAFFRON_MARAUDER')?.id==='HUMAN','human combatants are separately classified from undead');

for(const [points,rank,damage,yieldBonus] of [[499,4,0,0],[500,5,.01,0],[1000,10,.01,0],[1500,15,.01,.03],[3000,30,.02,.05]]){
 const x=structuredClone(s);
 x.character!.familyMasteryPoints={BEAST:points};
 const p=enemyFamilyMastery(x,'BEAST');
 ok(p.rank===rank&&p.damageBonus===damage&&p.materialBonus===yieldBonus,'family rank milestones '+rank);
}
ok(ENEMY_FAMILY_MASTERY_MILESTONES.length===6,'type mastery mirrors all six species milestone levels');
const wolfAndRat=recordMonsterMastery(recordMonsterMastery(s,'MOSS_RAT',600),'IRONWOOD_WOLF',500);
ok(enemyFamilyMastery(wolfAndRat,'BEAST').points===1100,'different species contribute to the same family');
ok(monsterMastery(wolfAndRat,'MOSS_RAT').points===600&&monsterMastery(wolfAndRat,'IRONWOOD_WOLF').points===500,'species tracks remain separate');
const postSpeciesCap=recordMonsterMastery(recordMonsterMastery(s,'MOSS_RAT',1000),'MOSS_RAT',1000);
ok(monsterMastery(postSpeciesCap,'MOSS_RAT').points===750&&enemyFamilyMastery(postSpeciesCap,'BEAST').points===2000,'family progress continues after species Rank 30');
const excluded=recordEnemyFamilyMastery(s,'FALLEN_KNIGHT',1500);
ok(!excluded.character?.familyMasteryPoints,'boss kill bypasses family mastery');
const backfill=backfillEnemyFamilyMastery({MOSS_RAT:750,IRONWOOD_WOLF:750,FIELD_WISP:125,FALLEN_KNIGHT:9999});
ok(backfill.BEAST===1500&&backfill.ELEMENTAL===125&&!('UNDEAD' in backfill),'legacy species progress backfills the right families once');
ok(Object.keys(normalizeEnemyFamilyMastery({UNKNOWN:25,BEAST:Infinity,HUMAN:4200,UNDEAD:-1})).join(',')==='HUMAN','family progress normalization rejects fake/invalid counters');
ok(normalizeEnemyFamilyMastery({HUMAN:4200}).HUMAN===3000,'family progress is capped at 3000');
const stacked=structuredClone(s);stacked.character!.monsterMasteryPoints={MOSS_RAT:750};stacked.character!.familyMasteryPoints={BEAST:3000};
const bonus=monsterMasteryCombatBonuses(stacked,'MOSS_RAT');
ok(Math.abs(bonus.damageMultiplier-1.02*1.02)<1e-12&&Math.abs(bonus.materialBonus-.10)<1e-12,'species and family bonuses stack multiplicatively for damage and additively for materials');
ok(monsterMasteryCombatBonuses(stacked,'FIELD_WISP').damageMultiplier===1&&monsterMasteryCombatBonuses(stacked,'FALLEN_KNIGHT').damageMultiplier===1,'family effects apply only against a qualifying family');
const master=recordMonsterMastery(s,'MOSS_RAT',10000);ok(monsterMastery(master,'MOSS_RAT').points===750,'points cap');ok(monsterMastery(master,'FIELD_WISP').damageBonus===0&&monsterMastery(master,'FALLEN_KNIGHT').damageBonus===0,'species only, excludes boss');
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
const before=sampleAtKills(s,20),after=sampleAtKills(master,20);
ok(before.kills===20&&after.kills===20,'compare identical verified kill counts, not fixed-time random encounters');const material=before.items.find(i=>i.itemId==='MOSS_FIBER')!;ok(after.items.find(i=>i.itemId==='MOSS_FIBER')!.quantity===material.quantity+Math.floor(material.quantity*.05),'5% actual normal material yield');
const combinedRewards=sampleAtKills(stacked,20);
ok(combinedRewards.items.find(i=>i.itemId==='MOSS_FIBER')!.quantity===material.quantity+Math.floor(material.quantity*.10),'both masteries grant 10% real normal material yield without double rounding');
ok(before.items.every(item=>itemDef(item.itemId).type!=='gear')&&after.items.every(item=>itemDef(item.itemId).type!=='gear'),'Normal monster rewards should feed crafting rather than drop legacy finished gear');
let forest=createCharacter(newGame(now),'WAYFINDER','Forest Test');forest.character!.level=25;forest.character!.hp=10000;forest.character!.currentHp=10000;forest.character!.monsterMasteryPoints={FOREST_TROLL:499};forest.currentRegionId='IRONWOOD';forest.unlockedMonsterIds.push('FOREST_TROLL');forest=startCombat(forest,'FOREST_TROLL',now);forest=claimActivity(forest,now+600000).state;
ok(forest.account.unlockedCombatCompanionIds?.includes('UNIT_004'),'real Forest Troll combat unlocks Briarhorn Cub');
const saved=parseSaveBackup(createSaveBackup(forest));ok(monsterMastery(saved,'FOREST_TROLL').points===monsterMastery(forest,'FOREST_TROLL').points,'save keeps mastery');
ok(enemyFamilyMastery(saved,'GIANT').points===enemyFamilyMastery(forest,'GIANT').points,'save keeps independent family progression');
const legacy=structuredClone(forest);
delete legacy.character!.familyMasteryPoints;
const restored=parseSaveBackup(createSaveBackup(legacy));
ok(enemyFamilyMastery(restored,'GIANT').points===monsterMastery(restored,'FOREST_TROLL').points,'older character saves backfill credited species kills');
const savedAgain=parseSaveBackup(createSaveBackup(saved));
ok(enemyFamilyMastery(savedAgain,'GIANT').points===enemyFamilyMastery(saved,'GIANT').points,'subsequent saves do not reapply family backfill');
ok(Object.keys(normalizeMonsterMastery({FALLEN_KNIGHT:750,MOSS_RAT:NaN,fake:99})).length===0,'invalid and boss points rejected');
let rejected=false;try{validateGameCommand({type:'mastery',args:{rank:30}});}catch{rejected=true;}ok(rejected,'no client rank grants');
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const screen=fs.readFileSync('src/screens/CombatScreen.tsx','utf8');
const familyUi=fs.readFileSync('src/components/EnemyFamilyMasteryPanel.tsx','utf8');
ok(screen.includes('<EnemyFamilyMasteryPanel state={state}/>')&&familyUi.includes('ENEMY_FAMILY_MASTERY_MILESTONES'),'type mastery appears next to species mastery');
ok(familyUi.includes('m.dropKnowledge')&&familyUi.includes('m.badgeUnlocked'),'family knowledge and cosmetic milestone are visible');
console.log(`PASS monster and enemy-family mastery: ${checks} checks`);

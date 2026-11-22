import {assert} from './test-assert';
import {regionalHuntPlan,usesDamageDrivenHunts} from '../src/core/ordinary-hunt';
import {regionalHuntHits,huntEnemyHpAt,huntHitsBetween} from '../src/core/combat-hit-timeline';
import {combatTimeline} from '../src/core/combat-timing';
import {activityCycleSeconds,activityRate} from '../src/core/dashboard';
import {activeCombatHitProjection,activeCombatRuntimeProjection,combatSustainProjection,createCharacter,newGame,previewActivityReward,startCombat} from '../src/core/game';

const base={
  zone:'Greenfields',monsterHp:30,playerHit:14,hitChance:.99,
  critChance:0,critMultiplier:1.5,haste:0,tempo:1,
  enemyHaste:0,environmentTimeMultiplier:1,seed:'regional-one-shot',
};
const novice=regionalHuntPlan(base);
const upgraded=regionalHuntPlan({...base,playerHit:200});
assert.equal(regionalHuntPlan(base).cycleSeconds,novice.cycleSeconds,'seeded hunts must replay deterministically');
assert.ok(upgraded.fightSeconds<novice.fightSeconds,'Attack should kill a weak enemy in fewer real strikes');
assert.equal(upgraded.strikes.filter(hit=>hit.actor==='player'&&hit.damage>0).length,1,'overgeared character must one-shot a Moss Rat');
assert.ok(upgraded.searchSeconds>=3&&upgraded.searchSeconds<=6,'Greenfields search is a bounded anti-farming delay, reduced by 2 seconds');
assert.ok(upgraded.cycleSeconds>upgraded.fightSeconds,'search must remain even after a one-shot');
assert.ok(regionalHuntPlan({...base,playerHit:200,haste:1}).fightSeconds<upgraded.fightSeconds,'Haste increases attacks per second');
// Deterministic missed swings must be observable without adding damage,
// changing crit rolls, altering search/attack cadence, or triggering skills.
const missedSeed=Array.from({length:40},(_,i)=>'real-miss-'+i)
  .map(seed=>regionalHuntPlan({...base,seed,hitChance:.55,playerHit:200}))
  .find(plan=>plan.strikes.some(strike=>strike.missed));
assert.ok(missedSeed,'accuracy sampling should produce genuine misses');
const missedStrikes=missedSeed!.strikes.filter(strike=>strike.missed);
assert.ok(missedStrikes.length>0&&missedStrikes.every(strike=>strike.actor==='player'&&strike.damage===0&&!strike.critical),
  'misses must be real zero-damage, noncritical player swings');
assert.equal(missedSeed!.strikes.filter(strike=>strike.actor==='player').reduce((sum,strike)=>sum+strike.damage,0),30,
  'observing misses must not reduce or invent damage');
const reflected=regionalHuntHits(missedSeed!,{monsterDamage:1,fatigueDamage:.2,healingPerEncounter:0});
assert.equal(reflected.filter(hit=>hit.missed).length,missedStrikes.length,'every resolved miss reaches the shared hit replay');
assert.ok(reflected.filter(hit=>hit.missed).every(hit=>hit.damage===0&&hit.actor==='player'),
  'miss feedback must not spend enemy HP');
assert.equal(huntEnemyHpAt(30,reflected,1),0,'misses must not prevent the final landed blow from killing');
assert.equal(huntEnemyHpAt(30,reflected,missedStrikes[0].atSeconds/missedSeed!.cycleSeconds),30,
  'HP stays unchanged on an opening missed swing');
assert.ok(missedSeed!.cycleSeconds>missedSeed!.searchSeconds,'search and attack timing stay positive');

const incoming=regionalHuntHits(upgraded,{monsterDamage:0,fatigueDamage:1.25,healingPerEncounter:.5});
assert.equal(incoming.filter(hit=>hit.actor==='enemy').length,0,'one-shot enemy never attacks');
assert.ok(incoming.some(hit=>hit.actor==='fatigue'&&hit.damage>0),'one-shot fights still consume stamina');
assert.equal(huntEnemyHpAt(30,incoming,upgraded.searchSeconds/upgraded.cycleSeconds),30,'searching does not damage enemies');
assert.equal(huntEnemyHpAt(30,incoming,1),0,'actual final attack kills the monster');
assert.equal(huntHitsBetween(incoming,0,.5).length+huntHitsBetween(incoming,.5,1).length,incoming.length,'split settlement must preserve real hit events');
// Every ordinary-combat region has a two-second faster encounter search than the prior baseline.
const searchWindows=[
  ['Greenfields',3,6],['Silverbrook',3,6],['Ironwood Forest',4,7],
  ['Old Mines',5,8],["King's Road",5,8],['Sunscar',6,10],
  ['Frostmarch',7,11],['Ashlands',8,12],
] as const;
for(const [zone,min,max] of searchWindows){
  assert.ok(usesDamageDrivenHunts(zone),zone+' must use damage-driven hunts');
  for(const seed of ['encounter-a','encounter-b','encounter-c']){
    const plan=regionalHuntPlan({...base,zone,seed});
    assert.ok(plan.searchSeconds>=min&&plan.searchSeconds<=max,zone+' search should be '+min+'–'+max+' seconds');
    assert.ok(plan.cycleSeconds>plan.searchSeconds,zone+' should retain actual attack time after searching');
    const fastWeather=regionalHuntPlan({...base,zone,seed,environmentTimeMultiplier:.5});
    assert.ok(fastWeather.searchSeconds>0,zone+' searches must stay positive under fast weather');
  }
}

const T=1_700_000;
const weakBase=createCharacter(newGame(T),'WAYFINDER','Weak Hunter');
weakBase.character!.attack=12;weakBase.character!.equipment={};
const strongBase=structuredClone(weakBase);
strongBase.character!.attack+=400;
const weak=startCombat(weakBase,'MOSS_RAT',T);
const strong=startCombat(strongBase,'MOSS_RAT',T); // Representative overgeared Attack without relying on a specific item ID.
const weakRate=activeCombatRuntimeProjection(weak)!,strongRate=activeCombatRuntimeProjection(strong)!;
assert.ok(strongRate.killCycleSeconds<weakRate.killCycleSeconds,'higher Attack must shorten the actual encounter');
assert.ok(strongRate.killsPerHour>weakRate.killsPerHour,'stronger gear should improve farming up to the encounter-search ceiling');
assert.ok(strongRate.killCycleSeconds>3,'even a one-shot hunt must still search for a new encounter');
const sustain=combatSustainProjection(strong,'MOSS_RAT')!;
assert.ok(Math.abs(sustain.killCycleSeconds-strongRate.killCycleSeconds)<.000001,'HUD combat rate and food forecast must use the same average');
assert.ok(Math.abs(activityCycleSeconds(strong)-strongRate.killCycleSeconds)<.000001,'dashboard must no longer show the obsolete fixed combat timer');
const dashboard=activityRate(strong);
assert.equal(dashboard.actionsPerHour,Math.floor(strongRate.killsPerHour),'home kill rate must agree with live combat');
assert.equal(dashboard.xpPerHour,Math.floor(strongRate.xpPerHour),'home XP rate must agree with live combat');
assert.equal(dashboard.goldPerHour,Math.floor(strongRate.goldPerHour),'home gold rate must agree with live combat');
assert.ok(sustain.netDamagePerKill>0&&sustain.foodPerHour>0,'overgeared easy farming still needs cooked food over time');
const completed=previewActivityReward(strong,T+(Math.ceil(strongRate.killCycleSeconds)+2)*1000);
assert.equal(completed.kills,1,'a completed encounter pays exactly one kill');
const beforeKill=activeCombatHitProjection(strong,T+Math.floor(strongRate.killCycleSeconds*450))!;
assert.ok(beforeKill.searching,'the search phase must be visible before engaging');
assert.equal(beforeKill.enemyHp,beforeKill.enemyMaxHp,'no damage is taken by an unencountered monster');

// Deep presentation regression: the old monster's final hit must not
// become a ghost first hit of the next monster after the search phase.
let firstKillAt:number|undefined;
for(let at=T+250;at<=T+60000;at+=250){
  if(previewActivityReward(strong,at).kills>=1){firstKillAt=at;break;}
}
assert.ok(firstKillAt!==undefined,'strong hunter should defeat its first enemy');
const nextSearch=activeCombatHitProjection(strong,firstKillAt!)!;
assert.ok(nextSearch.searching,'first defeat enters the next search phase');
assert.equal(nextSearch.lastHit,undefined,'next encounter must not inherit the last enemy hit');
const resumedSearch=activeCombatHitProjection(strong,firstKillAt!+500,nextSearch.cursor)!;
assert.ok(resumedSearch.searching,'incremental replay remains in encounter search');
assert.equal(resumedSearch.lastHit,undefined,'incremental replay must not resurrect a previous encounter hit');

const options={startsAtMs:T,elapsedSeconds:110,progressFraction:0,preparationEncounters:0,cycleSeconds:10,preparedCycleSeconds:10,cycleSecondsForEncounter:(i:number)=>i%2?12:10};
const all=combatTimeline(options);
const first=combatTimeline({...options,elapsedSeconds:43});
const second=combatTimeline({...options,startsAtMs:T+43_000,elapsedSeconds:67,progressFraction:first.nextProgressFraction,cycleSecondsForEncounter:(i:number)=>options.cycleSecondsForEncounter(i+first.encounters.length)});
assert.equal(first.encounters.length+second.encounters.length,all.encounters.length,'variable-duration hunts stay identical across claims');
assert.ok(Math.abs(second.nextProgressFraction-all.nextProgressFraction)<1e-7,'partial cycles preserve fractional progress');
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const huntUi=fs.readFileSync('src/components/HuntingPreview.tsx','utf8');
const stageUi=fs.readFileSync('src/components/BattleStage.tsx','utf8');
assert.ok(huntUi.includes('fight.searching')&&huntUi.includes("!fight?.searching&&fight?.lastHit"),'hunting UI must hide unencountered enemy HP and stale hit effects');
assert.ok(stageUi.includes("!fight?.searching&&fight?.lastHit"),'live combat theater must hide leftover hits while searching');
console.log('PASS damage-based regional hunts, search-state polish, consistent HUD estimates, stamina food and split claims');

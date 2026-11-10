import {assert} from './test-assert';
import {regionalHuntPlan,usesDamageDrivenHunts} from '../src/core/ordinary-hunt';
import {regionalHuntHits,huntEnemyHpAt,huntHitsBetween} from '../src/core/combat-hit-timeline';
import {combatTimeline} from '../src/core/combat-timing';
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
assert.equal(upgraded.strikes.filter(hit=>hit.actor==='player').length,1,'overgeared character must one-shot a Moss Rat');
assert.ok(upgraded.searchSeconds>=5&&upgraded.searchSeconds<=8,'Greenfields search is a bounded anti-farming delay');
assert.ok(upgraded.cycleSeconds>upgraded.fightSeconds,'search must remain even after a one-shot');
assert.ok(regionalHuntPlan({...base,playerHit:200,haste:1}).fightSeconds<upgraded.fightSeconds,'Haste increases attacks per second');
const incoming=regionalHuntHits(upgraded,{monsterDamage:0,fatigueDamage:1.25,healingPerEncounter:.5});
assert.equal(incoming.filter(hit=>hit.actor==='enemy').length,0,'one-shot enemy never attacks');
assert.ok(incoming.some(hit=>hit.actor==='fatigue'&&hit.damage>0),'one-shot fights still consume stamina');
assert.equal(huntEnemyHpAt(30,incoming,upgraded.searchSeconds/upgraded.cycleSeconds),30,'searching does not damage enemies');
assert.equal(huntEnemyHpAt(30,incoming,1),0,'actual final attack kills the monster');
assert.equal(huntHitsBetween(incoming,0,.5).length+huntHitsBetween(incoming,.5,1).length,incoming.length,'split settlement must preserve real hit events');
for(const zone of ['Greenfields','Silverbrook','Ironwood Forest','Old Mines',"King's Road",'Sunscar'])assert.ok(usesDamageDrivenHunts(zone),zone+' must use damage-driven hunts');
for(const zone of ['Frostmarch','Ashlands'])assert.ok(!usesDamageDrivenHunts(zone),zone+' is intentionally unchanged');

const T=1_700_000;
const weak=startCombat(createCharacter(newGame(T),'WAYFINDER','Weak Hunter'),'MOSS_RAT',T);
const strong=startCombat(createCharacter(newGame(T),'WAYFINDER','Strong Hunter'),'MOSS_RAT',T);
strong.character!.attack+=400; // Representative overgeared Attack without relying on a specific item ID.
const weakRate=activeCombatRuntimeProjection(weak)!,strongRate=activeCombatRuntimeProjection(strong)!;
assert.ok(strongRate.killCycleSeconds<weakRate.killCycleSeconds,'higher Attack must shorten the actual encounter');
assert.ok(strongRate.killsPerHour>weakRate.killsPerHour,'stronger gear should improve farming up to the encounter-search ceiling');
assert.ok(strongRate.killCycleSeconds>5,'even a one-shot hunt must still search for a new encounter');
const sustain=combatSustainProjection(strong,'MOSS_RAT')!;
assert.ok(sustain.netDamagePerKill>0&&sustain.foodPerHour>0,'overgeared easy farming still needs cooked food over time');
const completed=previewActivityReward(strong,T+Math.ceil(strongRate.killCycleSeconds*1000)+100);
assert.equal(completed.kills,1,'a completed encounter pays exactly one kill');
const beforeKill=activeCombatHitProjection(strong,T+Math.floor(strongRate.killCycleSeconds*450))!;
assert.ok(beforeKill.searching,'the search phase must be visible before engaging');
assert.equal(beforeKill.enemyHp,beforeKill.enemyMaxHp,'no damage is taken by an unencountered monster');

const options={startsAtMs:T,elapsedSeconds:110,progressFraction:0,preparationEncounters:0,cycleSeconds:10,preparedCycleSeconds:10,cycleSecondsForEncounter:(i:number)=>i%2?12:10};
const all=combatTimeline(options);
const first=combatTimeline({...options,elapsedSeconds:43});
const second=combatTimeline({...options,startsAtMs:T+43_000,elapsedSeconds:67,progressFraction:first.nextProgressFraction,cycleSecondsForEncounter:(i:number)=>options.cycleSecondsForEncounter(i+first.encounters.length)});
assert.equal(first.encounters.length+second.encounters.length,all.encounters.length,'variable-duration hunts stay identical across claims');
assert.ok(Math.abs(second.nextProgressFraction-all.nextProgressFraction)<1e-7,'partial cycles preserve fractional progress');
console.log('PASS damage-based launch hunts, search delay, stamina food, later-region exclusion and split claims');

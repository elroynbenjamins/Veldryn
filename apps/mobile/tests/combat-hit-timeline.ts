import {assert} from './test-assert';
import {huntHitEvents,huntHitsBetween,huntEnemyHpAt} from '../src/core/combat-hit-timeline';
import {activeCombatHitProjection,activeCombatRuntimeProjection,claimActivity,createCharacter,effectiveStats,newGame,previewActivityReward,startCombat} from '../src/core/game';

const events=huntHitEvents({monsterHp:1100,basePlayerHit:240,incomingDamage:52,healingPerEncounter:10,cycleSeconds:12,critChance:.25,seed:'replay-stable'});
const again=huntHitEvents({monsterHp:1100,basePlayerHit:240,incomingDamage:52,healingPerEncounter:10,cycleSeconds:12,critChance:.25,seed:'replay-stable'});
assert.equal(JSON.stringify(events),JSON.stringify(again),'hit events must replay deterministically');
assert.equal(huntEnemyHpAt(1100,events,0),1100);
assert.equal(huntEnemyHpAt(1100,events,1),0,'only attack events remove the full enemy HP');
const atThird=huntEnemyHpAt(1100,events,.34);
assert.ok(atThird>0&&atThird<1100,'actual hits, not smooth timer progress, determine HP');
const early=huntHitsBetween(events,0,.5),late=huntHitsBetween(events,.5,1);
assert.equal(early.length+late.length,events.length,'a split settlement must consume each hit once');
assert.ok(events.some(event=>event.actor==='enemy'&&event.damage>0),'enemy attacks must have actual damage');

const T=1_600_000;
const state=startCombat(createCharacter(newGame(T),'WAYFINDER','Real Hits'),'MOSS_RAT',T);
const cycle=activeCombatRuntimeProjection(state)!.killCycleSeconds;
const partialAt=T+Math.max(1,Math.floor(cycle*350));
const partial=activeCombatHitProjection(state,partialAt)!;
const preview=previewActivityReward(state,partialAt);
assert.equal(preview.kills,0,'real partial hits must not grant unearned kill rewards');
assert.ok(partial.enemyHp>0&&partial.enemyHp<partial.enemyMaxHp,'enemy must lose HP before timer completion');
assert.ok(partial.playerHp<effectiveStats(state).hp,'enemy must damage player before kill completion');
assert.equal(preview.endHp,partial.playerHp,'preview and combat display must use identical damage');
assert.equal(preview.nextCombatEnemyHp,partial.enemyHp,'displayed enemy HP must be a settled state value');

const first=claimActivity(state,partialAt);
assert.equal(first.state.character!.currentHp,partial.playerHp,'partial hits must persist real HP');
assert.equal(first.state.activity?.combatEnemyHp,partial.enemyHp,'partial enemy HP must persist on activity');
const finishAt=T+Math.ceil(cycle*1000)+100;
const unsplit=claimActivity(state,finishAt);
const second=claimActivity(first.state,finishAt);
assert.equal(first.reward.kills+second.reward.kills,unsplit.reward.kills,'split claims must not duplicate or miss kills');
assert.ok(Math.abs(second.state.character!.currentHp-unsplit.state.character!.currentHp)<.0001,'split claims must not duplicate enemy damage');
assert.ok(Math.abs((second.state.activity?.combatEnemyHp??0)-(unsplit.state.activity?.combatEnemyHp??0))<.0001,'enemy HP must not reset or double-deduct after claim');
assert.equal(first.reward.xp+second.reward.xp,unsplit.reward.xp,'split claims must not change base XP payouts');
assert.equal(first.reward.gold+second.reward.gold,unsplit.reward.gold,'split claims must not change base gold payouts');
console.log('PASS real hunt hits, partial HP persistence, deterministic replay, and split-claim parity');

import {assert} from './test-assert';
import {huntHitEvents,huntHitsBetween,huntEnemyHpAt} from '../src/core/combat-hit-timeline';
import {activeCombatHitProjection,activeCombatRuntimeProjection,claimActivity,createCharacter,effectiveStats,newGame,previewActivityReward,startCombat} from '../src/core/game';
import type {ActiveCombatHitCursor} from '../src/core/game';

const events=huntHitEvents({monsterHp:1100,basePlayerHit:240,incomingDamage:52,healingPerEncounter:10,cycleSeconds:12,critChance:.25,seed:'replay-stable'});
const again=huntHitEvents({monsterHp:1100,basePlayerHit:240,incomingDamage:52,healingPerEncounter:10,cycleSeconds:12,critChance:.25,seed:'replay-stable'});
assert.equal(JSON.stringify(events),JSON.stringify(again),'hit events must replay deterministically');
assert.equal(huntEnemyHpAt(1100,events,0),1100);
assert.equal(huntEnemyHpAt(1100,events,1),0,'only attack events remove the full enemy HP');
for(const tinyHp of [1,2]){
 const tiny=huntHitEvents({monsterHp:tinyHp,basePlayerHit:100,incomingDamage:1,healingPerEncounter:0,cycleSeconds:1,critChance:0,seed:'tiny'});
 const playerHits=tiny.filter(row=>row.actor==='player');
 assert.ok(playerHits.length<=tinyHp,'a low-HP monster cannot receive extra fake attacks');
 assert.ok(playerHits.every(row=>row.damage>0),'each blow must inflict positive damage');
 assert.equal(playerHits.reduce((total,row)=>total+row.damage,0),tinyHp,'the final strike must kill the monster');
}
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
// Foreground replay advances incrementally. It must remain identical to a
// full authoritative read-only projection across multi-cycle claims.
const liveState=structuredClone(state);
liveState.character!.preparation={itemId:'OATH_WARD_TONIC',remainingEncounters:3};
let cursor:ActiveCombatHitCursor|undefined;
const halfSecondSteps=Math.ceil(cycle*8);
for(let tick=0;tick<=halfSecondSteps;tick++){
 const at=T+tick*500;
 const direct=activeCombatHitProjection(liveState,at)!;
 const incremental=activeCombatHitProjection(liveState,at,cursor)!;
 assert.ok(Math.abs(direct.playerHp-incremental.playerHp)<1e-5,'incremental combat must keep exact HP parity');
 assert.ok(Math.abs(direct.enemyHp-incremental.enemyHp)<1e-5,'incremental combat must keep enemy HP parity');
 assert.equal(direct.stoppedReason,incremental.stoppedReason,'incremental combat stop must remain deterministic');
 assert.ok(Math.abs(direct.progressFraction-incremental.progressFraction)<1e-7,'incremental combat phase must stay synced');
 cursor=incremental.cursor;
}
assert.equal(liveState.character!.preparation!.remainingEncounters,3,'read-only live replay must not spend actual potion charges');
assert.equal(liveState.character!.currentHp,state.character!.currentHp,'read-only live replay must not mutate player HP');
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const homeStage=fs.readFileSync('src/components/BattleStage.tsx','utf8');
assert.ok(homeStage.includes('activeCombatHitProjection('),'Home encounter preview must use actual hunt events');
assert.ok(homeStage.includes('!motion.enabled||isLive'),'Home must not play cosmetic hits over live fight events');
assert.ok(homeStage.includes('current={fight?.enemyHp??'),'Home must display projected real enemy HP without rounding live damage');
const combatTab=fs.readFileSync('src/components/HuntingPreview.tsx','utf8');
assert.ok(combatTab.includes('activeCombatHitProjection('),'Combat tab must use real hit projection');
assert.ok(combatTab.includes('replayCursor.current'),'Combat tab must reuse incremental projections');
console.log('PASS real hunt hits, partial HP persistence, incremental replay, UI synchronization and split-claim parity');

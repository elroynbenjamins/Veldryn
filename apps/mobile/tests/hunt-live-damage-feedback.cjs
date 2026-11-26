'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=(name)=>fs.readFileSync(path.resolve(__dirname,'../src/components',name),'utf8');
const hunt=read('HuntingPreview.tsx');
const stage=read('BattleStage.tsx');

// The hit cursor retains the previous strike while searching for a new foe.
// A finished encounter must never trigger a phantom opening attack.
assert.ok(hunt.includes('const hit=lastHit;'));
assert.ok(hunt.includes('const recentSkillEffects=active&&!fight?.searching?'));
assert.ok(stage.includes('const recentSkillEffects=isLive&&!fight?.searching?'));

assert.ok(hunt.includes('lastAnimatedHitAtMs.current===hit.atMs'));
assert.ok(hunt.includes('lastAnimatedHitAtMs.current=hit.atMs'));
assert.ok(!hunt.includes('const hit=fight?.searching?undefined:fight?.lastHit;'));

// Every live damage float is gated by the most recent hit's actor. Damage 0
// stays 0 (mitigated), never a negative 0 or a bare minus symbol.
for(const source of [hunt,stage]){
 assert.ok(source.includes('const damageFloat=(value:number)=>value>0?'));
 assert.ok(source.includes("'0'"));
 assert.ok(!source.includes('>−{lastHit'));
 assert.ok(!source.includes('>−{recentHit'));
}
assert.ok(hunt.includes("lastHit?.actor==='enemy'?damageFloat(lastHit.damage):null"));
assert.ok(hunt.includes("lastHit?.actor==='player'?"));
assert.ok(stage.includes("recentHit?.actor==='enemy'?damageFloat(recentHit.damage):null"));
assert.ok(stage.includes("recentHit?.actor==='player'?"));

// Alternating player/enemy strikes cancel the previous animation. Both sides
// must reset, otherwise an interrupted impact flash can freeze indefinitely.
assert.ok(hunt.includes('for(const value of [playerImpact,enemyImpact,playerStrike,enemyStrike,shake,missFloat])'));
assert.ok(stage.includes('for(const value of [playerLunge,enemyLunge,enemyImpact,playerImpact,missFloat])'));

// Genuine misses are calculated in combat, not invented by a UI animation.
assert.ok(hunt.includes("hit.missed?missFloat:enemyImpact"));
assert.ok(stage.includes("recentHit.missed?missFloat:enemyImpact"));
assert.ok(hunt.includes("lastHit.missed?tr('MISS')"));
assert.ok(stage.includes("recentHit.missed?tr('MISS')"));
assert.ok(hunt.includes("lastHit?.actor==='player'&&!lastHit.missed?"));
assert.ok(stage.includes("const enemyFeedback=recentHit?.missed?missFloat:enemyImpact"));

console.log('PASS live hunt hit feedback, actor gating, zero damage and interrupted animation reset');

const bar=read('ActiveActivityBar.tsx');
const shared=read('useLiveHuntProjection.ts');
const combatBar=bar.slice(bar.indexOf('function CombatActivityBar('),bar.indexOf('function RunningActivityBar('));
const timedBar=bar.slice(bar.indexOf('function RunningActivityBar('),bar.indexOf('function makeStyles('));
assert.ok(bar.includes('useLiveHuntProjection(props.state,'));
assert.ok(hunt.includes('useLiveHuntProjection(state,active)'));
assert.ok(shared.includes('new WeakMap<GameState'));
assert.ok(shared.includes('activeCombatHitProjection(state,clock,snapshot.fight?.cursor)'));
// Timer ownership now belongs to the shared foreground lifecycle helper.
const foreground=read('../online/foreground-tasks.ts');
assert.ok(shared.includes('runWhileForeground(tick,750)'));
assert.ok(shared.includes('if(!listeners.size&&stopForegroundTicks){stopForegroundTicks();stopForegroundTicks=undefined;}'));
assert.ok(foreground.includes('clearInterval(timer)')&&foreground.includes("if(status==='active')start();else stop();"));

assert.ok(combatBar.includes('fight.enemyHp/Math.max(1,fight.enemyMaxHp)'));
assert.ok(combatBar.includes('fight&&!fight.searching?'));
assert.ok(combatBar.includes('projectedKills??combatKills'));
assert.ok(!combatBar.includes('cycleRemaining'));
assert.ok(!combatBar.includes('elapsed('));
assert.ok(!bar.includes('Next kill {seconds}s'));
assert.ok(timedBar.includes('cycleRemaining'));
assert.ok(timedBar.includes('elapsed(activity.startedAtMs,displayNowMs)'));
console.log('PASS shared damage-based activity bar, search state, kill count and timed activities');

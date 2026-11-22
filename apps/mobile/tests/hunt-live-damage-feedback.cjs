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
assert.ok(hunt.includes('for(const value of [playerImpact,enemyImpact,playerStrike,enemyStrike,shake])'));
assert.ok(stage.includes('for(const value of [playerLunge,enemyLunge,enemyImpact,playerImpact])'));

console.log('PASS live hunt hit feedback, actor gating, zero damage and interrupted animation reset');

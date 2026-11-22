'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=(name)=>fs.readFileSync(path.resolve(__dirname,'../src/components',name),'utf8');
const hunt=read('HuntingPreview.tsx');
const stage=read('BattleStage.tsx');

// Hit cursors retain the last strike across searches. A returning monster
// must not replay that stale event as an apparent opening miss.
assert.match(hunt,/const hit=lastHit;/);
assert.match(hunt,/lastAnimatedHitAtMs\.current===hit\.atMs/);
assert.match(hunt,/lastAnimatedHitAtMs\.current=hit\.atMs/);
assert.doesNotMatch(hunt,/const hit=fight\?\.searching\?undefined:fight\?\.lastHit/);

// A damage float must have an actor-matched numeric payload; no lone minus
// when the opposite combatant was the most recent attacker.
assert.match(hunt,/lastHit\?\.actor==='enemy'\?\`−\$\{damageText\(lastHit\.damage\)\}\`:null/);
assert.match(hunt,/lastHit\?\.actor==='player'\?\`−\$\{damageText\(lastHit\.damage\)\}/);
assert.doesNotMatch(hunt,/>−\{lastHit/);
assert.match(stage,/recentHit\?\.actor==='enemy'\?\`−\$\{damageValue\(recentHit\.damage\)\}\`:null/);
assert.match(stage,/recentHit\?\.actor==='player'\?\`−\$\{damageValue\(recentHit\.damage\)\}/);
assert.doesNotMatch(stage,/>−\{recentHit/);

console.log('Live hunt damage floats require an actor-matched hit and no stale encounter replay.');

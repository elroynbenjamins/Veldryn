const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const modal=fs.readFileSync(path.resolve(__dirname,'../src/components/StoryBossBattleModal.tsx'),'utf8');
const simulation=fs.readFileSync(path.resolve(__dirname,'../src/core/story-boss.ts'),'utf8');

assert.match(modal,/battle\.events\.filter\(event=>event\.atMs<=playhead\)/,'Only elapsed events may contribute to displayed battle progress');
assert.match(modal,/potionsUsedSoFar=visible\.filter\(event=>event\.type==='heal'\)\.length/,'Potion counter advances only when a healing event plays');
assert.match(modal,/potionsUsedSoFar>0\?/,'Potion usage stays hidden until the first potion actually plays');
assert.match(modal,/phasesReachedSoFar=Math\.min\(3,1\+visible\.filter\(event=>event\.type==='phase'\)\.length\)/,'Phase count advances only on played phase events');
assert.doesNotMatch(modal,/\{battle\.potionConsumed\}|\{battle\.phasesReached\.length\}/,'Live feed must not reveal final simulated totals');
assert.match(simulation,/push\(\{atMs:atMs\+40,type:'heal'/,'Potion usage has a distinct timeline event');
console.log('PASS story boss combat feed shows only elapsed potions and phases');

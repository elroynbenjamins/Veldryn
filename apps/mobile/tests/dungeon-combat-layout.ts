import {dungeonCombatLayout} from '../src/core/dungeon-combat-layout';

function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);}
function assert(value:unknown,message:string){if(!value)throw new Error(message);}

const compact=dungeonCombatLayout(320),narrow=dungeonCombatLayout(360),standard=dungeonCombatLayout(390),fallback=dungeonCombatLayout(Number.NaN);
equal(compact.mode,'compact');equal(narrow.mode,'narrow');equal(standard.mode,'standard');equal(fallback.mode,'standard');
assert(compact.cardMinHeight<standard.cardMinHeight,'small phones should use shorter combat cards');
assert(compact.portraitWidth<standard.portraitWidth,'small phones should use smaller combat portraits');
assert(compact.statusLimit===2&&narrow.statusLimit===2&&standard.statusLimit===3,'small phones should cap visible statuses more aggressively');
assert(compact.controlsWrap&&narrow.controlsWrap&&!standard.controlsWrap,'small phones should allow replay controls to wrap');
assert(compact.partyGap<standard.partyGap&&compact.arenaPadding<standard.arenaPadding,'small phones should reclaim horizontal space');
assert(compact.bossWidthPctFinal>standard.bossWidthPctFinal,'boss card can use more width when stacked above a narrow party row');
console.log('dungeon combat responsive layout OK');

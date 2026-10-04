import {dungeonCombatLayout} from '../src/core/dungeon-combat-layout';

function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);}
function assert(value:unknown,message:string){if(!value)throw new Error(message);}

const compact=dungeonCombatLayout(320),narrow=dungeonCombatLayout(360),standard=dungeonCombatLayout(390),fallback=dungeonCombatLayout(Number.NaN);
equal(compact.mode,'compact');equal(narrow.mode,'narrow');equal(standard.mode,'standard');equal(fallback.mode,'standard');
assert(compact.cardMinHeight<standard.cardMinHeight,'small phones should use shorter combat cards');
assert(compact.portraitWidth<standard.portraitWidth,'small phones should use smaller combat portraits');
assert(compact.statusLimit===2&&narrow.statusLimit===2&&standard.statusLimit===3,'small phones should cap visible statuses more aggressively');
assert(compact.controlsWrap&&narrow.controlsWrap&&standard.controlsWrap&&!dungeonCombatLayout(768).controlsWrap,'phone replay controls should wrap while wide tablet layouts can remain on one row');
assert(compact.partyGap<standard.partyGap&&compact.arenaPadding<standard.arenaPadding,'small phones should reclaim horizontal space');
for(const width of [320,360,390,768]){
 const layout=dungeonCombatLayout(width);
 assert(layout.bossWidthPctFinal===100&&layout.bossWidthPct<=layout.bossWidthPctFinal,'side-by-side boss artwork and identity retain the full encounter width');
 // Leave a conservative 32px screen gutter. Two modern cards must fit, with
 // room for the portrait, identity and health values at each density tier.
 const fieldWidth=width-32-layout.arenaPadding*2,cardWidth=(fieldWidth-layout.partyGap)/2;
 assert(cardWidth>=layout.portraitWidth+6+60,'each party card leaves readable space beside the circular portrait');
 assert(layout.portraitHeight+7<=layout.sceneHeight,'the responsive portrait remains inside the scene');
 assert(layout.cardMinHeight>=layout.sceneHeight+30,'health remains within the minimum card height');
}
console.log('dungeon combat responsive layout OK');

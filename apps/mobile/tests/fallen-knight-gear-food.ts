import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {effectiveStats,fallenKnightGearReadiness,previewFallenKnightBattle} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {FALLEN_KNIGHT_MAX_FOOD_UNITS} from '../src/core/story-boss';
import {characterTotalXpAtLevel} from '../src/core/progression';
import type {GameState} from '../src/core/types';

const road=REGIONAL_COMBAT_FIXTURES.find(row=>row.regionId==='KINGS_ROAD')!;
const nowMs=Date.UTC(2026,10,3,12,0,0);
function at25(state:GameState):GameState{
 const next={...state,character:{...state.character!,level:25,xp:characterTotalXpAtLevel(25)}};
 next.character.currentHp=effectiveStats(next).hp;
 return next;
}
const report:Record<string,{fullT2Won:boolean;fullT1Won:boolean;fullT2Food:number;fullT1Food:number;fullT2BossHp:number;fullT1BossHp:number}>={};
for(const cls of CLASSES){
 const fullT2=at25(regionalCombatFixture(road,'prepared',cls.id));
 const fullT1=at25(regionalCombatFixture(road,'underprepared',cls.id));
 const oneItem=at25({...fullT2,character:{...fullT2.character!,equipment:{weapon:fullT2.character!.equipment.weapon}}});
 const empty=at25({...fullT2,character:{...fullT2.character!,equipment:{}}});
 for(const state of [fullT2,fullT1,oneItem,empty]){
  state.inventory.stacks=[{itemId:road.foodId,quantity:500}];
  state.character!.equippedFoodId=road.foodId;
 }
 const ready=fallenKnightGearReadiness(fullT2);
 const weak=fallenKnightGearReadiness(fullT1);
 const partial=fallenKnightGearReadiness(oneItem);
 const none=fallenKnightGearReadiness(empty);
 const label=cls.id;
 assert.ok(ready.tierGap<.01,label+' complete T2 should close boss tier gap');
 assert.ok(weak.tierGap>=.8,label+' T1 must have a meaningful boss tier gap');
 assert.ok(partial.tierGap>weak.tierGap,label+' one high tier item must not bypass readiness');
 assert.ok(none.tierGap>=partial.tierGap,label+' empty gear must be weakest');
 assert.ok(ready.outgoingDamageMultiplier>weak.outgoingDamageMultiplier,label+' full T2 must hit harder');
 assert.ok(ready.actionSpeedMultiplier>weak.actionSpeedMultiplier,label+' full T2 must act faster');
 assert.ok(ready.incomingDamageMultiplier<weak.incomingDamageMultiplier,label+' full T2 must take less damage');
 const t2=previewFallenKnightBattle(fullT2,nowMs,'story');
 const t1=previewFallenKnightBattle(fullT1,nowMs,'story');
 const rematch=previewFallenKnightBattle(fullT2,nowMs,'rematch');
 for(const b of [t2,t1,rematch]){
  assert.ok(b.foodConsumed<=FALLEN_KNIGHT_MAX_FOOD_UNITS,label+' no unlimited food during boss');
  assert.ok(b.foodConsumed<=b.events.filter(e=>e.type==='boss_hit').length,label+' at most one meal per boss hit');
  assert.ok(b.durationMs<=100_000,label+' boss duration is bounded');
  assert.ok(b.bossMaxHp>0&&b.playerMaxHp>0);
 }
 const foodless=at25({...fullT2,inventory:{...fullT2.inventory,stacks:[]}});
 assert.equal(previewFallenKnightBattle(foodless,nowMs,'story').foodConsumed,0,label+' no phantom food');
 assert.ok(t2.player.attackIntervalMs<=t1.player.attackIntervalMs,label+' T2 attack interval is no slower');
 report[label]={fullT2Won:t2.won,fullT1Won:t1.won,fullT2Food:t2.foodConsumed,fullT1Food:t1.foodConsumed,fullT2BossHp:t2.finalBossHp,fullT1BossHp:t1.finalBossHp};
}
console.log('PASS Fallen Knight T2 readiness, nine classes, one-food-per-hit and finite food budget');
console.log(JSON.stringify(report));

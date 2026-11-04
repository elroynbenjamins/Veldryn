import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {effectiveStats,fallenKnightGearReadiness,previewFallenKnightBattle} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {FALLEN_KNIGHT_MAX_POTION_UNITS} from '../src/core/story-boss';
import {characterTotalXpAtLevel} from '../src/core/progression';
import type {GameState} from '../src/core/types';

const road=REGIONAL_COMBAT_FIXTURES.find(row=>row.regionId==='KINGS_ROAD')!;
const nowMs=Date.UTC(2026,10,3,12,0,0);
function at25(state:GameState):GameState{
 const next={...state,character:{...state.character!,level:25,xp:characterTotalXpAtLevel(25)}};
 next.character.currentHp=effectiveStats(next).hp;
 return next;
}
const report:Record<string,{fullT2Won:boolean;fullT1Won:boolean;fullT2Potions:number;fullT1Potions:number;fullT2BossHp:number;fullT1BossHp:number;t2WinsOf12:number;t1WinsOf12:number}>={};
for(const cls of CLASSES){
 const fullT2=at25(regionalCombatFixture(road,'prepared',cls.id));
 const fullT1=at25(regionalCombatFixture(road,'underprepared',cls.id));
 const oneItem=at25({...fullT2,character:{...fullT2.character!,equipment:{weapon:fullT2.character!.equipment.weapon}}});
 const empty=at25({...fullT2,character:{...fullT2.character!,equipment:{}}});
 for(const state of [fullT2,fullT1,oneItem,empty]){
  state.inventory.stacks=[{itemId:road.foodId,quantity:500},{itemId:'RIVERHEART_DRAUGHT',quantity:12}];
  state.character!.equippedFoodId=road.foodId;
  state.character!.equippedHealingPotionId='RIVERHEART_DRAUGHT';
 }
 const ready=fallenKnightGearReadiness(fullT2);
 const weak=fallenKnightGearReadiness(fullT1);
 const partial=fallenKnightGearReadiness(oneItem);
 const none=fallenKnightGearReadiness(empty);
 const label=cls.id;
 // Catalog level gates can make some T2 slots unavailable at level 25.
 // Compare attainable T2-heavy gear to attainable T1 at the same level.
 const attainableT2=Object.values(fullT2.character!.equipment).filter(id=>/^T2P_/.test(id??'')).length;
 assert.ok(attainableT2>=5,label+' the chapter checkpoint must offer at least five attainable T2 pieces');
 assert.ok(ready.tierGap<weak.tierGap,label+' attainable T2 gear must beat T1 gear');
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
  assert.equal(b.foodConsumed,0,label+' boss never consumes food');
  assert.ok(b.potionConsumed<=FALLEN_KNIGHT_MAX_POTION_UNITS,label+' capped boss potions');
  assert.ok(b.potionConsumed<=b.events.filter(e=>e.type==='boss_hit').length,label+' at most one potion per boss hit');
  assert.ok(b.durationMs<=100_000,label+' boss duration is bounded');
  assert.ok(b.bossMaxHp>0&&b.playerMaxHp>0);
 }
 const potionless=at25({...fullT2,inventory:{...fullT2.inventory,stacks:[{itemId:road.foodId,quantity:500}]}});
 assert.equal(previewFallenKnightBattle(potionless,nowMs,'story').potionConsumed,0,label+' food does not substitute for boss potions');
 assert.ok(t2.player.attackIntervalMs<=t1.player.attackIntervalMs,label+' T2 attack interval is no slower');
 // Vary deterministic encounter seeds so one favorable animation/RNG
 // sequence does not conceal an impossible checkpoint for a particular class.
 const seeds=Array.from({length:12},(_,index)=>nowMs+(index+1)*61_003);
 const t2WinsOf12=seeds.filter(time=>previewFallenKnightBattle(fullT2,time,'story').won).length;
 const t1WinsOf12=seeds.filter(time=>previewFallenKnightBattle(fullT1,time,'story').won).length;
 assert.ok(t2WinsOf12>=9,label+' attainable T2 should win at least 9 of 12 reproducible encounters');
 assert.ok(t1WinsOf12<=2,label+' basic T1 must not trivialize first boss');
 report[label]={fullT2Won:t2.won,fullT1Won:t1.won,fullT2Potions:t2.potionConsumed,fullT1Potions:t1.potionConsumed,fullT2BossHp:t2.finalBossHp,fullT1BossHp:t1.finalBossHp,t2WinsOf12,t1WinsOf12};
}
console.log('PASS Fallen Knight T2 readiness, nine classes, no boss food and bounded potion healing');
console.log(JSON.stringify(report));

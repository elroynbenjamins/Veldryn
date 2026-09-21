import { strict as assert } from 'node:assert';
import { EVENT_EXPEDITIONS } from '../event-expeditions';
import { EXPEDITION_ENCOUNTERS } from '../../../combat/content/expedition-encounters';

for(const event of EVENT_EXPEDITIONS){
 assert.equal(new Set(event.routeHighlights).size,3);
 assert.ok(event.minLevel>0&&event.rewardMarks>0);
 assert.ok(event.startMonth>=1&&event.endMonth<=12);
 assert.match(event.liveEventSeriesId,/^EVT_ANNUAL_\d{3}$/);
 assert.match(event.encounterPrefix,/^EVENT_[A-Z]+$/);
 assert.match(event.bossEncounterId,/^EVENT_[A-Z]+_BOSS$/);
 assert.ok(event.routeNodeCount>=5&&event.routeNodeCount<=7);
 assert.ok(event.mechanic.startValue>0&&event.mechanic.startValue<=event.mechanic.maxValue);
 assert.ok(event.mechanic.lowThreshold<event.mechanic.highThreshold&&event.mechanic.highThreshold<=event.mechanic.maxValue);
 assert.ok(event.mechanic.highRewardBonus>0);
 assert.ok(event.objective.maxCount>=1&&event.objective.startCount>=0&&event.objective.startCount<=event.objective.maxCount);
 assert.ok(event.objective.perPoint>0);
 assert.ok(['boss_attack_down','boss_hp_down','boss_defense_down','reward_bonus','preboss_heal'].includes(event.objective.effect));
 assert.ok(event.specialNodes.some(node=>(node.objectiveDelta??0)>0)||event.objective.startCount>0,`${event.eventName} needs a way to establish its signature objective`);
 assert.ok(event.specialNodes.length>=6);
 assert.ok(event.specialNodes.every(node=>node.depth>=3&&node.depth<=event.routeNodeCount&&node.choice>=0&&node.choice<=2));
 for(const index of [1,2,3])assert.ok(EXPEDITION_ENCOUNTERS[`${event.encounterPrefix}_BATTLE_0${index}`],`missing battle encounter ${event.encounterPrefix} #${index}`);
 assert.ok(EXPEDITION_ENCOUNTERS[event.bossEncounterId],`missing boss encounter ${event.bossEncounterId}`);
}
assert.equal(EVENT_EXPEDITIONS.length,8);
assert.deepEqual(new Set(EVENT_EXPEDITIONS.map(event=>event.objective.effect)),new Set(['boss_attack_down','boss_hp_down','boss_defense_down','reward_bonus','preboss_heal']));
assert.deepEqual(
 EVENT_EXPEDITIONS.filter(x=>['The Veilbreak','Merchant & Guild Festival','Frostfall Festival','Turning of the Age','Heartbond Festival','Bloomwake'].includes(x.eventName)).map(x=>x.routeHighlights.length),
 [3,3,3,3,3,3]
);
console.log('event expedition entry contract passed');

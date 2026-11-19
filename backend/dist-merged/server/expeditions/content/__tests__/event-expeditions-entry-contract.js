"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const event_expeditions_1 = require("../event-expeditions");
const expedition_encounters_1 = require("../../../combat/content/expedition-encounters");
for (const event of event_expeditions_1.EVENT_EXPEDITIONS) {
    node_assert_1.strict.equal(new Set(event.routeHighlights).size, 3);
    node_assert_1.strict.ok(event.minLevel > 0 && event.rewardMarks > 0);
    node_assert_1.strict.ok(event.startMonth >= 1 && event.endMonth <= 12);
    node_assert_1.strict.match(event.liveEventSeriesId, /^EVT_ANNUAL_\d{3}$/);
    node_assert_1.strict.match(event.encounterPrefix, /^EVENT_[A-Z]+$/);
    node_assert_1.strict.match(event.bossEncounterId, /^EVENT_[A-Z]+_BOSS$/);
    node_assert_1.strict.ok(event.routeNodeCount >= 5 && event.routeNodeCount <= 7);
    node_assert_1.strict.ok(event.mechanic.startValue > 0 && event.mechanic.startValue <= event.mechanic.maxValue);
    node_assert_1.strict.ok(event.mechanic.lowThreshold < event.mechanic.highThreshold && event.mechanic.highThreshold <= event.mechanic.maxValue);
    node_assert_1.strict.ok(event.mechanic.highRewardBonus > 0);
    node_assert_1.strict.ok(event.objective.maxCount >= 1 && event.objective.startCount >= 0 && event.objective.startCount <= event.objective.maxCount);
    node_assert_1.strict.ok(event.objective.perPoint > 0);
    node_assert_1.strict.ok(['boss_attack_down', 'boss_hp_down', 'boss_defense_down', 'reward_bonus', 'preboss_heal'].includes(event.objective.effect));
    node_assert_1.strict.ok(event.specialNodes.some(node => (node.objectiveDelta ?? 0) > 0) || event.objective.startCount > 0, `${event.eventName} needs a way to establish its signature objective`);
    node_assert_1.strict.ok(event.specialNodes.length >= 6);
    node_assert_1.strict.ok(event.specialNodes.every(node => node.depth >= 3 && node.depth <= event.routeNodeCount && node.choice >= 0 && node.choice <= 2));
    for (const index of [1, 2, 3])
        node_assert_1.strict.ok(expedition_encounters_1.EXPEDITION_ENCOUNTERS[`${event.encounterPrefix}_BATTLE_0${index}`], `missing battle encounter ${event.encounterPrefix} #${index}`);
    node_assert_1.strict.ok(expedition_encounters_1.EXPEDITION_ENCOUNTERS[event.bossEncounterId], `missing boss encounter ${event.bossEncounterId}`);
}
node_assert_1.strict.equal(event_expeditions_1.EVENT_EXPEDITIONS.length, 8);
node_assert_1.strict.deepEqual(new Set(event_expeditions_1.EVENT_EXPEDITIONS.map(event => event.objective.effect)), new Set(['boss_attack_down', 'boss_hp_down', 'boss_defense_down', 'reward_bonus', 'preboss_heal']));
node_assert_1.strict.deepEqual(event_expeditions_1.EVENT_EXPEDITIONS.filter(x => ['The Veilbreak', 'Merchant & Guild Festival', 'Frostfall Festival', 'Turning of the Age', 'Heartbond Festival', 'Bloomwake'].includes(x.eventName)).map(x => x.routeHighlights.length), [3, 3, 3, 3, 3, 3]);
console.log('event expedition entry contract passed');

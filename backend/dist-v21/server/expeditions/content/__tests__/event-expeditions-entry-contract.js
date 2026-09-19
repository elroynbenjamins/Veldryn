"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const event_expeditions_1 = require("../event-expeditions");
for (const event of event_expeditions_1.EVENT_EXPEDITIONS) {
    node_assert_1.strict.equal(new Set(event.routeHighlights).size, 3);
    node_assert_1.strict.ok(event.minLevel > 0 && event.rewardMarks > 0);
    node_assert_1.strict.ok(event.startMonth >= 1 && event.endMonth <= 12);
}
console.log('event expedition entry contract passed');

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coop_presentation_1 = require("../src/core/coop-presentation");
function equal(actual, expected, message = 'values differ') { if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(message); }
equal((0, coop_presentation_1.liveAffordances)('qmode'), { ready: false, votes: false, chat: false });
equal((0, coop_presentation_1.liveAffordances)('live'), { ready: true, votes: true, chat: true });
(0, coop_presentation_1.validateCoopRunView)({ runId: 'q', mode: 'qmode', phase: 'awaiting_choice', syncedLevel: 25, roleSlots: [{ role: 'tank', name: 'T', echo: true }, { role: 'damage', name: 'D1', echo: false }, { role: 'damage', name: 'D2', echo: true }, { role: 'support', name: 'S', echo: true }], options: [{ nodeId: 'a', title: 'A', kind: 'battle', risk: 'steady', reward: 'boon' }, { nodeId: 'b', title: 'B', kind: 'camp', risk: 'safe', reward: 'recovery' }, { nodeId: 'c', title: 'C', kind: 'event', risk: 'unknown', reward: 'unknown' }] });
let invalid = '';
try {
    (0, coop_presentation_1.validateCoopRunView)({ runId: 'x', mode: 'live', phase: 'choice', syncedLevel: 25, roleSlots: [{ role: 'tank', name: 'T', echo: false }, { role: 'damage', name: 'D', echo: false }, { role: 'damage', name: 'D', echo: false }, { role: 'support', name: 'S', echo: false }], options: [{ nodeId: 'a', title: 'A', kind: 'battle', risk: 'x', reward: 'x' }, { nodeId: 'b', title: 'B', kind: 'battle', risk: 'x', reward: 'x' }] });
}
catch (error) {
    invalid = error instanceof Error ? error.message : String(error);
}
equal(invalid, 'insufficient_route_options');
let duplicate = '';
try {
    (0, coop_presentation_1.validateCoopRunView)({ runId: 'x', mode: 'live', phase: 'choice', syncedLevel: 25, roleSlots: [{ role: 'tank', name: 'T', echo: false }, { role: 'damage', name: 'D1', echo: false }, { role: 'damage', name: 'D2', echo: false }, { role: 'support', name: 'S', echo: false }], options: [{ nodeId: 'a', title: 'A', kind: 'battle', risk: 'x', reward: 'x' }, { nodeId: 'a', title: 'B', kind: 'camp', risk: 'x', reward: 'x' }, { nodeId: 'c', title: 'C', kind: 'event', risk: 'x', reward: 'x' }] });
}
catch (error) {
    duplicate = error instanceof Error ? error.message : String(error);
}
equal(duplicate, 'invalid_route_options');
console.log('coop presentation OK');

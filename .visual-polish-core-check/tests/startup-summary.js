"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const playability_1 = require("../src/core/playability");
function ok(condition, message) { if (!condition)
    throw new Error(message); }
const started = (0, game_1.startGathering)((0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN', 'Return Tester'), 'GREENWOOD_TREE', 0);
const partial = (0, playability_1.settleStartupActivity)(started, 1000);
ok(partial.reward === null && partial.state === started, 'A zero-action startup must preserve the partial cycle');
const resumed = (0, playability_1.settleStartupActivity)(started, 60000);
ok(resumed.reward !== null, 'Completed offline actions should create a startup summary');
ok(resumed.reward.kills > 0 && resumed.reward.xp > 0 && resumed.reward.items.length > 0, 'Startup summary should include actions, XP, and resources');
ok(resumed.activity?.kind === 'woodcutting' && resumed.activity.targetId === 'GREENWOOD_TREE', 'Startup summary should retain the completed skill and target');
ok(resumed.state.activity?.lastClaimAtMs === 60000, 'Startup rewards should settle exactly once');
console.log('Startup activity summary tests passed.');

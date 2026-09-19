"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const economy_1 = require("../transactions/economy");
const matchmaker_1 = require("../matchmaking/matchmaker");
const progression_1 = require("../guild/progression");
const pvp_raids_1 = require("../endgame/pvp-raids");
const risk_1 = require("../telemetry/risk");
const contracts_1 = require("../api/contracts");
function assert(x, m) { if (!x)
    throw new Error(m); }
assert((0, economy_1.validateIdleCommit)({ characterId: 'c', idempotencyKey: 'k', activityId: 'a', elapsedSec: 28800, resourceItemId: 'ore', resourceAmount: 80, xp: 100 }).elapsedSec === 28800, 'idle validation');
const q = [{ id: '1', characterId: '1', role: 'tank', powerIndex: 100, createdAtMs: 0, echoAllowed: true }, { id: '2', characterId: '2', role: 'damage', powerIndex: 101, createdAtMs: 0, echoAllowed: true }, { id: '3', characterId: '3', role: 'damage', powerIndex: 99, createdAtMs: 0, echoAllowed: true }, { id: '4', characterId: '4', role: 'support', powerIndex: 100, createdAtMs: 0, echoAllowed: true }];
assert((0, matchmaker_1.chooseBestMatch)(q, 60000)?.ticketIds.length === 4, 'matchmaker');
assert((0, progression_1.bossAttemptAllowed)(2, 3) && !(0, progression_1.bossAttemptAllowed)(3, 3), 'guild boss attempts');
assert((0, pvp_raids_1.raidPityChance)(39) === 1, 'raid hard pity');
assert((0, pvp_raids_1.ratingDelta)(1000, 1000, 1) > 0, 'rating');
assert((0, risk_1.restrictionLevel)((0, risk_1.riskScore)(['seed_mismatch', 'impossible_elapsed', 'seed_mismatch'])) >= 1, 'risk');
assert(contracts_1.ANDROID_PACKAGE === 'com.elroybenjamins.veldryn', 'package');
assert((0, contracts_1.decideBootstrap)({ platform: 'android', buildNumber: 10, contentVersion: 'a', locale: 'en', timezone: 'Europe/Amsterdam' }, 9, 'b').contentUpdateRequired, 'bootstrap');
console.log('production-smoke ok');

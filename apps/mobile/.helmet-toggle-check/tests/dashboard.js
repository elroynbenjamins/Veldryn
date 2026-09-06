"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const dashboard_1 = require("../src/core/dashboard");
const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'BASTION', 'Tester');
const first = (0, dashboard_1.dashboardRecommendation)(state);
if (first.destination !== 'World' || first.zoneId !== 'Greenfields')
    throw new Error(`Expected first quest guidance to Greenfields, got ${JSON.stringify(first)}`);
state.activity = { kind: 'combat', targetId: 'MOSS_RAT', startedAtMs: 0, lastClaimAtMs: 0 };
const rate = (0, dashboard_1.activityRate)(state);
if (rate.actionsPerHour < 400 || rate.xpPerHour !== rate.actionsPerHour * 14 || rate.goldPerHour !== rate.actionsPerHour)
    throw new Error(`Unexpected activity rate ${JSON.stringify(rate)}`);
state.quests[0].status = 'complete';
if ((0, dashboard_1.dashboardRecommendation)(state).destination !== 'Quests')
    throw new Error('Completed quest should take priority');
state.overflow = { stacks: [{ itemId: 'MOSS_FIBER', quantity: 1 }], expiresAtMs: 1 };
if ((0, dashboard_1.dashboardRecommendation)(state).priority !== 'urgent')
    throw new Error('Overflow should be urgent');
console.log(JSON.stringify({ status: 'PASS', recommendation: first, rate }));

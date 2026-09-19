"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const dashboard_1 = require("../src/core/dashboard");
const world_weather_1 = require("../src/core/world-weather");
const monsters_1 = require("../src/content/monsters");
const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'BASTION', 'Tester');
const first = (0, dashboard_1.dashboardRecommendation)(state);
if (first.destination !== 'World' || first.zoneId !== 'Greenfields')
    throw new Error(`Expected first quest guidance to Greenfields, got ${JSON.stringify(first)}`);
const hunting = (0, game_1.startCombat)(state, 'MOSS_RAT', 0);
state.activity = hunting.activity;
const rate = (0, dashboard_1.activityRate)(state);
const effect = (0, world_weather_1.environmentEffectForActivity)(state.activity).effect;
const rat = monsters_1.MONSTERS.find(monster => monster.id === 'MOSS_RAT');
if (rate.actionsPerHour < 200 || rate.actionsPerHour > 300 || rate.xpPerHour !== Math.floor(rate.actionsPerHour * rat.xp * effect.xpMultiplier) || rate.goldPerHour !== Math.floor(rate.actionsPerHour * rat.gold * effect.goldMultiplier))
    throw new Error(`Unexpected weather-adjusted activity rate ${JSON.stringify(rate)}`);
state.quests[0].status = 'complete';
if ((0, dashboard_1.dashboardRecommendation)(state).destination !== 'Quests')
    throw new Error('Completed quest should take priority');
state.overflow = { stacks: [{ itemId: 'MOSS_FIBER', quantity: 1 }], expiresAtMs: 1 };
if ((0, dashboard_1.dashboardRecommendation)(state).priority !== 'urgent')
    throw new Error('Overflow should be urgent');
console.log(JSON.stringify({ status: 'PASS', recommendation: first, rate }));

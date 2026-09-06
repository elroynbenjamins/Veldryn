"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const seasonal_quests_1 = require("../src/core/seasonal-quests");
const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'BASTION', 'Tester');
const date = new Date('2026-09-05T12:00:00Z'), a = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'weekly', date), b = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'weekly', date), m = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'monthly', date);
if (a.length !== 3 || m.length !== 4)
    throw new Error('Seasonal board sizes are incorrect');
if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error('Same seasonal period must be deterministic');
if (a.some(q => q.className !== 'Bastion' || !q.id.startsWith('WEEKLY_')))
    throw new Error('Class-aligned weekly quests missing');
if (m.some(q => q.rewardGold <= a[0].rewardGold))
    throw new Error('Monthly rewards should exceed weekly rewards');
const other = (0, seasonal_quests_1.seasonalQuestBoard)((0, game_1.createCharacter)((0, game_1.newGame)(0), 'WAYFINDER', 'Scout'), 'weekly', date);
if (JSON.stringify(a.map(q => q.name)) === JSON.stringify(other.map(q => q.name)))
    throw new Error('Class layouts should differ');
console.log('PASS: deterministic class-aligned weekly and monthly quest boards');

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("../engine");
const launch_combat_1 = require("../content/launch-combat");
const players = ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'].map(x => (0, launch_combat_1.launchPlayer)(x, 25));
const input = { seed: 'VELDRYN_COMBAT_SMOKE_001', players, enemies: [(0, launch_combat_1.rootboundHeartBoss)()], maxDurationMs: 180000 };
const a = (0, engine_1.simulateCombat)(input);
const b = (0, engine_1.simulateCombat)(input);
if (a.victory !== b.victory || a.durationMs !== b.durationMs || JSON.stringify(a.events) !== JSON.stringify(b.events))
    throw new Error('combat_not_deterministic');
if (!a.events.some(e => e.type === 'damage'))
    throw new Error('no_damage_events');
if (!a.events.some(e => e.type === 'heal' || e.type === 'shield' || e.type === 'hot_tick'))
    throw new Error('no_support_events');
console.log(JSON.stringify({ victory: a.victory, reason: a.reason, durationMs: a.durationMs, eventCount: a.events.length, interrupts: a.players.reduce((s, p) => s + p.interrupts, 0), remainingEnemyHp: a.enemies.map(e => Math.round(e.hp)) }, null, 2));

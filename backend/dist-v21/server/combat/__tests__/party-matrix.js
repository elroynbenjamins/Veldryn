"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("../engine");
const launch_combat_1 = require("../content/launch-combat");
const teams = [
    ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'],
    ['Ironwarden', 'Hexweaver', 'Knife Dancer', 'Stonecaller'],
    ['Ironwarden', 'Wayfinder', 'Ravager', 'Knife Dancer'],
    ['Wayfinder', 'Ravager', 'Hexweaver', 'Knife Dancer'],
    ['Ironwarden', 'Wayfinder', 'Dawnkeeper', 'Stonecaller'],
];
for (const boss of [(0, launch_combat_1.rootboundHeartBoss)(), (0, launch_combat_1.bellWardenBoss)()]) {
    for (const t of teams) {
        let wins = 0, total = 30, dur = 0, downs = 0;
        for (let i = 0; i < total; i++) {
            const r = (0, engine_1.simulateCombat)({ seed: `${boss.id}:${t.join('-')}:${i}`, players: t.map(c => (0, launch_combat_1.launchPlayer)(c, 25)), enemies: [boss], maxDurationMs: 180000 });
            wins += +r.victory;
            dur += r.durationMs;
            downs += r.players.filter(p => p.downed).length;
        }
        console.log(`${boss.name}\t${t.join('/')}\t${wins}/${total}\tavg=${Math.round(dur / total / 100) / 10}s\tdowns=${downs}`);
    }
}

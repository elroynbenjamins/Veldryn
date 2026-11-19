"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const launch_combat_1 = require("../content/launch-combat");
const pve_balance_batch_1 = require("../pve-balance-batch");
const teams = [
    ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'],
    ['Ironwarden', 'Hexweaver', 'Knife Dancer', 'Stonecaller'],
    ['Ironwarden', 'Wayfinder', 'Ravager', 'Knife Dancer'],
    ['Wayfinder', 'Ravager', 'Hexweaver', 'Knife Dancer'],
    ['Ironwarden', 'Wayfinder', 'Dawnkeeper', 'Stonecaller'],
];
for (const encounterId of ['ROOTBOUND_BOSS', 'LANTERN_BOSS']) {
    for (const classes of teams) {
        const report = (0, pve_balance_batch_1.runPveBalanceBatch)({ encounterId, players: classes.map(classId => (0, launch_combat_1.launchPlayer)(classId, 25)), iterations: 30, seedPrefix: `LEGACY_MATRIX:${encounterId}:${classes.join('-')}`, maxDurationMs: 180000 });
        console.log(`${encounterId}\t${classes.join('/')}\twins=${report.resultCounts.victory}/${report.iterations}\tp50=${Math.round(report.durationMs.p50 / 100) / 10}s\tp90=${Math.round(report.durationMs.p90 / 100) / 10}s\tdownAvg=${report.partyDowns.mean}`);
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSimulatedEncounter = resolveSimulatedEncounter;
const power_1 = require("./power");
const rng_1 = require("./rng");
function resolveSimulatedEncounter(input) {
    if (input.members.length < 1 || input.members.length > 4)
        throw new Error('invalid_party_size');
    const ppi = (0, power_1.partyPowerIndex)(input.members.map(m => m.syncedPower), input.members.map(m => m.role), 1);
    const synergy = input.members.reduce((s, m) => s + m.boonSynergyMultiplier, 0) / input.members.length;
    const difficulty = (0, power_1.expeditionDifficultyIndex)(input.tier, input.nodeDifficultyMultiplier, input.regionalMechanicMultiplier, input.routeRiskMultiplier);
    const score = (ppi / Math.max(0.001, difficulty)) * input.executionScore * synergy;
    const probability = Math.max(0.03, Math.min(0.98, 1 / (1 + Math.exp(-8 * (score - 0.76)))));
    const roll = (0, rng_1.deterministicUnit)(input.secret, input.runId, input.nodeIndex, 'encounter-result');
    const success = roll < probability;
    const downs = [];
    const hpAfter = {};
    for (const member of input.members) {
        const personalRoll = (0, rng_1.deterministicUnit)(input.secret, input.runId, input.nodeIndex, member.characterId, 'hp');
        const loss = success ? (0.12 + personalRoll * 0.30) : (0.42 + personalRoll * 0.58);
        const hp = Math.max(0, Math.min(1, member.currentHpPct - loss));
        hpAfter[member.characterId] = Number(hp.toFixed(4));
        if (hp <= 0.01)
            downs.push(member.characterId);
    }
    return { success, partyPower: ppi, difficulty, successProbability: probability, roll, downs, hpAfter };
}

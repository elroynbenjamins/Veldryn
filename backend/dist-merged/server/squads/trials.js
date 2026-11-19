"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTrialFloor = generateTrialFloor;
exports.trialScore = trialScore;
exports.canEnterTrial = canEnterTrial;
exports.trialCheckpointFloor = trialCheckpointFloor;
function generateTrialFloor(floor) {
    if (floor < 1 || floor > 30)
        throw new Error('invalid_trial_floor');
    const pool = ['armored', 'rushing', 'anti_heal', 'shattering', 'arcane_storm', 'execution'];
    const count = floor >= 21 ? 3 : floor >= 11 ? 2 : 1;
    const mods = [];
    for (let i = 0; i < count; i++)
        mods.push(pool[(floor * 3 + i * 2) % pool.length]);
    return { floor, recommendedPower: Math.round(900 * Math.pow(1.075, floor - 1)), modifiers: [...new Set(mods)], boss: floor % 5 === 0 };
}
function trialScore(floor, seconds, downs) { return Math.max(0, Math.round(floor * 1000 - seconds * 2 - downs * 150)); }
function canEnterTrial(aliveCharacterIds) { return aliveCharacterIds.length >= 1; }
function trialCheckpointFloor(floor) { return floor < 5 ? 1 : Math.floor((floor - 1) / 5) * 5 + 1; }

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyPresence = classifyPresence;
exports.classifyAfk = classifyAfk;
exports.safetyAiRules = safetyAiRules;
const live_dungeon_policy_1 = require("./live-dungeon-policy");
function classifyPresence(input) {
    if (input.leftRun)
        return 'dropped';
    const age = Math.max(0, (input.nowMs - input.lastHeartbeatMs) / 1000);
    if (age < 15)
        return 'connected';
    if (age < live_dungeon_policy_1.LIVE_DUNGEON_POLICY.disconnectGraceSeconds)
        return 'grace';
    if (age < live_dungeon_policy_1.LIVE_DUNGEON_POLICY.safetyAiUntilSeconds)
        return 'safety_ai';
    return 'dropped';
}
function classifyAfk(input) {
    if (!input.inCombat)
        return 'active';
    const seconds = Math.max(0, input.secondsSinceMeaningfulInput);
    if (seconds < live_dungeon_policy_1.LIVE_DUNGEON_POLICY.afkWarningSeconds)
        return 'active';
    if (seconds < live_dungeon_policy_1.LIVE_DUNGEON_POLICY.afkSafetyAiSeconds)
        return 'warning';
    return 'safety_ai';
}
function safetyAiRules() {
    return {
        canBasicAttack: true,
        canUseBasicDefensive: true,
        canSpendConsumables: false,
        canUseUltimate: false,
        canCastVote: false,
        outputMultiplier: 0.70,
        note: 'Safety AI only protects the other three players during a mobile disconnect. It is intentionally worse than active play and cannot create route votes or consume player items.'
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIVE_DUNGEON_POLICY = void 0;
exports.validateStrictComposition = validateStrictComposition;
exports.validateLoadoutRole = validateLoadoutRole;
exports.matchmakingWindow = matchmakingWindow;
exports.areTicketsCompatible = areTicketsCompatible;
exports.rewardEligibility = rewardEligibility;
exports.deserterCooldownMinutes = deserterCooldownMinutes;
exports.LIVE_DUNGEON_POLICY = {
    partySize: 4,
    requiredRoles: { tank: 1, damage: 2, support: 1 },
    readyCheckSeconds: 20,
    routeVoteSeconds: 8,
    routeVoteMinSeconds: 5,
    routeVoteMaxSeconds: 10,
    disconnectGraceSeconds: 30,
    safetyAiUntilSeconds: 150,
    afkWarningSeconds: 60,
    afkSafetyAiSeconds: 120,
    minimumParticipationScore: 0.20,
    maxReadyReplacementCycles: 3,
    queueTicketTtlSeconds: 600,
    serverLeaseSeconds: 30,
    // Two-mode design only: Live Dungeon + Q-Mode. No automatic Echo/Hybrid filling in Live.
    liveEchoAutofill: false,
};
function validateStrictComposition(roles) {
    const counts = { tank: 0, damage: 0, support: 0 };
    for (const role of roles)
        counts[role]++;
    if (roles.length !== exports.LIVE_DUNGEON_POLICY.partySize)
        return { valid: false, counts, reason: 'party_size' };
    if (counts.tank !== 1 || counts.damage !== 2 || counts.support !== 1)
        return { valid: false, counts, reason: 'composition' };
    return { valid: true, counts };
}
function validateLoadoutRole(q) {
    if (q.combatLevel < 1 || q.powerIndex <= 0)
        return { valid: false, reason: 'invalid_power' };
    if (!Number.isInteger(q.loadoutVersion) || q.loadoutVersion < 1)
        return { valid: false, reason: 'invalid_loadout_version' };
    if (q.role === 'tank' && q.tankScore < 0.72)
        return { valid: false, reason: 'tank_score_too_low' };
    if (q.role === 'support' && q.supportScore < 0.72)
        return { valid: false, reason: 'support_score_too_low' };
    return { valid: true };
}
function matchmakingWindow(powerIndex, waitSeconds, role) {
    const start = role === 'damage' ? 0.12 : 0.10;
    const perMinute = role === 'damage' ? 0.06 : 0.05;
    const max = role === 'damage' ? 0.40 : 0.35;
    const fraction = Math.min(max, start + (Math.max(0, waitSeconds) / 60) * perMinute);
    return { minPower: powerIndex * (1 - fraction), maxPower: powerIndex * (1 + fraction), preferredLevelDelta: role === 'damage' ? 6 : 5 };
}
function areTicketsCompatible(a, b, aWaitSeconds, bWaitSeconds) {
    if (a.accountId === b.accountId)
        return false;
    if (a.contentId !== b.contentId)
        return false;
    const aw = matchmakingWindow(a.powerIndex, aWaitSeconds, a.role), bw = matchmakingWindow(b.powerIndex, bWaitSeconds, b.role);
    const powerOk = b.powerIndex >= aw.minPower && b.powerIndex <= aw.maxPower && a.powerIndex >= bw.minPower && a.powerIndex <= bw.maxPower;
    const levelOk = Math.abs(a.combatLevel - b.combatLevel) <= Math.max(aw.preferredLevelDelta, bw.preferredLevelDelta) + 4;
    return powerOk && levelOk;
}
function rewardEligibility(input) {
    if (!input.wasReady)
        return { eligible: false, participationScore: 0, reason: 'not_ready' };
    if (input.leftRun && !input.completedRun)
        return { eligible: false, participationScore: 0, reason: 'left_early' };
    const combat = Math.max(0, Math.min(1, input.combatParticipation));
    const mechanics = Math.max(0, Math.min(1, input.mechanicParticipation));
    const voting = Math.max(0, Math.min(1, input.routeVotesCast / 3));
    const score = combat * .55 + mechanics * .35 + voting * .10;
    if (score < exports.LIVE_DUNGEON_POLICY.minimumParticipationScore)
        return { eligible: false, participationScore: score, reason: 'insufficient_participation' };
    const safetyFraction = Math.max(0, input.safetyAiSeconds) / Math.max(1, input.runDurationSeconds);
    if (safetyFraction > .60 && score < .35)
        return { eligible: false, participationScore: score, reason: 'excessive_safety_ai' };
    return { eligible: true, participationScore: score };
}
function deserterCooldownMinutes(input) {
    if (!input.leftDuringActiveRun || input.disconnectClassifiedUnintentional)
        return 0;
    if (input.intentionalLeaves30d <= 0)
        return 5;
    if (input.intentionalLeaves30d === 1)
        return 10;
    if (input.intentionalLeaves30d === 2)
        return 20;
    return 30;
}

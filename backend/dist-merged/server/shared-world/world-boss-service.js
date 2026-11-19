"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_SETTLEMENT_GRACE_SECONDS = void 0;
exports.utcDateKey = utcDateKey;
exports.startWorldBossAttempt = startWorldBossAttempt;
exports.settleWorldBossAttempt = settleWorldBossAttempt;
exports.simulateAtomicWorldBossDamage = simulateAtomicWorldBossDamage;
const world_bosses_1 = require("./world-bosses");
function utcDateKey(nowMs) { return new Date(nowMs).toISOString().slice(0, 10); }
/** Grace period on top of the attempt window for client replay and network round trips. */
exports.WORLD_BOSS_SETTLEMENT_GRACE_SECONDS = 120;
async function startWorldBossAttempt(deps, input) {
    const instance = await deps.store.getInstance(input.instanceId);
    if (input.nowMs < instance.startsAtMs)
        throw new Error('world_boss_not_started');
    const dateKey = utcDateKey(input.nowMs);
    const [attemptsToday, lifetime, hasOpenAttempt] = await Promise.all([
        deps.store.countScoredAttempts(instance.instanceId, input.accountId, dateKey),
        deps.store.getLifetimeAttemptCounts(instance.instanceId, input.accountId),
        deps.store.hasOpenAttempt(instance.instanceId, input.accountId),
    ]);
    const availability = (0, world_bosses_1.canStartScoredBossAttempt)({ state: instance.state, attemptsToday, validAttemptsTotal: lifetime.validAttempts, echoAttemptsTotal: lifetime.echoAttempts, definition: instance.definition, nowMs: input.nowMs, endsAtMs: instance.endsAtMs, defeatedAtMs: instance.defeatedAtMs });
    if (!availability.allowed)
        throw new Error(availability.reason ?? 'world_boss_not_available');
    if (hasOpenAttempt)
        throw new Error('world_boss_attempt_already_open');
    await deps.authorizer.verifyEligibleCharacter({ accountId: input.accountId, characterId: input.characterId, definition: instance.definition });
    return deps.store.reserveAttempt({ instanceId: instance.instanceId, accountId: input.accountId, characterId: input.characterId, dateKey, echoOnly: availability.echoOnly, phaseId: (0, world_bosses_1.phaseForHp)(instance.definition, instance.remainingHp, instance.maxHp).id, expiresAtMs: input.nowMs + (instance.definition.attemptDurationSeconds + exports.WORLD_BOSS_SETTLEMENT_GRACE_SECONDS) * 1000, sourceRequestId: input.sourceRequestId, partyIdAtStart: input.partyIdAtStart, partyNameAtStart: input.partyNameAtStart, guildIdAtStart: input.guildIdAtStart, guildNameAtStart: input.guildNameAtStart });
}
async function settleWorldBossAttempt(deps, input) {
    const reservation = await deps.store.loadAttempt(input.encounterId);
    if (reservation.accountId !== input.accountId)
        throw new Error('world_boss_attempt_owner_mismatch');
    // Fail fast with the same reason the atomic RPC would raise; the database remains the final authority.
    if (input.nowMs != null && input.nowMs > reservation.expiresAtMs)
        throw new Error('world_boss_attempt_expired');
    if (input.combatResult.encounterId !== reservation.encounterId || input.combatResult.accountId !== reservation.accountId || input.combatResult.characterId !== reservation.characterId)
        throw new Error('world_boss_combat_receipt_mismatch');
    const instance = await deps.store.getInstance(reservation.instanceId);
    const impact = (0, world_bosses_1.computeWorldBossImpact)(instance.definition, input.combatResult);
    const damage = reservation.echoOnly ? 0 : impact.globalDamage;
    const applied = await deps.store.applyDamageAtomically({ encounterId: reservation.encounterId, instanceId: reservation.instanceId, accountId: reservation.accountId, requestedDamage: damage, impact, echoOnly: reservation.echoOnly, combatResult: input.combatResult });
    return { reservation, combatResult: input.combatResult, impact, appliedGlobalDamage: applied.appliedDamage, bossRemainingHp: applied.remainingHp, bossDefeated: applied.defeated, countsForPersonalProgress: !reservation.echoOnly };
}
function simulateAtomicWorldBossDamage(remainingHp, damage) { return (0, world_bosses_1.applyWorldBossDamage)(remainingHp, damage); }

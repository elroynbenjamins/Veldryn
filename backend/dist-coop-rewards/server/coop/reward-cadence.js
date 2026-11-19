"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshEnhancedRewardCharges = refreshEnhancedRewardCharges;
exports.consumeEnhancedRewardCharge = consumeEnhancedRewardCharge;
const config_1 = require("./config");
function assertTime(nowMs) { if (!Number.isFinite(nowMs) || nowMs < 0)
    throw new Error('invalid_reward_time'); }
function refreshEnhancedRewardCharges(state, nowMs, weekKey) {
    assertTime(nowMs);
    const capacity = config_1.COOP_ROGUELITE_CONFIG.enhancedRewardChargeCapacity, recharge = config_1.COOP_ROGUELITE_CONFIG.enhancedRewardRechargeMs;
    let next = state ? { ...state } : { charges: capacity, weekKey, weeklyUsed: 0 };
    if (next.weekKey !== weekKey)
        next = { ...next, weekKey, weeklyUsed: 0 };
    if (next.nextChargeAtMs !== undefined && nowMs >= next.nextChargeAtMs && next.charges < capacity) {
        const restored = Math.floor((nowMs - next.nextChargeAtMs) / recharge) + 1;
        next.charges = Math.min(capacity, next.charges + restored);
        next.nextChargeAtMs = next.charges >= capacity ? undefined : next.nextChargeAtMs + restored * recharge;
    }
    return next;
}
function consumeEnhancedRewardCharge(state, nowMs, weekKey) {
    const current = refreshEnhancedRewardCharges(state, nowMs, weekKey), weeklyLimit = config_1.COOP_ROGUELITE_CONFIG.enhancedRewardWeeklyLimit;
    if (current.charges < 1 || current.weeklyUsed >= weeklyLimit)
        return { enhanced: false, state: current, weeklyRemaining: Math.max(0, weeklyLimit - current.weeklyUsed) };
    const charges = current.charges - 1, nextChargeAtMs = current.nextChargeAtMs ?? nowMs + config_1.COOP_ROGUELITE_CONFIG.enhancedRewardRechargeMs;
    const updated = { ...current, charges, weeklyUsed: current.weeklyUsed + 1, nextChargeAtMs };
    return { enhanced: true, state: updated, weeklyRemaining: weeklyLimit - updated.weeklyUsed };
}

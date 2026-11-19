"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const idle_1 = require("../activities/idle");
const crafting_1 = require("../crafting/crafting");
const activity = { activityId: 'ore', startedAtMs: 0, lastClaimAtMs: 0, ratePerHour: 10, xpPerHour: 20, maxOfflineHours: 8 };
const now = 24 * 3600 * 1000;
const capped = (0, idle_1.calculateIdleClaim)(activity, now);
strict_1.default.equal(capped.resourceAmount, 80);
strict_1.default.equal(capped.xp, 160);
strict_1.default.equal(capped.newLastClaimAtMs, now);
strict_1.default.throws(() => (0, idle_1.calculateIdleClaim)({ ...activity, lastClaimAtMs: capped.newLastClaimAtMs }, now), /invalid_claim_time/);
const next = (0, idle_1.calculateIdleClaim)({ ...activity, lastClaimAtMs: capped.newLastClaimAtMs }, now + 3600000);
strict_1.default.equal(next.resourceAmount, 10, 'a later claim earns only new time');
const partial = (0, idle_1.calculateIdleClaim)(activity, 1500);
strict_1.default.equal(partial.newLastClaimAtMs, 1000);
strict_1.default.equal((0, idle_1.calculateIdleClaim)({ ...activity, lastClaimAtMs: partial.newLastClaimAtMs }, 2000).elapsedSec, 1);
const cappedPartial = (0, idle_1.calculateIdleClaim)(activity, now + 500);
strict_1.default.equal(cappedPartial.newLastClaimAtMs, now);
strict_1.default.equal((0, idle_1.calculateIdleClaim)({ ...activity, lastClaimAtMs: now }, now + 500).resourceAmount, 0);
strict_1.default.equal((0, idle_1.calculateIdleClaim)({ ...activity, maxOfflineHours: 30 }, 30 * 3600000).elapsedSec, 30 * 3600, 'cap is supplied by the owning policy');
for (const value of [NaN, Infinity, -1]) {
    strict_1.default.throws(() => (0, idle_1.calculateIdleClaim)({ ...activity, ratePerHour: value }, now), /invalid_activity/);
    strict_1.default.throws(() => (0, idle_1.calculateIdleClaim)({ ...activity, xpPerHour: value }, now), /invalid_activity/);
    strict_1.default.throws(() => (0, idle_1.calculateIdleClaim)({ ...activity, maxOfflineHours: value }, now), /invalid_activity/);
}
strict_1.default.throws(() => (0, idle_1.calculateIdleClaim)(activity, NaN), /invalid_claim_time/);
strict_1.default.throws(() => (0, idle_1.calculateIdleClaim)({ ...activity, ratePerHour: Number.MAX_VALUE }, now), /invalid_reward/);
const recipe = { id: 'bar', levelReq: 1, skillId: 'smithing', xp: 10, ingredients: [{ itemId: 'ore', quantity: 2 }], outputs: [{ itemId: 'bar', quantity: 1 }], durationSec: 5 };
strict_1.default.deepEqual((0, crafting_1.validateCraft)(recipe, 1, 2), { ingredients: [{ itemId: 'ore', quantity: 4 }], outputs: [{ itemId: 'bar', quantity: 2 }], xp: 20, durationSec: 10 });
for (const qty of [1.5, NaN, Infinity, -1, 0, 1000])
    strict_1.default.throws(() => (0, crafting_1.validateCraft)(recipe, 1, qty), /invalid_quantity/);
strict_1.default.throws(() => (0, crafting_1.validateCraft)(recipe, NaN, 1), /invalid_skill_level/);
strict_1.default.throws(() => (0, crafting_1.validateCraft)(recipe, 0, 1), /skill_level_too_low/);
strict_1.default.throws(() => (0, crafting_1.validateCraft)({ ...recipe, outputs: [{ itemId: 'bar', quantity: 1.5 }] }, 1, 1), /invalid_recipe/);
strict_1.default.throws(() => (0, crafting_1.validateCraft)({ ...recipe, xp: Number.MAX_SAFE_INTEGER }, 1, 2), /invalid_recipe/);
strict_1.default.equal((0, crafting_1.validateCraft)(recipe, 1, 999).outputs[0].quantity, 999);
console.log('release economy regressions passed');

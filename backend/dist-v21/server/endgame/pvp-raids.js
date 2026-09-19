"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectedScore = expectedScore;
exports.ratingDelta = ratingDelta;
exports.normalizeStat = normalizeStat;
exports.raidPityChance = raidPityChance;
exports.weeklyRaidEligible = weeklyRaidEligible;
function expectedScore(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
function ratingDelta(a, b, resultA, k = 24) { return Math.round(k * (resultA - expectedScore(a, b))); }
function normalizeStat(x) { return Math.max(x.floor, Math.min(x.cap, x.raw)); }
function raidPityChance(pity, base = 0.08, hardPity = 40) { if (pity >= hardPity - 1)
    return 1; return Math.min(0.5, base + pity * 0.012); }
function weeklyRaidEligible(claimed) { return !claimed; }

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskScore = riskScore;
exports.restrictionLevel = restrictionLevel;
exports.shouldFlagEconomy = shouldFlagEconomy;
const weight = { duplicate_claim: 2, impossible_elapsed: 8, market_spam: 3, chat_spam: 2, seed_mismatch: 10, state_version_conflict: 1, rate_limit: 1 };
function riskScore(signals) { return Math.min(100, signals.reduce((s, x) => s + weight[x], 0)); }
function restrictionLevel(score) { return score >= 80 ? 3 : score >= 50 ? 2 : score >= 25 ? 1 : 0; }
function shouldFlagEconomy(generated, sunk, traded, baseline) { const net = generated - sunk; return net > Math.max(baseline * 5, 1000000) || traded > Math.max(baseline * 10, 5000000); }

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateIdleClaim = calculateIdleClaim;
function calculateIdleClaim(a, nowMs) { if (nowMs <= a.lastClaimAtMs)
    throw new Error('invalid_claim_time'); const maxSec = a.maxOfflineHours * 3600; const elapsedSec = Math.min(maxSec, Math.floor((nowMs - a.lastClaimAtMs) / 1000)); return { elapsedSec, resourceAmount: Math.floor(a.ratePerHour * elapsedSec / 3600), xp: Math.floor(a.xpPerHour * elapsedSec / 3600), newLastClaimAtMs: a.lastClaimAtMs + elapsedSec * 1000 }; }

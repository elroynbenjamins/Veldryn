"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coop_live_lobby_1 = require("../src/core/coop-live-lobby");
const check = { readyCheckId: 'check', rosterRevision: 1, status: 'open', closesAtMs: 20000, refillEndsAtMs: null, serverNow: 12001, members: [] };
function equal(actual, expected) { if (actual !== expected)
    throw new Error(`Expected ${expected}, got ${actual}`); }
equal((0, coop_live_lobby_1.readySecondsRemaining)(check), 8);
equal((0, coop_live_lobby_1.readySecondsRemaining)({ ...check, serverNow: 20001 }), 0);
equal((0, coop_live_lobby_1.readySecondsRemaining)({ ...check, status: 'committed' }), 0);
equal((0, coop_live_lobby_1.readySecondsRemaining)({ ...check, status: 'refilling', refillEndsAtMs: 72001 }), 60);
equal((0, coop_live_lobby_1.readySecondsRemaining)({ ...check, status: 'requeued', refillEndsAtMs: 72001 }), 0);
console.log('PASS Live lobby uses database time for ready/refill deadlines and stops terminal countdowns');

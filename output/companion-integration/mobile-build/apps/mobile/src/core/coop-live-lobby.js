"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readySecondsRemaining = readySecondsRemaining;
function readySecondsRemaining(view) {
    const end = view.status === 'refilling' ? view.refillEndsAtMs : view.closesAtMs;
    return end === null || !['open', 'refilling'].includes(view.status) ? 0 : Math.max(0, Math.ceil((end - view.serverNow) / 1000));
}

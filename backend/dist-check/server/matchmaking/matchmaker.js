"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compositionPenalty = compositionPenalty;
exports.matchScore = matchScore;
exports.chooseBestMatch = chooseBestMatch;
exports.validateFrozenEcho = validateFrozenEcho;
function compositionPenalty(roles) {
    const counts = { tank: 0, damage: 0, support: 0 };
    roles.forEach(r => counts[r]++);
    return Math.abs(counts.tank - 1) * 25 + Math.abs(counts.damage - 2) * 12 + Math.abs(counts.support - 1) * 25;
}
function matchScore(ts, nowMs) {
    if (ts.length !== 4)
        return -Infinity;
    const avg = ts.reduce((a, b) => a + b.powerIndex, 0) / 4;
    const spread = Math.max(...ts.map(t => t.powerIndex)) - Math.min(...ts.map(t => t.powerIndex));
    const waitBonus = ts.reduce((a, t) => a + Math.min(20, (nowMs - t.createdAtMs) / 30000), 0);
    return 100 - compositionPenalty(ts.map(t => t.role)) - spread / Math.max(1, avg) * 40 + waitBonus;
}
function chooseBestMatch(queue, nowMs) {
    if (queue.length < 4)
        return null;
    let best = null;
    for (let a = 0; a < queue.length - 3; a++)
        for (let b = a + 1; b < queue.length - 2; b++)
            for (let c = b + 1; c < queue.length - 1; c++)
                for (let d = c + 1; d < queue.length; d++) {
                    const set = [queue[a], queue[b], queue[c], queue[d]], score = matchScore(set, nowMs);
                    if (!best || score > best.score)
                        best = { ticketIds: set.map(x => x.id), score, rolePattern: set.map(x => x.role[0].toUpperCase()).join('-') };
                }
    return best;
}
function validateFrozenEcho(profileVersion, recruitVersion) { if (profileVersion !== recruitVersion)
    throw new Error('echo_version_mismatch'); return true; }

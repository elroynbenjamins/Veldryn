"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancementFeedback = enhancementFeedback;
exports.newlyConfirmedIds = newlyConfirmedIds;
/** Messages derive from committed transitions, never from clicking an action. */
function enhancementFeedback(before, after) {
    if (before.itemId !== after.itemId)
        return null;
    if (after.rank > before.rank)
        return { message: `Equipment upgraded to +${after.rank}.`, tone: 'success' };
    if (after.failures > before.failures)
        return { message: 'Tempering attempt complete. Rank unchanged.', tone: 'info' };
    if (before.gemIds.join('|') !== after.gemIds.join('|'))
        return { message: 'Gem sockets updated.', tone: 'success' };
    return null;
}
function newlyConfirmedIds(before, after) {
    const previous = new Set(before);
    return [...new Set(after)].filter(id => !previous.has(id));
}

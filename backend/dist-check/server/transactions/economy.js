"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIdleCommit = validateIdleCommit;
exports.requiredMarketReserve = requiredMarketReserve;
function validateIdleCommit(x) {
    if (!x.characterId || !x.idempotencyKey || !x.activityId)
        throw new Error('missing_identity');
    if (!Number.isInteger(x.elapsedSec) || x.elapsedSec < 0 || x.elapsedSec > 86400)
        throw new Error('invalid_elapsed');
    if (!Number.isInteger(x.resourceAmount) || x.resourceAmount < 0 || !Number.isInteger(x.xp) || x.xp < 0)
        throw new Error('invalid_reward');
    return x;
}
function requiredMarketReserve(x) {
    if (x.unitPrice <= 0 || !Number.isInteger(x.quantity) || x.quantity <= 0)
        throw new Error('invalid_order');
    const gross = x.unitPrice * x.quantity;
    const listingFee = Math.floor(gross * x.listingFeeRate);
    return x.side === 'buy' ? { gold: gross + listingFee, items: 0, listingFee } : { gold: listingFee, items: x.quantity, listingFee };
}

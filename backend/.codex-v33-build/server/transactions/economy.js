"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIdleCommit = validateIdleCommit;
function validateIdleCommit(x) {
    if (!x.characterId || !x.idempotencyKey || !x.activityId)
        throw new Error('missing_identity');
    if (!Number.isInteger(x.elapsedSec) || x.elapsedSec < 0 || x.elapsedSec > 86400)
        throw new Error('invalid_elapsed');
    if (!Number.isInteger(x.resourceAmount) || x.resourceAmount < 0 || !Number.isInteger(x.xp) || x.xp < 0)
        throw new Error('invalid_reward');
    return x;
}

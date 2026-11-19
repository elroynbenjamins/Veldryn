"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayGuard = void 0;
exports.requestFingerprint = requestFingerprint;
const node_crypto_1 = require("node:crypto");
function requestFingerprint(accountId, action, key, payload) { if (!accountId || !action || key.length < 8)
    throw new Error('invalid_idempotency_input'); return (0, node_crypto_1.createHash)('sha256').update(`${accountId}|${action}|${key}|${JSON.stringify(payload)}`).digest().toString('hex'); }
class ReplayGuard {
    ttlMs;
    seen = new Map();
    constructor(ttlMs = 300000) {
        this.ttlMs = ttlMs;
    }
    accept(fp, now = Date.now()) { for (const [k, t] of this.seen)
        if (t <= now)
            this.seen.delete(k); if (this.seen.has(fp))
        return false; this.seen.set(fp, now + this.ttlMs); return true; }
}
exports.ReplayGuard = ReplayGuard;

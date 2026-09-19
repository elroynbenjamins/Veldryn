"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionRequestFingerprint = companionRequestFingerprint;
exports.runCompanionCommand = runCompanionCommand;
function stable(value) { if (value === null || typeof value !== 'object')
    return JSON.stringify(value); if (Array.isArray(value))
    return `[${value.map(stable).join(',')}]`; const o = value; return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`; }
function companionRequestFingerprint(action, payload) { const text = `${action}|${stable(payload)}`; let a = 2166136261 >>> 0, b = 0x9e3779b9; for (const ch of text) {
    a ^= ch.charCodeAt(0);
    a = Math.imul(a, 16777619) >>> 0;
    b = (Math.imul(b ^ a, 2246822519) + ch.charCodeAt(0)) >>> 0;
} return `${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`; }
async function runCompanionCommand(repo, accountId, action, requestId, payload, work) { if (!accountId)
    throw new Error('unauthenticated'); if (!requestId || requestId.length < 2)
    throw new Error('request_id_required'); return repo.transact({ accountId, action, requestId, fingerprint: companionRequestFingerprint(action, payload) }, work); }

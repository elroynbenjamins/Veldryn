"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGuildCreate = parseGuildCreate;
exports.parseGuildProfileUpdate = parseGuildProfileUpdate;
function obj(v) { if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new Error('invalid_request_body'); return v; }
;
function text(v, k, min = 1, max = 128) { if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max)
    throw new Error(`invalid_${k}`); return v.trim(); }
;
function policy(v) { const p = text(v, 'joinPolicy'); if (!['open', 'apply', 'invite'].includes(p))
    throw new Error('invalid_joinPolicy'); return p; }
;
function int(v, k, min, max) { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max)
    throw new Error(`invalid_${k}`); return v; }
function parseGuildCreate(v) { const r = obj(v); return { requestId: text(r.requestId, 'requestId', 8), characterId: text(r.characterId, 'characterId'), name: text(r.name, 'name', 3, 15), description: typeof r.description === 'string' ? r.description.trim() : '', language: text(r.language ?? 'English', 'language', 2, 24), crestId: text(r.crestId ?? 'oak', 'crestId', 2, 32), joinPolicy: policy(r.joinPolicy ?? 'open'), minimumLevel: int(r.minimumLevel ?? 1, 'minimumLevel', 1, 100) }; }
function parseGuildProfileUpdate(v) { const r = obj(v); return { requestId: text(r.requestId, 'requestId', 8), description: typeof r.description === 'string' ? r.description.trim() : '', language: text(r.language ?? 'English', 'language', 2, 24), crestId: text(r.crestId ?? 'oak', 'crestId', 2, 32), joinPolicy: policy(r.joinPolicy ?? 'open'), minimumLevel: int(r.minimumLevel ?? 1, 'minimumLevel', 1, 100) }; }

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAchievementClaimBody = parseAchievementClaimBody;
exports.parseAchievementShowcaseBody = parseAchievementShowcaseBody;
function object(input) { if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('INVALID_REQUEST'); return input; }
function requestId(value) { if (typeof value !== 'string' || value.trim().length < 8 || value.trim().length > 128)
    throw new Error('INVALID_REQUEST_ID'); return value.trim(); }
function parseAchievementClaimBody(input) { const row = object(input); return { requestId: requestId(row.requestId) }; }
function parseAchievementShowcaseBody(input) { const row = object(input), ids = Array.isArray(row.achievementIds) ? row.achievementIds.map(value => typeof value === 'string' ? value.trim() : '') : []; if (ids.length > 3 || new Set(ids).size !== ids.length || ids.some(id => !id))
    throw new Error('ACHIEVEMENT_SHOWCASE_INVALID'); return { requestId: requestId(row.requestId), achievementIds: ids }; }

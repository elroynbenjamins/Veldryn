"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProfileUpdateRequest = parseProfileUpdateRequest;
function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid_request_body'); return value; }
function text(value, key, min = 1, max = 128) { if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    throw new Error(`invalid_${key}`); return value.trim(); }
function optionalId(value, key) { return value === undefined || value === null || value === '' ? undefined : text(value, key); }
function parseProfileUpdateRequest(value) { const row = object(value), visibility = text(row.visibility, 'visibility'); if (!['public', 'friends', 'private'].includes(visibility))
    throw new Error('invalid_visibility'); return { requestId: text(row.requestId, 'requestId', 8), displayName: text(row.displayName, 'displayName', 3, 20), activeCharacterId: text(row.activeCharacterId, 'activeCharacterId'), titleId: text(row.titleId, 'titleId'), backgroundId: text(row.backgroundId, 'backgroundId'), borderId: optionalId(row.borderId, 'borderId'), petId: optionalId(row.petId, 'petId'), visibility }; }

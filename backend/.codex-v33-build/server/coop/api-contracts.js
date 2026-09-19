"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCoopRunRequest = parseCoopRunRequest;
exports.parseCoopDecisionCommand = parseCoopDecisionCommand;
exports.parseCoopReadyCommand = parseCoopReadyCommand;
exports.parseCoopChatCommand = parseCoopChatCommand;
function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid_request_body'); return value; }
function text(row, key, min = 1, max = 128) { const value = row[key]; if (typeof value !== 'string' || value.length < min || value.length > max)
    throw new Error(`invalid_${key}`); return value; }
function integer(row, key, min, max) { const value = row[key]; if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    throw new Error(`invalid_${key}`); return value; }
function rejectClientAuthority(row) { for (const key of ['role', 'stats', 'statSnapshot', 'loadoutSnapshot', 'normalizedReadiness'])
    if (key in row)
        throw new Error(`client_${key}_forbidden`); }
function parseCoopRunRequest(value, mode) {
    const row = object(value);
    rejectClientAuthority(row);
    return { requestId: text(row, 'requestId', 8), mode, dungeonId: text(row, 'dungeonId'), tier: integer(row, 'tier', 1, 5), characterId: text(row, 'characterId'), loadoutId: text(row, 'loadoutId'), loadoutRevision: integer(row, 'loadoutRevision', 1, Number.MAX_SAFE_INTEGER) };
}
function parseCoopDecisionCommand(value) {
    const row = object(value);
    rejectClientAuthority(row);
    return { requestId: text(row, 'requestId', 8), decisionId: text(row, 'decisionId'), decisionRevision: integer(row, 'decisionRevision', 1, Number.MAX_SAFE_INTEGER), optionId: text(row, 'optionId') };
}
function parseCoopReadyCommand(value) {
    const row = object(value);
    rejectClientAuthority(row);
    if (typeof row.accept !== 'boolean')
        throw new Error('invalid_accept');
    return { requestId: text(row, 'requestId', 8), rosterRevision: integer(row, 'rosterRevision', 1, Number.MAX_SAFE_INTEGER), accept: row.accept };
}
function parseCoopChatCommand(value) {
    const row = object(value);
    return { requestId: text(row, 'requestId', 8), text: text(row, 'text', 1, 300) };
}

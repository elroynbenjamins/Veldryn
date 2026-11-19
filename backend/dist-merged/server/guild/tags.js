"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGuildTag = normalizeGuildTag;
exports.validateGuildTag = validateGuildTag;
exports.guildTagAvailability = guildTagAvailability;
const RESERVED = new Set(['ADM', 'MOD', 'DEV', 'SYS', 'BOT', 'NPC', 'SUP']);
const BLOCKED = new Set(['SEX', 'XXX', 'CUM', 'FUK', 'FCK', 'ASS', 'TIT', 'DIC', 'DCK', 'CNT', 'KKK', 'NAZ', 'NIG', 'FAG']);
function normalizeGuildTag(input) { return input.trim().toUpperCase(); }
function validateGuildTag(input, extraBlocked = new Set()) {
    const tag = normalizeGuildTag(input);
    if (!/^[A-Z]{3}$/.test(tag))
        throw new Error('guild_tag_invalid_format');
    if (RESERVED.has(tag))
        throw new Error('guild_tag_reserved');
    if (BLOCKED.has(tag) || extraBlocked.has(tag))
        throw new Error('guild_tag_blocked');
    return tag;
}
function guildTagAvailability(input, permanentlyClaimed, extraBlocked = new Set()) {
    let normalizedTag = normalizeGuildTag(input);
    try {
        normalizedTag = validateGuildTag(input, extraBlocked);
    }
    catch (error) {
        const value = String(error);
        return { normalizedTag, available: false, reason: value.includes('reserved') ? 'reserved' : value.includes('blocked') ? 'blocked' : 'invalid_format' };
    }
    return permanentlyClaimed.has(normalizedTag) ? { normalizedTag, available: false, reason: 'taken' } : { normalizedTag, available: true };
}

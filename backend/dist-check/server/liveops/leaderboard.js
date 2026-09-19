"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLeaderboardPage = buildLeaderboardPage;
const party_events_1 = require("./party-events");
/**
 * Global ranking is computed first. Friends/Guild views are filters over those global entries, preserving global rank.
 * This prevents a separate reward ladder from being accidentally created for small private cohorts.
 */
function buildLeaderboardPage(allEntries, audience, visiblePartyIds, limit = 100, offset = 0) {
    const ranked = (0, party_events_1.rankPartyEntries)(allEntries);
    const filtered = audience === 'global' ? ranked : ranked.filter((entry) => visiblePartyIds?.has(entry.partyId));
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const safeOffset = Math.max(0, Math.floor(offset));
    const slice = filtered.slice(safeOffset, safeOffset + safeLimit);
    return {
        audience,
        entries: slice,
        totalRankedParties: ranked.length,
        ...(safeOffset + safeLimit < filtered.length ? { nextCursor: String(safeOffset + safeLimit) } : {}),
    };
}

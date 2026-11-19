"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_BOSS_RANK_METRICS = exports.PARTY_EVENT_LEADERBOARDS_RELEASED = void 0;
exports.snapshotPartyLeaderboardName = snapshotPartyLeaderboardName;
exports.projectVerifiedPartyBossScore = projectVerifiedPartyBossScore;
exports.rankVerifiedPartyBossEntries = rankVerifiedPartyBossEntries;
exports.PARTY_EVENT_LEADERBOARDS_RELEASED = false;
exports.PARTY_BOSS_RANK_METRICS = ['damage', 'depth', 'support', 'shielding', 'mechanics'];
/** Before party naming exists, snapshot a leader-based label at settlement. */
function snapshotPartyLeaderboardName(partyName, leaderCharacterName) {
    const custom = partyName?.trim().replace(/\s+/g, ' ');
    const leader = leaderCharacterName?.trim().replace(/\s+/g, ' ');
    if (custom && custom.length <= 64)
        return custom;
    if (leader)
        return (leader.slice(0, 46) + "'s Party").slice(0, 64);
    return 'Unnamed Party';
}
function projectVerifiedPartyBossScore(input) {
    if (!input.eventId || !input.partyId || !input.partyName.trim()
        || input.partyName.length > 64 || !Number.isFinite(input.completedAtMs)
        || !Number.isFinite(input.eventStartsAtMs)
        || !Number.isInteger(input.partySize) || input.partySize < 2 || input.partySize > 4
        || input.result.contributions.length !== input.partySize
        || input.result.tiers.length !== input.result.highestTierReached
        || input.result.tiersCleared > input.result.highestTierReached
        || !Number.isFinite(input.result.totalBossDamage)
        || input.result.totalBossDamage < 0)
        throw new Error('invalid_party_boss_ranking_source');
    const total = (field) => {
        let value = 0;
        for (const row of input.result.contributions) {
            const n = row[field];
            if (!Number.isFinite(n) || n < 0)
                throw new Error('invalid_party_boss_contribution');
            value += n;
        }
        return Math.round(value);
    };
    const healed = total('healing');
    const shielding = total('shielding');
    return {
        eventId: input.eventId, partyId: input.partyId,
        partyName: input.partyName.trim(), eventStartsAtMs: input.eventStartsAtMs,
        family: input.family, difficulty: input.difficulty, partySize: input.partySize,
        damage: Math.round(input.result.totalBossDamage),
        depth: input.result.tiersCleared,
        healed, shielding, absorbed: total('absorbedDamage'), interrupts: total('interrupts'),
        support: healed + shielding,
        completedAtMs: input.completedAtMs,
    };
}
/** Ranks identical scores as ties; event and difficulty are always isolated. */
function rankVerifiedPartyBossEntries(rows, scope) {
    if (!exports.PARTY_BOSS_RANK_METRICS.includes(scope.metric)
        || !['standard', 'veteran', 'heroic'].includes(scope.difficulty)
        || !Number.isFinite(scope.eventStartsAtMs))
        throw new Error('invalid_party_boss_rank_scope');
    const limit = scope.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new Error('invalid_party_boss_rank_limit');
    const filtered = rows.filter(row => row.eventStartsAtMs === scope.eventStartsAtMs
        && row.difficulty === scope.difficulty
        && (scope.partySize === undefined || row.partySize === scope.partySize));
    const score = (row) => scope.metric === 'damage' ? row.damage
        : scope.metric === 'depth' ? row.depth
            : scope.metric === 'support' ? row.support
                : scope.metric === 'shielding' ? row.absorbed + row.shielding
                    : row.interrupts;
    // Ensure a party has only one result; no farming or re-submission.
    if (new Set(filtered.map(row => row.eventId)).size !== filtered.length)
        throw new Error('duplicate_party_boss_rank_event');
    filtered.sort((a, b) => score(b) - score(a) || b.depth - a.depth || b.damage - a.damage
        || a.completedAtMs - b.completedAtMs || a.eventId.localeCompare(b.eventId));
    let rank = 0, prior;
    return filtered.map((row, index) => {
        const value = score(row);
        if (prior !== value)
            rank = index + 1;
        prior = value;
        return { ...row, rank, metric: scope.metric, score: value };
    }).slice(0, limit);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankWorldBossCandidates = rankWorldBossCandidates;
exports.worldBossPrestigeTier = worldBossPrestigeTier;
/** Echo encounters never enter candidates. Ranking is prestige-only; power rewards must not scale sharply with rank. */
function rankWorldBossCandidates(rows) {
    return [...rows]
        .filter(x => x.validAttempts > 0 && x.raidImpact > 0)
        .sort((a, b) => b.raidImpact - a.raidImpact || b.appliedGlobalDamage - a.appliedGlobalDamage || b.bestAttemptImpact - a.bestAttemptImpact || a.lastScoredAttemptAtMs - b.lastScoredAttemptAtMs || a.accountId.localeCompare(b.accountId))
        .map((row, index) => ({ ...row, finalRank: index + 1 }));
}
function worldBossPrestigeTier(rank, totalQualifiers) {
    if (rank < 1 || totalQualifiers < 1 || rank > totalQualifiers)
        return null;
    if (rank <= 10)
        return 'top10';
    if (rank <= 100)
        return 'top100';
    if (rank / totalQualifiers <= 0.10)
        return 'top10pct';
    return 'qualified';
}

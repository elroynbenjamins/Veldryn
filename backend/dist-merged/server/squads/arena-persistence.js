"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryArenaRuntimeRepository = void 0;
const seasons_1 = require("./seasons");
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const week = (ms) => { const d = new Date(ms), n = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() - n + 1); return d.toISOString().slice(0, 10); };
const fresh = (seasonId, accountId, nowMs) => ({ seasonId, accountId, rating: 1000, wins: 0, losses: 0, defenseWins: 0, bonusWinsDay: 0, bonusWinsWeek: 0, defenseRewardsDay: 0, dayKey: day(nowMs), weekKey: week(nowMs), rewardClaimed: false, updatedAtMs: nowMs });
function reset(state, nowMs) { const next = { ...state }; if (next.dayKey !== day(nowMs)) {
    next.dayKey = day(nowMs);
    next.bonusWinsDay = 0;
    next.defenseRewardsDay = 0;
} if (next.weekKey !== week(nowMs)) {
    next.weekKey = week(nowMs);
    next.bonusWinsWeek = 0;
} return next; }
class MemoryArenaRuntimeRepository {
    states = new Map();
    defenseRows = new Map();
    matches = new Map();
    rewards = new Map();
    receipts = new Map();
    claimReceipts = new Map();
    async season(nowMs) { return (0, seasons_1.arenaSeasonWindow)(nowMs); }
    async accountState(seasonId, accountId, nowMs) { const key = `${seasonId}:${accountId}`, state = reset(this.states.get(key) ?? fresh(seasonId, accountId, nowMs), nowMs); this.states.set(key, state); return structuredClone(state); }
    async publishDefense(input) { const receipt = `${input.record.accountId}:${input.requestId}`, prior = this.receipts.get(receipt); if (prior) {
        const row = this.defenseRows.get(prior);
        if (!row || row.snapshot.snapshotHash !== input.record.snapshot.snapshotHash)
            throw new Error('idempotency_conflict');
        return structuredClone(row);
    } const key = `${input.record.seasonId}:${input.record.accountId}`; this.defenseRows.set(key, structuredClone(input.record)); this.receipts.set(receipt, key); return structuredClone(input.record); }
    async defense(seasonId, accountId) { const row = this.defenseRows.get(`${seasonId}:${accountId}`); if (!row)
        return undefined; const state = this.states.get(`${seasonId}:${accountId}`); return structuredClone({ ...row, rating: state?.rating ?? row.rating }); }
    async defenses(seasonId) { return [...this.defenseRows.values()].filter(row => row.seasonId === seasonId).map(row => structuredClone({ ...row, rating: this.states.get(`${seasonId}:${row.accountId}`)?.rating ?? row.rating })); }
    async recentOpponents(seasonId, accountId, limit) { return [...this.matches.values()].filter(row => row.seasonId === seasonId && (row.attackerAccountId === accountId || row.defenderAccountId === accountId)).sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, limit).map(row => row.attackerAccountId === accountId ? row.defenderAccountId : row.attackerAccountId); }
    async matchByRequest(seasonId, accountId, requestId) { const row = [...this.matches.values()].find(item => item.seasonId === seasonId && item.attackerAccountId === accountId && item.requestId === requestId); return row ? structuredClone(row) : undefined; }
    async commitMatch(input) { const prior = await this.matchByRequest(input.record.seasonId, input.record.attackerAccountId, input.record.requestId); if (prior) {
        if (prior.result.digest !== input.record.result.digest)
            throw new Error('idempotency_conflict');
        return { match: prior, attackerState: await this.accountState(prior.seasonId, prior.attackerAccountId, prior.createdAtMs), defenderState: await this.accountState(prior.seasonId, prior.defenderAccountId, prior.createdAtMs) };
    } ; if (input.record.attackerAccountId === input.record.defenderAccountId || input.record.attackerRatingDelta + input.record.defenderRatingDelta !== 0)
        throw new Error('arena_rating_not_zero_sum'); const a = reset(this.states.get(`${input.record.seasonId}:${input.record.attackerAccountId}`) ?? fresh(input.record.seasonId, input.record.attackerAccountId, input.record.createdAtMs), input.record.createdAtMs), d = reset(this.states.get(`${input.record.seasonId}:${input.record.defenderAccountId}`) ?? fresh(input.record.seasonId, input.record.defenderAccountId, input.record.createdAtMs), input.record.createdAtMs); if (a.rating !== input.record.attackerRatingBefore || d.rating !== input.record.defenderRatingBefore)
        throw new Error('arena_rating_changed'); const won = input.record.result.winnerAccountId === a.accountId; if ((won && input.record.attackerRatingDelta < 0) || (!won && input.record.attackerRatingDelta > 0))
        throw new Error('arena_rating_direction_invalid'); if (a.rating + input.record.attackerRatingDelta < 0 || d.rating + input.record.defenderRatingDelta < 0)
        throw new Error('arena_rating_floor_invalid'); a.rating += input.record.attackerRatingDelta; d.rating += input.record.defenderRatingDelta; won ? a.wins++ : a.losses++; if (!won)
        d.defenseWins++; let ar, dr; if (won && input.attackerBonusEligible && (0, seasons_1.rankedBonusEligible)(a.bonusWinsDay, a.bonusWinsWeek)) {
        a.bonusWinsDay++;
        a.bonusWinsWeek++;
        ar = this.reward(a, 'ranked_win', input.record.id);
    } if (!won && input.defenderBonusEligible && (0, seasons_1.defenseRewardEligible)(d.defenseRewardsDay)) {
        d.defenseRewardsDay++;
        dr = this.reward(d, 'defense_win', input.record.id);
    } a.updatedAtMs = d.updatedAtMs = input.record.createdAtMs; this.states.set(`${a.seasonId}:${a.accountId}`, a); this.states.set(`${d.seasonId}:${d.accountId}`, d); const match = { ...structuredClone(input.record), ...(ar ? { attackerRewardEntitlementId: ar } : {}), ...(dr ? { defenderRewardEntitlementId: dr } : {}) }; this.matches.set(match.id, match); return { match: structuredClone(match), attackerState: structuredClone(a), defenderState: structuredClone(d) }; }
    reward(state, kind, sourceId) { const id = `arena-ent-${kind}-${state.seasonId}-${state.accountId}-${sourceId}`, prior = this.rewards.get(id); if (prior)
        return prior.id; const row = { id, seasonId: state.seasonId, accountId: state.accountId, kind, rewardTier: (0, seasons_1.seasonRewardTier)(state.rating), catalogVersion: 'arena-rewards-v1', sourceId, createdAtMs: state.updatedAtMs }; this.rewards.set(id, row); return id; }
    async history(accountId, limit) { return [...this.matches.values()].filter(row => row.attackerAccountId === accountId || row.defenderAccountId === accountId).sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, limit).map(row => structuredClone(row)); }
    async pendingRewards(accountId) { return [...this.rewards.values()].filter(row => row.accountId === accountId && !row.claimedAtMs).sort((a, b) => a.createdAtMs - b.createdAtMs).map(row => structuredClone(row)); }
    async ensureSeasonReward(input) { const state = await this.accountState(input.seasonId, input.accountId, input.nowMs), id = `arena-ent-season-${input.seasonId}-${input.accountId}-${input.sourceId}`, prior = this.rewards.get(id); if (prior)
        return structuredClone(prior); const row = { id, seasonId: input.seasonId, accountId: input.accountId, kind: 'season', rewardTier: (0, seasons_1.seasonRewardTier)(input.rating), catalogVersion: 'arena-rewards-v1', sourceId: input.sourceId, createdAtMs: input.nowMs }; this.rewards.set(id, row); return structuredClone(row); }
    async claimReward(accountId, id, requestId, nowMs) { const receiptKey = `${accountId}:${requestId}`, priorId = this.claimReceipts.get(receiptKey); if (priorId && priorId !== id)
        throw new Error('idempotency_conflict'); const row = this.rewards.get(id); if (!row)
        throw new Error('arena_reward_not_found'); if (row.accountId !== accountId)
        throw new Error('not_reward_recipient'); if (row.claimedAtMs && row.claimRequestId !== requestId)
        throw new Error('arena_reward_already_claimed'); row.claimedAtMs ??= nowMs; row.claimRequestId ??= requestId; this.claimReceipts.set(receiptKey, id); return structuredClone(row); }
}
exports.MemoryArenaRuntimeRepository = MemoryArenaRuntimeRepository;

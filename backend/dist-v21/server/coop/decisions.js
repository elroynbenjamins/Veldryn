"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveDecisionService = exports.MemoryDecisionRepository = void 0;
exports.progressionAfterDecision = progressionAfterDecision;
const rng_1 = require("../expeditions/rng");
const config_1 = require("./config");
class MemoryDecisionRepository {
    rows = new Map();
    save(row) { this.rows.set(row.id, structuredClone(row)); }
    get(id) { const row = this.rows.get(id); return row ? structuredClone(row) : undefined; }
}
exports.MemoryDecisionRepository = MemoryDecisionRepository;
class LiveDecisionService {
    repository;
    serverSecret;
    constructor(repository, serverSecret) {
        this.repository = repository;
        this.serverSecret = serverSecret;
    }
    open(input) {
        if (new Set(input.optionIds).size < 3 || input.optionIds.length < 3)
            throw new Error('insufficient_decision_options');
        if (new Set(input.eligibleAccountIds).size !== 4)
            throw new Error('invalid_decision_roster');
        if (!input.optionIds.includes(input.balancedFallbackOptionId))
            throw new Error('invalid_fallback');
        const row = { ...structuredClone(input), closesAtMs: input.openedAtMs + config_1.COOP_ROGUELITE_CONFIG.liveVoteMs, status: 'open', votes: {}, receipts: {} };
        this.repository.save(row);
        return row;
    }
    vote(input) {
        const row = this.required(input.decisionId);
        const receipt = row.receipts[`${input.accountId}:${input.requestId}`];
        const payload = `${input.revision}:${input.optionId}`;
        if (receipt) {
            if (receipt.payload !== payload)
                throw new Error('idempotency_conflict');
            return row;
        }
        if (row.status !== 'open' || input.nowMs >= row.closesAtMs)
            throw new Error('vote_closed');
        if (input.revision !== row.revision)
            throw new Error('stale_decision');
        if (!row.eligibleAccountIds.includes(input.accountId))
            throw new Error('not_participant');
        if (!row.optionIds.includes(input.optionId))
            throw new Error('invalid_option');
        row.votes[input.accountId] = input.optionId;
        row.receipts[`${input.accountId}:${input.requestId}`] = { payload, optionId: input.optionId };
        const votes = Object.values(row.votes);
        if (votes.length === 4 && new Set(votes).size === 1)
            this.commit(row, votes[0], 'unanimous', 4);
        else
            this.repository.save(row);
        return structuredClone(row);
    }
    resolveDeadline(decisionId, nowMs) {
        const row = this.required(decisionId);
        if (row.status === 'resolved')
            return row;
        if (nowMs < row.closesAtMs)
            throw new Error('decision_deadline_not_reached');
        const counts = Object.fromEntries(row.optionIds.map(option => [option, Object.values(row.votes).filter(vote => vote === option).length]));
        const highest = Math.max(...Object.values(counts));
        if (highest === 0) {
            this.commit(row, row.balancedFallbackOptionId, 'no_votes', 0);
            return this.required(decisionId);
        }
        const tied = row.optionIds.filter(option => counts[option] === highest).sort();
        const selected = tied.length === 1 ? tied[0] : tied[(0, rng_1.deterministicInt)(this.serverSecret, 0, tied.length - 1, 'live-vote-v1', row.tieKey, row.id, row.revision)];
        this.commit(row, selected, tied.length === 1 ? 'plurality' : 'tie', highest);
        return this.required(decisionId);
    }
    commit(row, selected, reason, count) { if (row.status === 'resolved')
        return; row.status = 'resolved'; row.selectedOptionId = selected; row.resolutionReason = reason; row.resolutionCount = count; this.repository.save(row); }
    required(id) { const row = this.repository.get(id); if (!row)
        throw new Error('decision_not_found'); return row; }
}
exports.LiveDecisionService = LiveDecisionService;
function progressionAfterDecision(previousZeroInputDecisions, decision) { const zero = decision.resolutionReason === 'no_votes' ? previousZeroInputDecisions + 1 : 0; return { zeroInputDecisions: zero, pause: zero >= 2 }; }

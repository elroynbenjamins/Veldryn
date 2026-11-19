"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_FINALE_READINESS_V3_RELEASED = void 0;
exports.previewPartyEventFinaleReadiness = previewPartyEventFinaleReadiness;
exports.partyEventVoteClosesAt = partyEventVoteClosesAt;
/**
 * Party Events v3: preview-only readiness / finalization contract.
 * Does not mutate stage state, create entitlements or change SQL.
 * Partial-finalist rules are not approved; this projection never grants loot.
 */
const weekly_party_event_runtime_v2_1 = require("./weekly-party-event-runtime-v2");
exports.PARTY_EVENT_FINALE_READINESS_V3_RELEASED = false;
function previewPartyEventFinaleReadiness(input) {
    if (!Number.isFinite(input.nowMs) || !Number.isFinite(input.eventEndsAtMs))
        throw Error('party_v3_invalid_readiness_time');
    // The existing v2 guard must not conflate preclose preparation with a
    // victory that can only be settled on Day 8.
    const normalized = { ...input.stage, finaleCleared: false, completed: false };
    const evaluation = (0, weekly_party_event_runtime_v2_1.evaluateWeeklyPartyStage)(normalized);
    const fullPreparation = input.stage.stage === 3 && evaluation.missingPoints === 0
        && evaluation.pendingSupplies.length === 0 && input.stage.voteResolved;
    const closed = input.nowMs >= input.eventEndsAtMs;
    if (!closed && input.bossResultCommitted)
        throw Error('party_v3_premature_boss_result');
    const state = !closed
        ? fullPreparation ? 'ready_for_finale' : 'in_progress'
        : input.bossResultCommitted
            ? fullPreparation ? 'boss_settled_full' : 'boss_settled_partial'
            : fullPreparation ? 'frozen_full' : 'frozen_partial';
    return {
        state, stage: input.stage.stage, fullPreparation, eventClosed: closed,
        bossSettled: input.bossResultCommitted,
        legacyStageStatus: evaluation.status, missingEventPoints: evaluation.missingPoints,
        missingSupplies: evaluation.pendingSupplies.reduce((n, o) => n + o.missingQuantity, 0),
        eligibleForRewardGrant: false,
    };
}
/** Independent close-time policy: one immutable vote/member, no post-close ballots.
 * This is only a deadline projection; v2 database votes remain authoritative. */
function partyEventVoteClosesAt(openedAtMs, eventEndsAtMs) {
    if (!Number.isFinite(openedAtMs) || !Number.isFinite(eventEndsAtMs)
        || openedAtMs >= eventEndsAtMs)
        throw Error('party_v3_invalid_vote_window');
    return Math.min(openedAtMs + 6 * 3600_000, eventEndsAtMs);
}

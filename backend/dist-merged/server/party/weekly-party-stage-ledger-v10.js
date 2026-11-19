"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_STAGE_LEDGER_V10_RELEASED = void 0;
exports.partyEventStageChecksumV10 = partyEventStageChecksumV10;
exports.projectLockedPartyEventStageV10 = projectLockedPartyEventStageV10;
exports.planPartyEventStageReceiptV10 = planPartyEventStageReceiptV10;
/**
 * Party Events v10 — hidden, read-only server-ledger contract.
 *
 * This is a pure validation/projection layer, NOT a database, endpoint, receipt
 * issuer or reward grant. The integration must load each field from locked
 * server-owned rows in one consistent transaction. A checksum detects accidental
 * drift; it is NOT an authentication token or proof of source ownership.
 */
const node_crypto_1 = require("node:crypto");
const role_readiness_1 = require("../coop/role-readiness");
const weekly_party_events_v2_1 = require("./weekly-party-events-v2");
const weekly_party_distinct_finales_v8_1 = require("./weekly-party-distinct-finales-v8");
const weekly_party_family_stages_v9_1 = require("./weekly-party-family-stages-v9");
exports.PARTY_EVENT_STAGE_LEDGER_V10_RELEASED = false;
function invalid(reason) { throw Error('party_event_v10_' + reason); }
const validId = (value) => typeof value === 'string'
    && value.length >= 8 && value.length <= 180 && value.trim() === value;
const validTime = (n) => Number.isSafeInteger(n) && n >= 0;
/** Deterministic checksum for server-persisted projections, not a signature. */
function partyEventStageChecksumV10(value) {
    const canonical = (v) => {
        if (Array.isArray(v))
            return '[' + v.map(canonical).join(',') + ']';
        if (v && typeof v === 'object')
            return '{' + Object.entries(v)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, item]) => JSON.stringify(k) + ':' + canonical(item)).join(',') + '}';
        return JSON.stringify(v);
    };
    return (0, node_crypto_1.createHash)('sha256').update(canonical(JSON.parse(JSON.stringify(value)))).digest('hex');
}
function assertWeek(week, nowMs, openedAtMs) {
    const { eventStartsAtMs: start, eventEndsAtMs: end } = week;
    if (!validId(week.partyId) || !validTime(start) || !validTime(end)
        || !validTime(nowMs) || !validTime(openedAtMs)
        || openedAtMs < start || openedAtMs > nowMs || nowMs >= end)
        invalid('closed_or_invalid_window');
    const cadence = (0, weekly_party_events_v2_1.partyEventCadenceAt)(start);
    if (!cadence.active || cadence.cycleIndex !== week.cycleIndex
        || cadence.eventStartsAtMs !== start || cadence.eventEndsAtMs !== end
        || cadence.family !== week.family || !Number.isSafeInteger(week.seed) || week.seed < 0
        || (0, weekly_party_events_v2_1.selectPartyEventVariation)(week.family, week.seed) !== week.variation
        || !['standard', 'veteran', 'heroic'].includes(week.difficulty))
        invalid('week_identity_mismatch');
    const members = week.roster;
    if (members.length < 2 || members.length > 4
        || new Set(members.map(m => m.accountId)).size !== members.length
        || new Set(members.map(m => m.characterId)).size !== members.length)
        invalid('invalid_enrollment');
    // Party Events allow flexible class-role mixes (2–4 members); every
    // actor role is still checked against its real stored class below.
    const ids = new Set();
    for (const member of members) {
        const l = member.loadout, actor = l.actor;
        if (!validId(member.accountId) || !validId(member.characterId)
            || !validTime(member.joinedAtMs) || member.joinedAtMs > openedAtMs
            || l.accountId !== member.accountId || l.characterId !== member.characterId
            || !validId(l.loadoutId) || !Number.isSafeInteger(l.revision) || l.revision < 0
            || !validTime(l.savedAtMs) || l.savedAtMs < member.joinedAtMs || l.savedAtMs > nowMs
            || actor.id !== member.characterId || ids.has(actor.id)
            || actor.team !== 'players' || !Number.isInteger(actor.level)
            || actor.level < 1 || actor.level > 100 || (0, role_readiness_1.deriveRole)(l.classId) !== actor.role
            || actor.classId !== l.classId
            || !Number.isFinite(actor.stats.maxHp) || actor.stats.maxHp <= 0
            || !Number.isFinite(actor.stats.attackPower) || actor.stats.attackPower < 0)
            invalid('invalid_frozen_loadout');
        const { snapshotHash, ...payload } = l;
        if (!/^[0-9a-f]{64}$/.test(snapshotHash)
            || snapshotHash !== partyEventStageChecksumV10(payload))
            invalid('loadout_checksum_mismatch');
        ids.add(actor.id);
    }
}
function assertStage(input) {
    const { stageRecord: s, week, nowMs } = input;
    if (![1, 2, 3].includes(s.stage))
        invalid('invalid_stage');
    assertWeek(week, nowMs, s.openedAtMs);
    const design = (0, weekly_party_distinct_finales_v8_1.partyEventFamilyDesignV8)(week.family);
    const vote = (v, stage) => {
        if (!v || !validTime(v.lockedAtMs) || v.lockedAtMs < week.eventStartsAtMs
            || v.lockedAtMs > nowMs
            || !(stage === 2 ? design.stage2 : design.stage3).some(option => option.id === v.choice))
            invalid('vote_not_locked');
    };
    if (s.stage === 1 && (s.stage2Vote !== null || s.stage3Vote !== null)
        || s.stage === 2 && s.stage3Vote !== null)
        invalid('future_vote_leak');
    if (s.stage >= 2)
        vote(s.stage2Vote, 2);
    if (s.stage === 3) {
        vote(s.stage3Vote, 3);
        if (s.stage3Vote.lockedAtMs < s.openedAtMs
            || s.stage2Vote.lockedAtMs > s.stage3Vote.lockedAtMs)
            invalid('vote_order_mismatch');
    }
    if (s.stage === 2 && s.stage2Vote.lockedAtMs < s.openedAtMs)
        invalid('vote_order_mismatch');
    const orderKeys = new Set();
    for (const order of s.verifiedOrders) {
        const key = [order.stage, order.kind, order.preparation ?? '', order.itemId].join(':');
        if (orderKeys.has(key) || !validId(order.itemId)
            || ![1, 2, 3].includes(order.stage)
            || !Number.isSafeInteger(order.quantity) || order.quantity < 1
            || !Number.isSafeInteger(order.donatedQuantity)
            || order.donatedQuantity < 0 || order.donatedQuantity > order.quantity)
            invalid('invalid_supply_ledger');
        orderKeys.add(key);
    }
}
/** One consistent, detached read model for v9 story simulation. Never grants EP. */
function projectLockedPartyEventStageV10(input) {
    assertStage(input);
    // Detaching prevents the combat engine/consumer from mutating source rows.
    const snapshot = structuredClone(input);
    const { week, stageRecord: stage } = snapshot;
    const contextHash = partyEventStageChecksumV10({ week, stageRecord: stage });
    const story = (0, weekly_party_family_stages_v9_1.simulatePartyEventStoryStageV9)({
        family: week.family, variation: week.variation, stage: stage.stage,
        difficulty: week.difficulty, seed: week.seed,
        verifiedActors: week.roster.map(m => m.loadout.actor),
        verifiedOrders: stage.verifiedOrders,
        ...(stage.stage >= 2 ? { stage2Choice: stage.stage2Vote.choice } : {}),
        ...(stage.stage === 3 ? { stage3Choice: stage.stage3Vote.choice } : {}),
    });
    return { kind: 'hidden_non_rewarding_locked_stage',
        contextHash, story, eligibleForEventPoints: false,
        eligibleForRewardGrant: false };
}
const ACTION_STAGE = {
    scout_route: 1, secure_approach: 2, support_expedition: 2, prepare_finale: 3,
};
/**
 * Calculates an idempotent receipt INSERT decision. Its caller MUST read
 * evidence from the actual server source ledger and enforce unique
 * (party,week,account,action), (party,week,source) and request IDs atomically
 * in the database; this pure function does not write, reserve or pay anything.
 */
function planPartyEventStageReceiptV10(input) {
    assertStage(input.context);
    const { week, stageRecord, nowMs } = input.context;
    const e = input.evidence;
    if (ACTION_STAGE[input.actionId] !== stageRecord.stage)
        invalid('action_wrong_stage');
    if (!validId(input.requestId) || !validId(e.sourceEventId)
        || e.partyId !== week.partyId
        || !week.roster.some(m => m.accountId === e.accountId
            && m.joinedAtMs <= e.occurredAtMs)
        || !validTime(e.occurredAtMs) || !validTime(e.committedAtMs)
        || e.occurredAtMs < stageRecord.openedAtMs
        || e.occurredAtMs >= week.eventEndsAtMs
        || e.committedAtMs < e.occurredAtMs || e.committedAtMs > nowMs
        || !['verified_combat', 'verified_noncombat'].includes(e.kind)
        || (stageRecord.stage === 1 && e.kind !== 'verified_noncombat'))
        invalid('unverified_or_out_of_window_source');
    const existing = input.existingReceipts.filter(r => r.partyId === week.partyId
        && r.eventStartsAtMs === week.eventStartsAtMs);
    const sameAction = existing.find(r => r.accountId === e.accountId
        && r.actionId === input.actionId);
    if (sameAction) {
        if (sameAction.requestId !== input.requestId
            || sameAction.sourceEventId !== e.sourceEventId
            || sameAction.stage !== stageRecord.stage)
            invalid('action_already_claimed');
        return { status: 'replay', receipt: structuredClone(sameAction), eventPointsGranted: 0 };
    }
    if (existing.some(r => r.sourceEventId === e.sourceEventId
        || r.requestId === input.requestId))
        invalid('reused_source_or_request');
    const receipt = {
        partyId: week.partyId, eventStartsAtMs: week.eventStartsAtMs,
        accountId: e.accountId, stage: stageRecord.stage, actionId: input.actionId,
        sourceEventId: e.sourceEventId, requestId: input.requestId,
        committedAtMs: e.committedAtMs,
        stageContextHash: partyEventStageChecksumV10({ week, stageRecord }),
    };
    return { status: 'new', receipt, eventPointsGranted: 0 };
}

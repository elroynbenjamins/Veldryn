"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const launch_combat_1 = require("../../combat/content/launch-combat");
const weekly_party_events_v2_1 = require("../weekly-party-events-v2");
const weekly_party_distinct_finales_v8_1 = require("../weekly-party-distinct-finales-v8");
const weekly_party_stage_ledger_v10_1 = require("../weekly-party-stage-ledger-v10");
function assert(condition, message) {
    if (!condition)
        throw Error('party_event_v10_test: ' + message);
}
function rejects(callback, expected) {
    let error = '';
    try {
        callback();
    }
    catch (e) {
        error = String(e);
    }
    assert(error.includes(expected), 'expected ' + expected + ' but received ' + error);
}
assert(weekly_party_stage_ledger_v10_1.PARTY_EVENT_STAGE_LEDGER_V10_RELEASED === false, 'hidden flag must remain disabled');
const EPOCH = Date.parse('2026-11-09T00:00:00.000Z');
const DAY = 86_400_000;
const CLASSES = ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'];
function makeWeek(cycle) {
    const start = EPOCH + cycle * 21 * DAY, cadence = (0, weekly_party_events_v2_1.partyEventCadenceAt)(start), seed = cycle + 4;
    const roster = CLASSES.map((name, index) => {
        const accountId = 'account-' + cycle + '-test-' + index;
        const characterId = 'character-' + cycle + '-test-' + index;
        const classId = name.toUpperCase(), savedAtMs = start + 500;
        const actor = { ...(0, launch_combat_1.launchPlayer)(name, 25), id: characterId, classId };
        const payload = { accountId, characterId, classId,
            loadoutId: 'stored-loadout-' + cycle + '-' + index, revision: 1, actor, savedAtMs };
        return { accountId, characterId, joinedAtMs: start,
            loadout: { ...payload, snapshotHash: (0, weekly_party_stage_ledger_v10_1.partyEventStageChecksumV10)(payload) } };
    });
    return { partyId: 'persistent-party-test-' + cycle, cycleIndex: cycle,
        eventStartsAtMs: start, eventEndsAtMs: cadence.eventEndsAtMs,
        family: cadence.family, variation: (0, weekly_party_events_v2_1.selectPartyEventVariation)(cadence.family, seed),
        difficulty: 'standard', seed, roster };
}
function makeContext(week, stage) {
    const start = week.eventStartsAtMs, options = (0, weekly_party_distinct_finales_v8_1.partyEventFamilyDesignV8)(week.family);
    const stageRecord = {
        stage, openedAtMs: start + (stage - 1) * DAY + 2000,
        stage2Vote: stage >= 2 ? { choice: options.stage2[0].id, lockedAtMs: start + DAY + 3000 } : null,
        stage3Vote: stage === 3 ? { choice: options.stage3[1].id, lockedAtMs: start + 2 * DAY + 3000 } : null,
        verifiedOrders: [],
    };
    return { week, stageRecord, nowMs: stageRecord.openedAtMs + 12_000 };
}
let projections = 0;
for (let cycle = 0; cycle < 4; cycle++) {
    const week = makeWeek(cycle);
    for (const stage of [1, 2, 3]) {
        const ctx = makeContext(week, stage);
        const projection = (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)(ctx);
        assert(projection.kind === 'hidden_non_rewarding_locked_stage'
            && projection.eligibleForEventPoints === false
            && projection.eligibleForRewardGrant === false
            && !('rewards' in projection) && !('eventPoints' in projection), 'projection must never mint event points or loot');
        assert(projection.story.stage === stage && projection.story.family === week.family, 'stage identity derives from canonical event');
        assert(projection.contextHash === (0, weekly_party_stage_ledger_v10_1.partyEventStageChecksumV10)({
            week, stageRecord: ctx.stageRecord
        }), 'stable server snapshot checksum');
        assert(projection.story.selectedChoice === (stage === 1 ? null : stage === 2
            ? ctx.stageRecord.stage2Vote.choice : ctx.stageRecord.stage3Vote.choice), 'only locked stage votes used');
        assert(stage !== 1 || projection.story.combat === null, 'scouting must remain noncombat');
        projections++;
    }
}
assert(projections === 12, 'cover all four stories and stages');
const week = makeWeek(0), stageOne = makeContext(week, 1);
// V32: no fixed 1T/2D/1S quota. All player classes must still resolve from
// the server-trusted class catalog with matching role and frozen checksum.
const allDamageWeek = { ...week, roster: week.roster.map(member => {
        const actor = { ...(0, launch_combat_1.launchPlayer)('Wayfinder', 25),
            id: member.characterId, classId: 'WAYFINDER' };
        const payload = { ...member.loadout, classId: 'WAYFINDER', actor };
        const { snapshotHash: unused, ...raw } = payload;
        void unused;
        return { ...member, loadout: { ...raw,
                snapshotHash: (0, weekly_party_stage_ledger_v10_1.partyEventStageChecksumV10)(raw) } };
    }) };
const fourDamage = (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)({ ...stageOne, week: allDamageWeek });
assert(fourDamage.story.combat === null &&
    fourDamage.story.verifiedRequiredStages === 0, 'four Damage participants may enroll without changing stage evidence');
const spoofedRole = { ...allDamageWeek, roster: allDamageWeek.roster.map((member, index) => index === 0 ? { ...member, loadout: { ...member.loadout,
            actor: { ...member.loadout.actor, role: 'tank' } } } : member) };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)({ ...stageOne, week: spoofedRole }), 'invalid_frozen_loadout');
const member = week.roster[0];
const evidence = { sourceEventId: 'source-event-0001', partyId: week.partyId,
    accountId: member.accountId, kind: 'verified_noncombat',
    occurredAtMs: stageOne.stageRecord.openedAtMs + 1000,
    committedAtMs: stageOne.stageRecord.openedAtMs + 2000 };
const requestId = 'request-unique-0001';
const plan = (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne, evidence, requestId,
    actionId: 'scout_route', existingReceipts: [] });
assert(plan.status === 'new' && plan.eventPointsGranted === 0, 'new receipt is only a plan and awards zero points');
const replay = (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne, evidence, requestId,
    actionId: 'scout_route', existingReceipts: [plan.receipt] });
assert(replay.status === 'replay' && replay.eventPointsGranted === 0
    && replay.receipt.sourceEventId === plan.receipt.sourceEventId, 'same request and event are idempotent');
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne,
    evidence: { ...evidence, sourceEventId: 'source-event-0002' }, requestId: 'request-unique-0002',
    actionId: 'scout_route', existingReceipts: [plan.receipt] }), 'action_already_claimed');
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne,
    evidence: { ...evidence, accountId: 'spoofed-member-999' }, requestId,
    actionId: 'scout_route', existingReceipts: [] }), 'unverified_or_out_of_window_source');
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne,
    evidence: { ...evidence, partyId: 'some-other-party' }, requestId,
    actionId: 'scout_route', existingReceipts: [] }), 'unverified_or_out_of_window_source');
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne,
    evidence: { ...evidence, kind: 'verified_combat' }, requestId,
    actionId: 'scout_route', existingReceipts: [] }), 'unverified_or_out_of_window_source');
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne,
    evidence: { ...evidence, occurredAtMs: week.eventStartsAtMs - 1 },
    requestId, actionId: 'scout_route', existingReceipts: [] }), 'unverified_or_out_of_window_source');
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne,
    evidence: { ...evidence, committedAtMs: stageOne.nowMs + 1 },
    requestId, actionId: 'scout_route', existingReceipts: [] }), 'unverified_or_out_of_window_source');
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageOne, evidence,
    requestId, actionId: 'prepare_finale', existingReceipts: [] }), 'action_wrong_stage');
const stageTwo = makeContext(week, 2);
const secondEvidence = { ...evidence, sourceEventId: 'source-event-0003',
    occurredAtMs: stageTwo.stageRecord.openedAtMs + 1000,
    committedAtMs: stageTwo.stageRecord.openedAtMs + 2000 };
const second = (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageTwo,
    evidence: secondEvidence, requestId: 'request-unique-0003',
    actionId: 'secure_approach', existingReceipts: [] });
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageTwo,
    evidence: secondEvidence, requestId: 'request-unique-0004',
    actionId: 'support_expedition', existingReceipts: [second.receipt] }), 'reused_source_or_request');
rejects(() => (0, weekly_party_stage_ledger_v10_1.planPartyEventStageReceiptV10)({ context: stageTwo,
    evidence: { ...secondEvidence, sourceEventId: 'source-event-0004' },
    requestId: 'request-unique-0003', actionId: 'support_expedition',
    existingReceipts: [second.receipt] }), 'reused_source_or_request');
const changedRoster = { ...week, roster: week.roster.map((member, index) => index === 0
        ? { ...member, loadout: { ...member.loadout, actor: { ...member.loadout.actor,
                    stats: { ...member.loadout.actor.stats, attackPower: member.loadout.actor.stats.attackPower + 100 } } } }
        : member) };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)({ ...stageOne, week: changedRoster }), 'loadout_checksum_mismatch');
const duplicate = { ...week, roster: week.roster.map((member, index) => index === 1
        ? { ...member, accountId: week.roster[0].accountId } : member) };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)({ ...stageOne, week: duplicate }), 'invalid_enrollment');
const leaking = { ...stageOne, stageRecord: { ...stageOne.stageRecord,
        stage3Vote: { choice: 'brace_wagons', lockedAtMs: stageOne.nowMs } } };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)(leaking), 'future_vote_leak');
const missingVote = { ...stageTwo, stageRecord: { ...stageTwo.stageRecord, stage2Vote: null } };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)(missingVote), 'vote_not_locked');
const tamperedVote = { ...stageTwo, stageRecord: { ...stageTwo.stageRecord,
        stage2Vote: { choice: 'fake_route', lockedAtMs: stageTwo.nowMs } } };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)(tamperedVote), 'vote_not_locked');
const futureStage = { ...stageTwo, stageRecord: { ...stageTwo.stageRecord,
        stage3Vote: { choice: 'brace_wagons', lockedAtMs: stageTwo.nowMs } } };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)(futureStage), 'future_vote_leak');
const late = { ...stageOne, nowMs: week.eventEndsAtMs };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)(late), 'closed_or_invalid_window');
const wrongFamily = { ...week, family: 'lost_reliquary' };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)({ ...stageOne, week: wrongFamily }), 'week_identity_mismatch');
const supply = { stage: 1, kind: 'required', itemId: 'GREENWOOD_LOG',
    category: 'wood', tier: 'common', quantity: 10,
    estimatedGatherSeconds: 300, donatedQuantity: 1 };
const duplicateSupply = { ...stageOne, stageRecord: { ...stageOne.stageRecord,
        verifiedOrders: [supply, supply] } };
rejects(() => (0, weekly_party_stage_ledger_v10_1.projectLockedPartyEventStageV10)(duplicateSupply), 'invalid_supply_ledger');
const recorded = Object.freeze([plan.receipt]);
assert(recorded.length === 1, 'fixture tests plan output without storing anything');
console.log('Party Events v10: 12 family/stage projections and receipt security cases passed');

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScheduledPartyEvent = createScheduledPartyEvent;
exports.eventPhase = eventPhase;
exports.assertNoOverlappingPartyEvents = assertNoOverlappingPartyEvents;
const event_definitions_1 = require("./event-definitions");
function createScheduledPartyEvent(input) {
    const errors = (0, event_definitions_1.validatePartyEventDefinition)(input.definition);
    if (errors.length > 0)
        throw new Error(`invalid_event_definition:${errors.join(',')}`);
    const endsAtMs = input.endsAtMs ?? input.startsAtMs + input.definition.durationHours * 60 * 60 * 1000;
    const durationHours = (endsAtMs - input.startsAtMs) / 3_600_000;
    if (durationHours < event_definitions_1.PARTY_EVENT_MIN_DURATION_HOURS || durationHours > event_definitions_1.PARTY_EVENT_MAX_DURATION_HOURS)
        throw new Error('event_schedule_duration_out_of_range');
    const grace = input.settlementGraceMinutes ?? event_definitions_1.PARTY_EVENT_DEFAULT_SETTLEMENT_GRACE_MINUTES;
    if (grace < 5 || grace > 30)
        throw new Error('settlement_grace_out_of_range');
    return { instanceId: input.instanceId, definition: input.definition, startsAtMs: input.startsAtMs, endsAtMs, settlementGraceMinutes: grace };
}
function eventPhase(event, nowMs) {
    if (nowMs < event.startsAtMs)
        return 'scheduled';
    if (nowMs < event.endsAtMs)
        return 'active';
    const graceEnds = event.endsAtMs + event.settlementGraceMinutes * 60_000;
    return nowMs < graceEnds ? 'settling' : 'finalizable';
}
function assertNoOverlappingPartyEvents(candidate, existing) {
    const overlaps = existing.some((event) => candidate.startsAtMs < event.endsAtMs && event.startsAtMs < candidate.endsAtMs);
    if (overlaps)
        throw new Error('party_event_schedule_overlap');
}

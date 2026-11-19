"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_definitions_1 = require("../event-definitions");
const scheduler_1 = require("../scheduler");
const party_event_service_1 = require("../party-event-service");
function assert(value, message) { if (!value)
    throw new Error(message); }
const definition = event_definitions_1.PARTY_EVENT_TEMPLATE_POOL[0];
const now = Date.parse('2026-09-13T12:00:00Z');
const scheduled = (0, scheduler_1.createScheduledPartyEvent)({ instanceId: 'event1', definition, startsAtMs: now - 1000 });
class MemoryRepo {
    receipts = new Set();
    daily = new Map();
    binding = new Map();
    members = new Map();
    async withEventAccountLock(_event, _account, work) { return work(this); }
    async getScheduledEvent(id) { return id === 'event1' ? scheduled : null; }
    async contributionReceiptExists(instanceId, accountId, sourceEventId) { return this.receipts.has(`${instanceId}:${accountId}:${sourceEventId}`); }
    async pointsCreditedToday(instanceId, accountId, dateKey) { return this.daily.get(`${instanceId}:${accountId}:${dateKey}`) ?? 0; }
    async getBinding(instanceId, accountId) { return this.binding.get(`${instanceId}:${accountId}`) ?? null; }
    async getMemberPartyPoints(instanceId, partyId, accountId) { return this.members.get(`${instanceId}:${partyId}:${accountId}`)?.points ?? 0; }
    async getPartyProgress(instanceId, partyId) {
        const members = [...this.members.entries()].filter(([key]) => key.startsWith(`${instanceId}:${partyId}:`)).map(([, value]) => value);
        return { partyId, score: members.reduce((s, m) => s + m.points, 0), combatPoints: members.reduce((s, m) => s + m.combatPoints, 0), skillingPoints: members.reduce((s, m) => s + m.skillingPoints, 0), lastScoreAtMs: now, members };
    }
    async commitContribution(input) {
        const receiptKey = `${input.instanceId}:${input.accountId}:${input.sourceEventId}`;
        if (this.receipts.has(receiptKey))
            return 'duplicate';
        this.receipts.add(receiptKey);
        const dayKey = `${input.instanceId}:${input.accountId}:${input.dateKey}`;
        this.daily.set(dayKey, (this.daily.get(dayKey) ?? 0) + input.creditedPoints);
        const key = `${input.instanceId}:${input.partyId}:${input.accountId}`;
        const current = this.members.get(key) ?? { accountId: input.accountId, partyId: input.partyId, points: 0, combatPoints: 0, skillingPoints: 0 };
        const next = { ...current, points: current.points + input.partyCreditedPoints, combatPoints: current.combatPoints + (input.category === 'combat' ? input.partyCreditedPoints : 0), skillingPoints: current.skillingPoints + (input.category === 'skilling' ? input.partyCreditedPoints : 0), lastContributionAtMs: input.occurredAtMs };
        this.members.set(key, next);
        return 'inserted';
    }
    async lockBinding(input) { this.binding.set(`event1:${input.accountId}`, input); }
}
const contribution = (id, category, seconds) => ({
    sourceEventId: id, accountId: 'a1', occurredAtMs: now, dateKey: '2026-09-13',
    profile: { id, category, expectedSecondsPerUnit: seconds, challenge: 'routine' }, units: 1,
    activityKind: category === 'combat' ? 'combat' : 'crafting', contentId: id, tags: ['rift'], partyIdAtSettlement: 'p1',
});
(async () => {
    const repo = new MemoryRepo();
    const first = await (0, party_event_service_1.recordPartyEventContribution)(repo, 'event1', contribution('c1', 'combat', 1000));
    assert(first.ok && !first.duplicate, 'first contribution should insert');
    if (first.ok && !first.duplicate)
        assert(first.partyCreditedPoints > 250, 'first contribution should be enough to lock binding');
    assert((await repo.getBinding('event1', 'a1'))?.partyId === 'p1', 'binding should lock to first meaningful party');
    const dup = await (0, party_event_service_1.recordPartyEventContribution)(repo, 'event1', contribution('c1', 'combat', 1000));
    assert(dup.ok && dup.duplicate, 'duplicate settlement should be idempotent');
    const switchedEvent = { ...contribution('c2', 'skilling', 1000), partyIdAtSettlement: 'p2' };
    const switched = await (0, party_event_service_1.recordPartyEventContribution)(repo, 'event1', switchedEvent);
    assert(switched.ok && !switched.duplicate && switched.partyCreditedPoints === 0, 'party hopping after binding must not feed second party ranking');
    console.log('party-event-service-v17 ok');
})().catch((error) => { throw error; });

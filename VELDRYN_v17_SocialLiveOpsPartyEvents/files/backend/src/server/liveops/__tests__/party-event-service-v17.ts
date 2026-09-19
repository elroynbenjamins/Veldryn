import { PARTY_EVENT_TEMPLATE_POOL } from '../event-definitions';
import { createScheduledPartyEvent } from '../scheduler';
import { recordPartyEventContribution, type LockedPartyEventRepository, type PartyEventBinding, type PartyEventRepository } from '../party-event-service';
import type { PartyEventPartyProgress, PartyEventMemberProgress } from '../party-events';
import type { SocialContributionEvent } from '../contribution';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const definition = PARTY_EVENT_TEMPLATE_POOL[0];
const now = Date.parse('2026-09-13T12:00:00Z');
const scheduled = createScheduledPartyEvent({ instanceId: 'event1', definition, startsAtMs: now - 1000 });

class MemoryRepo implements PartyEventRepository, LockedPartyEventRepository {
  receipts = new Set<string>();
  daily = new Map<string, number>();
  binding = new Map<string, PartyEventBinding>();
  members = new Map<string, PartyEventMemberProgress>();
  async withEventAccountLock<T>(_event: string, _account: string, work: (repo: LockedPartyEventRepository) => Promise<T>): Promise<T> { return work(this); }
  async getScheduledEvent(id: string) { return id === 'event1' ? scheduled : null; }
  async contributionReceiptExists(instanceId: string, accountId: string, sourceEventId: string) { return this.receipts.has(`${instanceId}:${accountId}:${sourceEventId}`); }
  async pointsCreditedToday(instanceId: string, accountId: string, dateKey: string) { return this.daily.get(`${instanceId}:${accountId}:${dateKey}`) ?? 0; }
  async getBinding(instanceId: string, accountId: string) { return this.binding.get(`${instanceId}:${accountId}`) ?? null; }
  async getMemberPartyPoints(instanceId: string, partyId: string, accountId: string) { return this.members.get(`${instanceId}:${partyId}:${accountId}`)?.points ?? 0; }
  async getPartyProgress(instanceId: string, partyId: string): Promise<PartyEventPartyProgress> {
    const members = [...this.members.entries()].filter(([key]) => key.startsWith(`${instanceId}:${partyId}:`)).map(([,value]) => value);
    return { partyId, score: members.reduce((s,m)=>s+m.points,0), combatPoints: members.reduce((s,m)=>s+m.combatPoints,0), skillingPoints: members.reduce((s,m)=>s+m.skillingPoints,0), lastScoreAtMs: now, members };
  }
  async commitContribution(input: { instanceId: string; accountId: string; partyId: string; partyNameAtSettlement?: string; sourceEventId: string; dateKey: string; category: 'combat' | 'skilling'; activityKind: string; contentId: string; rawPoints: number; creditedPoints: number; partyCreditedPoints: number; occurredAtMs: number; }): Promise<'inserted'|'duplicate'> {
    const receiptKey = `${input.instanceId}:${input.accountId}:${input.sourceEventId}`;
    if (this.receipts.has(receiptKey)) return 'duplicate';
    this.receipts.add(receiptKey);
    const dayKey = `${input.instanceId}:${input.accountId}:${input.dateKey}`;
    this.daily.set(dayKey, (this.daily.get(dayKey) ?? 0) + input.creditedPoints);
    const key = `${input.instanceId}:${input.partyId}:${input.accountId}`;
    const current = this.members.get(key) ?? { accountId: input.accountId, partyId: input.partyId, points: 0, combatPoints: 0, skillingPoints: 0 };
    const next = { ...current, points: current.points + input.partyCreditedPoints, combatPoints: current.combatPoints + (input.category === 'combat' ? input.partyCreditedPoints : 0), skillingPoints: current.skillingPoints + (input.category === 'skilling' ? input.partyCreditedPoints : 0), lastContributionAtMs: input.occurredAtMs };
    this.members.set(key, next);
    return 'inserted';
  }
  async lockBinding(input: PartyEventBinding) { this.binding.set(`event1:${input.accountId}`, input); }
}

const contribution = (id: string, category: 'combat'|'skilling', seconds: number): SocialContributionEvent => ({
  sourceEventId: id, accountId: 'a1', occurredAtMs: now, dateKey: '2026-09-13',
  profile: { id, category, expectedSecondsPerUnit: seconds, challenge: 'routine' }, units: 1,
  activityKind: category === 'combat' ? 'combat' : 'crafting', contentId: id, tags: ['rift'], partyIdAtSettlement: 'p1',
});

(async () => {
  const repo = new MemoryRepo();
  const first = await recordPartyEventContribution(repo, 'event1', contribution('c1', 'combat', 1000));
  assert(first.ok && !first.duplicate, 'first contribution should insert');
  if (first.ok && !first.duplicate) assert(first.partyCreditedPoints > 250, 'first contribution should be enough to lock binding');
  assert((await repo.getBinding('event1', 'a1'))?.partyId === 'p1', 'binding should lock to first meaningful party');

  const dup = await recordPartyEventContribution(repo, 'event1', contribution('c1', 'combat', 1000));
  assert(dup.ok && dup.duplicate, 'duplicate settlement should be idempotent');

  const switchedEvent = { ...contribution('c2', 'skilling', 1000), partyIdAtSettlement: 'p2' };
  const switched = await recordPartyEventContribution(repo, 'event1', switchedEvent);
  assert(switched.ok && !switched.duplicate && switched.partyCreditedPoints === 0, 'party hopping after binding must not feed second party ranking');
  console.log('party-event-service-v17 ok');
})().catch((error) => { throw error; });

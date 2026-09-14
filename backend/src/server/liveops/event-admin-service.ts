import { createHash } from 'node:crypto';
import { createScheduledPartyEvent, assertNoOverlappingPartyEvents, type EventScheduleInput } from './scheduler';
import type { PartyLiveOpsEventDefinition, ScheduledPartyEvent } from './event-definitions';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

export function liveOpsDefinitionHash(definition: PartyLiveOpsEventDefinition): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(definition))).digest().toString('hex');
}

export interface StoredEventDefinitionIdentity { eventId: string; version: number; configHash: string; }
export interface LiveOpsAdminRepository {
  findDefinition(eventId: string, version: number): Promise<StoredEventDefinitionIdentity | null>;
  insertImmutableDefinition(definition: PartyLiveOpsEventDefinition, configHash: string): Promise<void>;
  listScheduledPartyEvents(): Promise<ScheduledPartyEvent[]>;
  insertScheduledPartyEvent(event: ScheduledPartyEvent, configHash: string): Promise<void>;
}

export async function publishPartyEventDefinition(repo: LiveOpsAdminRepository, definition: PartyLiveOpsEventDefinition): Promise<{ configHash: string; inserted: boolean }> {
  const configHash = liveOpsDefinitionHash(definition);
  const existing = await repo.findDefinition(definition.id, definition.version);
  if (existing) {
    if (existing.configHash !== configHash) throw new Error('event_definition_version_conflict');
    return { configHash, inserted: false };
  }
  await repo.insertImmutableDefinition(definition, configHash);
  return { configHash, inserted: true };
}

export async function schedulePartyEvent(repo: LiveOpsAdminRepository, input: EventScheduleInput): Promise<ScheduledPartyEvent> {
  const published = await publishPartyEventDefinition(repo, input.definition);
  const scheduled = createScheduledPartyEvent(input);
  assertNoOverlappingPartyEvents(scheduled, await repo.listScheduledPartyEvents());
  await repo.insertScheduledPartyEvent(scheduled, published.configHash);
  return scheduled;
}

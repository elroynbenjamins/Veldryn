import type { ExpeditionTier } from './constants';
import { EXPEDITIONS } from './content/launch-content';
import { generateRoute } from './route-generation';
import { deterministicDigest } from './rng';

export interface CreateRunMemberInput {
  accountId: string;
  characterId: string;
  characterLevel: number;
  role: 'tank'|'damage'|'support';
  loadoutSnapshot: Record<string, unknown>;
  statSnapshot: Record<string, unknown>;
}

export interface CreateRunInput {
  secret: string;
  runId: string;
  expeditionId: string;
  tier: ExpeditionTier;
  contentVersion: string;
  creatorAccountId: string;
  members: CreateRunMemberInput[];
}

export function prepareExpeditionRun(input: CreateRunInput) {
  const def = EXPEDITIONS[input.expeditionId];
  if (!def) throw new Error('unknown_expedition');
  if (input.members.length < 1 || input.members.length > 4) throw new Error('invalid_party_size');
  const duplicate = new Set(input.members.map(m=>m.characterId));
  if (duplicate.size !== input.members.length) throw new Error('duplicate_character');
  for (const m of input.members) {
    if (m.characterLevel < def.minLevel) throw new Error(`character_below_min_level:${m.characterId}`);
  }
  const route = generateRoute(input.secret, input.expeditionId, input.runId);
  const seedHash = deterministicDigest(input.secret, input.runId, input.expeditionId, input.contentVersion).toString('hex');
  return {
    run: { id:input.runId, expeditionId:input.expeditionId, tier:input.tier, contentVersion:input.contentVersion, createdBy:input.creatorAccountId, seedHash },
    members: input.members.map(m => ({...m, syncedLevel:Math.min(m.characterLevel, def.recommendedLevel)})),
    route,
  };
}

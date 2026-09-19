import { PARTY_CONTRACT_POOL, type PartyContractDefinition } from './party-contracts';
import type { PartyActivityPreference } from './party-policy';

export interface PartyContractRotation {
  weekKey: string;
  startsAt: string;
  expiresAt: string;
  contracts: readonly PartyContractDefinition[];
}

function mondayUtcStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}

export function partyContractWeekKey(date = new Date()): string {
  return mondayUtcStart(date).toISOString().slice(0, 10);
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function selectForFocus(focus: PartyActivityPreference, weekKey: string): PartyContractDefinition {
  const candidates = PARTY_CONTRACT_POOL.filter((contract) => contract.focus === focus);
  if (candidates.length === 0) throw new Error(`No party contracts configured for ${focus}`);
  return candidates[stableHash(`${weekKey}:${focus}`) % candidates.length];
}

export function getPartyContractRotation(date = new Date()): PartyContractRotation {
  const start = mondayUtcStart(date);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekKey = start.toISOString().slice(0, 10);
  return {
    weekKey,
    startsAt: start.toISOString(),
    expiresAt: end.toISOString(),
    contracts: [
      selectForFocus('combat', weekKey),
      selectForFocus('skilling', weekKey),
      selectForFocus('mixed', weekKey),
    ],
  };
}

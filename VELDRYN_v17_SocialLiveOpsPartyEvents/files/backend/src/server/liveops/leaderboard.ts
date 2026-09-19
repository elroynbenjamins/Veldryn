import { rankPartyEntries, type LeaderboardEntry } from './party-events';

export type LeaderboardAudience = 'global' | 'friends' | 'guild';

export interface LeaderboardPage {
  audience: LeaderboardAudience;
  entries: LeaderboardEntry[];
  totalRankedParties: number;
  nextCursor?: string;
}

/**
 * Global ranking is computed first. Friends/Guild views are filters over those global entries, preserving global rank.
 * This prevents a separate reward ladder from being accidentally created for small private cohorts.
 */
export function buildLeaderboardPage(
  allEntries: readonly LeaderboardEntry[],
  audience: LeaderboardAudience,
  visiblePartyIds?: ReadonlySet<string>,
  limit = 100,
  offset = 0,
): LeaderboardPage {
  const ranked = rankPartyEntries(allEntries);
  const filtered = audience === 'global' ? ranked : ranked.filter((entry) => visiblePartyIds?.has(entry.partyId));
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const safeOffset = Math.max(0, Math.floor(offset));
  const slice = filtered.slice(safeOffset, safeOffset + safeLimit);
  return {
    audience,
    entries: slice,
    totalRankedParties: ranked.length,
    ...(safeOffset + safeLimit < filtered.length ? { nextCursor: String(safeOffset + safeLimit) } : {}),
  };
}

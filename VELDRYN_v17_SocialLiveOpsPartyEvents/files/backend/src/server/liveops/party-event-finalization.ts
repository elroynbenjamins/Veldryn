import { createHash } from 'node:crypto';
import { rankPartyEntries, rankingRewardBand, type LeaderboardEntry, type PartyEventPartyProgress } from './party-events';
import { eventPhase } from './scheduler';
import type { ScheduledPartyEvent } from './event-definitions';

export interface FinalizedRankSnapshot {
  partyId: string;
  rank: number;
  eligiblePartyCount: number;
  score: number;
  percentile: number;
  rewardBand: Exclude<ReturnType<typeof rankingRewardBand>, 'none'>;
  meaningfulContributors: number;
  snapshottedAtMs: number;
}

export interface PartyEventFinalizationRepository {
  withFinalizationLock<T>(eventInstanceId: string, work: () => Promise<T>): Promise<T>;
  getScheduledEvent(eventInstanceId: string): Promise<ScheduledPartyEvent | null>;
  isFinalized(eventInstanceId: string): Promise<boolean>;
  listPartyProgress(eventInstanceId: string): Promise<PartyEventPartyProgress[]>;
  replaceRankSnapshots(eventInstanceId: string, snapshots: readonly FinalizedRankSnapshot[]): Promise<void>;
  markFinalized(eventInstanceId: string, finalizedAtMs: number, checksum: string): Promise<void>;
}

function finalizationChecksum(eventInstanceId: string, snapshots: readonly FinalizedRankSnapshot[]): string {
  return createHash('sha256').update(JSON.stringify({ eventInstanceId, snapshots })).digest().toString('hex');
}

export async function finalizePartyEvent(
  repo: PartyEventFinalizationRepository,
  eventInstanceId: string,
  nowMs = Date.now(),
): Promise<{ finalized: boolean; checksum?: string; snapshots: FinalizedRankSnapshot[] }> {
  return repo.withFinalizationLock(eventInstanceId, async () => {
    const event = await repo.getScheduledEvent(eventInstanceId);
    if (!event) throw new Error('event_not_found');
    if (await repo.isFinalized(eventInstanceId)) return { finalized: false, snapshots: [] };
    if (eventPhase(event, nowMs) !== 'finalizable') throw new Error('event_not_finalizable');

    const progress = await repo.listPartyProgress(eventInstanceId);
    const entries: LeaderboardEntry[] = progress.map((party) => {
      const meaningful = party.members.filter((member) => member.points >= event.definition.meaningfulContributorPoints).length;
      const categoryMinimum = event.definition.contributionRules.minimumCategoryFraction ?? {};
      const categoryEligible = (categoryMinimum.combat === undefined || party.combatPoints >= Math.ceil(event.definition.rankedMinimumPartyPoints * categoryMinimum.combat))
        && (categoryMinimum.skilling === undefined || party.skillingPoints >= Math.ceil(event.definition.rankedMinimumPartyPoints * categoryMinimum.skilling));
      return {
        partyId: party.partyId,
        score: party.score,
        lastScoreAtMs: party.lastScoreAtMs,
        meaningfulContributors: meaningful,
        rankedEligible: party.score >= event.definition.rankedMinimumPartyPoints
          && meaningful >= event.definition.rankedMinimumMeaningfulContributors
          && categoryEligible,
      };
    });
    const ranked = rankPartyEntries(entries);
    const eligiblePartyCount = ranked.length;
    const snapshots: FinalizedRankSnapshot[] = ranked.map((entry) => {
      const band = rankingRewardBand(entry.rank, eligiblePartyCount, true);
      if (band === 'none' || !entry.rank || entry.percentile === undefined) throw new Error('invalid_final_rank');
      return {
        partyId: entry.partyId, rank: entry.rank, eligiblePartyCount, score: entry.score,
        percentile: entry.percentile, rewardBand: band, meaningfulContributors: entry.meaningfulContributors, snapshottedAtMs: nowMs,
      };
    });
    const checksum = finalizationChecksum(eventInstanceId, snapshots);
    await repo.replaceRankSnapshots(eventInstanceId, snapshots);
    await repo.markFinalized(eventInstanceId, nowMs, checksum);
    return { finalized: true, checksum, snapshots };
  });
}

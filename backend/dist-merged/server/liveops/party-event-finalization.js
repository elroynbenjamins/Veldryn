"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizePartyEvent = finalizePartyEvent;
const node_crypto_1 = require("node:crypto");
const party_events_1 = require("./party-events");
const scheduler_1 = require("./scheduler");
function finalizationChecksum(eventInstanceId, snapshots) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ eventInstanceId, snapshots })).digest().toString('hex');
}
async function finalizePartyEvent(repo, eventInstanceId, nowMs = Date.now()) {
    return repo.withFinalizationLock(eventInstanceId, async () => {
        const event = await repo.getScheduledEvent(eventInstanceId);
        if (!event)
            throw new Error('event_not_found');
        if (await repo.isFinalized(eventInstanceId))
            return { finalized: false, snapshots: [] };
        if ((0, scheduler_1.eventPhase)(event, nowMs) !== 'finalizable')
            throw new Error('event_not_finalizable');
        const progress = await repo.listPartyProgress(eventInstanceId);
        const entries = progress.map((party) => {
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
        const ranked = (0, party_events_1.rankPartyEntries)(entries);
        const eligiblePartyCount = ranked.length;
        const snapshots = ranked.map((entry) => {
            const band = (0, party_events_1.rankingRewardBand)(entry.rank, eligiblePartyCount, true);
            if (band === 'none' || !entry.rank || entry.percentile === undefined)
                throw new Error('invalid_final_rank');
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

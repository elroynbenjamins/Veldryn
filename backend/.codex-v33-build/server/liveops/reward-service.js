"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimLiveOpsEventReward = claimLiveOpsEventReward;
const party_events_1 = require("./party-events");
const party_event_service_1 = require("./party-event-service");
function milestoneBundle(definition, kind, points) {
    const milestones = kind === 'personal' ? definition.personalMilestones : definition.partyMilestones;
    return milestones.find((milestone) => milestone.points === points)?.reward.bundleId;
}
async function claimLiveOpsEventReward(repo, input) {
    const event = await repo.getScheduledEvent(input.eventInstanceId);
    if (!event)
        throw new Error('event_not_found');
    const binding = await repo.getBinding(input.eventInstanceId, input.accountId);
    const claimKey = input.kind === 'personal_milestone'
        ? (0, party_event_service_1.personalClaimKey)(input.eventInstanceId, input.accountId, input.milestonePoints)
        : input.kind === 'party_milestone'
            ? (0, party_event_service_1.partyClaimKey)(input.eventInstanceId, binding?.partyId ?? 'unbound', input.accountId, input.milestonePoints)
            : (0, party_event_service_1.rankingClaimKey)(input.eventInstanceId, binding?.partyId ?? 'unbound', input.accountId);
    return repo.withRewardClaimLock(claimKey, async () => {
        if (await repo.claimExists(claimKey))
            return { claimed: false };
        let rewardBundleId;
        let partyId;
        if (input.kind === 'personal_milestone') {
            const personalPoints = await repo.getPersonalPoints(input.eventInstanceId, input.accountId);
            if (!(0, party_events_1.reachedPersonalMilestones)(event.definition, personalPoints).includes(input.milestonePoints))
                throw new Error('personal_milestone_not_reached');
            rewardBundleId = milestoneBundle(event.definition, 'personal', input.milestonePoints);
        }
        else if (input.kind === 'party_milestone') {
            if (!binding)
                throw new Error('party_event_binding_required');
            partyId = binding.partyId;
            const member = await repo.getMemberProgress(input.eventInstanceId, partyId, input.accountId);
            if (!(0, party_events_1.memberEligibleForPartyEventReward)(event.definition, member ?? undefined))
                throw new Error('personal_party_reward_eligibility_not_met');
            const partyScore = await repo.getPartyScore(input.eventInstanceId, partyId);
            if (partyScore < input.milestonePoints)
                throw new Error('party_milestone_not_reached');
            rewardBundleId = milestoneBundle(event.definition, 'party', input.milestonePoints);
        }
        else {
            if (!await repo.isFinalized(input.eventInstanceId))
                throw new Error('ranking_not_finalized');
            if (!binding)
                throw new Error('party_event_binding_required');
            partyId = binding.partyId;
            const member = await repo.getMemberProgress(input.eventInstanceId, partyId, input.accountId);
            if (!(0, party_events_1.memberEligibleForPartyEventReward)(event.definition, member ?? undefined))
                throw new Error('personal_party_reward_eligibility_not_met');
            const rank = await repo.getFinalRank(input.eventInstanceId, partyId);
            if (!rank)
                throw new Error('party_not_ranked');
            rewardBundleId = (0, party_events_1.rankingRewardForBand)(event.definition, rank.rewardBand)?.bundleId;
        }
        if (!rewardBundleId)
            throw new Error('reward_bundle_not_configured');
        const transactionId = await repo.grantRewardBundle(input.accountId, rewardBundleId, claimKey);
        await repo.recordClaim({ claimKey, eventInstanceId: input.eventInstanceId, accountId: input.accountId, ...(partyId ? { partyId } : {}), rewardKind: input.kind, ...('milestonePoints' in input ? { milestonePoints: input.milestonePoints } : {}), rewardBundleId, grantedTransactionId: transactionId });
        return { claimed: true, rewardBundleId, transactionId };
    });
}

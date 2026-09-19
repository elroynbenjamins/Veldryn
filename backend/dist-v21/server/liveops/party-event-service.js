"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPartyEventContribution = recordPartyEventContribution;
exports.personalClaimKey = personalClaimKey;
exports.partyClaimKey = partyClaimKey;
exports.rankingClaimKey = rankingClaimKey;
exports.immutableDefinitionIdentity = immutableDefinitionIdentity;
const contribution_1 = require("./contribution");
const party_events_1 = require("./party-events");
const scheduler_1 = require("./scheduler");
/**
 * Trusted contribution entrypoint for Party Events. It is intentionally account-serialized to protect daily caps and party binding.
 * Personal event points remain creditable after switching parties, but once binding locks, only the bound party receives party/ranking points.
 */
async function recordPartyEventContribution(repo, instanceId, contribution, nowMs = contribution.occurredAtMs) {
    return repo.withEventAccountLock(instanceId, contribution.accountId, async (locked) => {
        const scheduled = await locked.getScheduledEvent(instanceId);
        if (!scheduled)
            return { ok: false, code: 'event_not_found' };
        if ((0, scheduler_1.eventPhase)(scheduled, nowMs) !== 'active')
            return { ok: false, code: 'event_not_active' };
        const score = (0, contribution_1.scoreLiveOpsContribution)(contribution, scheduled.definition);
        if (!score.eligible)
            return { ok: false, code: 'activity_not_eligible' };
        const currentPartyId = contribution.partyIdAtSettlement;
        if (!currentPartyId)
            return { ok: false, code: 'no_party' };
        if (await locked.contributionReceiptExists(instanceId, contribution.accountId, contribution.sourceEventId))
            return { ok: true, duplicate: true };
        const creditedToday = await locked.pointsCreditedToday(instanceId, contribution.accountId, contribution.dateKey);
        const creditedPoints = (0, contribution_1.cappedEventCredit)(score.eventPoints, creditedToday, scheduled.definition.contributionRules.dailyAccountCreditCap);
        const binding = await locked.getBinding(instanceId, contribution.accountId);
        const partyCreditedPoints = !binding || binding.partyId === currentPartyId ? creditedPoints : 0;
        const committed = await locked.commitContribution({
            instanceId, accountId: contribution.accountId, partyId: currentPartyId, partyNameAtSettlement: contribution.partyNameAtSettlement, sourceEventId: contribution.sourceEventId,
            dateKey: contribution.dateKey, category: contribution.profile.category, activityKind: contribution.activityKind,
            contentId: contribution.contentId, rawPoints: score.eventPoints, creditedPoints, partyCreditedPoints, occurredAtMs: contribution.occurredAtMs,
        });
        if (committed === 'duplicate')
            return { ok: true, duplicate: true };
        let bindingPartyId = binding?.partyId;
        if (!binding && partyCreditedPoints > 0) {
            const newPartyPoints = await locked.getMemberPartyPoints(instanceId, currentPartyId, contribution.accountId);
            if (newPartyPoints >= scheduled.definition.partyBindingLockPoints) {
                await locked.lockBinding({ accountId: contribution.accountId, partyId: currentPartyId, lockedAtMs: nowMs, pointsAtLock: newPartyPoints });
                bindingPartyId = currentPartyId;
            }
        }
        const partyProgress = await locked.getPartyProgress(instanceId, currentPartyId);
        return {
            ok: true, duplicate: false, rawPoints: score.eventPoints, creditedPoints, partyCreditedPoints,
            ...(bindingPartyId ? { bindingPartyId } : {}), partyEvaluation: (0, party_events_1.evaluatePartyEvent)(scheduled.definition, partyProgress),
        };
    });
}
function personalClaimKey(instanceId, accountId, milestonePoints) {
    return `${instanceId}:personal:${accountId}:${milestonePoints}`;
}
function partyClaimKey(instanceId, partyId, accountId, milestonePoints) {
    return `${instanceId}:party:${partyId}:${accountId}:${milestonePoints}`;
}
function rankingClaimKey(instanceId, partyId, accountId) {
    return `${instanceId}:ranking:${partyId}:${accountId}`;
}
function immutableDefinitionIdentity(definition) {
    return `${definition.id}@${definition.version}`;
}

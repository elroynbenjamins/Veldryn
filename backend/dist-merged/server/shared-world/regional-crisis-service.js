"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordRegionalCrisisContribution = recordRegionalCrisisContribution;
const regional_crises_1 = require("./regional-crises");
async function recordRegionalCrisisContribution(store, instanceId, event, snapshot) {
    const instance = await store.getInstance(instanceId);
    // Non-crediting outcomes still report the crisis's real progress so callers never read a secured region as unsecured.
    const unchanged = () => ({ crisisInstanceId: instanceId, creditedPoints: 0, globalCreditedPoints: instance.creditedPoints, secured: instance.state === 'secured' || (0, regional_crises_1.evaluateRegionalCrisis)(instance.definition, instance).secured });
    if (instance.state !== 'active' && instance.state !== 'secured')
        return unchanged();
    if (event.occurredAtMs < instance.startsAtMs || event.occurredAtMs >= instance.endsAtMs)
        return unchanged();
    const today = await store.getAccountDailyPoints(instanceId, event.accountId, event.dateKey);
    const score = (0, regional_crises_1.scoreRegionalCrisisContribution)(event, instance.definition, today);
    if (!score.eligible || score.creditedPoints <= 0)
        return unchanged();
    const recorded = await store.recordContribution({ instanceId, sourceEventId: event.sourceEventId, accountId: event.accountId, dateKey: event.dateKey, occurredAtMs: event.occurredAtMs, rawPoints: score.rawPoints, creditedPoints: score.creditedPoints, category: score.category, contentId: event.contentId, activityKind: event.activityKind, partyIdAtSettlement: snapshot?.partyIdAtSettlement, partyNameAtSettlement: snapshot?.partyNameAtSettlement, guildIdAtSettlement: snapshot?.guildIdAtSettlement, guildNameAtSettlement: snapshot?.guildNameAtSettlement });
    const evaluation = (0, regional_crises_1.evaluateRegionalCrisis)(instance.definition, recorded.progress);
    return { crisisInstanceId: instanceId, creditedPoints: recorded.duplicate ? 0 : recorded.creditedPoints, globalCreditedPoints: recorded.progress.creditedPoints, secured: instance.state === 'secured' || evaluation.secured };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeSocialContribution = routeSocialContribution;
/**
 * One trusted settlement event can feed the active Party Contract and active Party Event in parallel.
 * Targets and partyIdAtSettlement are snapshotted when the gameplay/economy transaction commits, so delayed
 * outbox processing cannot reassign credit after a Party change.
 */
async function routeSocialContribution(deps, envelope) {
    const { event, targets } = envelope;
    const contract = targets.partyContractInstanceId && deps.recordContract
        ? await deps.recordContract(targets.partyContractInstanceId, event)
        : undefined;
    const partyEvents = [];
    for (const eventInstanceId of targets.partyEventInstanceIds) {
        partyEvents.push({ eventInstanceId, result: await deps.recordPartyEvent(eventInstanceId, event) });
    }
    return { ...(contract ? { contract } : {}), partyEvents };
}

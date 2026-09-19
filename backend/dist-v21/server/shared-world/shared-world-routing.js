"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeSocialContributionV19 = routeSocialContributionV19;
const guild_project_contribution_router_1 = require("../guild/guild-project-contribution-router");
/**
 * Regional Crisis targets are snapshotted when the authoritative activity settlement commits.
 * World Boss combat does NOT flow through this generic router; boss attempts have their own authoritative combat receipt.
 */
async function routeSocialContributionV19(deps, envelope) {
    const base = await (0, guild_project_contribution_router_1.routeSocialContributionV18)(deps, envelope);
    const regionalCrises = [];
    if (deps.recordRegionalCrisis && envelope.regionalCrisisTargets) {
        const snapshot = { ...envelope.regionalCrisisTargets, partyIdAtSettlement: envelope.event.partyIdAtSettlement, partyNameAtSettlement: envelope.event.partyNameAtSettlement, guildIdAtSettlement: envelope.guildTargets?.guildIdAtSettlement, guildNameAtSettlement: envelope.guildTargets?.guildNameAtSettlement };
        for (const crisisInstanceId of snapshot.crisisInstanceIds) {
            regionalCrises.push(await deps.recordRegionalCrisis(crisisInstanceId, envelope.event, snapshot));
        }
    }
    return { ...base, regionalCrises };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeSocialContributionV18 = routeSocialContributionV18;
const social_contribution_router_1 = require("../liveops/social-contribution-router");
/**
 * v18 extends the v17 transactional social-contribution outbox. Guild membership/project targets are captured at
 * authoritative settlement time, so delayed workers cannot move contribution to a newly joined Guild.
 */
async function routeSocialContributionV18(deps, envelope) {
    const base = await (0, social_contribution_router_1.routeSocialContribution)(deps, envelope);
    const guildProjects = [];
    if (envelope.guildTargets?.guildIdAtSettlement && deps.recordGuildProject) {
        for (const projectInstanceId of envelope.guildTargets.guildProjectInstanceIds) {
            guildProjects.push(await deps.recordGuildProject(projectInstanceId, envelope.event, envelope.guildTargets));
        }
    }
    return { ...base, guildProjects };
}

import type { SocialContributionEnvelope, SocialContributionRouterDependencies, SocialContributionRoutingResult } from '../liveops/social-contribution-router';
import { routeSocialContribution } from '../liveops/social-contribution-router';
import type { SocialContributionEvent } from '../liveops/contribution';

export interface GuildContributionTargetSnapshot {
  guildIdAtSettlement?: string;
  guildNameAtSettlement?: string;
  guildMembershipJoinedAt?: string;
  guildProjectInstanceIds: string[];
}

export interface GuildProjectContributionResult {
  projectInstanceId: string;
  creditedPoints: number;
  completionCreditedPoints: number;
  completed: boolean;
}

export interface V18SocialContributionEnvelope extends SocialContributionEnvelope {
  guildTargets?: GuildContributionTargetSnapshot;
}

export interface V18SocialContributionRouterDependencies extends SocialContributionRouterDependencies {
  recordGuildProject?: (
    projectInstanceId:string,
    event:SocialContributionEvent,
    snapshot:GuildContributionTargetSnapshot,
  )=>Promise<GuildProjectContributionResult>;
}

export interface V18SocialContributionRoutingResult extends SocialContributionRoutingResult {
  guildProjects: GuildProjectContributionResult[];
}

/**
 * v18 extends the v17 transactional social-contribution outbox. Guild membership/project targets are captured at
 * authoritative settlement time, so delayed workers cannot move contribution to a newly joined Guild.
 */
export async function routeSocialContributionV18(
  deps:V18SocialContributionRouterDependencies,
  envelope:V18SocialContributionEnvelope,
):Promise<V18SocialContributionRoutingResult>{
  const base=await routeSocialContribution(deps,envelope);
  const guildProjects:GuildProjectContributionResult[]=[];
  if(envelope.guildTargets?.guildIdAtSettlement && deps.recordGuildProject){
    for(const projectInstanceId of envelope.guildTargets.guildProjectInstanceIds){
      guildProjects.push(await deps.recordGuildProject(projectInstanceId,envelope.event,envelope.guildTargets));
    }
  }
  return {...base,guildProjects};
}

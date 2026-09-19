import type { V18SocialContributionEnvelope, V18SocialContributionRouterDependencies, V18SocialContributionRoutingResult } from '../guild/guild-project-contribution-router';
import { routeSocialContributionV18 } from '../guild/guild-project-contribution-router';
import type { SocialContributionEvent } from '../liveops/contribution';

export interface RegionalCrisisTargetSnapshot {
  crisisInstanceIds:string[];
  regionIdAtSettlement?:string;
  partyIdAtSettlement?:string;
  partyNameAtSettlement?:string;
  guildIdAtSettlement?:string;
  guildNameAtSettlement?:string;
}

export interface V19SocialContributionEnvelope extends V18SocialContributionEnvelope {
  regionalCrisisTargets?:RegionalCrisisTargetSnapshot;
}

export interface RegionalCrisisContributionResult {
  crisisInstanceId:string;
  creditedPoints:number;
  globalCreditedPoints:number;
  secured:boolean;
}

export interface V19SocialContributionRouterDependencies extends V18SocialContributionRouterDependencies {
  recordRegionalCrisis?: (crisisInstanceId:string,event:SocialContributionEvent,snapshot:RegionalCrisisTargetSnapshot)=>Promise<RegionalCrisisContributionResult>;
}

export interface V19SocialContributionRoutingResult extends V18SocialContributionRoutingResult {
  regionalCrises:RegionalCrisisContributionResult[];
}

/**
 * Regional Crisis targets are snapshotted when the authoritative activity settlement commits.
 * World Boss combat does NOT flow through this generic router; boss attempts have their own authoritative combat receipt.
 */
export async function routeSocialContributionV19(deps:V19SocialContributionRouterDependencies,envelope:V19SocialContributionEnvelope):Promise<V19SocialContributionRoutingResult>{
  const base=await routeSocialContributionV18(deps,envelope);
  const regionalCrises:RegionalCrisisContributionResult[]=[];
  if(deps.recordRegionalCrisis&&envelope.regionalCrisisTargets){
    const snapshot:RegionalCrisisTargetSnapshot={...envelope.regionalCrisisTargets,partyIdAtSettlement:envelope.event.partyIdAtSettlement,partyNameAtSettlement:envelope.event.partyNameAtSettlement,guildIdAtSettlement:envelope.guildTargets?.guildIdAtSettlement,guildNameAtSettlement:envelope.guildTargets?.guildNameAtSettlement};
    for(const crisisInstanceId of snapshot.crisisInstanceIds){
      regionalCrises.push(await deps.recordRegionalCrisis(crisisInstanceId,envelope.event,snapshot));
    }
  }
  return {...base,regionalCrises};
}

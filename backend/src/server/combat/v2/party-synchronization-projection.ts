/**
 * Presentation-only Class Synchronization projection for hidden 2.0 lobbies.
 *
 * Never use this module to accept/reject matchmaking, alter CP, reserve roles,
 * or authorize combat. It intentionally contains no friendship/guild/history
 * inputs so random and established parties project identically.
 */
import type {ClassIdV2} from './build-contract';
import {
 PARTY_SYNCHRONIZATION_RULESET_V2,listPartySynchronizationsV2,
 planPartySynchronizationV2,type SyncModeV2,type SyncParticipantV2,type SyncStatV2,
} from './party-synchronization';

export type PartySyncPresentationModeV2=Exclude<SyncModeV2,'solo'|'individual_world_boss'>;
export interface PartySyncLobbyProjectionV2{
 readonly ruleset:typeof PARTY_SYNCHRONIZATION_RULESET_V2;
 readonly releaseEnabled:false;
 readonly informationalOnly:true;
 readonly canGateEntry:false;
 readonly canFilterRecruitment:false;
 readonly personalCpDelta:0;
 readonly requiresProgression:false;
 readonly activeCount:number;
 readonly scalePercent:number;
 readonly links:readonly {
  readonly id:string;
  readonly name:string;
  readonly nameKey:string;
  readonly classes:readonly ClassIdV2[];
  readonly bonuses:readonly {
   readonly stat:SyncStatV2;
   readonly statKey:string;
   readonly bps:number;
  }[];
 }[];
 readonly totals:readonly {
  readonly stat:SyncStatV2;
  readonly statKey:string;
  readonly bps:number;
 }[];
}
export interface PartySyncCandidatePreviewV2{
 readonly releaseEnabled:false;
 readonly informationalOnly:true;
 readonly canGateEntry:false;
 readonly canFilterRecruitment:false;
 readonly queueEligibilityIndependentOfSynchronization:true;
 readonly personalCpDelta:0;
 readonly beforeActiveCount:number;
 readonly afterActiveCount:number;
 readonly beforeScalePercent:number;
 readonly afterScalePercent:number;
 readonly scaleDeltaPercent:number;
 readonly newlyActivatedLinkIds:readonly string[];
 readonly resulting:PartySyncLobbyProjectionV2;
}
const statKey=(stat:SyncStatV2)=>'party_sync.stat.'+stat;
const nameKey=(id:string)=>'party_sync.'+id+'.name';

export function projectPartySynchronizationLobbyV2(
 mode:PartySyncPresentationModeV2,
 roster:readonly SyncParticipantV2[],
):PartySyncLobbyProjectionV2{
 const plan=planPartySynchronizationV2(mode,roster);
 return {
  ruleset:PARTY_SYNCHRONIZATION_RULESET_V2,releaseEnabled:false,
  informationalOnly:true,canGateEntry:false,canFilterRecruitment:false,
  personalCpDelta:0,requiresProgression:false,
  activeCount:plan.active.length,scalePercent:plan.scalePercent,
  links:plan.active.map(link=>({
   id:link.id,name:link.name,nameKey:nameKey(link.id),classes:[...link.classes],
   bonuses:link.bonuses.map(([stat,bps])=>({stat,statKey:statKey(stat),bps})),
  })),
  totals:Object.entries(plan.totalsBps)
   .filter((entry):entry is [SyncStatV2,number]=>typeof entry[1]==='number')
   .sort(([a],[b])=>a.localeCompare(b))
   .map(([stat,bps])=>({stat,statKey:statKey(stat),bps})),
 };
}

export function previewPartySynchronizationCandidateV2(
 mode:PartySyncPresentationModeV2,
 existing:readonly SyncParticipantV2[],
 candidate:SyncParticipantV2,
):PartySyncCandidatePreviewV2{
 if(existing.length>=4)throw Error('party_sync_preview_party_full');
 if(existing.some(member=>member.characterId===candidate.characterId))
  throw Error('party_sync_preview_duplicate_character');
 const before=projectPartySynchronizationLobbyV2(mode,existing);
 const resulting=projectPartySynchronizationLobbyV2(mode,[...existing,candidate]);
 const beforeIds=new Set(before.links.map(link=>link.id));
 return {
  releaseEnabled:false,informationalOnly:true,canGateEntry:false,
  canFilterRecruitment:false,queueEligibilityIndependentOfSynchronization:true,
  personalCpDelta:0,beforeActiveCount:before.activeCount,
  afterActiveCount:resulting.activeCount,beforeScalePercent:before.scalePercent,
  afterScalePercent:resulting.scalePercent,
  scaleDeltaPercent:resulting.scalePercent-before.scalePercent,
  newlyActivatedLinkIds:resulting.links.filter(link=>!beforeIds.has(link.id)).map(link=>link.id),
  resulting,
 };
}

/** Static catalogue for the client info sheet. This is not a recruitment index. */
export function projectPartySynchronizationCatalogueV2(){
 return listPartySynchronizationsV2().map(link=>({
  id:link.id,name:link.name,nameKey:nameKey(link.id),classes:[...link.classes],
  baseBonuses:link.bonuses.map(([stat,bps])=>({stat,statKey:statKey(stat),bps})),
  canFilterRecruitment:false as const,requiresProgression:false as const,
 }));
}

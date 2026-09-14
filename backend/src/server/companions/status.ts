import {busyCompanionIds,rolloverCompanionAssignmentStatuses} from './assignments';
import {companionServerDefinition} from './content';
import type {CompanionAssignment,CompanionAvailabilityStatus,CompanionTrialProgress,OwnedCompanionSnapshot} from './domain';

export interface CompanionStatusContext{
  owned:Record<string,OwnedCompanionSnapshot>;
  assignments:readonly CompanionAssignment[];
  equippedCompanionIds:ReadonlySet<string>;
  trialProgress?:CompanionTrialProgress;
  unavailableCompanionIds?:ReadonlySet<string>;
  serverNowMs:number;
}
export function companionAvailabilityStatus(companionId:string,context:CompanionStatusContext):CompanionAvailabilityStatus{
  if(!companionServerDefinition(companionId))return 'unavailable';
  if(!context.owned[companionId])return 'locked';
  if(context.unavailableCompanionIds?.has(companionId))return 'unavailable';
  if(context.equippedCompanionIds.has(companionId))return 'equipped';
  const assignments=rolloverCompanionAssignmentStatuses(context.assignments,context.serverNowMs);
  if(busyCompanionIds(assignments).has(companionId))return 'expedition';
  if(context.trialProgress?.season.activeRun?.teamCompanionIds.includes(companionId))return 'active_trial';
  return 'available';
}
export function availableForCompanionActivity(companionId:string,context:CompanionStatusContext){return companionAvailabilityStatus(companionId,context)==='available';}

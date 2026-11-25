export const SCOUTING_TRAINING_MINUTES=[5,15,30,60,120,240,480] as const;
export type ScoutingTrainingMinutes=typeof SCOUTING_TRAINING_MINUTES[number];
export type ScoutingAssignmentKind='route'|'practice'|'survey'|'camp';
export type ScoutingFoodSelection={itemId:string;quantity:number};
export type ScoutingDispatchCommand=
 |{kind:'route';routeId:string;companionIds:string[]}
 |{kind:'practice'|'survey';routeId:string;companionIds:string[];trainingMinutes:ScoutingTrainingMinutes}
 |{kind:'camp';missionId:string;companionIds:string[];earnExplorationXp:boolean;food:ScoutingFoodSelection[]};
export interface ScoutingAccountProjection{accountId:string;xp:number;level:number;creditedDiscoveryIds:string[];retainedSlots:number}
export interface ScoutingCharacterProjection{characterId:string;retainedRegionIds:string[];retainedAreaIds:string[];discoveredRouteIds:string[]}
export interface ScoutingAssignmentProjection{assignmentId:string;characterId:string;kind:ScoutingAssignmentKind;status:'active'|'completed'|'claimed';endsAt:string;companionIds:string[];explorationXp:number}
export interface ScoutingSnapshotProjection{account:ScoutingAccountProjection;character:ScoutingCharacterProjection;assignments:ScoutingAssignmentProjection[];camp:{level:number;capacity:number;active:number};legacyReports:number}
export interface ScoutingDispatchResult{requestId:string;idempotentReplay:boolean;assignment:ScoutingAssignmentProjection;snapshot:ScoutingSnapshotProjection}
export interface ScoutingClaimResult{requestId:string;assignmentId:string;idempotentReplay:boolean;explorationXpAwarded:number;reward:Record<string,unknown>|null;snapshot:ScoutingSnapshotProjection}
export interface ScoutingMigrationResult{accountId:string;alreadyMigrated:boolean;xp:number;level:number;retainedSlots:number;characters:number}

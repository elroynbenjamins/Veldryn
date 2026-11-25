import type {ScoutingClaimResult,ScoutingDispatchCommand,ScoutingDispatchResult,ScoutingMigrationResult,ScoutingSnapshotProjection} from './scouting-types';
export interface ScoutingRepository{
 snapshot(accountId:string,characterId:string):Promise<ScoutingSnapshotProjection>;
 dispatch(input:{accountId:string;characterId:string;requestId:string;command:ScoutingDispatchCommand;nowMs:number}):Promise<ScoutingDispatchResult>;
 claim(input:{accountId:string;characterId:string;assignmentId:string;requestId:string;nowMs:number}):Promise<ScoutingClaimResult>;
 migrateAccount(input:{accountId:string;nowMs:number}):Promise<ScoutingMigrationResult>;
}

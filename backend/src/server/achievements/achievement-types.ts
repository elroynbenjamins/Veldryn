export type AchievementCategory='Progression'|'Arena'|'Expeditions'|'Guild'|'Collection'|'Meta';
export interface AchievementRewardProjection{gold:number;titleId?:string;titleName?:string}
export interface AchievementEntryProjection{id:string;category:AchievementCategory;name:string;description:string;progress:number;required:number;points:number;completed:boolean;claimed:boolean;reward:AchievementRewardProjection;claimedAtMs?:number}
export interface AchievementSnapshotProjection{entries:AchievementEntryProjection[];score:number;claimedCount:number;showcaseIds:string[]}
export interface AchievementClaimResult{achievementId:string;payout:AchievementRewardProjection;creditedCharacterId:string;claimedAtMs:number;idempotentReplay:boolean;snapshot:AchievementSnapshotProjection}
export interface AchievementShowcaseResult{showcaseIds:string[];snapshot:AchievementSnapshotProjection}

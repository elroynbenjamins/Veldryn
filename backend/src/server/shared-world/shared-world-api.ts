export interface RegionalCrisisSummaryDto {
  instanceId:string; name:string; regionId:string; state:string; startsAt:string; endsAt:string; targetPoints:number; creditedPoints:number; progressFraction:number; currentStageName:string; yourPoints:number; yourMilestones:number[]; partyPoints?:number; guildPoints?:number;
}
export interface WorldBossSummaryDto {
  instanceId:string; name:string; regionId:string; state:string; startsAt:string; endsAt:string; maxHp:number; remainingHp:number; hpFraction:number; phaseName:string; attemptsToday:number; dailyAttemptCap:number; yourRaidImpact:number; yourAppliedDamage:number; defeatedAt?:string;
}
export interface SharedWorldApi {
  listActiveRegionalCrises(accountId:string):Promise<RegionalCrisisSummaryDto[]>;
  getRegionalCrisis(accountId:string,instanceId:string):Promise<RegionalCrisisSummaryDto>;
  listAvailableWorldBosses(accountId:string):Promise<WorldBossSummaryDto[]>;
  getWorldBoss(accountId:string,instanceId:string):Promise<WorldBossSummaryDto>;
}

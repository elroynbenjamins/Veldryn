/**
 * Read-only mirror of guild_shop_claim_daily_server_v1's eligibility rule.
 * The database remains authoritative for claiming and token amounts.
 * Check-in alone is never sufficient for the Activity reward.
 */
export type GuildDailyTokenKind='attendance'|'contribution';
export type GuildDailyTokenStatus='ready'|'locked'|'claimed'|'capped'|'unavailable';

export interface GuildDailyTokenWallet{
 claimedDailyKinds:readonly GuildDailyTokenKind[];
 earnedThisWeek:number;
 weeklyCap:number;
}
export interface GuildDailyTokenMuster{
 activityDate:string;
 checkInPoints:number;
 combatPoints:number;
 skillingPoints:number;
}

export function guildDailyTokenClaimStatus(
 wallet:GuildDailyTokenWallet|null,
 muster:GuildDailyTokenMuster|null,
 kind:GuildDailyTokenKind,
 utcDate:string=new Date().toISOString().slice(0,10),
):GuildDailyTokenStatus{
 if(!wallet)return 'unavailable';
 if(wallet.claimedDailyKinds.includes(kind))return 'claimed';
 if(wallet.earnedThisWeek>=wallet.weeklyCap)return 'capped';
 // Never infer an eligible claim from old daily activity or a failed read.
 if(!muster||muster.activityDate!==utcDate)return 'unavailable';
 const earned=kind==='attendance'?muster.checkInPoints>0
   :muster.combatPoints>0||muster.skillingPoints>0;
 return earned?'ready':'locked';
}

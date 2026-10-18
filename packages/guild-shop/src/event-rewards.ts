import { GUILD_EVENT_TOKEN_REWARDS } from "./catalogue";
export type GuildEventTokenActivity =
 | "daily_participation" | "contribution_milestone" | "boss_completion"
 | "personal_milestone" | "final_guild_milestone";
export interface GuildEventRewardDefinition {
 eventId:string; activity:GuildEventTokenActivity; milestoneId:string; tokens:number;
}
export type EventRewardDecision =
 | {ok:true; claimKey:string; tokens:number}
 | {ok:false; reason:"invalid_event"|"invalid_milestone"|"invalid_reward"};
/** Generates a stable claim key for a server-verified milestone.
 * The backend MUST check completion and guild membership independently.
 */
export function validateEventGuildTokenReward(reward:GuildEventRewardDefinition):EventRewardDecision {
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(reward.eventId))return {ok:false,reason:"invalid_event"};
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(reward.milestoneId))return {ok:false,reason:"invalid_milestone"};
 const ranges:Record<GuildEventTokenActivity,readonly [number,number]>={
  daily_participation:[GUILD_EVENT_TOKEN_REWARDS.dailyParticipation,GUILD_EVENT_TOKEN_REWARDS.dailyParticipation],
  contribution_milestone:[GUILD_EVENT_TOKEN_REWARDS.contributionMilestoneMin,GUILD_EVENT_TOKEN_REWARDS.contributionMilestoneMax],
  boss_completion:[GUILD_EVENT_TOKEN_REWARDS.bossCompletion,GUILD_EVENT_TOKEN_REWARDS.bossCompletion],
  personal_milestone:[GUILD_EVENT_TOKEN_REWARDS.personalMilestoneMin,GUILD_EVENT_TOKEN_REWARDS.personalMilestoneMax],
  final_guild_milestone:[GUILD_EVENT_TOKEN_REWARDS.finalMilestoneMin,GUILD_EVENT_TOKEN_REWARDS.finalMilestoneMax],
 };
 if(!Object.prototype.hasOwnProperty.call(ranges,reward.activity))return {ok:false,reason:"invalid_reward"};
 const [min,max]=ranges[reward.activity];
 if(!Number.isSafeInteger(reward.tokens)||reward.tokens<min||reward.tokens>max)return {ok:false,reason:"invalid_reward"};
 return {ok:true,claimKey:`guild-event:${reward.eventId}:${reward.activity}:${reward.milestoneId}`,tokens:reward.tokens};
}

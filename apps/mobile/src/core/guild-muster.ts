export const GUILD_MUSTER_DAILY_CAP=100;
export const GUILD_MUSTER_CHECK_IN_POINTS=5;
export const GUILD_MUSTER_RALLY_MARK_THRESHOLD=25;
export const GUILD_MUSTER_PERSONAL_WEEKLY_GOAL=4;
export const GUILD_MUSTER_RALLY_ACTIVE_SHARE=0.60;

export type GuildMusterRallyTier=0|1|2|3;

export function guildMusterRallyTarget(memberCount:number){
  const members=Math.max(1,Math.floor(Number.isFinite(memberCount)?memberCount:1));
  const participatingMembers=Math.max(1,Math.ceil(members*GUILD_MUSTER_RALLY_ACTIVE_SHARE));
  return participatingMembers*GUILD_MUSTER_PERSONAL_WEEKLY_GOAL;
}

export function guildMusterRallyTier(rallyMarks:number,target:number):GuildMusterRallyTier{
  const marks=Math.max(0,Math.floor(Number.isFinite(rallyMarks)?rallyMarks:0));
  const safeTarget=Math.max(1,Math.floor(Number.isFinite(target)?target:1));
  if(marks>=safeTarget)return 3;
  if(marks>=Math.ceil(safeTarget*0.70))return 2;
  if(marks>=Math.ceil(safeTarget*0.35))return 1;
  return 0;
}

export function guildMusterHallBonusBps(tier:GuildMusterRallyTier){
  return tier===3?1500:tier===2?1000:tier===1?500:0;
}

export function guildMusterEarnedRallyMark(points:number){
  return Math.max(0,Math.floor(Number.isFinite(points)?points:0))>=GUILD_MUSTER_RALLY_MARK_THRESHOLD;
}

export function guildMusterDailyPercent(points:number){
  return Math.max(0,Math.min(100,Math.round(Math.max(0,points)/GUILD_MUSTER_DAILY_CAP*100)));
}

export function guildMusterRallyPercent(marks:number,target:number){
  return Math.max(0,Math.min(100,Math.round(Math.max(0,marks)/Math.max(1,target)*100)));
}

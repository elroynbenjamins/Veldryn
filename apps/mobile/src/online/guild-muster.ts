import {supabase} from './supabase';

export interface OnlineGuildMusterState{
  guildId:string;
  activityDate:string;
  weekKey:string;
  weekEndsAt:string;
  checkedIn:boolean;
  dailyPoints:number;
  checkInPoints:number;
  combatPoints:number;
  skillingPoints:number;
  dailyCap:number;
  rallyMarkThreshold:number;
  rallyMarkEarned:boolean;
  personalQualifyingDays:number;
  personalWeeklyGoal:number;
  personalWeeklyPoints:number;
  memberCount:number;
  checkedInMembersToday:number;
  qualifiedMembersToday:number;
  rallyMarks:number;
  rallyTarget:number;
  rallyTier:0|1|2|3;
  hallBonusBps:number;
  guildWeeklyPoints:number;
}

export interface OnlineGuildMusterMember{
  accountId:string;
  displayName:string;
  role:string;
  todayPoints:number;
  weeklyPoints:number;
  qualifyingDays:number;
  lifetimePoints:number;
}

function client(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}
function num(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(0,Math.floor(parsed)):0;}

export async function loadOnlineGuildMuster():Promise<{state:OnlineGuildMusterState;members:OnlineGuildMusterMember[]}|null>{
  const db=client();
  const [{data:stateData,error:stateError},{data:rosterData,error:rosterError}]=await Promise.all([
    db.rpc('guild_muster_state_v1'),
    db.rpc('guild_muster_roster_v1'),
  ]);
  if(stateError)throw stateError;
  if(rosterError)throw rosterError;
  const row=stateData?.[0] as Record<string,unknown>|undefined;
  if(!row)return null;
  const state:OnlineGuildMusterState={
    guildId:String(row.guild_id),
    activityDate:String(row.activity_date),
    weekKey:String(row.week_key),
    weekEndsAt:String(row.week_ends_at),
    checkedIn:row.checked_in===true,
    dailyPoints:num(row.daily_points),
    checkInPoints:num(row.check_in_points),
    combatPoints:num(row.combat_points),
    skillingPoints:num(row.skilling_points),
    dailyCap:num(row.daily_cap)||100,
    rallyMarkThreshold:num(row.rally_mark_threshold)||25,
    rallyMarkEarned:row.rally_mark_earned===true,
    personalQualifyingDays:num(row.personal_qualifying_days),
    personalWeeklyGoal:num(row.personal_weekly_goal)||4,
    personalWeeklyPoints:num(row.personal_weekly_points),
    memberCount:num(row.member_count),
    checkedInMembersToday:num(row.checked_in_members_today),
    qualifiedMembersToday:num(row.qualified_members_today),
    rallyMarks:num(row.rally_marks),
    rallyTarget:num(row.rally_target)||1,
    rallyTier:Math.max(0,Math.min(3,num(row.rally_tier))) as 0|1|2|3,
    hallBonusBps:num(row.hall_bonus_bps),
    guildWeeklyPoints:num(row.guild_weekly_points),
  };
  const members=((rosterData??[]) as Record<string,unknown>[]).map((member):OnlineGuildMusterMember=>({
    accountId:String(member.account_id),
    displayName:String(member.display_name??'Adventurer'),
    role:String(member.role??'member'),
    todayPoints:num(member.today_points),
    weeklyPoints:num(member.weekly_points),
    qualifyingDays:num(member.qualifying_days),
    lifetimePoints:num(member.lifetime_points),
  }));
  return {state,members};
}

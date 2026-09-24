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
  activityPercent:number;
  activityTargetUnits:number;
  activityDailyDecayPercent:number;
  activityPartialDecayPercent:number;
  activityDecayMode:'protected'|'partial'|'inactive';
  activityTodayUnits:number;
  activityActiveMemberCount:number;
  gatheringSpeedBps:number;
  productionSpeedBps:number;
  activitySkillXpBps:number;
  masteryXpBps:number;
  rareMaterialRelativeBps:number;
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


export interface OnlineGuildActivityState{
  guildId:string;activityPercent:number;activityTargetUnits:number;activityTodayUnits:number;activeMemberCount:number;
  decayMode:'protected'|'partial'|'inactive';partialDecayPercent:number;inactiveDecayPercent:number;
  gatheringSpeedBps:number;productionSpeedBps:number;skillXpBps:number;masteryXpBps:number;rareMaterialRelativeBps:number;
}

export async function loadOnlineGuildActivityState():Promise<OnlineGuildActivityState|null>{
  const db=client();
  const {data,error}=await db.rpc('guild_activity_state_v2');
  if(error)throw error;
  const row=data?.[0] as Record<string,unknown>|undefined;
  if(!row)return null;
  return {
    guildId:String(row.guild_id),
    activityPercent:num(row.activity_percent),
    activityTargetUnits:num(row.target_units)||100,
    activityTodayUnits:num(row.activity_today_units),
    activeMemberCount:num(row.active_member_count)||1,
    decayMode:(row.decay_mode==='protected'||row.decay_mode==='partial'?row.decay_mode:'inactive') as 'protected'|'partial'|'inactive',
    partialDecayPercent:num(row.partial_decay_percent)||5,
    inactiveDecayPercent:num(row.inactive_decay_percent)||10,
    gatheringSpeedBps:num(row.gathering_speed_bps),
    productionSpeedBps:num(row.production_speed_bps),
    skillXpBps:num(row.skill_xp_bps),
    masteryXpBps:num(row.mastery_xp_bps),
    rareMaterialRelativeBps:num(row.rare_material_relative_bps),
  };
}

export async function loadOnlineGuildMuster():Promise<{state:OnlineGuildMusterState;members:OnlineGuildMusterMember[]}|null>{
  const db=client();
  const [{data:stateData,error:stateError},{data:rosterData,error:rosterError},{data:activityData,error:activityError}]=await Promise.all([
    db.rpc('guild_muster_state_v1'),
    db.rpc('guild_muster_roster_v1'),
    db.rpc('guild_activity_state_v2'),
  ]);
  if(stateError)throw stateError;
  if(rosterError)throw rosterError;
  if(activityError)throw activityError;
  const row=stateData?.[0] as Record<string,unknown>|undefined;
  const activityRow=activityData?.[0] as Record<string,unknown>|undefined;
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
    activityPercent:num(activityRow?.activity_percent),
    activityTargetUnits:num(activityRow?.target_units)||100,
    activityDailyDecayPercent:num(activityRow?.inactive_decay_percent)||10,
    activityPartialDecayPercent:num(activityRow?.partial_decay_percent)||5,
    activityDecayMode:(activityRow?.decay_mode==='protected'||activityRow?.decay_mode==='partial'?String(activityRow?.decay_mode):'inactive') as 'protected'|'partial'|'inactive',
    activityTodayUnits:num(activityRow?.activity_today_units),
    activityActiveMemberCount:num(activityRow?.active_member_count)||1,
    gatheringSpeedBps:num(activityRow?.gathering_speed_bps),
    productionSpeedBps:num(activityRow?.production_speed_bps),
    activitySkillXpBps:num(activityRow?.skill_xp_bps),
    masteryXpBps:num(activityRow?.mastery_xp_bps),
    rareMaterialRelativeBps:num(activityRow?.rare_material_relative_bps),
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

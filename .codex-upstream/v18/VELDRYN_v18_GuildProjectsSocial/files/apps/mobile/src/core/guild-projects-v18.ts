export type GuildProjectFocus='combat'|'skilling'|'mixed'|'development';
export type GuildProjectKind='weekly_campaign'|'development'|'event';

export interface GuildProjectCandidateView { id:string;templateId:string;name:string;description:string;focus:Exclude<GuildProjectFocus,'development'>;votes:number;myVote:boolean;rewardTier:'standard'|'enhanced'|'prestige'; }
export interface GuildProjectMemberView { accountId:string;displayName:string;role:string;points:number;combatPoints:number;skillingPoints:number;meaningful:boolean;rewardEligible:boolean; }
export interface GuildProjectResourceGoalView { resourceKind:'gold'|'item';resourceId:string;label:string;target:number;current:number; }
export interface GuildProjectView {
  id:string;name:string;description:string;kind:GuildProjectKind;focus:GuildProjectFocus;status:'active'|'completed'|'expired'|'cancelled';slotIndex:number;
  targetPoints:number;completionPoints:number;combatPoints:number;skillingPoints:number;meaningfulContributors:number;minimumMeaningfulContributors:number;
  personalPoints:number;personalRewardThreshold:number;dailyPoints:number;dailyCap:number;endsAt?:string;members:GuildProjectMemberView[];resourceGoals:GuildProjectResourceGoalView[];
  canClaimCompletionReward:boolean;completionRewardClaimed:boolean;
}
export interface GuildDecreeView { id:string;name:string;description:string;votes:number;myVote:boolean;active:boolean;endsAt?:string; }
export interface GuildActivityView { id:string;kind:string;title:string;body?:string;createdAt:string; }
export interface GuildMemberRow { accountId:string;displayName:string;role:string;contributionThisWeek:number;onlineState?:'online'|'recent'|'offline';joinedAt:string; }
export interface GuildHubView { guildId:string;name:string;level:number;xp:number;memberCount:number;memberCap:number;bulletin:string;myRole:string;projectSlots:number;activeProjects:GuildProjectView[];boardCandidates:GuildProjectCandidateView[];decrees:GuildDecreeView[];activity:GuildActivityView[];members:GuildMemberRow[]; }

export function projectProgressPercent(project:GuildProjectView):number{
  if(project.kind==='development'){
    if(project.resourceGoals.length===0)return 0;
    const fractions=project.resourceGoals.map(g=>g.target<=0?1:Math.min(1,g.current/g.target));
    return Math.round((fractions.reduce((a,b)=>a+b,0)/fractions.length)*100);
  }
  if(project.targetPoints<=0)return 0;
  return Math.max(0,Math.min(125,Math.round((project.completionPoints/project.targetPoints)*100)));
}

export function projectFocusLabel(focus:GuildProjectFocus):string{
  return focus==='combat'?'Combat':focus==='skilling'?'Skilling':focus==='mixed'?'Mixed':'Development';
}

export function formatGuildRole(role:string):string{return role.split('_').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' ')}

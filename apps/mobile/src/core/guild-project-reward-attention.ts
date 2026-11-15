/** Claim alerts must match the rewards shown on the Guild Projects claim board.
 * A reward is actionable only for this account, after completion, during the
 * seven-day claim window, and before a successful claim is recorded. */
export interface GuildProjectRewardForAttention {
 id:string;
 launchWeekly?:boolean;
 status:'active'|'completed'|'expired'|'cancelled';
 completionRewardClaimed?:boolean;
 personalPoints:number;
 personalRewardThreshold:number;
 endsAt?:string;
}

export function claimableGuildProjectRewardIds(
 projects:readonly GuildProjectRewardForAttention[],
 nowMs=Date.now(),
):string[]{
 const seen=new Set<string>();
 return projects.filter(project=>{
  if(!project.id||seen.has(project.id))return false;
  seen.add(project.id);
  if(project.launchWeekly!==true||project.status!=='completed'||project.completionRewardClaimed)return false;
  if(!Number.isFinite(project.personalPoints)||!Number.isFinite(project.personalRewardThreshold)
   ||project.personalRewardThreshold<=0||project.personalPoints<project.personalRewardThreshold)return false;
  if(!project.endsAt)return false;
  const end=Date.parse(project.endsAt);
  return Number.isFinite(end)&&nowMs<end+7*86400000;
 }).map(project=>project.id);
}

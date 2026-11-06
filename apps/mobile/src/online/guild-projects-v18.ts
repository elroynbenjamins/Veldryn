import {supabase} from './supabase';
import {myGuild} from './social';
import {ShortLivedReadCache} from '../core/short-lived-read-cache';
import type {GuildActivityView,GuildProjectFocus,GuildProjectKind} from '../core/guild-projects-v18';

type ProjectRow={
 id:string;guild_id:string;template_id:string;definition_snapshot:Record<string,unknown>|null;kind:GuildProjectKind;focus:GuildProjectFocus;slot_index:number;status:'active'|'completed'|'expired'|'cancelled';
 target_points:number|string;completion_points:number|string;combat_points:number|string;skilling_points:number|string;cycle_key?:string|null;meaningful_contributors:number;minimum_meaningful_contributors:number;personal_reward_threshold:number;ends_at?:string|null;started_at:string;
};
type ProgressRow={project_instance_id:string;account_id:string;raw_points:number|string;completion_points:number|string;combat_points:number|string;skilling_points:number|string};
type ResourceRow={project_instance_id:string;resource_kind:'gold'|'item';resource_id:string;target_amount:number|string;contributed_amount:number|string};
type ActivityRow={id:string;kind:string;title:string;body?:string|null;created_at:string};
type EffortSourceRow={project_id:string;account_id:string;source:'combat'|'gathering'|'crafting'|'donation';points:number|string};
type RosterRow={account_id:string;display_name:string;role:string};
type CandidateRow={id:string;cycleKey:string;templateId:string;name:string;description:string;focus:'combat'|'skilling'|'mixed';expiresAt:string;guildXp:number|string;goldReward:number|string;mode:string;voteCount:number;myVote:boolean};

export interface OnlineGuildProjectResourceGoal{resourceKind:'gold'|'item';resourceId:string;label:string;target:number;current:number}
export interface OnlineGuildProjectMemberContribution{
 accountId:string;displayName:string;role:string;points:number;combatPoints:number;gatheringPoints:number;craftingPoints:number;donationPoints?:number;meaningful:boolean;
}
export interface OnlineGuildProjectSupplyItem{itemId:string;name:string;category:'wood'|'fish'|'ore';value:number;available:number}
export interface OnlineGuildProjectSummary{
 id:string;templateId:string;name:string;description:string;kind:GuildProjectKind;focus:GuildProjectFocus;slotIndex:number;status:'active'|'completed'|'expired'|'cancelled';
 targetPoints:number;completionPoints:number;combatPoints:number;skillingPoints:number;meaningfulContributors:number;minimumMeaningfulContributors:number;
 completionRewardClaimed?:boolean;launchWeekly?:boolean;rewardGold:number;rewardDestination:'character'|'guild_bank';guildXpReward?:number;hallProgress?:number;projectMode?:'effort'|'donation'|'hybrid';activityTotals:Record<'combat'|'gathering'|'crafting',number>&{donation?:number};personalPoints:number;personalRewardThreshold:number;endsAt?:string;startedAt:string;resourceGoals:OnlineGuildProjectResourceGoal[];memberContributions:OnlineGuildProjectMemberContribution[];
}
export interface OnlineGuildProjectCandidate{id:string;cycleKey:string;templateId:string;name:string;description:string;focus:'combat'|'skilling'|'mixed';expiresAt:string;voteCount:number;myVote:boolean;canStart:boolean;guildXpReward:number;rewardGold:number;mode:'effort'|'donation'|'hybrid'}
export interface OnlineGuildProjectsSnapshot{guildId:string;projects:OnlineGuildProjectSummary[];candidates:OnlineGuildProjectCandidate[];activity:GuildActivityView[];supplyInventory?:OnlineGuildProjectSupplyItem[]}

function client(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}
function num(value:unknown){const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0}
function humanize(value:string){return value.replace(/^guild_(?:weekly|dev|event)_/,'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function definitionText(snapshot:Record<string,unknown>|null,key:string,fallback:string){const value=snapshot?.[key];return typeof value==='string'&&value.trim()?value.trim():fallback}
function resourceLabel(snapshot:Record<string,unknown>|null,resourceId:string,kind:'gold'|'item'){
 const requirements=[...(Array.isArray(snapshot?.donationRequirements)?snapshot!.donationRequirements as Array<Record<string,unknown>>:[]),...(Array.isArray(snapshot?.supplyGoals)?snapshot!.supplyGoals as Array<Record<string,unknown>>:[])];
 const match=requirements.find(row=>row.resourceId===resourceId||'supply:'+row.category===resourceId);
 const label=match?.label;
 if(typeof label==='string'&&label.trim())return label.trim();
 return kind==='gold'?'Gold':humanize(resourceId);
}

const projectReads=new ShortLivedReadCache<OnlineGuildProjectsSnapshot>(20_000);
export async function loadOnlineGuildProjectsV18(force=false):Promise<OnlineGuildProjectsSnapshot|null>{
 // Check the current authoritative membership on every visit/read, including
 // cache hits. A stale guild projection must not outlive access revocation.
 const membership=await myGuild();if(!membership){projectReads.clear();return null;}
 return projectReads.read(membership.account_id+':'+membership.guild_id,()=>readGuildProjects(membership),force);
}
async function readGuildProjects(membership:NonNullable<Awaited<ReturnType<typeof myGuild>>>):Promise<OnlineGuildProjectsSnapshot>{
 const db=client();
 const prepared=await db.rpc('prepare_guild_projects_v2');if(prepared.error)throw prepared.error;
 const [projectResult,candidateResult,rosterResult,supplyResult]=await Promise.all([
  db.from('guild_project_instances')
   .select('id,guild_id,template_id,definition_snapshot,kind,focus,slot_index,cycle_key,status,target_points,completion_points,combat_points,skilling_points,meaningful_contributors,minimum_meaningful_contributors,personal_reward_threshold,ends_at,started_at')
   .eq('guild_id',membership.guild_id).in('status',['active','completed']).order('started_at',{ascending:false}).limit(12),
  db.rpc('guild_project_choice_ballot_v1'),
  db.rpc('guild_roster',{p_guild_id:membership.guild_id}),
  db.rpc('guild_project_supply_inventory_v1'),
 ]);
 if(projectResult.error)throw projectResult.error;
 // During a staged rollout the main project must remain available until the
 // optional second project has been deployed. Only missing-RPC errors degrade.
 const missingRpc=(error:unknown)=>!!error&&/PGRST202|could not find the function|function .* does not exist/i.test(String((error as {message?:unknown}).message??error));
 if(candidateResult.error&&!missingRpc(candidateResult.error))throw candidateResult.error;
 if(supplyResult.error&&!missingRpc(supplyResult.error))throw supplyResult.error;
 if(rosterResult.error)throw rosterResult.error;
 const projectData=projectResult.data,candidateData=candidateResult.error?[]:candidateResult.data;
 const rows=(projectData??[]) as ProjectRow[],ids=rows.map(row=>row.id),roster=(rosterResult.data??[]) as RosterRow[];
 let progress:ProgressRow[]=[],resources:ResourceRow[]=[],activitySources:EffortSourceRow[]=[];
 if(ids.length){
  const [progressResult,resourceResult,sourceResult]=await Promise.all([
   db.from('guild_project_member_progress').select('project_instance_id,account_id,raw_points,completion_points,combat_points,skilling_points').in('project_instance_id',ids),
   db.from('guild_project_resource_progress').select('project_instance_id,resource_kind,resource_id,target_amount,contributed_amount').in('project_instance_id',ids),
   db.from('guild_project_effort_sources_v1').select('project_id,account_id,source,points').in('project_id',ids),
  ]);
  if(progressResult.error)throw progressResult.error;if(resourceResult.error)throw resourceResult.error;
  // The per-source effort breakdown is supplementary. Tolerate a backend that
  // has not applied the effort-sources view yet so Projects still load with a
  // zeroed activity breakdown instead of failing the whole board.
  if(!sourceResult.error)activitySources=(sourceResult.data??[]) as EffortSourceRow[];
  progress=(progressResult.data??[]) as ProgressRow[];resources=(resourceResult.data??[]) as ResourceRow[];
 }
 const {data:activityData,error:activityError}=await db.from('guild_activity_feed').select('id,kind,title,body,created_at').eq('guild_id',membership.guild_id).order('created_at',{ascending:false}).limit(30);
 if(activityError)throw activityError;
 const claims=await db.from('guild_project_reward_claims').select('project_instance_id').eq('account_id',membership.account_id).eq('reward_key','completion');if(claims.error)throw claims.error;
 const claimed=new Set((claims.data??[]).map(row=>row.project_instance_id));
 const progressByProjectAndAccount=new Map(progress.map(row=>[row.project_instance_id+':'+row.account_id,row]));
 const projects=rows.map(row=>{
  const activityTotals={combat:0,gathering:0,crafting:0,donation:0};
  for(const source of activitySources.filter(e=>e.project_id===row.id))activityTotals[source.source]+=num(source.points);
  const snapshot=row.definition_snapshot??{},personal=progressByProjectAndAccount.get(row.id+':'+membership.account_id);
  const memberContributions=roster.map(member=>{
   const contribution=progressByProjectAndAccount.get(row.id+':'+member.account_id);
   const sources={combat:0,gathering:0,crafting:0,donation:0};
   const memberSources=activitySources.filter(entry=>entry.project_id===row.id&&entry.account_id===member.account_id);
   for(const source of memberSources)sources[source.source]+=num(source.points);
   // During a staged rollout, the source breakdown may not be available yet.
   // Existing skilling points were gathering-only before crafting was added.
   const hasSkillingSource=memberSources.some(source=>source.source==='gathering'||source.source==='crafting');
   return {accountId:member.account_id,displayName:member.display_name||'Adventurer',role:member.role||'member',points:num(contribution?.raw_points),combatPoints:sources.combat||num(contribution?.combat_points),gatheringPoints:sources.gathering||(hasSkillingSource?0:num(contribution?.skilling_points)),craftingPoints:sources.crafting,donationPoints:sources.donation,meaningful:num(contribution?.raw_points)>=250};
  }).sort((a,b)=>b.points-a.points||a.displayName.localeCompare(b.displayName));
  return {
   id:row.id,templateId:row.template_id,launchWeekly:row.template_id==='guild_weekly_shared_effort'||(row.slot_index===2&&row.cycle_key?.startsWith('choice:')===true),completionRewardClaimed:claimed.has(row.id),
   name:definitionText(snapshot,'name',humanize(row.template_id)),activityTotals,
   rewardGold:num(snapshot.goldReward)||500,rewardDestination:snapshot.rewardDestination==='guild_bank'?'guild_bank':'character',
   guildXpReward:num(snapshot.guildXpReward),hallProgress:num(snapshot.guildHallProgress)||200,
   projectMode:snapshot.mode==='donation'?'donation':snapshot.mode==='hybrid'?'hybrid':'effort',
   description:definitionText(snapshot,'description','Shared Guild project.'),
   kind:row.kind,focus:row.focus,slotIndex:row.slot_index,status:row.status,
   targetPoints:num(row.target_points),completionPoints:num(row.completion_points),combatPoints:num(row.combat_points),skillingPoints:num(row.skilling_points),
   meaningfulContributors:Math.max(0,Math.floor(row.meaningful_contributors||0)),minimumMeaningfulContributors:Math.max(0,Math.floor(row.minimum_meaningful_contributors||0)),
   personalPoints:num(personal?.raw_points),personalRewardThreshold:num(row.personal_reward_threshold),
   endsAt:row.ends_at??undefined,startedAt:row.started_at,memberContributions,
   resourceGoals:resources.filter(goal=>goal.project_instance_id===row.id).map(goal=>({resourceKind:goal.resource_kind,resourceId:goal.resource_id,label:resourceLabel(snapshot,goal.resource_id,goal.resource_kind),target:num(goal.target_amount),current:num(goal.contributed_amount)})),
  } satisfies OnlineGuildProjectSummary;
 });
 const candidates=(Array.isArray(candidateData)?candidateData as CandidateRow[]:[]).map(row=>({
  id:row.id,cycleKey:row.cycleKey,templateId:row.templateId,name:row.name,description:row.description,
  focus:row.focus,expiresAt:row.expiresAt,voteCount:num(row.voteCount),
  myVote:row.myVote===true,canStart:false,guildXpReward:num(row.guildXp),rewardGold:num(row.goldReward),
  mode:row.mode==='donation'?'donation':row.mode==='hybrid'?'hybrid':'effort',
 } satisfies OnlineGuildProjectCandidate));
 const supplyInventory=(Array.isArray(supplyResult.data)?supplyResult.data as Array<Record<string,unknown>>:[])
  .filter(row=>typeof row.itemId==='string'&&typeof row.name==='string'&&['wood','fish','ore'].includes(String(row.category)))
  .map(row=>({itemId:String(row.itemId),name:String(row.name),category:row.category as 'wood'|'fish'|'ore',
    value:num(row.value),available:num(row.available)}));
 const activity=(activityData??[]).map((row:ActivityRow):GuildActivityView=>({id:row.id,kind:row.kind,title:row.title,body:row.body??undefined,createdAt:row.created_at}));
 return{guildId:membership.guild_id,projects,candidates,activity,supplyInventory};
}

export async function voteOnlineGuildProjectCandidate(candidateId:string){const db=client();const {data,error}=await db.rpc('guild_project_vote_v1',{p_candidate_id:candidateId});if(error)throw error;projectReads.clear();return data as string;}

export async function claimOnlineGuildProjectReward(id:string){const {data,error}=await client().rpc('claim_guild_project_reward_v2',{p_project:id});if(error)throw error;projectReads.clear();return data;}

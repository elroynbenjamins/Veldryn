import {supabase} from './supabase';
import {myGuild} from './social';
import type {GuildActivityView,GuildProjectFocus,GuildProjectKind} from '../core/guild-projects-v18';

type ProjectRow={
 id:string;guild_id:string;template_id:string;definition_snapshot:Record<string,unknown>|null;kind:GuildProjectKind;focus:GuildProjectFocus;slot_index:number;status:'active'|'completed'|'expired'|'cancelled';
 target_points:number|string;completion_points:number|string;combat_points:number|string;skilling_points:number|string;meaningful_contributors:number;minimum_meaningful_contributors:number;personal_reward_threshold:number;ends_at?:string|null;started_at:string;
};
type ProgressRow={project_instance_id:string;raw_points:number|string;completion_points:number|string;combat_points:number|string;skilling_points:number|string};
type ResourceRow={project_instance_id:string;resource_kind:'gold'|'item';resource_id:string;target_amount:number|string;contributed_amount:number|string};
type ActivityRow={id:string;kind:string;title:string;body?:string|null;created_at:string};

export interface OnlineGuildProjectResourceGoal{resourceKind:'gold'|'item';resourceId:string;label:string;target:number;current:number}
export interface OnlineGuildProjectSummary{
 id:string;name:string;description:string;kind:GuildProjectKind;focus:GuildProjectFocus;slotIndex:number;status:'active'|'completed'|'expired'|'cancelled';
 targetPoints:number;completionPoints:number;combatPoints:number;skillingPoints:number;meaningfulContributors:number;minimumMeaningfulContributors:number;
 personalPoints:number;personalRewardThreshold:number;endsAt?:string;startedAt:string;resourceGoals:OnlineGuildProjectResourceGoal[];
}
export interface OnlineGuildProjectsSnapshot{guildId:string;projects:OnlineGuildProjectSummary[];activity:GuildActivityView[]}

function client(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}
function num(value:unknown){const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0}
function humanize(value:string){return value.replace(/^guild_(?:weekly|dev|event)_/,'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function definitionText(snapshot:Record<string,unknown>|null,key:string,fallback:string){const value=snapshot?.[key];return typeof value==='string'&&value.trim()?value.trim():fallback}
function resourceLabel(snapshot:Record<string,unknown>|null,resourceId:string,kind:'gold'|'item'){
 const requirements=Array.isArray(snapshot?.donationRequirements)?snapshot!.donationRequirements as Array<Record<string,unknown>>:[];
 const match=requirements.find(row=>row.resourceId===resourceId);
 const label=match?.label;
 if(typeof label==='string'&&label.trim())return label.trim();
 return kind==='gold'?'Gold':humanize(resourceId);
}

export async function loadOnlineGuildProjectsV18():Promise<OnlineGuildProjectsSnapshot|null>{
 const membership=await myGuild();if(!membership)return null;
 const db=client();
 const {data:projectData,error:projectError}=await db.from('guild_project_instances')
  .select('id,guild_id,template_id,definition_snapshot,kind,focus,slot_index,status,target_points,completion_points,combat_points,skilling_points,meaningful_contributors,minimum_meaningful_contributors,personal_reward_threshold,ends_at,started_at')
  .eq('guild_id',membership.guild_id).in('status',['active','completed']).order('started_at',{ascending:false}).limit(12);
 if(projectError)throw projectError;
 const rows=(projectData??[]) as ProjectRow[],ids=rows.map(row=>row.id);
 let progress:ProgressRow[]=[],resources:ResourceRow[]=[];
 if(ids.length){
  const [progressResult,resourceResult]=await Promise.all([
   db.from('guild_project_member_progress').select('project_instance_id,raw_points,completion_points,combat_points,skilling_points').in('project_instance_id',ids).eq('account_id',membership.account_id),
   db.from('guild_project_resource_progress').select('project_instance_id,resource_kind,resource_id,target_amount,contributed_amount').in('project_instance_id',ids),
  ]);
  if(progressResult.error)throw progressResult.error;if(resourceResult.error)throw resourceResult.error;
  progress=(progressResult.data??[]) as ProgressRow[];resources=(resourceResult.data??[]) as ResourceRow[];
 }
 const {data:activityData,error:activityError}=await db.from('guild_activity_feed').select('id,kind,title,body,created_at').eq('guild_id',membership.guild_id).order('created_at',{ascending:false}).limit(30);
 if(activityError)throw activityError;
 const progressByProject=new Map(progress.map(row=>[row.project_instance_id,row]));
 const projects=rows.map(row=>{
  const snapshot=row.definition_snapshot??{},personal=progressByProject.get(row.id);
  return {
   id:row.id,
   name:definitionText(snapshot,'name',humanize(row.template_id)),
   description:definitionText(snapshot,'description','Shared Guild project.'),
   kind:row.kind,focus:row.focus,slotIndex:row.slot_index,status:row.status,
   targetPoints:num(row.target_points),completionPoints:num(row.completion_points),combatPoints:num(row.combat_points),skillingPoints:num(row.skilling_points),
   meaningfulContributors:Math.max(0,Math.floor(row.meaningful_contributors||0)),minimumMeaningfulContributors:Math.max(0,Math.floor(row.minimum_meaningful_contributors||0)),
   personalPoints:num(personal?.raw_points),personalRewardThreshold:num(row.personal_reward_threshold),
   endsAt:row.ends_at??undefined,startedAt:row.started_at,
   resourceGoals:resources.filter(goal=>goal.project_instance_id===row.id).map(goal=>({resourceKind:goal.resource_kind,resourceId:goal.resource_id,label:resourceLabel(snapshot,goal.resource_id,goal.resource_kind),target:num(goal.target_amount),current:num(goal.contributed_amount)})),
  } satisfies OnlineGuildProjectSummary;
 });
 const activity=(activityData??[]).map((row:ActivityRow):GuildActivityView=>({id:row.id,kind:row.kind,title:row.title,body:row.body??undefined,createdAt:row.created_at}));
 return{guildId:membership.guild_id,projects,activity};
}

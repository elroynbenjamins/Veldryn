import {supabase} from './supabase';

export type GuildQuestCategory='Combat'|'Skilling'|'Mixed'|'Crafting';
export type GuildQuestRarity='common'|'uncommon'|'rare'|'epic'|'legendary';
export interface GuildQuestObjectiveProgress{key:string;progress:number;target:number;}
export interface GuildQuestPersonalProgress{key:string;progress:number;target:number;}
export interface OnlineGuildQuest{
 guildId:string;weekKey:string;weekEndsAt:string;activeMembers:number;questKey:string;title:string;
 category:GuildQuestCategory;description:string;theme:string;rarity:GuildQuestRarity;estimatedMinutes:number;progress:number;target:number;objectiveProgress:GuildQuestObjectiveProgress[];activityReward:number;completed:boolean;contributorCount:number;boardSlot:number;featured:boolean;personalProgress:GuildQuestPersonalProgress[];newlyCompleted:boolean;activityBeforePercent:number|null;activityAfterPercent:number|null;
}
function client(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}
function num(v:unknown){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
export async function loadOnlineGuildQuests():Promise<OnlineGuildQuest[]>{
 const {data,error}=await client().rpc('guild_quest_state_v1');
 if(error)throw error;
 return ((data??[]) as Record<string,unknown>[]).map(row=>({
  guildId:String(row.guild_id),weekKey:String(row.week_key),weekEndsAt:String(row.week_ends_at),activeMembers:num(row.active_members),
  questKey:String(row.quest_key),title:String(row.title),category:(['Combat','Skilling','Mixed','Crafting'].includes(String(row.category))?row.category:'Mixed') as GuildQuestCategory,
  description:String(row.description??''),theme:String(row.theme??row.category??'Guild Quest'),rarity:(['common','uncommon','rare','epic','legendary'].includes(String(row.rarity))?row.rarity:'common') as GuildQuestRarity,estimatedMinutes:num(row.estimated_minutes)||5,progress:num(row.progress),target:Math.max(1,num(row.target)),activityReward:num(row.activity_reward),
  objectiveProgress:Array.isArray(row.objective_progress)?(row.objective_progress as Record<string,unknown>[]).map(x=>({key:String(x.key),progress:num(x.progress),target:Math.max(1,num(x.target))})):[],completed:row.completed===true,contributorCount:num(row.contributor_count),boardSlot:num(row.board_slot),featured:row.featured===true,personalProgress:Array.isArray(row.personal_progress)?(row.personal_progress as Record<string,unknown>[]).map(x=>({key:String(x.key),progress:num(x.progress),target:Math.max(1,num(x.target))})):[],newlyCompleted:row.newly_completed===true,activityBeforePercent:row.activity_before_percent==null?null:num(row.activity_before_percent),activityAfterPercent:row.activity_after_percent==null?null:num(row.activity_after_percent),
 }));
}

import {supabase} from './supabase';

export type GuildQuestCategory='Combat'|'Skilling'|'Mixed';
export interface OnlineGuildQuest{
 guildId:string;weekKey:string;weekEndsAt:string;activeMembers:number;questKey:string;title:string;
 category:GuildQuestCategory;description:string;theme:string;progress:number;target:number;activityReward:number;completed:boolean;contributorCount:number;
}
function client(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase;}
function num(v:unknown){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
export async function loadOnlineGuildQuests():Promise<OnlineGuildQuest[]>{
 const {data,error}=await client().rpc('guild_quest_state_v1');
 if(error)throw error;
 return ((data??[]) as Record<string,unknown>[]).map(row=>({
  guildId:String(row.guild_id),weekKey:String(row.week_key),weekEndsAt:String(row.week_ends_at),activeMembers:num(row.active_members),
  questKey:String(row.quest_key),title:String(row.title),category:(row.category==='Combat'||row.category==='Skilling'?row.category:'Mixed') as GuildQuestCategory,
  description:String(row.description??''),theme:String(row.theme??row.category??'Guild Quest'),progress:num(row.progress),target:Math.max(1,num(row.target)),activityReward:num(row.activity_reward),
  completed:row.completed===true,contributorCount:num(row.contributor_count),
 }));
}

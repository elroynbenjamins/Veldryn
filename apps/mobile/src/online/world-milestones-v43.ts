import {supabase} from './supabase';
export interface WorldMilestoneFeedRow{feed_id:string;account_id:string;kind:string;display_name:string;subject_id:string;subject_name:string;detail:string|null;occurred_at:string;expires_at:string}
export async function worldMilestoneFeedV43(limit=40){
 if(!supabase)throw new Error('Online services are not configured in this build.');
 const {data,error}=await supabase.from('world_milestone_feed').select('feed_id,account_id,kind,display_name,subject_id,subject_name,detail,occurred_at,expires_at').gt('expires_at',new Date().toISOString()).order('occurred_at',{ascending:false}).limit(Math.max(1,Math.min(50,limit)));
 if(error)throw error;return (data??[]) as WorldMilestoneFeedRow[];
}

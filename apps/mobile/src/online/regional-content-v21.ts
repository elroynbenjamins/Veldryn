import type {RegionalProgressState} from '../core/types';
import type {RegionProgressV21} from '../core/region-content-v21';
import {supabase} from './supabase';

type RegionProgressRow=RegionProgressState & {region_id:string;content_version:string;updated_at:string};

export async function loadFrostmarchProgressV21():Promise<RegionProgressV21|null>{
  if(!supabase)return null;
  const {data,error}=await supabase.rpc('get_region_progress_v21',{p_region_id:'REG_003'});
  if(error)throw error;
  const row=(Array.isArray(data)?data[0]:data) as RegionProgressRow|undefined;
  if(!row)return null;
  const bounded=(value:unknown,max:number)=>Math.min(max,Math.max(0,Math.floor(Number(value??0))));
  return {storyCompleted:bounded(row.story_completed??row.storyCompleted,10),storyTotal:10,sideQuestsCompleted:bounded(row.side_quests_completed??row.sideQuestsCompleted,8),sideQuestsTotal:8,echoesCompleted:bounded(row.echoes_completed??row.echoesCompleted,4),echoesTotal:4,dungeonsCompleted:bounded(row.dungeons_completed??row.dungeonsCompleted,3),dungeonsTotal:3,collectionEntries:bounded(row.collection_entries??row.collectionEntries,16),collectionTotal:16,bossMasteryTier:bounded(row.boss_mastery_tier??row.bossMasteryTier,4),bossMasteryMax:4};
}

import {isValidRegionProgressV21,type RegionProgressV21} from '../core/region-content-v21';
import {supabase} from './supabase';

type RegionProgressRow={
  region_id:string;
  content_version:string;
  updated_at:string;
  story_completed?:number;
  side_quests_completed?:number;
  echoes_completed?:number;
  dungeons_completed?:number;
  collection_entries?:number;
  boss_mastery_tier?:number;
  storyCompleted?:number;
  sideQuestsCompleted?:number;
  echoesCompleted?:number;
  dungeonsCompleted?:number;
  collectionEntries?:number;
  bossMasteryTier?:number;
};

export async function loadFrostmarchProgressV21():Promise<RegionProgressV21|null>{
  if(!supabase)return null;
  const {data,error}=await supabase.rpc('get_region_progress_v21',{p_region_id:'REG_003'});
  if(error)throw error;
  const row=(Array.isArray(data)?data[0]:data) as RegionProgressRow|undefined;
  if(!row)return null;
  const bounded=(value:unknown,max:number)=>Math.min(max,Math.max(0,Math.floor(Number(value??0))));
  const progress={storyCompleted:bounded(row.story_completed??row.storyCompleted,10),storyTotal:10,sideQuestsCompleted:bounded(row.side_quests_completed??row.sideQuestsCompleted,8),sideQuestsTotal:8,echoesCompleted:bounded(row.echoes_completed??row.echoesCompleted,4),echoesTotal:4,dungeonsCompleted:bounded(row.dungeons_completed??row.dungeonsCompleted,3),dungeonsTotal:3,collectionEntries:bounded(row.collection_entries??row.collectionEntries,16),collectionTotal:16,bossMasteryTier:bounded(row.boss_mastery_tier??row.bossMasteryTier,4),bossMasteryMax:4};
  return row.region_id==='REG_003'&&isValidRegionProgressV21(progress)?progress:null;
}

export async function loadActiveFrostmarchContentVersionV21():Promise<string|null>{
  if(!supabase)return null;
  const {data,error}=await supabase.from('active_region_content_records_v21').select('content_version').eq('region_id','REG_003').limit(1);
  if(error)throw error;
  const version=data?.[0]?.content_version;
  return typeof version==='string'&&version.trim().length>0?version.trim():null;
}

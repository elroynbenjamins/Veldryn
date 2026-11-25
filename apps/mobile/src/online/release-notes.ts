import {Platform} from 'react-native';
import {supabase} from './supabase';
import {parseReleaseNoteRow,type ReleaseNote} from '../core/release-notes';

const freshnessMs=5*60_000;
let cached:ReleaseNote[]=[];
let refreshAfter=0;
let pending:Promise<ReleaseNote[]>|undefined;

/** Public, optional announcements. No release metadata is ever required to play. */
export function fetchReleaseNotes():Promise<ReleaseNote[]>{
 if(pending)return pending;
 if(Date.now()<refreshAfter)return Promise.resolve(cached);
 pending=loadReleaseNotes().finally(()=>{pending=undefined;});
 return pending;
}
async function loadReleaseNotes():Promise<ReleaseNote[]>{
 if(!supabase)return [];
 try{
  const {data,error}=await supabase.from('app_release_notes')
   .select('version,title,highlights,published_at')
   .eq('platform',Platform.OS==='android'?'android':'other')
   .eq('is_published',true)
   .lte('published_at',new Date().toISOString())
   .order('published_at',{ascending:false})
   .limit(8);
  if(error)throw error;
  cached=(data??[]).map(row=>parseReleaseNoteRow(row as Record<string,unknown>)).filter((row):row is ReleaseNote=>!!row);
  refreshAfter=Date.now()+freshnessMs;
  return cached;
 }catch{
  refreshAfter=Date.now()+30_000;
  return cached;
 }
}

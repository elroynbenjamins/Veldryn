import {Platform} from 'react-native';
import {supabase} from './supabase';
import {parseReleaseNoteRow,type ReleaseNote} from '../core/release-notes';

/** Public, optional announcements. No release metadata is ever required to play. */
export async function fetchReleaseNotes():Promise<ReleaseNote[]>{
 if(!supabase)return [];
 try{
  const {data,error}=await supabase.from('app_release_notes')
   .select('version,title,highlights,published_at')
   .eq('platform',Platform.OS==='android'?'android':'other')
   .eq('is_published',true)
   .lte('published_at',new Date().toISOString())
   .order('published_at',{ascending:false})
   .limit(8);
  if(error)return []; // Older deployments may not have the table yet.
  return (data??[]).map(row=>parseReleaseNoteRow(row as Record<string,unknown>)).filter((row):row is ReleaseNote=>!!row);
 }catch{
  return []; // Offline players can still launch the game.
 }
}

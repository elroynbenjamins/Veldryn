import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {supabase} from './supabase';

export type CoopProfileIconScope='run'|'ready'|'lfg';
export interface CoopProfileIcon {profileIconId:string|null;iconClassId:string|null;}
export type CoopProfileIcons=ReadonlyMap<string,CoopProfileIcon>;
const noIcons:CoopProfileIcons=new Map();
export const noCoopProfileIcon:CoopProfileIcon={profileIconId:null,iconClassId:null};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cosmeticId=(value:unknown)=>typeof value==='string'&&value.length<=128?value:null;

/** Cosmetic-only projection: the server authorizes the scope and hides account IDs. */
export async function loadCoopProfileIcons(scope:CoopProfileIconScope,ids:readonly string[]):Promise<CoopProfileIcons>{
 if(!supabase||!ids.length)return noIcons;
 const {data,error}=await supabase.rpc('coop_profile_icons_v1',{p_scope:scope,p_ids:[...ids]});
 if(error)throw error;
 if(!Array.isArray(data))return noIcons;
 const icons=new Map<string,CoopProfileIcon>();
 for(const row of data){
  if(!row||typeof row.subject_id!=='string'||!uuid.test(row.subject_id))continue;
  icons.set(row.subject_id,{profileIconId:cosmeticId(row.profile_icon_id),iconClassId:cosmeticId(row.icon_class_id)});
 }
 return icons;
}

/** Keep identity refreshes outside the gameplay poll and discard stale viewer/scope results. */
export function useCoopProfileIcons(scope:CoopProfileIconScope,ids:readonly string[],enabled=true,rosterKey:string|number=''):CoopProfileIcons{
 const accountId=useAuthSession().session?.user.id??'';
 const requestedIds=[...new Set(ids.filter(id=>uuid.test(id)))].sort().slice(0,100);
 const idsKey=scope==='lfg'||requestedIds.length===1?requestedIds.join(','):'';
 const key=enabled&&accountId&&idsKey?`${accountId}|${scope}|${idsKey}|${rosterKey}`:'';
 const [result,setResult]=useState<{key:string;icons:CoopProfileIcons}>({key:'',icons:noIcons});
 useEffect(()=>{
  setResult({key,icons:noIcons});
  if(!key)return;
  let stopped=false,generation=0,pending=0;
  const load=async()=>{
   if(stopped||pending||(AppState.currentState!==null&&AppState.currentState!=='active'))return;
   const request=++generation;pending=request;
   try{
    const icons=await loadCoopProfileIcons(scope,idsKey.split(','));
    if(!stopped&&request===generation)setResult({key,icons});
   }catch{if(!stopped&&request===generation)setResult({key,icons:noIcons});}
   finally{if(pending===request)pending=0;}
  };
  void load();
  const timer=setInterval(()=>void load(),60000);
  const listener=AppState.addEventListener('change',next=>{
   generation++;pending=0;setResult({key,icons:noIcons});
   if(next==='active')void load();
  });
  return()=>{stopped=true;generation++;clearInterval(timer);listener.remove();};
 },[key,scope,idsKey]);
 return key&&result.key===key?result.icons:noIcons;
}

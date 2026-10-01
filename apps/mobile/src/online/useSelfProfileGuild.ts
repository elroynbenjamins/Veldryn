import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import type {GameState} from '../core/types';
import {localProfileGuild,type ProfileGuildIdentity} from '../core/profile-guild';
import {useAuthSession} from './AuthSessionProvider';
import {onlineConfigured} from './supabase';
import {guildIdentities,profileGuildByTag} from './social';

/** Session-keyed, read-only affiliation for editor/local-preview surfaces. */
export function useSelfProfileGuild(state:GameState,enabled=true){
 const {session}=useAuthSession(),accountId=session?.user.id??'';
 const [result,setResult]=useState<{accountId:string;guild:ProfileGuildIdentity|null}>({accountId:'',guild:null});
 useEffect(()=>{
  if(!enabled||!onlineConfigured||!accountId)return;
  let alive=true,request=0;
  const refresh=async()=>{
   const current=++request;
   try{
    const identity=(await guildIdentities([accountId])).get(accountId);
    const fallback=identity?.guild_tag?{tag:identity.guild_tag,tagColorId:identity.guild_tag_color_id}:null;
    const guild=fallback?await profileGuildByTag(fallback.tag).catch(()=>fallback):null;
    if(alive&&current===request)setResult({accountId,guild});
   }catch{if(alive&&current===request)setResult({accountId,guild:null})}
  };
  void refresh();
  const foreground=AppState.addEventListener('change',next=>{if(next==='active')void refresh()});
  return()=>{alive=false;foreground.remove()};
 },[accountId,enabled,state.account.guildMember]);
 if(!onlineConfigured)return localProfileGuild(state);
 return accountId&&result.accountId===accountId?result.guild:null;
}

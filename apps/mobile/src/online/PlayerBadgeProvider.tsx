import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {loadPlayerBadgePreferences,updatePlayerBadgePreferences,type PlayerBadgePreferences} from './player-badges';
import {guildIdentities,type SocialProfileIcon} from './social';
import {peekPlayerIdentity,playerIdentityDetailsNeedRefresh,playerIdentityNeedsRefresh,subscribePlayerIdentityChanges} from './player-identity-cache';
import type {PlayerBadgeIdentity} from '../core/player-badges';

export type BadgeState=PlayerBadgePreferences&{accountId:string;loading:boolean;busy:boolean;error:string;setVisible:(visible:boolean)=>Promise<void>;refresh:()=>Promise<void>};
type BadgeContext=BadgeState&{remote:Map<string,PlayerBadgeIdentity|undefined>;icons:Map<string,SocialProfileIcon>;watch:(id:string)=>()=>void};
const empty={accountId:'',showSupporter:true,supporterAvailable:false,identity:undefined,loading:false,busy:false,error:''};
const Context=createContext<BadgeContext>({...empty,setVisible:async()=>{},refresh:async()=>{},remote:new Map(),icons:new Map(),watch:()=>()=>{}});
export function PlayerBadgeProvider({children}:{children:ReactNode}){
 const accountId=useAuthSession().session?.user.id??'';
 const [state,setState]=useState<Omit<BadgeState,'setVisible'|'refresh'>>(empty),generation=useRef(0),saving=useRef(0);
 const watched=useRef(new Map<string,number>()),[watchVersion,setWatchVersion]=useState(0);
 const [remote,setRemote]=useState<{accountId:string;identities:Map<string,PlayerBadgeIdentity|undefined>;icons:Map<string,SocialProfileIcon>}>({accountId:'',identities:new Map(),icons:new Map()});
 const watch=useCallback((id:string)=>{watched.current.set(id,(watched.current.get(id)??0)+1);setWatchVersion(value=>value+1);return()=>{const count=(watched.current.get(id)??1)-1;if(count)watched.current.set(id,count);else watched.current.delete(id);setWatchVersion(value=>value+1);};},[]);
 useEffect(()=>{
  let alive=true,request=0;
  const showCached=(changedId:string)=>{
   const row=peekPlayerIdentity(changedId);
   if(!row)return;
   setRemote(previous=>{
    if(previous.accountId!==accountId)return previous;
    const identities=new Map(previous.identities),icons=new Map(previous.icons);
    identities.set(changedId,row.player_badges);icons.set(changedId,row);
    return {...previous,identities,icons};
   });
  };
  const load=async()=>{
   const version=++request,ids=[...watched.current.keys()];
   if(!accountId||!ids.length){
    if(alive&&version===request)setRemote(previous=>previous.accountId===accountId&&!previous.icons.size?previous:{accountId,identities:new Map(),icons:new Map()});
    return;
   }
   try{
    const rows=await guildIdentities(ids);
    if(alive&&version===request)setRemote({
     accountId,identities:new Map([...rows].map(([id,row])=>[id,row.player_badges])),icons:rows,
    });
   }catch{/* Preserve the last good public icons while offline. */}
  };
  const unsubscribe=subscribePlayerIdentityChanges(id=>{
   if(!watched.current.has(id))return;
   showCached(id);
   // An explicit invalidation fetches the fresh row; an optimistic icon
   // update is already fresh and is served from the shared cache.
   if(playerIdentityNeedsRefresh(id)||playerIdentityDetailsNeedRefresh(id))void load();
  });
  const batch=setTimeout(()=>void load(),50);
  // This timer checks the cache, not the server. Fetch only if rows expired.
  const timer=setInterval(()=>{if(AppState.currentState==='active'&&watched.current.size)void load();},5*60*1000);
  const foreground=AppState.addEventListener('change',next=>{
   if(next==='active'&&watched.current.size)void load();
   // Do not blank avatars on background/foreground transitions.
  });
  return()=>{alive=false;request++;clearTimeout(batch);clearInterval(timer);foreground.remove();unsubscribe();};
 },[accountId,watchVersion]);
 const refresh=useCallback(async()=>{
  if(saving.current)return;
  const version=++generation.current;
  if(!accountId){setState(empty);return;}
  try{const data=await loadPlayerBadgePreferences();if(version===generation.current)setState({...data,accountId,loading:false,busy:false,error:''});}
  catch(e){if(version===generation.current)setState({...empty,accountId,error:e instanceof Error?e.message:'Could not load badges.'});}
 },[accountId]);
 useEffect(()=>{
  saving.current=0;setState({...empty,accountId,loading:!!accountId});void refresh();
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},60000);
  const foreground=AppState.addEventListener('change',next=>{if(next==='active')void refresh();else{generation.current++;setState(value=>({...value,identity:undefined}));}});
  return()=>{generation.current++;clearInterval(timer);foreground.remove();};
 },[accountId,refresh]);
 const setVisible=useCallback(async(visible:boolean)=>{
  if(!accountId||saving.current)return;
  const version=++generation.current;saving.current=version;setState(value=>({...value,busy:true,error:''}));
  try{const data=await updatePlayerBadgePreferences(visible);if(version===generation.current)setState({...data,accountId,loading:false,busy:false,error:''});}
  catch(e){if(version===generation.current)setState(value=>({...value,busy:false,error:e instanceof Error?e.message:'Could not save badge visibility.'}));}
  finally{if(saving.current===version)saving.current=0;}
 },[accountId]);
 return <Context.Provider value={{...(state.accountId===accountId?state:empty),setVisible,refresh,watch,remote:remote.accountId===accountId?remote.identities:new Map(),icons:remote.accountId===accountId?remote.icons:new Map()}}>{children}</Context.Provider>;
}
export const usePlayerBadges=()=>useContext(Context);
export function useIdentityBadges(accountId:string|undefined,initial:PlayerBadgeIdentity|undefined){
 const context=usePlayerBadges(),watch=context.watch;
 useEffect(()=>accountId?watch(accountId):undefined,[accountId,watch]);
 return accountId&&context.accountId===accountId?context.identity:accountId&&context.remote.has(accountId)?context.remote.get(accountId):initial;
}

export function useIdentityIcon(accountId:string|undefined){
 const context=usePlayerBadges(),watch=context.watch;
 useEffect(()=>accountId?watch(accountId):undefined,[accountId,watch]);
 return accountId?context.icons.get(accountId):undefined;
}

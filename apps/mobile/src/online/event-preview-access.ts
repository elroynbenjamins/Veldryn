import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {supabase} from './supabase';

type PreviewGrant={eventId:string;expiresAtMs:number;characterId:string|undefined};

/** Display-only; never modifies saved event runtime or calls gameplay commands. */
export function useEventPreviewAccess(characterId:string|undefined,nowMs:number):PreviewGrant|undefined{
 const [grant,setGrant]=useState<PreviewGrant>();
 useEffect(()=>{
  const client=supabase;
  setGrant(undefined);
  if(!client||!characterId)return;
  let live=true,epoch=0;
  let accountId:string|undefined;
  let authRefresh:ReturnType<typeof setTimeout>|undefined;
  const refresh=async()=>{
   const request=++epoch;
   try{
    const {data:session,error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;
    const uid=session.session?.user.id;
    if(!live||request!==epoch)return;
    if(!uid){setGrant(undefined);return;}
    if(accountId!==uid){accountId=uid;setGrant(undefined);}
    const {data,error}=await client.from('event_preview_access_v1').select('event_id,expires_at').eq('account_id',uid).order('expires_at',{ascending:true}).limit(1);
    if(error)throw error;
    if(!live||request!==epoch||accountId!==uid)return;
    const row=data?.[0],expiresAtMs=Date.parse(row?.expires_at??'');
    setGrant(row&&typeof row.event_id==='string'&&Number.isFinite(expiresAtMs)&&expiresAtMs>Date.now()?{eventId:row.event_id,expiresAtMs,characterId}:undefined);
   }catch{if(live&&request===epoch)setGrant(undefined);}
  };
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{
   const next=session?.user.id;
   if(accountId!==next){accountId=next;epoch++;setGrant(undefined);if(authRefresh)clearTimeout(authRefresh);if(next)authRefresh=setTimeout(()=>{if(live&&AppState.currentState==='active')void refresh();},0);}
  });
  const appState=AppState.addEventListener('change',status=>{if(status==='active')void refresh();else{epoch++;setGrant(undefined);}});
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},30_000);
  void refresh();
  return()=>{live=false;epoch++;clearInterval(timer);if(authRefresh)clearTimeout(authRefresh);subscription.unsubscribe();appState.remove();};
 },[characterId]);
 return grant&&grant.characterId===characterId&&grant.expiresAtMs>nowMs?grant:undefined;
}

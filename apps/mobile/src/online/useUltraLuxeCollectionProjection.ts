import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {supabase} from './supabase';
import {subscribePlayerIdentityChanges} from './player-identity-cache';
import {normalizeReviewGrantSnapshot,type ReviewGrantSnapshot} from '../core/ultra-luxe-review-integration';

export const normalizeUltraLuxeCollectionProjection=normalizeReviewGrantSnapshot;
/** Only query when a candidate ID was projected into the current gameplay state.
 * Missing RPC, failed request, wrong account, or hidden screen = no candidate choices.
 * State unlock lists are discovery hints, not proof of grants. */
export function useUltraLuxeCollectionProjection(enabled:boolean,allowSix=false){
 const accountId=useAuthSession().session?.user.id??'';
 const scope=enabled?accountId:'',key=scope?JSON.stringify([scope,allowSix]):'',scopeRef=useRef(key);scopeRef.current=key;
 const serial=useRef(0);
 const [projection,setProjection]=useState<{key:string;value:ReviewGrantSnapshot}>();
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  const request=++serial.current;
  setProjection(undefined);
  if(!scope||!supabase)return;
  const db=supabase;
  void (async()=>{
   try{
    const {data,error}=await db.auth.getSession();
    if(error||data.session?.user.id!==scope||cancelled||scopeRef.current!==key||serial.current!==request)return;
    const result=await db.rpc('ultra_luxe_collection_self_v1').setHeader('Authorization',`Bearer ${data.session.access_token}`);
    if(result.error||cancelled||scopeRef.current!==key||serial.current!==request)return;
    const value=normalizeUltraLuxeCollectionProjection(result.data,scope,allowSix);
    if(value)setProjection({key,value});
   }catch{/* Older servers and failed reads remain closed. */}
  })();
  const invalidate=()=>{serial.current++;setProjection(undefined);setRefresh(v=>v+1);};
  const app=AppState.addEventListener('change',s=>{if(s==='active')invalidate();});
  const unsubscribe=subscribePlayerIdentityChanges(id=>{if(id===scope)invalidate();});
  return()=>{cancelled=true;serial.current++;app.remove();unsubscribe();};
 },[scope,key,allowSix,refresh]);
 return projection?.key===key&&projection.value.accountId===scope?projection.value:undefined;
}

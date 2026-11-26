import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {supabase} from './supabase';
import {subscribePlayerIdentityChanges} from './player-identity-cache';
import {ULTRA_LUXE_REVIEW_COLLECTIONS,type ReviewGrantSnapshot} from '../core/ultra-luxe-review-integration';

export function normalizeUltraLuxeCollectionProjection(raw:unknown,accountId:string):ReviewGrantSnapshot|undefined{
 if(!accountId||!raw||typeof raw!=='object')return undefined;
 const row=raw as {accountId?:unknown;collectionIds?:unknown};
 if(row.accountId!==accountId||!Array.isArray(row.collectionIds))return undefined;
 const ids=new Set(row.collectionIds.filter((id):id is string=>typeof id==='string'));
 return {accountId,collectionIds:ULTRA_LUXE_REVIEW_COLLECTIONS.filter(c=>ids.has(c.id)).map(c=>c.id)};
}
/** Only query when a candidate ID was projected into the current gameplay state.
 * Missing RPC, failed request, wrong account, or hidden screen = no candidate choices.
 * State unlock lists are discovery hints, not proof of grants. */
export function useUltraLuxeCollectionProjection(enabled:boolean){
 const accountId=useAuthSession().session?.user.id??'';
 const scope=enabled?accountId:'',scopeRef=useRef(scope);scopeRef.current=scope;
 const [projection,setProjection]=useState<ReviewGrantSnapshot>();
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  setProjection(undefined);
  if(!scope||!supabase)return;
  const db=supabase;
  void (async()=>{
   try{
    const {data,error}=await db.auth.getSession();
    if(error||data.session?.user.id!==scope||cancelled)return;
    const result=await db.rpc('ultra_luxe_collection_self_v1').setHeader('Authorization',`Bearer ${data.session.access_token}`);
    if(result.error||cancelled||scopeRef.current!==scope)return;
    setProjection(normalizeUltraLuxeCollectionProjection(result.data,scope));
   }catch{/* Older servers and failed reads remain closed. */}
  })();
  const app=AppState.addEventListener('change',s=>{if(s==='active'){setProjection(undefined);setRefresh(v=>v+1);}});
  const unsubscribe=subscribePlayerIdentityChanges(id=>{if(id===scope){setProjection(undefined);setRefresh(v=>v+1);}});
  return()=>{cancelled=true;app.remove();unsubscribe();};
 },[scope,refresh]);
 return projection?.accountId===scope?projection:undefined;
}

import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {supabase} from './supabase';
import {invalidatePlayerIdentity,subscribePlayerIdentityChanges} from './player-identity-cache';
import {normalizeLuxeNameReadback,verifiedLuxeNameReadbackStyle,type UltraLuxeGradientId} from './ultra-luxe-name-readback';

type Projection=NonNullable<ReturnType<typeof normalizeLuxeNameReadback>>;
async function pinnedClient(accountId:string){
 const db=supabase;if(!db)throw new Error('Online services unavailable.');
 const {data,error}=await db.auth.getSession();if(error)throw error;
 if(!data.session||data.session.user.id!==accountId)throw new Error('Account changed.');
 return {db,token:data.session.access_token};
}
async function readSelection(accountId:string){
 const {db,token}=await pinnedClient(accountId);
 const {data,error}=await db.rpc('ultra_luxe_name_self_v1').setHeader('Authorization',`Bearer ${token}`);
 if(error)throw error;
 const projection=normalizeLuxeNameReadback(data,accountId);
 if(!projection)throw new Error('Invalid private name projection.');
 return projection;
}
/** Existing account unlocks are only a request hint. The RPC is the authority.
 * Old servers, errors, and stale viewer responses expose no private choices. */
export function useUltraLuxeNameSelection(enabled:boolean){
 const accountId=useAuthSession().session?.user.id??'';
 const scope=enabled?accountId:'';
 const current=useRef(scope);current.current=scope;
 const mounted=useRef(false),writing=useRef<string|null>(null),serial=useRef(0);
 const [projection,setProjection]=useState<Projection>();
 const [pending,setPending]=useState('');
 const [error,setError]=useState<{accountId:string;message:string}>();
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;serial.current++;};},[]);
 useEffect(()=>{
  const request=++serial.current;
  setProjection(undefined);setError(undefined);
  if(!scope)return;
  void readSelection(scope).then(row=>{if(mounted.current&&current.current===scope&&request===serial.current)setProjection(row);}).catch(()=>{});
  const app=AppState.addEventListener('change',s=>{if(s==='active')setRefresh(v=>v+1);});
  const unsub=subscribePlayerIdentityChanges(id=>{if(id===scope)setRefresh(v=>v+1);});
  return()=>{serial.current++;app.remove();unsub();};
 },[scope,refresh]);
 const verified=projection?.accountId===scope?projection:undefined;
 const select=useCallback(async(id:UltraLuxeGradientId|null)=>{
  if(!scope||current.current!==scope||!verified||id!==null&&!verified.ownedIds.includes(id)||writing.current===scope)return;
  writing.current=scope;setPending(scope);setError(undefined);
  const request=++serial.current;
  try{
   const {db,token}=await pinnedClient(scope);
   if(current.current!==scope||!mounted.current)return;
   const {data,error}=await db.rpc('ultra_luxe_name_select_v1',{p_preset_id:id}).setHeader('Authorization',`Bearer ${token}`);
   if(error)throw error;
   const ack=normalizeLuxeNameReadback(data,scope);
   if(!ack||ack.selectedId!==id)throw new Error('Name style was not confirmed.');
   const confirmed=await readSelection(scope);
   if(confirmed.selectedId!==id)throw new Error('Name style changed before confirmation.');
   if(mounted.current&&current.current===scope&&request===serial.current)setProjection(confirmed);
   if(mounted.current&&current.current===scope)invalidatePlayerIdentity(scope);
  }catch(e){if(mounted.current&&current.current===scope)setError({accountId:scope,message:e instanceof Error?e.message:'Could not save name style.'});}
  finally{if(writing.current===scope)writing.current=null;if(mounted.current)setPending(v=>v===scope?'':v);}
 },[scope,verified]);
 return {verifiedOwnedIds:verified?.ownedIds??[],selectedId:verified?.selectedId??null,projection:verified,style:verifiedLuxeNameReadbackStyle(verified),saving:pending===scope&&!!scope,error:error?.accountId===scope?error.message:undefined,onSelect:(id:UltraLuxeGradientId|null)=>void select(id)};
}

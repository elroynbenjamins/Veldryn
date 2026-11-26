import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {supabase} from './supabase';

export type OnlinePlayer={
 account_id:string;
 sender_name:string;
 level:number;
 /** Sum of combat levels of all characters on the account; null until server support is available. */
 total_character_level:number|null;
 class_id:string;
 is_friend:boolean;
 is_guildmate:boolean;
};

type OnlineRoster={count:number;players:OnlinePlayer[]};

/** The server decides the visibility, count and unique-account semantics.
 * Never infer recent activity from chat messages or cached local character saves.
 */
export function parseOnlineRoster(value:unknown):OnlineRoster{
 if(!value||typeof value!=='object')throw new Error('Invalid online player response.');
 const payload=value as Record<string,unknown>;
 if(typeof payload.count!=='number'||!Number.isFinite(payload.count)||!Array.isArray(payload.players))throw new Error('Invalid online player response.');
 const seen=new Set<string>();
 const players:OnlinePlayer[]=payload.players.flatMap((entry:unknown)=>{
  if(!entry||typeof entry!=='object')return [];
  const row=entry as Record<string,unknown>;
  if(typeof row.account_id!=='string'||!row.account_id.trim()||seen.has(row.account_id)||typeof row.sender_name!=='string'||!row.sender_name.trim())return [];
  seen.add(row.account_id);
  const level=typeof row.level==='number'&&Number.isFinite(row.level)?Math.max(1,Math.floor(row.level)):1;
  return [{account_id:row.account_id,sender_name:row.sender_name,level,total_character_level:typeof row.total_character_level==='number'&&Number.isSafeInteger(row.total_character_level)&&row.total_character_level>=level?row.total_character_level:null,class_id:typeof row.class_id==='string'?row.class_id:'',is_friend:row.is_friend===true,is_guildmate:row.is_guildmate===true}];
 });
 return {count:Math.max(0,Math.floor(payload.count)),players};
}

type RosterRpc=(name:string)=>PromiseLike<{data:unknown;error:{code?:string;message?:string}|null}>;
type CountCapability={missing:boolean};
export async function readOnlinePlayerProjection(rpc:RosterRpc,details:boolean,capability:CountCapability):Promise<OnlineRoster>{
 if(!details&&!capability.missing){
  const {data,error}=await rpc('online_player_count_v1');
  if(!error){
   if(typeof data!=='number'||!Number.isSafeInteger(data)||data<0)throw new Error('Invalid online player count.');
   return {count:data,players:[]};
  }
  // Only an absent RPC permits legacy fallback. Never bypass access errors.
  if(error.code!=='PGRST202'&&error.code!=='42883')throw error;
  capability.missing=true;
 }
 const {data,error}=await rpc('online_player_roster_v2');
 if(error)throw error;
 const roster=parseOnlineRoster(data);
 return details?roster:{count:roster.count,players:[]};
}

export function useOnlinePlayerRoster(active:boolean,details=false){
 const {session}=useAuthSession(),accountId=session?.user.id;
 const scope=useRef({accountId,active,details});scope.current={accountId,active,details};
 const capability=useRef<{accountId:string|undefined;missing:boolean}>({accountId,missing:false});
 const pending=useRef<{accountId:string;details:boolean;promise:Promise<void>}|null>(null);
 const [state,setState]=useState<{accountId:string;count:number|null;players:OnlinePlayer[];loading:boolean;error:string}|null>(null);
 const refresh=useCallback(async()=>{
  const client=supabase;
  if(!client||!accountId||scope.current.accountId!==accountId||!scope.current.active)return;
  if(capability.current.accountId!==accountId)capability.current={accountId,missing:false};
  const existing=pending.current;
  if(existing?.accountId===accountId){
   await existing.promise;
   if(scope.current.accountId===accountId&&scope.current.active&&scope.current.details&&!existing.details)await refresh();
   return;
  }
  const requestedDetails=scope.current.details,serverCapability=capability.current;
  const current=()=>scope.current.accountId===accountId&&scope.current.active;
  const flight={accountId,details:requestedDetails,promise:Promise.resolve()};
  pending.current=flight;
  setState(previous=>({accountId,count:previous?.accountId===accountId?previous.count:null,players:previous?.accountId===accountId?previous.players:[],loading:true,error:''}));
  flight.promise=(async()=>{
   try{
    const roster=await readOnlinePlayerProjection(name=>client.rpc(name),requestedDetails,serverCapability);
    if(current())setState({accountId,count:roster.count,players:requestedDetails&&scope.current.details?roster.players:[],loading:false,error:''});
   }catch(e){
    if(current())setState(previous=>({accountId,count:previous?.accountId===accountId?previous.count:null,players:previous?.accountId===accountId?previous.players:[],loading:false,error:e instanceof Error?e.message:typeof (e as {message?:unknown})?.message==='string'?String((e as {message:string}).message):'Unable to load online players.'}));
   }finally{if(pending.current===flight)pending.current=null;}
  })();
  await flight.promise;
 },[accountId]);
 useEffect(()=>{
  if(!active||!accountId||!supabase)return;
  let timer:ReturnType<typeof setInterval>|undefined;
  const stop=()=>{if(timer!==undefined){clearInterval(timer);timer=undefined;}};
  const start=()=>{if(timer!==undefined)return;void refresh();timer=setInterval(()=>void refresh(),45_000);};
  if(AppState.currentState==='active'||AppState.currentState===null)start();
  const foreground=AppState.addEventListener('change',next=>{if(next==='active')start();else stop();});
  return()=>{stop();foreground.remove();};
 },[active,accountId,refresh]);
 useEffect(()=>{
  if(!active||!details)return;
  if(AppState.currentState==='active'||AppState.currentState===null)void refresh();
 },[active,details,refresh]);
 const visible=state?.accountId===accountId&&active?state:null;
 return {count:visible?.count??null,players:details?visible?.players??[]:[],loading:visible?.loading??false,error:visible?.error??'',refresh};
}

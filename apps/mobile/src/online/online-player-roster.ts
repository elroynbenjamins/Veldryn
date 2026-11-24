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

export function useOnlinePlayerRoster(active:boolean){
 const {session}=useAuthSession(),accountId=session?.user.id;
 const currentAccount=useRef(accountId);currentAccount.current=accountId;
 const pendingForAccount=useRef<string|null>(null);
 const [roster,setRoster]=useState<OnlineRoster|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if(!supabase||!accountId||pendingForAccount.current===accountId)return;
  pendingForAccount.current=accountId;
  if(currentAccount.current===accountId)setLoading(true);
  try{
   const {data,error:requestError}=await supabase.rpc('online_player_roster_v2');
   if(requestError)throw requestError;
   if(currentAccount.current===accountId){setRoster(parseOnlineRoster(data));setError('');}
  }catch(e){
   if(currentAccount.current===accountId)setError(e instanceof Error?e.message:'Unable to load online players.');
  }finally{
   if(pendingForAccount.current===accountId)pendingForAccount.current=null;
   if(currentAccount.current===accountId)setLoading(false);
  }
 },[accountId]);
 useEffect(()=>{
  setRoster(null);setError('');
  if(!active||!accountId||!supabase)return;
  void refresh();
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},45_000);
  const foreground=AppState.addEventListener('change',next=>{if(next==='active')void refresh();});
  return()=>{clearInterval(timer);foreground.remove();};
 },[active,accountId,refresh]);
 return {count:roster?.count??null,players:roster?.players??[],loading,error,refresh};
}

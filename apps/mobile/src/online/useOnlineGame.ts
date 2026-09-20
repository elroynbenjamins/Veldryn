import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {createOnlineGameRepository,serverGameplayEnabled} from './gameplay';
import {supabase} from './supabase';
import type {GameCommand} from '../core/game-commands';
import type {OnlineSnapshot} from '../core/online-game-repository';
export function useOnlineGame(){
 const {session}=useAuthSession(),accountId=session?.user.id;
 const repo=useMemo(()=>serverGameplayEnabled&&accountId?createOnlineGameRepository(accountId):null,[accountId]);
 const active=useRef(repo);active.current=repo;
 const [snapshot,setSnapshot]=useState<OnlineSnapshot|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const refresh=useCallback(async()=>{if(!repo)return;try{const next=await repo.refresh();if(active.current===repo){setSnapshot(next);setPending(await repo.hasPending());setError('');}}catch(e){if(active.current===repo)setError(e instanceof Error?e.message:'Online service unavailable.');}},[repo]);
 useEffect(()=>{setSnapshot(null);setError('');setPending(false);setBusy(false);setLoading(Boolean(repo));if(!repo)return;void refresh().finally(()=>{if(active.current===repo)setLoading(false);});},[repo,refresh]);
 useEffect(()=>{const sub=AppState.addEventListener('change',next=>{if(next==='active')void refresh();});return()=>sub.remove();},[refresh]);
 useEffect(()=>{
  if(!serverGameplayEnabled||!accountId||!supabase)return;
  let foreground=AppState.currentState==='active';
  const heartbeat=()=>{if(!foreground)return;void supabase.rpc('record_player_presence_v1').then(()=>{}).catch(()=>{});};
  const timer=setInterval(heartbeat,5*60_000);
  const sub=AppState.addEventListener('change',next=>{foreground=next==='active';if(foreground)heartbeat();});
  return()=>{clearInterval(timer);sub.remove();};
 },[accountId]);
 const execute=async(command?:GameCommand)=>{if(!repo)throw new Error('Sign in before playing online.');setBusy(true);setError('');try{const next=await repo.execute(command);if(active.current!==repo)throw new Error('Account changed while saving.');setSnapshot(next);setPending(false);return next;}catch(e){if(active.current===repo){setPending(await repo.hasPending());if(repo.snapshot)setSnapshot(repo.snapshot);setError(e instanceof Error?e.message:'Unable to save. Retry the pending action.');}throw e;}finally{if(active.current===repo)setBusy(false);}};
 return {snapshot:snapshot?.accountId===accountId?snapshot:null,loading,busy,error,pending,refresh,execute};
}

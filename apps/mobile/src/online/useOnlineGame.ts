import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {createOnlineGameRepository,serverGameplayEnabled} from './gameplay';
import {supabase} from './supabase';
import type {GameCommand} from '../core/game-commands';
import type {OnlineSnapshot} from '../core/online-game-repository';
import {saveAndRefreshPlayerNameStyle} from '../core/player-name-style-save';
import type {PlayerNameStylePreference} from '../core/player-name-style';
import {updateOnlinePlayerNameStyle} from './social';
export function useOnlineGame(){
 const {session}=useAuthSession(),accountId=session?.user.id;
 const repo=useMemo(()=>serverGameplayEnabled&&accountId?createOnlineGameRepository(accountId):null,[accountId]);
 const active=useRef(repo);active.current=repo;
 const nameStyleSaving=useRef<typeof repo>(null);
 const commandSaving=useRef<typeof repo>(null);
 const refreshInFlight=useRef<{repo:typeof repo;promise:Promise<OnlineSnapshot|undefined>}|null>(null);
 const [foregroundRevision,setForegroundRevision]=useState(0);
 const [snapshot,setSnapshot]=useState<OnlineSnapshot|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const refresh=useCallback(async()=>{if(!repo)return;if(refreshInFlight.current?.repo===repo)return refreshInFlight.current.promise;const promise=(async()=>{try{const next=await repo.refresh();const hasPending=await repo.hasPending();if(active.current===repo){setSnapshot(repo.snapshot??next);setPending(hasPending);setError('');return next;}}catch(e){if(active.current===repo)setError(e instanceof Error?e.message:'Online service unavailable.');}})();refreshInFlight.current={repo,promise};try{return await promise;}finally{if(refreshInFlight.current?.promise===promise)refreshInFlight.current=null;}},[repo]);
 const refreshCommerce=useCallback(async(expectedAccountId:string)=>{
  const current=()=>Boolean(repo&&active.current===repo&&repo.accountId===expectedAccountId);
  if(!repo||!current())throw new Error('Account changed while refreshing purchases.');
  try{
   const next=await repo.refresh();
   if(!current()||next.accountId!==expectedAccountId)throw new Error('Account changed while refreshing purchases.');
   const hasPending=await repo.hasPending();
   if(!current())throw new Error('Account changed while refreshing purchases.');
   setSnapshot(repo.snapshot??next);setPending(hasPending);setError('');
  }catch(e){if(current())setError(e instanceof Error?e.message:'Unable to refresh your account benefits.');throw e;}
 },[repo]);
 useEffect(()=>{setSnapshot(null);setError('');setPending(false);setBusy(false);setLoading(Boolean(repo));if(!repo)return;void refresh().finally(()=>{if(active.current===repo)setLoading(false);});},[repo,refresh]);
 useEffect(()=>{let previous=AppState.currentState;const sub=AppState.addEventListener('change',next=>{const returned=previous!=='active'&&next==='active';previous=next;if(returned)void refresh().then(value=>{if(value&&active.current===repo)setForegroundRevision(revision=>revision+1);});});return()=>sub.remove();},[refresh,repo]);
 useEffect(()=>{
  const client=supabase;
  if(!serverGameplayEnabled||!accountId||!client)return;
  let foreground=AppState.currentState==='active';
  const heartbeat=()=>{if(!foreground)return;void client.rpc('record_player_presence_v1').then(()=>{},()=>{});};
  const timer=setInterval(heartbeat,5*60_000);
  const sub=AppState.addEventListener('change',next=>{foreground=next==='active';if(foreground)heartbeat();});
  return()=>{clearInterval(timer);sub.remove();};
 },[accountId]);
 const execute=async(command?:GameCommand)=>{if(!repo)throw new Error('Sign in before playing online.');if(nameStyleSaving.current===repo)throw new Error('Your name style is still saving. Please wait.');if(commandSaving.current===repo)throw new Error('A gameplay action is already being saved.');commandSaving.current=repo;setBusy(true);setError('');try{const next=await repo.execute(command);if(active.current!==repo)throw new Error('Account changed while saving.');setSnapshot(next);setPending(false);return next;}catch(e){if(active.current===repo){setPending(await repo.hasPending());if(repo.snapshot)setSnapshot(repo.snapshot);setError(e instanceof Error?e.message:'Unable to save. Retry the pending action.');}throw e;}finally{if(commandSaving.current===repo)commandSaving.current=null;if(active.current===repo)setBusy(false);}};
 const saveNameStyle=async(style:PlayerNameStylePreference)=>{
  if(!repo||active.current!==repo)throw new Error('Sign in before changing your name style.');
  if(busy||commandSaving.current===repo||nameStyleSaving.current===repo)throw new Error('Another change is still saving. Please wait.');
  nameStyleSaving.current=repo;setBusy(true);setError('');
  try{return await saveAndRefreshPlayerNameStyle(style,{
   accountId:repo.accountId,isCurrent:()=>active.current===repo,
   write:preference=>updateOnlinePlayerNameStyle(preference,repo.accountId),refresh:()=>repo.refresh(),accept:setSnapshot,
  });}
  catch(e){if(active.current===repo)setError(e instanceof Error?e.message:'Could not save name style.');throw e;}
  finally{if(nameStyleSaving.current===repo)nameStyleSaving.current=null;if(active.current===repo)setBusy(false);}
 };
 const refreshSnapshot=useCallback(async()=>{await refresh();},[refresh]);
 return {snapshot:snapshot?.accountId===accountId? snapshot:null,loading,busy,error,pending,foregroundRevision,refresh:refreshSnapshot,refreshCommerce,execute,saveNameStyle};
}

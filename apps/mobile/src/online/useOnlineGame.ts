import {fullSetUndoCommand} from '../core/ultra-luxe-full-set-undo-command';
import {confirmUltraLuxeFullSetReadback,type FullSetPlan,type FullSetScope} from '../core/ultra-luxe-full-set-name';
import {ultraLuxeFullSetCommand} from '../core/ultra-luxe-full-set-command';
import {invalidatePlayerIdentity} from './player-identity-cache';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useAuthSession} from './AuthSessionProvider';
import {createOnlineGameRepository,serverGameplayEnabled} from './gameplay';
import {supabase} from './supabase';
import {fetchActiveEventRuntime} from './live-events';
import type {GameCommand} from '../core/game-commands';
import type {OnlineSnapshot} from '../core/online-game-repository';
import {saveAndRefreshPlayerNameStyle} from '../core/player-name-style-save';
import type {PlayerNameStylePreference} from '../core/player-name-style';
import {updateOnlinePlayerNameStyle} from './social';
import {rememberOnlineSnapshot} from '../core/online-snapshot-cache';
import {previewCombatEquipmentCommand} from '../core/combat-equipment-optimistic';
declare const process:{env:Record<string,string|undefined>};
// Closed until the unified server authority and generated Edge build are deployed.
const fullSetReleased=typeof process!=='undefined'&&process.env.EXPO_PUBLIC_ULTRA_LUXE_FULL_SET==='true';
const undoReleased=fullSetReleased&&process.env.EXPO_PUBLIC_ULTRA_LUXE_FULL_SET_UNDO==='true';
export function useOnlineGame(){
 const {session}=useAuthSession(),accountId=session?.user.id;
 const repo=useMemo(()=>serverGameplayEnabled&&accountId?createOnlineGameRepository(accountId):null,[accountId]);
 const active=useRef(repo);active.current=repo;
 const nameStyleSaving=useRef<typeof repo>(null);
 const commandSaving=useRef<typeof repo>(null);
 const refreshInFlight=useRef<{repo:typeof repo;promise:Promise<OnlineSnapshot|undefined>}|null>(null);
 const [foregroundRevision,setForegroundRevision]=useState(0);
 const [snapshot,setSnapshot]=useState<OnlineSnapshot|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false);
 const refresh=useCallback(async()=>{if(!repo)return;if(refreshInFlight.current?.repo===repo)return refreshInFlight.current.promise;const promise=(async()=>{try{const next=await repo.refresh();const hasPending=await repo.hasPending();if(active.current===repo){rememberOnlineSnapshot(next);if(commandSaving.current!==repo)setSnapshot(repo.snapshot??next);setPending(hasPending);setError('');return next;}}catch(e){if(active.current===repo)setError(e instanceof Error?e.message:'Online service unavailable.');}})();refreshInFlight.current={repo,promise};try{return await promise;}finally{if(refreshInFlight.current?.promise===promise)refreshInFlight.current=null;}},[repo]);
 const refreshCommerce=useCallback(async(expectedAccountId:string)=>{
  const current=()=>Boolean(repo&&active.current===repo&&repo.accountId===expectedAccountId);
  if(!repo||!current())throw new Error('Account changed while refreshing purchases.');
  try{
   const next=await repo.refresh();
   if(!current()||next.accountId!==expectedAccountId)throw new Error('Account changed while refreshing purchases.');
   const hasPending=await repo.hasPending();
   if(!current())throw new Error('Account changed while refreshing purchases.');
   rememberOnlineSnapshot(next);setSnapshot(repo.snapshot??next);setPending(hasPending);setError('');
  }catch(e){if(current())setError(e instanceof Error?e.message:'Unable to refresh your account benefits.');throw e;}
 },[repo]);
 useEffect(()=>{setSnapshot(repo?.snapshot??null);setError('');setPending(false);setBusy(false);setLoading(Boolean(repo&&!repo.snapshot));if(!repo)return;void refresh().finally(()=>{if(active.current===repo)setLoading(false);});},[repo,refresh]);
 useEffect(()=>{let previous=AppState.currentState;const sub=AppState.addEventListener('change',next=>{const returned=previous!=='active'&&next==='active';previous=next;if(returned)void refresh().then(value=>{if(value&&active.current===repo)setForegroundRevision(revision=>revision+1);});});return()=>sub.remove();},[refresh,repo]);
 useEffect(()=>{
  const client=supabase;
  if(!serverGameplayEnabled||!accountId||!client)return;
  let foreground=AppState.currentState==='active',lastPresenceAt=0;
  // Best-effort presence while foregrounded. Keep older-client compatibility
  // with the existing 5-minute presence buckets, but refresh more frequently.
  const heartbeat=()=>{if(!foreground)return;const now=Date.now();if(now-lastPresenceAt<60_000)return;lastPresenceAt=now;void client.rpc('record_player_presence_v1').then(()=>{},()=>{});};
  // Do not leave newly signed-in players invisible until their first timer tick.
  heartbeat();
  const timer=setInterval(heartbeat,2*60_000);
  const sub=AppState.addEventListener('change',next=>{foreground=next==='active';if(foreground)heartbeat();});
  return()=>{clearInterval(timer);sub.remove();};
 },[accountId]);
 // Poll the lightweight public event window only while foregrounded. Refresh the
 // authoritative account snapshot when its schedule or lifecycle changes;
 // never inject a public RPC response into a saved account snapshot.
 useEffect(()=>{
  if(!repo||!supabase)return;
  let disposed=false,inFlight=false;
  const poll=async()=>{
   if(disposed||inFlight||AppState.currentState!=='active'||active.current!==repo||refreshInFlight.current?.repo===repo||commandSaving.current===repo||nameStyleSaving.current===repo)return;
   inFlight=true;
   try{
    const current=repo.snapshot;
    if(!current)return;
    // A recent authoritative gameplay read/command already includes the event
    // window. Do not add an immediate duplicate public schedule request.
    const age=Date.now()-current.serverNow;
    if(age>=0&&age<30_000)return;
    const runtime=await fetchActiveEventRuntime();
    if(disposed||AppState.currentState!=='active'||active.current!==repo||refreshInFlight.current?.repo===repo||commandSaving.current===repo||nameStyleSaving.current===repo)return;
    const previous=repo.snapshot;
    if(!previous)return;
    const stored=previous.state.account.liveEvent;
    const key=(r:typeof stored)=>r?JSON.stringify([r.eventId,r.enabled,r.startsAtMs,r.endsAtMs,r.graceEndsAtMs??null,r.priority??null,r.modules??[]]):'';
    const now=Date.now();
    const boundaryCrossed=!!runtime&&[runtime.startsAtMs,runtime.endsAtMs,runtime.graceEndsAtMs].some(at=>typeof at==='number'&&previous.serverNow<at&&at<=now);
    // The gameplay service may retain an expired runtime for historical
    // claims. Ignore that expected difference after its grace window closes.
    const expired=!!stored&&now>=(stored.graceEndsAtMs??stored.endsAtMs);
    if((key(runtime)!==key(stored)&&!(runtime===undefined&&expired))||boundaryCrossed)await refresh();
   }catch{/* Retry on next foreground tick; never clear ownership on a network error. */}
   finally{inFlight=false;}
  };
  let timer:ReturnType<typeof setInterval>|undefined;
  const stop=()=>{if(timer!==undefined){clearInterval(timer);timer=undefined;}};
  const start=()=>{if(timer===undefined)timer=setInterval(()=>void poll(),120_000);};
  // Initial load and foreground return already perform an authoritative GET.
  // The independent schedule check is only needed during continued play.
  if(AppState.currentState==='active')start();
  const sub=AppState.addEventListener('change',next=>{if(next==='active')start();else stop();});
  return()=>{disposed=true;stop();sub.remove();};
 },[repo,refresh]);
 const execute=async(command?:GameCommand,returnClaim=false)=>{if(!repo)throw new Error('Sign in before playing online.');if(nameStyleSaving.current===repo)throw new Error('Your name style is still saving. Please wait.');if(commandSaving.current===repo)throw new Error('A gameplay action is already being saved.');// Reserve the per-account command slot synchronously; the repository serializes and safely replays durable actions.
 commandSaving.current=repo;setBusy(true);setError('');
 // Preview only a validated weapon swap while a hunt is running. This is NOT
 // written to the repository, pending-command store or server; a failed
 // command restores the previous authoritative snapshot in catch.
 const authoritative=repo.snapshot;
 const projected=command&&!pending&&authoritative?.state?previewCombatEquipmentCommand(authoritative.state,command):null;
 if(projected&&authoritative&&active.current===repo)setSnapshot({...authoritative,state:projected,reward:undefined});
 try{const next=await repo.execute(command,returnClaim);if(active.current!==repo)throw new Error('Account changed while saving.');rememberOnlineSnapshot(next);setSnapshot(next);setPending(false);return next;}catch(e){if(active.current===repo){setPending(await repo.hasPending());if(repo.snapshot)setSnapshot(repo.snapshot);setError(e instanceof Error?e.message:'Unable to save. Retry the pending action.');}throw e;}finally{if(commandSaving.current===repo)commandSaving.current=null;if(active.current===repo)setBusy(false);}};
 const saveNameStyle=async(style:PlayerNameStylePreference)=>{
  if(!repo||active.current!==repo)throw new Error('Sign in before changing your name style.');
  if(busy||commandSaving.current===repo||nameStyleSaving.current===repo)throw new Error('Another change is still saving. Please wait.');
  nameStyleSaving.current=repo;setBusy(true);setError('');
  try{return await saveAndRefreshPlayerNameStyle(style,{
   accountId:repo.accountId,isCurrent:()=>active.current===repo,
   write:preference=>updateOnlinePlayerNameStyle(preference,repo.accountId),refresh:()=>repo.refresh(),accept:next=>{rememberOnlineSnapshot(next);setSnapshot(next)},
  });}
  catch(e){if(active.current===repo)setError(e instanceof Error?e.message:'Could not save name style.');throw e;}
  finally{if(nameStyleSaving.current===repo)nameStyleSaving.current=null;if(active.current===repo)setBusy(false);}
 };
 const equipUltraLuxeFullSet=async(plan:FullSetPlan)=>{
  if(!fullSetReleased||!repo||active.current!==repo||repo.accountId!==plan.scope.accountId||
   repo.snapshot?.state.character?.id!==plan.scope.characterId)throw new Error('Full set equip unavailable for this character.');
  const next=await execute(ultraLuxeFullSetCommand(plan));
  if(active.current!==repo)throw new Error('Account changed while saving.');
  invalidatePlayerIdentity(repo.accountId);
  const scope={accountId:repo.accountId,characterId:repo.snapshot?.state.character?.id??''};
  const result=confirmUltraLuxeFullSetReadback(plan,scope,{replayed:next.ultraLuxeFullSetReplayed,gameplay:next,nameSelection:next.ultraLuxeNameSelection});
  if(result!=='confirmed')throw new Error(result==='superseded'?'Full set selection has since changed.':'Full set equip could not be confirmed.');
  return next;
 };
 const undoUltraLuxeFullSet=async(scope:FullSetScope,equipRequestId:string)=>{
  if(!undoReleased||!repo||active.current!==repo||repo.accountId!==scope.accountId||
   repo.snapshot?.state.character?.id!==scope.characterId)throw new Error('Full set Undo unavailable for this character.');
  const next=await execute(fullSetUndoCommand(scope,equipRequestId));
  if(active.current!==repo)throw new Error('Account changed while saving.');
  invalidatePlayerIdentity(repo.accountId);
  if(next.accountId!==scope.accountId||next.state.character?.id!==scope.characterId||
   next.ultraLuxeNameSelection?.accountId!==scope.accountId||typeof next.ultraLuxeFullSetReplayed!=='boolean')throw Error('Full set Undo could not be confirmed.');
  return next;
 };
 const refreshSnapshot=useCallback(async()=>{await refresh();},[refresh]);
 // After an external guild inventory mutation, do not reuse a read started before the receipt.
 const refreshAfterExternalWrite=useCallback(async()=>{
  if(refreshInFlight.current?.repo===repo)await refreshInFlight.current.promise;
  if(!repo||active.current!==repo||commandSaving.current===repo)throw new Error('Gameplay state is changing. Refresh again.');
  const next=await refresh();if(!next||active.current!==repo||await repo.hasPending())throw new Error('Inventory refresh was not confirmed.');
 },[repo,refresh]);
 return {snapshot:snapshot?.accountId===accountId? snapshot:null,loading,busy,error,pending,foregroundRevision,refresh:refreshSnapshot,refreshAfterExternalWrite,refreshCommerce,execute,saveNameStyle,equipUltraLuxeFullSet:fullSetReleased?equipUltraLuxeFullSet:undefined,undoUltraLuxeFullSet:undoReleased?undoUltraLuxeFullSet:undefined};
}

import {CoopLiveLobbyView,type LobbyIdentity} from './CoopLobbyPresentation';
export {CoopLiveLobbyView} from './CoopLobbyPresentation';
import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {coopClient,coopRequestId} from '../../online/coop-client';
import {type LiveQueueView,type LiveReadyView} from '../../core/coop-live-lobby';

/** Available only behind the internal Live lobby gate. Closing/backgrounding
 * stops heartbeats; the database owns expiry and ready acceptance deadlines. */
export function CoopLiveLobby({onBack,onRunReady,dungeons,selfPortrait}:LobbyIdentity&{onBack:()=>void;onRunReady?:(runId:string)=>void}){
 const [queue,setQueue]=useState<LiveQueueView>(),[ready,setReady]=useState<LiveReadyView>();
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(false),[loading,setLoading]=useState(true);
 const mounted=useRef(true),refresh=useRef<()=>Promise<void>>(async()=>{});
 useEffect(()=>{
  mounted.current=true;let stopped=false,inFlight=false,lastHeartbeat=0;
  const update=async()=>{
   if(stopped||inFlight||AppState.currentState!=='active')return;inFlight=true;
   try{
    const next=await coopClient.liveQueue();if(stopped)return;setQueue(next);
    if(next.ticket?.status==='queued'&&Date.now()-lastHeartbeat>=10000){lastHeartbeat=Date.now();try{await coopClient.heartbeatLive(next.ticket.ticketId);}catch{/* A match may have reserved it after the poll. The next poll resolves that race. */}}
    const current=next.ticket?.status==='reserved'&&next.ticket.reservationId?await coopClient.liveReady(next.ticket.reservationId):undefined;
    const hasPending=await coopClient.hasPending();if(!stopped){setReady(current);setPending(hasPending);}
    if(current?.runId&&onRunReady)onRunReady(current.runId);
   }catch(error){if(!stopped)setNotice(error instanceof Error?error.message:String(error));}finally{if(!stopped)setLoading(false);inFlight=false;}
  };
  refresh.current=update;void update();const timer=setInterval(()=>void update(),2500);
  const listener=AppState.addEventListener('change',status=>{if(status==='active')void update();});
  return()=>{stopped=true;mounted.current=false;clearInterval(timer);listener.remove();};
 },[onRunReady]);
 const act=async(work:()=>Promise<unknown>)=>{
  if(busy)return undefined;setBusy(true);setNotice('');let result:unknown;
  try{result=await work();await refresh.current();}catch(error){if(mounted.current)setNotice(error instanceof Error?error.message:String(error));}
  finally{if(mounted.current){setBusy(false);setPending(await coopClient.hasPending().catch(()=>false));}}
  return result;
 };
 const acceptReady=()=>void act(async()=>{const result=await coopClient.ready(ready!.readyCheckId,{requestId:coopRequestId(),rosterRevision:ready!.rosterRevision,accept:true});if(result.runId&&onRunReady)onRunReady(result.runId);return result;});
 return <CoopLiveLobbyView dungeons={dungeons} selfPortrait={selfPortrait} queue={queue} ready={ready} notice={notice} busy={busy} pending={pending} loading={loading} onBack={onBack} onRetry={()=>void refresh.current()} onRetryPending={()=>void act(()=>coopClient.retryPending())} onCancel={()=>void act(()=>coopClient.cancelLive(queue!.ticket!.ticketId))} onAccept={acceptReady} onDecline={()=>void act(()=>coopClient.ready(ready!.readyCheckId,{requestId:coopRequestId(),rosterRevision:ready!.rosterRevision,accept:false}))}/>;
}

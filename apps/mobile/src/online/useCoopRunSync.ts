import {useEffect} from 'react';
import {coopSyncIntervalMs,type CoopSyncMode,type CoopSyncUrgency} from '../core/coop-sync-policy';
import {supabase} from './supabase';

/**
 * One single-flight refresh loop per visible run, with realtime as the fast path.
 * Re-arm the watchdog only after each request finishes to avoid overlapping reads.
 */
export function useCoopRunSync({runId,mode,urgency,enabled,refresh,setError}:{
 runId?:string;
 mode:CoopSyncMode;
 urgency:CoopSyncUrgency;
 enabled:boolean;
 refresh:(id:string)=>Promise<void>;
 setError:(message:string)=>void;
}){
 useEffect(()=>{
  if(!enabled||!runId)return;
  const id=runId;
  let stopped=false,inFlight=false,queued=false,realtimeConnected=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const clearTimer=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}};
  const schedule=(delay:number)=>{clearTimer();if(!stopped)timer=setTimeout(()=>void update(),delay);};
  const update=async()=>{
   if(stopped)return;
   if(inFlight){queued=true;return;}
   clearTimer();
   inFlight=true;
   try{await refresh(id);if(!stopped)setError('');}
   catch(reason){if(!stopped)setError(reason instanceof Error?reason.message:String(reason));}
   finally{
    inFlight=false;
    if(!stopped){const repeat=queued;queued=false;schedule(repeat?0:coopSyncIntervalMs(mode,urgency,realtimeConnected));}
   }
  };
  void update();
  const channel=supabase?.channel('coop-snapshot-'+id)
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'coop_run_client_snapshots',filter:'run_id=eq.'+id},()=>void update())
   .subscribe(status=>{
    if(stopped)return;
    const connected=status==='SUBSCRIBED';
    if(connected===realtimeConnected)return;
    realtimeConnected=connected;
    if(!inFlight)schedule(coopSyncIntervalMs(mode,urgency,realtimeConnected));
   });
  return()=>{stopped=true;clearTimer();if(channel)void supabase?.removeChannel(channel);};
 },[runId,mode,urgency,enabled,refresh,setError]);
}

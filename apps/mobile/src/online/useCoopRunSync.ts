import {useEffect} from 'react';
import {coopSyncIntervalMs,type CoopSyncMode,type CoopSyncUrgency} from '../core/coop-sync-policy';
import {supabase} from './supabase';
import {coopErrorMessage} from './coop-client';

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
  let stopped=false,inFlight=false,queued=false,realtimeConnected=false,coalescing=false,failures=0;
  const CHANGE_COALESCE_MS=350;
  const retryDelay=()=>{const base=coopSyncIntervalMs(mode,urgency,realtimeConnected);const cap=urgency==='decision'?4000:Math.max(base,15000);return Math.min(cap,base*2**Math.min(failures,4));};
  let timer:ReturnType<typeof setTimeout>|undefined;
  const clearTimer=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}};
  const schedule=(delay:number)=>{clearTimer();if(!stopped)timer=setTimeout(()=>void update(),delay);};
  const update=async()=>{
   if(stopped)return;
   if(inFlight){queued=true;return;}
   clearTimer();
   inFlight=true;
   coalescing=false;
   queued=false;
   try{await refresh(id);failures=0;if(!stopped)setError('');}
   catch(reason){failures++;if(!stopped)setError(coopErrorMessage(reason));}
   finally{
    inFlight=false;
    if(!stopped){const repeat=queued;queued=false;coalescing=!failures&&repeat;schedule(failures?retryDelay():repeat?CHANGE_COALESCE_MS:coopSyncIntervalMs(mode,urgency,realtimeConnected));}
   }
  };
  void update();
  const channel=supabase?.channel('coop-snapshot-'+id)
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'coop_run_client_snapshots',filter:'run_id=eq.'+id},()=>{if(stopped||coalescing||(failures>0&&!inFlight))return;if(inFlight){queued=true;return;}void update();})
   .subscribe(status=>{
    if(stopped)return;
    const connected=status==='SUBSCRIBED';
    if(connected===realtimeConnected)return;
    realtimeConnected=connected;
    if(!inFlight&&!failures&&!coalescing)schedule(coopSyncIntervalMs(mode,urgency,realtimeConnected));
   });
  return()=>{stopped=true;clearTimer();if(channel)void supabase?.removeChannel(channel);};
 },[runId,mode,urgency,enabled,refresh,setError]);
}

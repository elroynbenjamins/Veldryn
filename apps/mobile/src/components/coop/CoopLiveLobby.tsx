import {useEffect,useRef,useState} from 'react';
import {AppState,Text,View} from 'react-native';
import {GameButton} from '../GameButton';
import {coopClient,coopRequestId} from '../../online/coop-client';
import {readySecondsRemaining,type LiveQueueView,type LiveReadyView} from '../../core/coop-live-lobby';
import {C} from '../../theme/theme';

/** Available only behind the internal Live lobby gate. Closing/backgrounding
 * stops heartbeats; the database owns expiry and ready acceptance deadlines. */
export function CoopLiveLobby({onBack}:{onBack:()=>void}){
 const [queue,setQueue]=useState<LiveQueueView>(),[ready,setReady]=useState<LiveReadyView>();
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(false);
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
   }catch(error){if(!stopped)setNotice(error instanceof Error?error.message:String(error));}finally{inFlight=false;}
  };
  refresh.current=update;void update();const timer=setInterval(()=>void update(),2500);
  const listener=AppState.addEventListener('change',status=>{if(status==='active')void update();});
  return()=>{stopped=true;mounted.current=false;clearInterval(timer);listener.remove();};
 },[]);
 const act=async(work:()=>Promise<unknown>)=>{
  if(busy)return;setBusy(true);setNotice('');try{await work();await refresh.current();}catch(error){if(mounted.current)setNotice(error instanceof Error?error.message:String(error));}
  finally{if(mounted.current){setBusy(false);setPending(await coopClient.hasPending().catch(()=>false));}}
 };
 const self=ready?.members.find(row=>row.self),status=ready?.status??queue?.ticket?.status;
 return <View style={{flex:1,padding:16,gap:12}}>
  <Text accessibilityRole="header" style={{color:C.text,fontSize:22}}>Live dungeon party</Text>
  <Text style={{color:C.muted}}>1 Tank · 2 Damage · 1 Support</Text>
  {!!notice&&<Text accessibilityRole="alert" style={{color:C.warning}}>{notice}</Text>}
  {pending&&<GameButton title="Retry pending action" disabled={busy} onPress={()=>void act(()=>coopClient.retryPending())}/>}
  {!queue&&<Text style={{color:C.text}}>Loading your saved queue…</Text>}
  {status==='queued'&&<Text style={{color:C.text}}>Searching for your party · Auto Tier up to {queue?.ticket?.maxTier??queue?.ticket?.tier??'—'}. Keep this screen open to stay in the queue.</Text>}
  {ready&&<>
   {ready.tier?<Text style={{color:C.muted}}>Matched difficulty · Tier {ready.tier} (highest common eligible tier)</Text>:null}
   <Text style={{color:C.text}}>{ready.status==='open'?`Ready check · ${readySecondsRemaining(ready)} seconds`:ready.status==='refilling'?`Finding replacements · ${readySecondsRemaining(ready)} seconds`:ready.status==='committed'?'Your party is ready. Waiting for the dungeon to start.':'This ready check has ended.'}</Text>
   {ready.members.filter(member=>ready.status!=='refilling'||member.accepted).map(member=><Text key={member.characterId} style={{color:C.text}}>{member.role}{member.self?' · You':''} · {member.accepted?'Accepted':'Waiting'}</Text>)}
   {ready.status==='open'&&<>
    <GameButton title={self?.accepted?'Accepted':'Accept party'} disabled={busy||pending||self?.accepted||readySecondsRemaining(ready)===0} onPress={()=>void act(()=>coopClient.ready(ready.readyCheckId,{requestId:coopRequestId(),rosterRevision:ready.rosterRevision,accept:true}))}/>
    <GameButton title="Decline party" disabled={busy||pending} onPress={()=>void act(()=>coopClient.ready(ready.readyCheckId,{requestId:coopRequestId(),rosterRevision:ready.rosterRevision,accept:false}))}/>
   </>}
  </>}
  {status==='queued'&&queue?.ticket&&<GameButton title="Cancel search" disabled={busy||pending} onPress={()=>void act(()=>coopClient.cancelLive(queue.ticket!.ticketId))}/>}
  {['cancelled','expired'].includes(status??'')&&<Text style={{color:C.text}}>Your search has ended. You can start a new search.</Text>}
  <GameButton title="Back" tone="secondary" disabled={busy} onPress={onBack}/>
 </View>;
}

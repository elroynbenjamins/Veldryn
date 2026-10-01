import {useSocialText} from '../../i18n/social';
import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,AppState,StyleSheet,Text,View} from 'react-native';
import {coopClient,coopRequestId} from '../../online/coop-client';
import {readySecondsRemaining,type LiveQueueView,type LiveReadyView} from '../../core/coop-live-lobby';
import {coopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {ExpeditionScreenShell,FantasyPanel,PrimaryAction,RoleBadge,StateChip} from './CoopVisualKit';

/** Available only behind the internal Live lobby gate. Closing/backgrounding
 * stops heartbeats; the database owns expiry and ready acceptance deadlines. */
export function CoopLiveLobby({onBack,onRunReady}:{onBack:()=>void;onRunReady?:(runId:string)=>void}){
 const st=useSocialText();
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
 const self=ready?.members.find(row=>row.self),status=ready?.status??queue?.ticket?.status;
 const statusCopy=status==='queued'?'Searching for your party':status==='reserved'||status==='matched'?'Match found · preparing the ready check':status==='open'?`Ready check · ${readySecondsRemaining(ready!)} seconds`:status==='refilling'?`Finding a replacement · ${readySecondsRemaining(ready!)} seconds`:status==='committed'?'Party locked · preparing your dungeon':'Search inactive';
 const acceptReady=()=>void act(async()=>{const result=await coopClient.ready(ready!.readyCheckId,{requestId:coopRequestId(),rosterRevision:ready!.rosterRevision,accept:true});if(result.runId&&onRunReady)onRunReady(result.runId);return result;});
 return <ExpeditionScreenShell eyebrow={st("LIVE MATCHMAKING")} title={st("Find a dungeon party")} onBack={onBack} backLabel={st("Back to expeditions")} banner={<View style={s.banner}><View style={s.flex}><Text style={s.copy}>{st("A live party of one Tank, two Damage, and one Support.")}</Text><Text style={s.meta}>{st("Keep this screen open while searching. Server time controls every deadline.")}</Text></View><StateChip label={status==='open'||status==='refilling'?st("ACTION NEEDED"):status==='committed'?st("READY"):st("LIVE")} tone={status==='open'||status==='refilling'?'warning':status==='committed'?'success':'selected'}/></View>}>
  {notice?<FantasyPanel variant="danger"><Text accessibilityRole="alert" style={s.error}>{notice}</Text><PrimaryAction label={st("Retry connection")} tone="secondary" disabled={busy} onPress={()=>void refresh.current()}/></FantasyPanel>:null}
  {pending?<FantasyPanel variant="selected"><Text style={s.cardTitle}>{st("Pending action saved")}</Text><Text style={s.copy}>{st("Your last matchmaking action will be retried safely against the server.")}</Text><PrimaryAction label={st("Retry pending action")} disabled={busy} loading={busy} onPress={()=>void act(()=>coopClient.retryPending())}/></FantasyPanel>:null}
  {loading&&!queue?<FantasyPanel><View style={s.loading}><ActivityIndicator color={coopColors.cyan}/><Text style={s.copy}>{st("Restoring your matchmaking session…")}</Text></View></FantasyPanel>:null}
  {!loading&&status==='queued'?<FantasyPanel variant="selected"><View style={s.head}><View style={s.flex}><Text style={s.kicker}>{st("SEARCHING")}</Text><Text style={s.cardTitle}>{st("Building your party")}</Text></View><StateChip label={st("IN QUEUE")} tone="selected"/></View><Text style={s.copy}>Auto Tier up to {queue?.ticket?.maxTier??queue?.ticket?.tier??'—'} · role: {queue?.ticket?.role??'—'}</Text><Text style={s.meta}>{st("The matcher is looking for the remaining roles. You can cancel at any time.")}</Text><PrimaryAction label={st("Cancel search")} tone="danger" disabled={busy||pending} loading={busy} onPress={()=>void act(()=>coopClient.cancelLive(queue!.ticket!.ticketId))}/></FantasyPanel>:null}
  {status==='reserved'||status==='matched'?<FantasyPanel variant="selected"><Text style={s.kicker}>{st("MATCH FOUND")}</Text><Text style={s.cardTitle}>{st("Your party is being assembled")}</Text><Text style={s.copy}>{st("The server reserved a compatible roster. Loading the ready check now…")}</Text><View style={s.loading}><ActivityIndicator color={coopColors.cyan}/></View></FantasyPanel>:null}
  {ready?<FantasyPanel variant={ready.status==='open'?'selected':ready.status==='committed'?'success':'default'}><View style={s.head}><View style={s.flex}><Text style={s.kicker}>{ready.status==='open'?st("READY CHECK"):ready.status==='refilling'?st("RE-FILLING PARTY"):st("PARTY STATUS")}</Text><Text style={s.cardTitle}>{statusCopy}</Text></View><StateChip label={`TIER ${ready.tier??queue?.ticket?.tier??'—'}`} tone="selected"/></View><Text style={s.copy}>{ready.status==='open'?st("Confirm your place before the timer expires."):ready.status==='refilling'?st("Accepted players are held while the server searches for a replacement."):ready.status==='committed'?st("Everyone accepted. The dungeon handoff is the next step."):st("This ready check has ended.")}</Text><View style={s.members}>{ready.members.filter(member=>ready.status!=='refilling'||member.accepted).map(member=><View key={member.characterId} style={s.member}><RoleBadge role={member.role} label={member.role}/><View style={s.flex}><Text style={s.memberName}>{member.self?st("You"):member.role.toUpperCase()}</Text><Text style={s.meta}>{member.accepted?st("Accepted"):st("Waiting for response")}</Text></View><StateChip label={member.accepted?'✓':'…'} tone={member.accepted?'success':'warning'}/></View>)}</View>{ready.status==='open'?<View style={s.actions}><View style={s.flex}><PrimaryAction label={self?.accepted?st("Accepted"):st("Accept party")} disabled={busy||pending||self?.accepted||readySecondsRemaining(ready)===0} loading={busy} onPress={acceptReady}/></View><View style={s.flex}><PrimaryAction label={st("Decline")} tone="danger" disabled={busy||pending} onPress={()=>void act(()=>coopClient.ready(ready.readyCheckId,{requestId:coopRequestId(),rosterRevision:ready.rosterRevision,accept:false}))}/></View></View>:null}</FantasyPanel>:null}
  {!loading&&!queue?.ticket&&!ready?<FantasyPanel><Text style={s.cardTitle}>{st("No active search")}</Text><Text style={s.copy}>{st("Return to the expedition menu and start Quick Match or join a Live group post.")}</Text></FantasyPanel>:null}
  {['cancelled','expired','requeued'].includes(status??'')?<FantasyPanel variant="danger"><Text style={s.cardTitle}>{st("Search ended")}</Text><Text style={s.copy}>{st("Your party search has ended. You can safely return to the expedition menu and start again.")}</Text><PrimaryAction label={st("Back to expeditions")} tone="secondary" disabled={busy} onPress={onBack}/></FantasyPanel>:null}
 </ExpeditionScreenShell>;
}

const s=StyleSheet.create({banner:{flexDirection:'row',alignItems:'center',gap:coopSpacing.sm},head:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},flex:{flex:1,minWidth:0},kicker:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900',letterSpacing:1},cardTitle:{...coopTypography.section,color:coopColors.text},copy:{...coopTypography.body,color:coopColors.textSecondary},meta:{...coopTypography.meta,color:coopColors.textMuted},error:{...coopTypography.body,color:coopColors.danger},loading:{minHeight:52,alignItems:'center',justifyContent:'center',gap:coopSpacing.sm},members:{gap:coopSpacing.sm,paddingTop:coopSpacing.xs},member:{minHeight:56,flexDirection:'row',alignItems:'center',gap:coopSpacing.sm,padding:coopSpacing.xs,borderTopWidth:1,borderColor:coopColors.goldDim},memberName:{...coopTypography.meta,color:coopColors.text,fontWeight:'900'},actions:{flexDirection:'row',gap:coopSpacing.sm}});

import {profileIconSource} from '../components/ProfileIcon';
import {useSocialText} from '../i18n/social';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {BackHandler,Pressable,View,Text} from 'react-native';
import {CoopDungeonDetails,CoopDungeonList,CoopEventExpeditionDetails} from '../components/coop/CoopDungeonBrowser';
import {CoopLoadoutSelection} from '../components/coop/CoopLoadoutSelection';
import {buildCoopLoadoutIntent,presentCoopLoadout,type CoopLoadoutIntent} from '../core/coop-loadout-presentation';
import {CoopRunOverview,type CoopRewardDisplay} from '../components/coop/CoopRunOverview';
import {CoopLiveLobby} from '../components/coop/CoopLiveLobby';
import {CoopLiveRecruitmentBoard} from '../components/coop/CoopLiveRecruitmentBoard';
import {presentCoopDungeon,validateCoopDungeonView,type CoopDungeonView,type CoopTier} from '../core/coop-dungeon-browsing';
import type {CoopMode,CoopRunView} from '../core/coop-presentation';
import type {Language} from '../i18n';
import {coopClient,coopLiveReadyEnabled,coopRequestId,type CoopEntryData} from '../online/coop-client';
import {presentQModeRun,type CoopQModeServerProjection} from '../core/coop-qmode';
import {realCoopQModeSource} from '../online/coop-qmode-source';
import {supabase} from '../online/supabase';
import {GameButton} from '../components/GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {realCoopEntrySource,type CoopEntrySource} from '../online/coop-entry-source';
import type {GameState} from '../core/types';
import {clt} from '../i18n';
import {presentEventExpeditionRun,validateCoopEventExpeditionPreview,type CoopEventExpeditionPreview,type CoopEventRunServerProjection} from '../core/coop-event-expeditions';
import type {CoopChatMessage} from '../online/coop-client';
import {noCoopProfileIcon,useCoopProfileIcons} from '../online/coop-profile-icons';
import {combatPowerRating} from '../core/combat-power';

export function CoopExpeditionScreen({onClose,language,state,entrySource=realCoopEntrySource,initialDungeonId,onInitialDungeonHandled,initialEventLiveId,onInitialEventHandled,onRewardsChanged}:{onClose:()=>void;language:Language;state:GameState;entrySource?:CoopEntrySource;initialDungeonId?:string;onInitialDungeonHandled?:()=>void;initialEventLiveId?:string;onInitialEventHandled?:()=>void;onRewardsChanged?:()=>void|Promise<void>}){
 const st=useSocialText();
  const C=useGameTheme();
  const [entry,setEntry]=useState<CoopEntryData>();
  const [selected,setSelected]=useState<CoopDungeonView>();
  const [selectedEvent,setSelectedEvent]=useState<CoopEventExpeditionPreview>();
  const [mode,setMode]=useState<CoopMode>('qmode');
  const [tier,setTier]=useState<CoopTier>();
  const [run,setRun]=useState<CoopRunView>();
  const [eventRun,setEventRun]=useState<CoopEventRunServerProjection>();
  const [showLive,setShowLive]=useState(false);
  const [showEchoSharing,setShowEchoSharing]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [syncError,setSyncError]=useState('');
  const [notice,setNotice]=useState('');
  const loadRequestId=useRef(0);
  const [showLoadouts,setShowLoadouts]=useState(false);
  const [busy,setBusy]=useState(false),[pending,setPending]=useState(false);
  const [myLiveVote,setMyLiveVote]=useState<{runId:string;decisionId:string;optionId:string}|null>(null);
  const displayRun=useMemo(()=>eventRun?presentEventExpeditionRun(eventRun):run,[eventRun,run]);
  const selectableLoadouts=useMemo(()=>state.character?(entry?.loadouts??[]).map(loadout=>presentCoopLoadout(loadout,state.character!.id)).filter(loadout=>loadout.selectable):[],[entry,state.character]);
  const echoLoadout=entry?.loadouts.find(loadout=>loadout.id==='current');
  const echoReady=Boolean(echoLoadout?.ready&&(state.character?.level??0)>=15);
  const runIcons=useCoopProfileIcons('run',displayRun?[displayRun.runId]:[],entrySource.kind==='real',displayRun?.roleSlots.map(slot=>slot.memberId??'').sort().join(','));
  const runWithIcons=useMemo(()=>displayRun&&entrySource.kind==='real'?{...displayRun,roleSlots:displayRun.roleSlots.map(slot=>({...slot,...(runIcons.get(slot.memberId??'')??noCoopProfileIcon)}))}:displayRun,[displayRun,entrySource.kind,runIcons]);
  const showRecruitment=mode==='live'&&coopLiveReadyEnabled&&entrySource.kind==='real'&&!showLive&&!showLoadouts&&!selected&&!selectedEvent&&!run&&!eventRun;
  const recruitmentIcons=useCoopProfileIcons('lfg',(entry?.liveRecruitment??[]).map(post=>post.id),showRecruitment);
  const recruitmentWithIcons=(entry?.liveRecruitment??[]).map(post=>({...post,...(recruitmentIcons.get(post.id)??noCoopProfileIcon)}));
  const activeRunId=useRef<string|undefined>(undefined);activeRunId.current=run?.runId;
  const activeEventRunId=useRef<string|undefined>(undefined);activeEventRunId.current=eventRun?.runId;
  const initialDungeonHandled=useRef(false);
  const initialEventHandled=useRef(false);
  const [rewards,setRewards]=useState<CoopRewardDisplay[]>([]);
  const [chatMessages,setChatMessages]=useState<CoopChatMessage[]>([]);
  const acceptRun=useCallback((projection:CoopQModeServerProjection)=>{const next=presentQModeRun(projection);setRun(current=>current&&current.runId===next.runId&&(current.stateVersion??0)>(next.stateVersion??0)?current:next);},[]);
  const acceptEventRun=useCallback((projection:CoopEventRunServerProjection)=>{setEventRun(current=>current&&current.runId===projection.runId&&current.stateVersion>projection.stateVersion?current:projection);},[]);
  const refreshRun=useCallback(async(runId:string)=>{
    const value=await coopClient.run(runId);if(!('team' in value))throw new Error(st("Invalid run response."));
    if(activeRunId.current!==runId)return;
    const next=presentQModeRun(value);setRun(current=>current?.runId===runId&&(current.stateVersion??0)<=(next.stateVersion??0)?next:current);
    if(next.mode==='live'){const chat=await coopClient.partyChat(runId);if(activeRunId.current===runId)setChatMessages(chat.messages);}
    if(['completed','failed'].includes(next.phase)){const items=await coopClient.rewards(runId);if(activeRunId.current===runId)setRewards(items);}
  },[]);
  const refreshEventRun=useCallback(async(runId:string)=>{
    const next=await coopClient.eventRun(runId);if(activeEventRunId.current!==runId)return;
    setEventRun(current=>current?.runId===runId&&current.stateVersion<=next.stateVersion?next:current);
  },[]);
  const action=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setNotice('');try{await work();}catch(reason){setNotice(reason instanceof Error?reason.message:String(reason));}finally{setBusy(false);if(entrySource.kind==='real')setPending(await coopClient.hasPending().catch(()=>false));}};
  const load=useCallback(async()=>{
    const requestId=++loadRequestId.current;
    setLoading(true);setError('');
    try{const next=await entrySource.load();next.dungeons.forEach(source=>validateCoopDungeonView(presentCoopDungeon(source)));next.eventExpeditions?.forEach(validateCoopEventExpeditionPreview);if(requestId===loadRequestId.current)setEntry(next)}
    catch(reason){if(requestId===loadRequestId.current)setError(reason instanceof Error?reason.message:String(reason))}
    finally{if(requestId===loadRequestId.current)setLoading(false)}
  },[entrySource]);
  useEffect(()=>{void load();return()=>{loadRequestId.current++}},[load]);
  useEffect(()=>{
    if(initialEventHandled.current||!initialEventLiveId||!entry)return;
    initialEventHandled.current=true;onInitialEventHandled?.();
    const expedition=entry.eventExpeditions?.find(item=>item.liveEventId===initialEventLiveId&&item.status==='available');
    if(expedition){setSelectedEvent(expedition);setSelected(undefined);setShowLoadouts(false);setNotice('');return;}
    setNotice(st("This active event does not currently offer a launchable seasonal expedition."));
  },[entry,initialEventLiveId,onInitialEventHandled]);
  useEffect(()=>{let cancelled=false;if(coopLiveReadyEnabled&&entrySource.kind==='real')void coopClient.liveQueue().then(value=>{if(!cancelled&&value.ticket&&['queued','reserved'].includes(value.ticket.status))setShowLive(true);}).catch(()=>{});return()=>{cancelled=true;};},[entrySource]);
  useEffect(()=>{if(entrySource.kind==='real')void coopClient.hasPending().then(setPending).catch(()=>{});},[entrySource]);
  useEffect(()=>{
    if(mode!=='live'||!coopLiveReadyEnabled||entrySource.kind!=='real'||showLive||showLoadouts||selected||selectedEvent||run||eventRun)return;
    let stopped=false,inFlight=false;
    const refreshBoard=async()=>{if(stopped||inFlight)return;inFlight=true;try{const posts=await coopClient.liveRecruitment();if(!stopped)setEntry(current=>current?{...current,liveRecruitment:posts}:current);}catch{}finally{inFlight=false;}};
    void refreshBoard();const timer=setInterval(()=>void refreshBoard(),15_000);return()=>{stopped=true;clearInterval(timer);};
  },[entrySource.kind,mode,showLive,showLoadouts,selected,selectedEvent,run,eventRun]);
  useEffect(()=>{
    const id=run?.runId;if(!id||entrySource.kind!=='real')return;
    setSyncError('');
    let stopped=false,inFlight=false;
    const update=async()=>{if(stopped||inFlight)return;inFlight=true;try{await refreshRun(id);if(!stopped)setSyncError('');}catch(reason){if(!stopped)setSyncError(reason instanceof Error?reason.message:String(reason));}finally{inFlight=false;}};
    void update();const timer=setInterval(()=>void update(),2500);
    const channel=supabase?.channel('coop-snapshot-'+id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'coop_run_client_snapshots',filter:'run_id=eq.'+id},()=>void update()).subscribe();
    return()=>{stopped=true;clearInterval(timer);if(channel)void supabase?.removeChannel(channel);};
  },[run?.runId,entrySource.kind,refreshRun]);
  useEffect(()=>{
    const id=eventRun?.runId;if(!id||entrySource.kind!=='real')return;
    setSyncError('');
    let stopped=false,inFlight=false;
    const update=async()=>{if(stopped||inFlight)return;inFlight=true;try{await refreshEventRun(id);if(!stopped)setSyncError('');}catch(reason){if(!stopped)setSyncError(reason instanceof Error?reason.message:String(reason));}finally{inFlight=false;}};
    void update();const timer=setInterval(()=>void update(),2500);
    const channel=supabase?.channel('event-coop-snapshot-'+id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'coop_run_client_snapshots',filter:'run_id=eq.'+id},()=>void update()).subscribe();
    return()=>{stopped=true;clearInterval(timer);if(channel)void supabase?.removeChannel(channel);};
  },[eventRun?.runId,entrySource.kind,refreshEventRun]);
  useEffect(()=>{if(!showLive&&!showLoadouts&&!selected&&!selectedEvent&&!run&&!eventRun)return;const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(showLive){onClose();return true}if(eventRun){setEventRun(undefined);return true}if(run){setRun(undefined);return true}if(showLoadouts){setShowLoadouts(false);setNotice('');return true}if(selectedEvent){setSelectedEvent(undefined);setNotice('');return true}if(selected){setSelected(undefined);setNotice('');return true}return false});return()=>subscription.remove()},[showLive,showLoadouts,selected,selectedEvent,run,eventRun,onClose]);
  const dungeons=useMemo(()=>(entry?.dungeons??[]).map(presentCoopDungeon),[entry]);
  const activeEventExpeditions=useMemo(()=>(entry?.eventExpeditions??[]).filter(expedition=>expedition.status==='available'),[entry]);
  useEffect(()=>{
    if(initialDungeonHandled.current||!initialDungeonId||!entry)return;
    initialDungeonHandled.current=true;onInitialDungeonHandled?.();
    const dungeon=dungeons.find(item=>item.id===initialDungeonId);
    if(dungeon){setSelectedEvent(undefined);setEventRun(undefined);setRun(undefined);setSelected(dungeon);setTier(dungeon.difficulties[0]);setShowLoadouts(false);setNotice('');return;}
    setNotice(st("That dungeon source is not currently available in the dungeon catalog."));
  },[dungeons,entry,initialDungeonId,onInitialDungeonHandled]);
  const verifiedLoadout=()=>entry?.loadouts.find(item=>item.id==='current'&&item.status==='verified'&&item.ready)??entry?.loadouts.find(item=>item.status==='verified'&&item.ready);
  const startWithLoadout=(intent:CoopLoadoutIntent)=>void action(async()=>{
    if(entrySource.kind!=='real'){setNotice(clt(language,'intentOnly'));return;}
    if(intent.mode==='live'){
      if(!coopLiveReadyEnabled)throw new Error(st("Live matchmaking is not enabled yet."));
      await coopClient.joinLive({requestId:coopRequestId(),dungeonId:intent.dungeonId,tier:intent.tier,characterId:intent.characterId,loadoutId:intent.loadoutId,loadoutRevision:intent.loadoutRevision});
      setShowLive(true);return;
    }
    const started=await realCoopQModeSource.start(intent,coopRequestId());setRun(started.run);
  });
  const continueDungeon=(resolvedTier:CoopTier)=>{
    setTier(resolvedTier);
    if(entrySource.kind!=='real'||!selected||selectableLoadouts.length!==1){setShowLoadouts(true);return;}
    startWithLoadout(buildCoopLoadoutIntent({mode,dungeonId:selected.id,tier:resolvedTier,loadout:selectableLoadouts[0]}));
  };
  const refreshLiveRecruitment=async()=>{const posts=await coopClient.liveRecruitment();setEntry(current=>current?{...current,liveRecruitment:posts}:current);};
  const resumeActiveRun=()=>{const projection=entry?.activeRunProjection;if(!projection){if(entry?.activeRun)setRun(entry.activeRun);return;}if(projection.mode!=='live'){setRun(entry.activeRun);return;}void action(async()=>{const value=await coopClient.run(projection.runId);if(!('team' in value))throw new Error(st("Invalid active Live run response."));acceptRun(value);});};
  function joinRecruitmentSearch(dungeonId:string){const dungeon=dungeons.find(item=>item.id===dungeonId);if(!dungeon?.available){setNotice(st("That dungeon is no longer available for this character."));return;}setMode('live');chooseDungeon(dungeon);}
  function chooseDungeon(dungeon:CoopDungeonView){setSelectedEvent(undefined);setEventRun(undefined);setSelected(dungeon);setTier(dungeon.difficulties[0]);setNotice('')}
  function chooseEvent(expedition:CoopEventExpeditionPreview){setSelected(undefined);setShowLoadouts(false);setRun(undefined);setSelectedEvent(expedition);setNotice('')}
  const retry=pending?<GameButton title={st("Retry pending co-op action")} disabled={busy} onPress={()=>action(async()=>{const value=await coopClient.retryPending();if(value&&typeof value==='object'&&'eventExpeditionId' in value)acceptEventRun(value as CoopEventRunServerProjection);else if(value&&typeof value==='object'&&'team' in value)acceptRun(value as CoopQModeServerProjection);await load();})}/>:null;
  const quickLiveMatch=()=>void action(async()=>{const loadout=verifiedLoadout();if(!loadout)throw new Error(st("No verified Live-ready loadout is available. Refresh your co-op loadout first."));await coopClient.quickLive({requestId:coopRequestId(),characterId:loadout.characterId,loadoutId:loadout.id,loadoutRevision:loadout.revision});setShowLive(true);});
  const liveTools=coopLiveReadyEnabled&&entrySource.kind==='real'?<CoopLiveRecruitmentBoard showQuickMatch={false} posts={recruitmentWithIcons} dungeons={dungeons} nowMs={entry?.serverNow??Date.now()} busy={busy} notice={notice}
    onQuickMatch={quickLiveMatch}
    onJoin={joinRecruitmentSearch}
    onPublish={(dungeonId,note)=>action(async()=>{await coopClient.publishLiveRecruitment({requestId:coopRequestId(),dungeonId,note});await refreshLiveRecruitment();setNotice(st("Live LFG posted for 30 minutes."));})}
    onCloseMine={()=>void action(async()=>{await coopClient.closeLiveRecruitment();await refreshLiveRecruitment();setNotice(st("Live LFG removed."));})}
    onRefresh={()=>action(refreshLiveRecruitment)}/>:undefined;
  if(showLive)return <CoopLiveLobby dungeons={dungeons} selfPortrait={state.character?profileIconSource(state.character.profileIconId,state.character.classId):undefined} onBack={()=>setShowLive(false)} onRunReady={runId=>{setShowLive(false);void action(async()=>{const projection=await coopClient.run(runId);if(!('team' in projection))throw new Error(st("Invalid Live run response."));acceptRun(projection);});}}/>;
  if(eventRun){
    const view=runWithIcons!,marks=eventRun.settlement.rewardMarks??0;
    return <View style={{flex:1}}>{retry}<CoopRunOverview language={language} run={view} seasonal eventName={eventRun.eventName} notice={notice} syncError={syncError} busy={busy} reduceMotion={state.settings.reduceMotion} onBack={()=>{setEventRun(undefined);void load();}} onRefresh={()=>action(async()=>{await refreshEventRun(eventRun.runId);setSyncError('')})} onChoose={nodeId=>void action(async()=>{if(!eventRun.decisionId||eventRun.decisionRevision===undefined)throw new Error(st("Refresh this run before choosing."));acceptEventRun(await coopClient.chooseEvent(eventRun.runId,{requestId:coopRequestId(),decisionId:eventRun.decisionId,decisionRevision:eventRun.decisionRevision,optionId:nodeId}));})} terminalAction={eventRun.phase==='completed'?{label:st('Collect {marks} event currency',{marks}),claimed:eventRun.settlement.status==='claimed',completeText:st('{marks} event currency collected.',{marks}),onPress:()=>void action(async()=>{acceptEventRun(await coopClient.claimEvent(eventRun.runId));setNotice(st('{marks} event currency and reputation collected.',{marks}));await onRewardsChanged?.();})}:undefined}/></View>;
  }
  if(run)return <View style={{flex:1}}>{retry}<CoopRunOverview language={language} run={runWithIcons!} myVotedNodeId={myLiveVote?.runId===run.runId&&myLiveVote.decisionId===run.decisionId?myLiveVote.optionId:undefined} selfVoter={state.character?{name:state.character.name,profileIconId:state.character.profileIconId,className:state.character.classId}:undefined} notice={notice} syncError={syncError} busy={busy} rewards={rewards} chatMessages={chatMessages} onChatSend={run.mode==='live'?async text=>{const response=await coopClient.chat(run.runId,text);setChatMessages(response.messages);}:undefined} reduceMotion={state.settings.reduceMotion} onBack={()=>{setRun(undefined);setChatMessages([]);setRewards([]);void load();}} onRefresh={()=>action(async()=>{await refreshRun(run.runId);setSyncError('')})} onChoose={nodeId=>void action(async()=>{if(!run.decisionId||run.decisionRevision===undefined)throw new Error(st("Refresh this run before choosing."));const body={requestId:coopRequestId(),decisionId:run.decisionId,decisionRevision:run.decisionRevision,optionId:nodeId};const voting=run.mode==='live'&&run.options.length>1;const result=voting?await coopClient.vote(run.runId,body):await coopClient.choose(run.runId,body);if(voting)setMyLiveVote({runId:run.runId,decisionId:run.decisionId,optionId:nodeId});acceptRun(result);})} onClaim={id=>action(async()=>{const reward=await coopClient.claim(id);setNotice(reward.live_fellowship_bonus?st('{marks} Expedition Marks collected. Includes +{bonus} Live Fellowship bonus.',{marks:reward.marks,bonus:reward.live_fellowship_bonus}):st('{marks} Expedition Marks collected.',{marks:reward.marks}));await onRewardsChanged?.();await refreshRun(run.runId);await load();})}/></View>;
  if(selectedEvent)return <CoopEventExpeditionDetails language={language} event={selectedEvent} notice={notice} busy={busy} onBack={()=>{setSelectedEvent(undefined);setNotice('')}} onLaunch={()=>void action(async()=>{
    if(entrySource.kind!=='real'){setNotice(clt(language,'intentOnly'));return;}
    const loadout=entry?.loadouts.find(item=>item.id==='current'&&item.status==='verified'&&item.ready)??entry?.loadouts.find(item=>item.status==='verified'&&item.ready);
    if(!loadout)throw new Error(st("No verified expedition-ready loadout is available. Refresh your co-op loadout first."));
    const started=await coopClient.startEvent({requestId:coopRequestId(),eventExpeditionId:selectedEvent.id,characterId:loadout.characterId,loadoutId:loadout.id,loadoutRevision:loadout.revision});
    setSelectedEvent(undefined);acceptEventRun(started);
  })}/>;
  if(selected&&showLoadouts&&tier&&state.character)return <View style={{flex:1}}>{retry}<CoopLoadoutSelection state={state} language={language} dungeonId={selected.id} dungeonName={selected.name} tier={tier} mode={mode} loadouts={entry?.loadouts??[]} notice={notice} refreshing={loading||busy} onBack={()=>{setShowLoadouts(false);setNotice('')}} onRefresh={()=>load()} onIntent={startWithLoadout}/></View>;
  if(selected)return <CoopDungeonDetails language={language} dungeon={selected} currentLevel={state.character?.level??0} currentPower={combatPowerRating(state).total} mode={mode} tier={tier} readyToStart={entrySource.kind==='real'&&selectableLoadouts.length===1} busy={busy||pending} liveFellowshipRemaining={entry?.liveFellowshipRemaining} rewardBudget={entry?.rewardBudget} notice={notice} onBack={()=>{setSelected(undefined);setNotice('')}} onTier={next=>{setTier(next);setNotice('')}} onContinue={continueDungeon}/>;
  const echoTools=entrySource.kind==='real'&&entry?.gameVersion?(<View style={{paddingHorizontal:16,paddingTop:8}}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showEchoSharing}} accessibilityLabel={st("Echo sharing")} accessibilityHint={st("Sharing an Echo lets other players recruit a snapshot of your character for 24 hours.")} onPress={()=>setShowEchoSharing(value=>!value)} style={{paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <View style={{flex:1}}><Text style={{color:C.text,fontWeight:'700'}}>{st("My Echo · Current equipment")}</Text><Text numberOfLines={2} style={{color:C.muted}}>{entry.echoSharing?st("Your character Echo is shared with other adventurers."):st("Prepare a snapshot of your current dungeon loadout for other players.")}</Text></View>
        <Text style={{color:C.muted,marginLeft:8}}>{showEchoSharing?'−':'+'}</Text>
      </Pressable>
      {showEchoSharing&&<View style={{gap:8,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2}}>
        <Text style={{color:C.text,fontWeight:'700'}}>{echoLoadout?st('{name} · Level {level}',{name:echoLoadout.className,level:echoLoadout.level}):st("Current character")}</Text>
        <Text style={{color:C.muted,fontSize:12}}>{echoLoadout?st("Role: {role} · {count} equipped items",{role:echoLoadout.role,count:echoLoadout.equipment.length}):st("No loadout verified yet.")}</Text>
        <Text style={{color:echoReady?C.good:C.warning,fontSize:12,fontWeight:'700'}}>{entry.echoSharing?st("SHARED"):echoReady?st("READY TO SHARE"):st("NOT READY")}</Text>
        {!echoReady&&<Text style={{color:C.muted,fontSize:12}}>{state.character&&state.character.level<15?st("Echo sharing unlocks at character level 15."):st("Your current co-op equipment must pass the readiness check.")}</Text>}
        <Text style={{color:C.muted,fontSize:12,lineHeight:17}}>{st("Your Echo is a frozen copy of your current class, equipment and combat abilities. It remains available for up to 24 hours. Changing your gear does not automatically update an existing Echo.")}</Text>
        <GameButton title={entry.echoSharing?st("Update Echo from current gear"):st("Share my current Echo")} disabled={busy||!echoReady} onPress={()=>action(async()=>{await coopClient.shareEcho(entry.gameVersion!,true);await load();setNotice(st("Your Echo has been published from your current equipment."));})}/>
        {entry.echoSharing&&<GameButton title={st("Stop sharing my Echo")} tone="secondary" disabled={busy} onPress={()=>action(async()=>{await coopClient.shareEcho(entry.gameVersion!,false);await load();setNotice(st("Your Echo is no longer shared."));})}/>}
      </View>}
      {!!notice&&<Text accessibilityRole="alert" style={{color:C.warning}}>{notice}</Text>}
    </View>):undefined;
  return <View style={{flex:1}}>
    {retry}
    <CoopDungeonList language={language} mode={mode} liveAvailable={entrySource.kind!=='real'||coopLiveReadyEnabled} onMode={next=>{setMode(next);setNotice('')}} dungeons={dungeons} eventExpeditions={activeEventExpeditions} loading={loading} error={error} notice={notice} activeRun={entry?.activeRun} liveTools={liveTools} echoTools={echoTools} onQuickMatch={coopLiveReadyEnabled&&entrySource.kind==='real'?quickLiveMatch:undefined} quickMatchBusy={busy||loading||pending} onBack={onClose} onRetry={()=>load()} onSelect={chooseDungeon} onSelectEvent={chooseEvent} onResume={()=>{if(entry?.activeEventRunProjection){setRun(undefined);setEventRun(entry.activeEventRunProjection);return;}resumeActiveRun()}}/>
  </View>;
}

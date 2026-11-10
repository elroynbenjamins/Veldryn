import {profileIconSource} from '../components/ProfileIcon';
import {dungeonHealingPotionView} from '../core/coop-potion-view';
import {dungeonTonicView} from '../core/coop-tonic-view';
import {useSocialText} from '../i18n/social';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,BackHandler,Pressable,View,Text} from 'react-native';
import {CoopDungeonDetails,CoopDungeonList,CoopEventExpeditionDetails} from '../components/coop/CoopDungeonBrowser';
import {CoopLoadoutSelection} from '../components/coop/CoopLoadoutSelection';
import {buildCoopLoadoutIntent,presentCoopLoadout,type CoopLoadoutIntent} from '../core/coop-loadout-presentation';
import {CoopRunOverview,type CoopRewardDisplay} from '../components/coop/CoopRunOverview';
import {CoopLiveRematchPanel} from '../components/coop/CoopLiveRematchPanel';
import {CoopLiveLobby} from '../components/coop/CoopLiveLobby';
import {CoopLiveRecruitmentBoard} from '../components/coop/CoopLiveRecruitmentBoard';
import {presentCoopDungeon,validateCoopDungeonView,type CoopDungeonView,type CoopTier,type CoopDungeonProjection} from '../core/coop-dungeon-browsing';
import type {CoopMode,CoopRunView} from '../core/coop-presentation';
import type {Language} from '../i18n';
import {coopClient,coopErrorMessage,coopLiveReadyEnabled,coopRequestId,type CoopEntryData,type CoopLiveRematchState} from '../online/coop-client';
import {presentQModeRun,type CoopQModeServerProjection} from '../core/coop-qmode';
import {realCoopQModeSource} from '../online/coop-qmode-source';
import {COOP_CHAT_REFRESH_MS,type CoopSyncUrgency} from '../core/coop-sync-policy';
import {useCoopRunSync} from '../online/useCoopRunSync';
import {GameButton} from '../components/GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {realCoopEntrySource,type CoopEntrySource} from '../online/coop-entry-source';
import type {GameState} from '../core/types';
import {clt,ct} from '../i18n';
import {presentEventExpeditionRun,validateCoopEventExpeditionPreview,type CoopEventExpeditionPreview,type CoopEventRunServerProjection} from '../core/coop-event-expeditions';
import type {CoopChatMessage} from '../online/coop-client';
import {noCoopProfileIcon,useCoopProfileIcons} from '../online/coop-profile-icons';
import {combatPowerRating} from '../core/combat-power';

export function CoopExpeditionScreen({onClose,language,state,entrySource=realCoopEntrySource,initialDungeonId,onInitialDungeonHandled,initialEventLiveId,onInitialEventHandled,onRewardsChanged,onRunActiveChange}:{onClose:()=>void;language:Language;state:GameState;entrySource?:CoopEntrySource;initialDungeonId?:string;onInitialDungeonHandled?:()=>void;initialEventLiveId?:string;onInitialEventHandled?:()=>void;onRewardsChanged?:()=>void|Promise<void>;onRunActiveChange?:(active:boolean)=>void}){
 const st=useSocialText();
  const C=useGameTheme();
  const [entry,setEntry]=useState<CoopEntryData>();
  // Disk-backed browse previews only: no loadouts, rewards or running state.
  const characterId=state.character?.id;
  const [cachedBrowse,setCachedBrowse]=useState<{characterId:string;dungeons:CoopDungeonProjection[]}>();
  const [selected,setSelected]=useState<CoopDungeonView>();
  const [selectedEvent,setSelectedEvent]=useState<CoopEventExpeditionPreview>();
  const [mode,setMode]=useState<CoopMode>('qmode');
  const [tier,setTier]=useState<CoopTier>();
  const [run,setRun]=useState<CoopRunView>();
  const [eventRun,setEventRun]=useState<CoopEventRunServerProjection>();
  // Active runs occupy the dungeon stage without the World tabs or global HUD.
  // Report transitions and reset the shell when navigating away or unmounting.
  const isActiveRun=Boolean(run||eventRun);
  useEffect(()=>{
    onRunActiveChange?.(isActiveRun);
    return ()=>onRunActiveChange?.(false);
  },[isActiveRun,onRunActiveChange]);
  const [showLive,setShowLive]=useState(false);
  const [showEchoSharing,setShowEchoSharing]=useState(false);
  const [foreground,setForeground]=useState(AppState.currentState==='active');
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
  const recruitmentWithIcons=useMemo(()=>(entry?.liveRecruitment??[]).map(post=>({...post,...(recruitmentIcons.get(post.id)??noCoopProfileIcon)})),[entry?.liveRecruitment,recruitmentIcons]);
  const activeRunId=useRef<string|undefined>(undefined);activeRunId.current=run?.runId;
  const activeEventRunId=useRef<string|undefined>(undefined);activeEventRunId.current=eventRun?.runId;
  const initialDungeonHandled=useRef(false);
  const initialEventHandled=useRef(false);
  const [rewards,setRewards]=useState<CoopRewardDisplay[]>([]);
  const [lastQModeIntent,setLastQModeIntent]=useState<CoopLoadoutIntent>();
  const [rematchOpen,setRematchOpen]=useState(false);
  const [rematchState,setRematchState]=useState<CoopLiveRematchState>();
  const [rematchError,setRematchError]=useState('');
  const [rematchBusy,setRematchBusy]=useState(false);
  const rematchEntered=useRef<string|undefined>(undefined);
  const [chatMessages,setChatMessages]=useState<CoopChatMessage[]>([]);
  useEffect(()=>{const listener=AppState.addEventListener('change',status=>setForeground(status==='active'));return()=>listener.remove();},[]);
  const acceptRun=useCallback((projection:CoopQModeServerProjection)=>{const next=presentQModeRun(projection);setRun(current=>current&&current.runId===next.runId&&(current.stateVersion??0)>(next.stateVersion??0)?current:next);},[]);
  const acceptEventRun=useCallback((projection:CoopEventRunServerProjection)=>{setEventRun(current=>current&&current.runId===projection.runId&&current.stateVersion>projection.stateVersion?current:projection);},[]);
  const refreshRun=useCallback(async(runId:string)=>{
    const value=await coopClient.run(runId);if(!('team' in value))throw new Error(st("Invalid run response."));
    if(activeRunId.current!==runId)return;
    const next=presentQModeRun(value);setRun(current=>current?.runId===runId&&(current.stateVersion??0)<=(next.stateVersion??0)?next:current);
  },[]);
  const refreshEventRun=useCallback(async(runId:string)=>{
    const next=await coopClient.eventRun(runId);if(activeEventRunId.current!==runId)return;
    setEventRun(current=>current?.runId===runId&&current.stateVersion<=next.stateVersion?next:current);
  },[]);
  const action=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setNotice('');try{await work();}catch(reason){setNotice(coopErrorMessage(reason));}finally{setBusy(false);if(entrySource.kind==='real')setPending(await coopClient.hasPending().catch(()=>false));}};
  const load=useCallback(async(force=true)=>{
    const requestId=++loadRequestId.current;
    setLoading(true);setError('');
    try{
      const next=await entrySource.load({characterId,characterLevel:state.character?.level,force});
      next.dungeons.forEach(source=>validateCoopDungeonView(presentCoopDungeon(source)));
      next.eventExpeditions?.forEach(validateCoopEventExpeditionPreview);
      if(requestId===loadRequestId.current){setEntry(next);setCachedBrowse(undefined);}
    }catch(reason){if(requestId===loadRequestId.current)setError(coopErrorMessage(reason))}
    finally{if(requestId===loadRequestId.current)setLoading(false)}
  },[entrySource,characterId,state.character?.level]);
  // Server-owned ready checks are polled only while this modal is open.
  const enterRematch=useCallback(async(nextRunId:string)=>{
   if(rematchEntered.current===nextRunId)return;
   const value=await coopClient.run(nextRunId);
   if(!('team' in value))throw new Error(st('Invalid Live rematch response.'));
   rematchEntered.current=nextRunId;
   setRematchOpen(false);setRematchError('');setRewards([]);setChatMessages([]);setNotice('');
   acceptRun(value);void load();
  },[acceptRun,load]);
  useEffect(()=>{
   if(!rematchOpen||!run||run.mode!=='live'||!foreground)return;
   let stopped=false,inFlight=false;const oldRunId=run.runId;
   const poll=async()=>{
    if(stopped||inFlight)return;
    inFlight=true;
    try{
     const next=await coopClient.liveRematch(oldRunId);
     if(stopped||activeRunId.current!==oldRunId)return;
     setRematchState(next);setRematchError('');
     if(next.status==='committed'&&next.runId)await enterRematch(next.runId);
    }catch(error){if(!stopped)setRematchError(error instanceof Error?error.message:String(error));}
    finally{inFlight=false;}
   };
   void poll();const interval=setInterval(()=>void poll(),2400);
   return()=>{stopped=true;clearInterval(interval);};
  },[rematchOpen,run?.runId,run?.mode,foreground,enterRematch]);
  const respondRematch=(accept:boolean)=>{if(!run||rematchBusy)return;const oldRunId=run.runId;setRematchBusy(true);setRematchError('');
   void coopClient.respondLiveRematch(oldRunId,accept).then(next=>{
    if(activeRunId.current!==oldRunId)return;
    setRematchState(next);
    if(next.status==='committed'&&next.runId)void enterRematch(next.runId).catch(error=>setRematchError(error instanceof Error?error.message:String(error)));
   }).catch(error=>setRematchError(error instanceof Error?error.message:String(error))).finally(()=>setRematchBusy(false));
  };
  useEffect(()=>{
    let cancelled=false;
    setEntry(undefined);setCachedBrowse(undefined);
    if(characterId&&entrySource.cachedDungeons){
      void entrySource.cachedDungeons(characterId).then(catalog=>{
        if(!cancelled&&catalog?.dungeons.length)setCachedBrowse({characterId,dungeons:catalog.dungeons});
      }).catch(()=>{});
    }
    // A recent authorized in-memory response saves this GET entirely.
    // Otherwise the saved browse catalog remains visible during the refresh.
    void load(false);
    return()=>{cancelled=true;loadRequestId.current++;};
  },[load,entrySource,characterId]);
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
    if(!foreground||mode!=='live'||!coopLiveReadyEnabled||entrySource.kind!=='real'||showLive||showLoadouts||selected||selectedEvent||run||eventRun)return;
    let stopped=false,inFlight=false;
    const refreshBoard=async()=>{if(stopped||inFlight)return;inFlight=true;try{const posts=await coopClient.liveRecruitment();if(!stopped)setEntry(current=>current?{...current,liveRecruitment:posts}:current);}catch{}finally{inFlight=false;}};
    void refreshBoard();const timer=setInterval(()=>void refreshBoard(),15_000);return()=>{stopped=true;clearInterval(timer);};
  },[entrySource.kind,mode,foreground,showLive,showLoadouts,selected,selectedEvent,run,eventRun]);
  const syncRunId=eventRun?.runId??run?.runId;
  const syncMode=eventRun?'event':run?.mode??'qmode';
  const syncPhase=eventRun?.phase??run?.phase;
  const syncDecisionId=eventRun?.decisionId??run?.decisionId;
  const syncUrgency:CoopSyncUrgency=syncPhase==='resolving_node'?'combat':syncPhase!=='completed'&&syncPhase!=='failed'&&syncDecisionId?'decision':'idle';
  const refreshActiveRun=useCallback(async(id:string)=>{
    if(activeEventRunId.current===id)await refreshEventRun(id);
    else if(activeRunId.current===id)await refreshRun(id);
  },[refreshEventRun,refreshRun]);
  useCoopRunSync({
    runId:syncRunId,mode:syncMode,urgency:syncUrgency,
    enabled:foreground&&entrySource.kind==='real',
    refresh:refreshActiveRun,setError:setSyncError,
  });
  // Chat has its own bounded cadence and never rides on every battle/vote update.
  useEffect(()=>{
    const id=run?.runId;
    if(!foreground||!id||run?.mode!=='live'||eventRun||entrySource.kind!=='real')return;
    let stopped=false,inFlight=false;
    const update=async()=>{
      if(stopped||inFlight)return;
      inFlight=true;
      try{const chat=await coopClient.partyChat(id);if(!stopped&&activeRunId.current===id)setChatMessages(chat.messages);}
      catch{/* Chat retry is best-effort and must not mark a healthy dungeon as unavailable. */}
      finally{inFlight=false;}
    };
    void update();
    const timer=setInterval(()=>void update(),COOP_CHAT_REFRESH_MS);
    return()=>{stopped=true;clearInterval(timer);};
  },[foreground,run?.runId,run?.mode,eventRun?.runId,entrySource.kind]);
  // Final rewards are immutable until claimed, not a per-frame polling dependency.
  const terminalRunId=run&&['completed','failed'].includes(run.phase)?run.runId:undefined;
  useEffect(()=>{
    if(!terminalRunId||!foreground||entrySource.kind!=='real')return;
    let stopped=false,attempts=0;
    let retryTimer:ReturnType<typeof setTimeout>|undefined;
    const fetchRewards=async()=>{
      attempts++;
      let ready=false;
      try{
        const items=await coopClient.rewards(terminalRunId);
        if(stopped||activeRunId.current!==terminalRunId)return;
        setRewards(items);
        ready=items.length>0;
      }catch{/* A newly finished run may not have its reward projection ready yet. */}
      finally{
        if(!stopped&&!ready&&attempts<3)retryTimer=setTimeout(()=>void fetchRewards(),attempts===1?5_000:15_000);
      }
    };
    void fetchRewards();
    return()=>{stopped=true;if(retryTimer!==undefined)clearTimeout(retryTimer);};
  },[terminalRunId,foreground,entrySource.kind]);
  useEffect(()=>{if(!showLive&&!showLoadouts&&!selected&&!selectedEvent&&!run&&!eventRun)return;const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(showLive){onClose();return true}if(eventRun){setEventRun(undefined);return true}if(run){setRun(undefined);return true}if(showLoadouts){setShowLoadouts(false);setNotice('');return true}if(selectedEvent){setSelectedEvent(undefined);setNotice('');return true}if(selected){setSelected(undefined);setNotice('');return true}return false});return()=>subscription.remove()},[showLive,showLoadouts,selected,selectedEvent,run,eventRun,onClose]);
  const cachedDungeons=cachedBrowse&&cachedBrowse.characterId===characterId?cachedBrowse.dungeons:undefined;
  const dungeons=useMemo(()=>(entry?.dungeons??cachedDungeons??[]).map(presentCoopDungeon),[entry,cachedDungeons]);
  useEffect(()=>{
    if(!entry)return;
    // A cached detail card must reflect the fresh server catalog once loaded.
    setSelected(previous=>previous?dungeons.find(item=>item.id===previous.id):undefined);
  },[entry,dungeons]);
  const activeEventExpeditions=useMemo(()=>(entry?.eventExpeditions??[]).filter(expedition=>expedition.status==='available'),[entry]);
  useEffect(()=>{
    if(initialDungeonHandled.current||!initialDungeonId||(!entry&&!cachedDungeons?.length))return;
    initialDungeonHandled.current=true;onInitialDungeonHandled?.();
    const dungeon=dungeons.find(item=>item.id===initialDungeonId);
    if(dungeon){setSelectedEvent(undefined);setEventRun(undefined);setRun(undefined);setSelected(dungeon);setTier(dungeon.difficulties[0]);setShowLoadouts(false);setNotice('');return;}
    setNotice(st("That dungeon source is not currently available in the dungeon catalog."));
  },[dungeons,entry,cachedDungeons,initialDungeonId,onInitialDungeonHandled]);
  const verifiedLoadout=()=>entry?.loadouts.find(item=>item.id==='current'&&item.status==='verified'&&item.ready)??entry?.loadouts.find(item=>item.status==='verified'&&item.ready);
  const startWithLoadout=(intent:CoopLoadoutIntent)=>void action(async()=>{
    if(entrySource.kind!=='real'){setNotice(clt(language,'intentOnly'));return;}
    if(intent.mode==='live'){
      if(!coopLiveReadyEnabled)throw new Error(st("Live matchmaking is not enabled yet."));
      await coopClient.joinLive({requestId:coopRequestId(),dungeonId:intent.dungeonId,tier:intent.tier,characterId:intent.characterId,loadoutId:intent.loadoutId,loadoutRevision:intent.loadoutRevision});
      setShowLive(true);return;
    }
    const started=await realCoopQModeSource.start(intent,coopRequestId());setLastQModeIntent(intent);setRun(started.run);
  });
  const continueDungeon=(resolvedTier:CoopTier)=>{
    if(!entry&&entrySource.kind==='real'){
      setNotice(ct(language,'browse.loading'));
      void load(true);
      return;
    }
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
  // A repeat run is a fresh server-validated start, never a replay of results.
  // Quick Match seeks a new roster. Same-party rematches use the separate
  // unanimous server-authorized ready check after rewards are claimed.
  const queueAgainAction=run?.mode==='qmode'&&lastQModeIntent?{
    label:st("Run again"),
    onPress:()=>void action(async()=>{
      const started=await realCoopQModeSource.start(lastQModeIntent,coopRequestId());
      setRewards([]);setChatMessages([]);setRun(started.run);await load();
    }),
  }:run?.mode==='live'&&coopLiveReadyEnabled&&verifiedLoadout()?{
    label:st("Find new Live party"),
    onPress:()=>void action(async()=>{
      const loadout=verifiedLoadout();
      if(!loadout)throw new Error(st("A verified Live-ready loadout is required."));
      await coopClient.quickLive({requestId:coopRequestId(),characterId:loadout.characterId,loadoutId:loadout.id,loadoutRevision:loadout.revision});
      setRewards([]);setChatMessages([]);setRun(undefined);setShowLive(true);await load();
    }),
  }:undefined;
  const liveTools=coopLiveReadyEnabled&&entrySource.kind==='real'?<CoopLiveRecruitmentBoard showQuickMatch={false} posts={recruitmentWithIcons} dungeons={dungeons} nowMs={entry?.serverNow??Date.now()} busy={busy} notice={notice}
    onQuickMatch={quickLiveMatch}
    onJoin={joinRecruitmentSearch}
    onPublish={(dungeonId,note)=>action(async()=>{await coopClient.publishLiveRecruitment({requestId:coopRequestId(),dungeonId,note});await refreshLiveRecruitment();setNotice(st("Live LFG posted for 30 minutes."));})}
    onCloseMine={()=>void action(async()=>{await coopClient.closeLiveRecruitment();await refreshLiveRecruitment();setNotice(st("Live LFG removed."));})}
    onRefresh={()=>action(refreshLiveRecruitment)}/>:undefined;
  if(showLive)return <CoopLiveLobby dungeons={dungeons} setupState={state} selfPortrait={state.character?profileIconSource(state.character.profileIconId,state.character.classId):undefined} onBack={()=>setShowLive(false)} onRunReady={runId=>{setShowLive(false);void action(async()=>{const projection=await coopClient.run(runId);if(!('team' in projection))throw new Error(st("Invalid Live run response."));acceptRun(projection);});}}/>;
  if(eventRun){
    const view=runWithIcons!,marks=eventRun.settlement.rewardMarks??0;
    return <View style={{flex:1}}>{retry}<CoopRunOverview language={language} run={view} seasonal eventName={eventRun.eventName} notice={notice} syncError={syncError} busy={busy} reduceMotion={state.settings.reduceMotion} onBack={()=>{setEventRun(undefined);void load();}} onRefresh={()=>action(async()=>{await refreshEventRun(eventRun.runId);setSyncError('')})} onChoose={nodeId=>void action(async()=>{if(!eventRun.decisionId||eventRun.decisionRevision===undefined)throw new Error(st("Refresh this run before choosing."));acceptEventRun(await coopClient.chooseEvent(eventRun.runId,{requestId:coopRequestId(),decisionId:eventRun.decisionId,decisionRevision:eventRun.decisionRevision,optionId:nodeId}));})} terminalAction={eventRun.phase==='completed'?{label:st('Collect {marks} event currency',{marks}),claimed:eventRun.settlement.status==='claimed',completeText:st('{marks} event currency collected.',{marks}),onPress:()=>void action(async()=>{acceptEventRun(await coopClient.claimEvent(eventRun.runId));setNotice(st('{marks} event currency and reputation collected.',{marks}));await onRewardsChanged?.();})}:undefined}/></View>;
  }
  if(run)return <View style={{flex:1}}>{retry}<CoopRunOverview language={language} run={runWithIcons!} myVotedNodeId={myLiveVote?.runId===run.runId&&myLiveVote.decisionId===run.decisionId?myLiveVote.optionId:undefined} selfVoter={state.character?{name:state.character.name,profileIconId:state.character.profileIconId,className:state.character.classId}:undefined} notice={notice} syncError={syncError} busy={busy} rewards={rewards} chatMessages={chatMessages} onChatSend={run.mode==='live'?async text=>{const response=await coopClient.chat(run.runId,text);setChatMessages(response.messages);}:undefined} reduceMotion={state.settings.reduceMotion} onBack={()=>{setRun(undefined);setChatMessages([]);setRewards([]);void load();}} onRefresh={()=>action(async()=>{await refreshRun(run.runId);if(run.mode==='live'){const chat=await coopClient.partyChat(run.runId);if(activeRunId.current===run.runId)setChatMessages(chat.messages);}if(['completed','failed'].includes(run.phase)){const items=await coopClient.rewards(run.runId);if(activeRunId.current===run.runId)setRewards(items);}setSyncError('')})} onChoose={(nodeId,boonId)=>void action(async()=>{if(!run.decisionId||run.decisionRevision===undefined)throw new Error(st("Refresh this run before choosing."));const body={requestId:coopRequestId(),decisionId:run.decisionId,decisionRevision:run.decisionRevision,optionId:nodeId,...(boonId?{boonId}:{})};const voting=run.mode==='live'&&run.options.length>1;const result=voting?await coopClient.vote(run.runId,body):await coopClient.choose(run.runId,body);if(voting)setMyLiveVote({runId:run.runId,decisionId:run.decisionId,optionId:nodeId});acceptRun(result);})} dungeonTonic={entrySource.kind==='real'?dungeonTonicView(run,state):undefined} onPrepareTonic={entrySource.kind==='real'?potionId=>void action(async()=>{
     acceptRun(await coopClient.prepareTonic(run.runId,potionId));
     await onRewardsChanged?.();
    }):undefined} healingPotion={entrySource.kind==='real'?dungeonHealingPotionView(run,state):undefined} onUseHealingPotion={entrySource.kind==='real'?()=>void action(async()=>{
     acceptRun(await coopClient.useHealingPotion(run.runId));
     await onRewardsChanged?.();
    }):undefined} onPurchaseMerchant={offerId=>void action(async()=>{
      if(run.mode!=='qmode'||run.stateVersion===undefined)throw new Error(st('Refresh this run before choosing.'));
      acceptRun(await coopClient.purchaseMerchant(run.runId,{requestId:coopRequestId(),expectedVersion:run.stateVersion,offerId}));
     })} onQueueAgain={queueAgainAction} onPartyRematch={run.mode==='live'&&coopLiveReadyEnabled?()=>{setRematchState(undefined);setRematchError('');rematchEntered.current=undefined;setRematchOpen(true);}:undefined} onClaim={id=>action(async()=>{const reward=await coopClient.claim(id);setNotice(reward.live_fellowship_bonus?st('{marks} Expedition Marks collected. Includes +{bonus} Live Fellowship bonus.',{marks:reward.marks,bonus:reward.live_fellowship_bonus}):st('{marks} Expedition Marks collected.',{marks:reward.marks}));await onRewardsChanged?.();await refreshRun(run.runId);const latestRewards=await coopClient.rewards(run.runId);if(activeRunId.current===run.runId)setRewards(latestRewards);await load();})}/><CoopLiveRematchPanel visible={rematchOpen} run={runWithIcons!} status={rematchState} busy={rematchBusy} error={rematchError}
    onReady={()=>respondRematch(true)} onDecline={()=>respondRematch(false)} onClose={()=>setRematchOpen(false)}
    onEnter={()=>{if(rematchState?.runId)void enterRematch(rematchState.runId).catch(error=>setRematchError(error instanceof Error?error.message:String(error)));}}
   /></View>;
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
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showEchoSharing}} accessibilityLabel={st("Echo sharing")} accessibilityHint={st("Sharing an Echo lets other players recruit a snapshot of your character for 7 days.")} onPress={()=>setShowEchoSharing(value=>!value)} style={{paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <View style={{flex:1}}><Text style={{color:C.text,fontWeight:'700'}}>{st("My Echo · Current equipment")}</Text><Text numberOfLines={2} style={{color:C.muted}}>{entry.echoSharing?st("Your character Echo is shared with other adventurers."):st("Prepare a snapshot of your current dungeon loadout for other players.")}</Text></View>
        <Text style={{color:C.muted,marginLeft:8}}>{showEchoSharing?'−':'+'}</Text>
      </Pressable>
      {showEchoSharing&&<View style={{gap:8,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2}}>
        <Text style={{color:C.text,fontWeight:'700'}}>{echoLoadout?st('{name} · Level {level}',{name:echoLoadout.className,level:echoLoadout.level}):st("Current character")}</Text>
        <Text style={{color:C.muted,fontSize:12}}>{echoLoadout?st("Role: {role} · {count} equipped items",{role:echoLoadout.role,count:echoLoadout.equipment.length}):st("No loadout verified yet.")}</Text>
        <Text style={{color:echoReady?C.good:C.warning,fontSize:12,fontWeight:'700'}}>{entry.echoSharing?st("SHARED"):echoReady?st("READY TO SHARE"):st("NOT READY")}</Text>
        {!echoReady&&<Text style={{color:C.muted,fontSize:12}}>{state.character&&state.character.level<15?st("Echo sharing unlocks at character level 15."):st("Your current co-op equipment must pass the readiness check.")}</Text>}
        <Text style={{color:C.muted,fontSize:12,lineHeight:17}}>{st("Your Echo is a frozen copy of your current class, equipment and combat abilities. It remains available for up to 7 days. Changing your gear does not automatically update an existing Echo.")}</Text>
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

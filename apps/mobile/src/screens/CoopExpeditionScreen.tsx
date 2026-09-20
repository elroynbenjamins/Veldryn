import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {BackHandler,View,Text} from 'react-native';
import {CoopDungeonDetails,CoopDungeonList} from '../components/coop/CoopDungeonBrowser';
import {CoopLoadoutSelection} from '../components/coop/CoopLoadoutSelection';
import {CoopRunOverview} from '../components/coop/CoopRunOverview';
import {CoopLiveLobby} from '../components/coop/CoopLiveLobby';
import {presentCoopDungeon,validateCoopDungeonView,type CoopDungeonView,type CoopTier} from '../core/coop-dungeon-browsing';
import type {CoopMode,CoopRunView} from '../core/coop-presentation';
import type {Language} from '../i18n';
import {coopClient,coopLiveReadyEnabled,coopRequestId,type CoopEntryData} from '../online/coop-client';
import {presentQModeRun,type CoopQModeServerProjection} from '../core/coop-qmode';
import {realCoopQModeSource} from '../online/coop-qmode-source';
import {supabase} from '../online/supabase';
import {GameButton} from '../components/GameButton';
import {C} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
import {realCoopEntrySource,type CoopEntrySource} from '../online/coop-entry-source';
import type {GameState} from '../core/types';
import {clt} from '../i18n';
import {validateCoopEventExpeditionPreview} from '../core/coop-event-expeditions';

export function CoopExpeditionScreen({onClose,language,state,entrySource=realCoopEntrySource}:{onClose:()=>void;language:Language;state:GameState;entrySource?:CoopEntrySource}){
  const {colors:C}=useTheme();
  const [entry,setEntry]=useState<CoopEntryData>();
  const [selected,setSelected]=useState<CoopDungeonView>();
  const [mode,setMode]=useState<CoopMode>('qmode');
  const [tier,setTier]=useState<CoopTier>();
  const [run,setRun]=useState<CoopRunView>();
  const [showLive,setShowLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [showLoadouts,setShowLoadouts]=useState(false);
  const [busy,setBusy]=useState(false),[pending,setPending]=useState(false);
  const activeRunId=useRef<string|undefined>(undefined);activeRunId.current=run?.runId;
  const [rewards,setRewards]=useState<Array<{id:string;claimed_at:string|null;reward_json:{marks?:number}}>>([]);
  const acceptRun=useCallback((projection:CoopQModeServerProjection)=>{const next=presentQModeRun(projection);setRun(current=>current&&current.runId===next.runId&&(current.stateVersion??0)>(next.stateVersion??0)?current:next);},[]);
  const refreshRun=useCallback(async(runId:string)=>{
    const value=await coopClient.run(runId);if(!('team' in value))throw new Error('Invalid run response.');
    if(activeRunId.current!==runId)return;
    const next=presentQModeRun(value);setRun(current=>current?.runId===runId&&(current.stateVersion??0)<=(next.stateVersion??0)?next:current);
    if(['completed','failed'].includes(next.phase)){const items=await coopClient.rewards(runId);if(activeRunId.current===runId)setRewards(items);}
  },[]);
  const action=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setNotice('');try{await work();}catch(reason){setNotice(reason instanceof Error?reason.message:String(reason));}finally{setBusy(false);if(entrySource.kind==='real')setPending(await coopClient.hasPending().catch(()=>false));}};
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{const next=await entrySource.load();next.dungeons.forEach(source=>validateCoopDungeonView(presentCoopDungeon(source)));next.eventExpeditions?.forEach(validateCoopEventExpeditionPreview);setEntry(next)}catch(reason){setEntry(undefined);setError(reason instanceof Error?reason.message:String(reason))}finally{setLoading(false)}
  },[entrySource]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{let cancelled=false;if(coopLiveReadyEnabled&&entrySource.kind==='real')void coopClient.liveQueue().then(value=>{if(!cancelled&&value.ticket&&['queued','reserved'].includes(value.ticket.status))setShowLive(true);}).catch(()=>{});return()=>{cancelled=true;};},[entrySource]);
  useEffect(()=>{if(entrySource.kind==='real')void coopClient.hasPending().then(setPending).catch(()=>{});},[entrySource]);
  useEffect(()=>{
    const id=run?.runId;if(!id||entrySource.kind!=='real')return;
    let stopped=false,inFlight=false;
    const update=async()=>{if(stopped||inFlight)return;inFlight=true;try{await refreshRun(id);}catch(reason){if(!stopped)setNotice(reason instanceof Error?reason.message:String(reason));}finally{inFlight=false;}};
    void update();const timer=setInterval(()=>void update(),2500);
    const channel=supabase?.channel('coop-snapshot-'+id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'coop_run_client_snapshots',filter:'run_id=eq.'+id},()=>void update()).subscribe();
    return()=>{stopped=true;clearInterval(timer);if(channel)void supabase?.removeChannel(channel);};
  },[run?.runId,entrySource.kind,refreshRun]);
  useEffect(()=>{if(!showLive&&!showLoadouts&&!selected&&!run)return;const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(showLive){onClose();return true}if(run){setRun(undefined);return true}if(showLoadouts){setShowLoadouts(false);setNotice('');return true}if(selected){setSelected(undefined);setNotice('');return true}return false});return()=>subscription.remove()},[showLive,showLoadouts,selected,run,onClose]);
  const dungeons=useMemo(()=>(entry?.dungeons??[]).map(presentCoopDungeon),[entry]);
  function chooseDungeon(dungeon:CoopDungeonView){setSelected(dungeon);setTier(dungeon.difficulties[0]);setNotice('')}
  const retry=pending?<GameButton title="Retry pending co-op action" disabled={busy} onPress={()=>void action(async()=>{const value=await coopClient.retryPending();if(value&&typeof value==='object'&&'team' in value)acceptRun(value as CoopQModeServerProjection);await load();})}/>:null;
  if(showLive)return <CoopLiveLobby onBack={onClose}/>;
  if(run)return <View style={{flex:1}}>{retry}<CoopRunOverview language={language} run={run} notice={notice} busy={busy} rewards={rewards} onBack={()=>{setRun(undefined);setRewards([]);void load();}} onRefresh={()=>void action(()=>refreshRun(run.runId))} onChoose={nodeId=>void action(async()=>{if(!run.decisionId||!run.decisionRevision)throw new Error('Refresh this run before choosing.');acceptRun(await coopClient.choose(run.runId,{requestId:coopRequestId(),decisionId:run.decisionId,decisionRevision:run.decisionRevision,optionId:nodeId}));})} onClaim={id=>void action(async()=>{const reward=await coopClient.claim(id);setNotice(`${reward.marks} Expedition Marks collected.`);await refreshRun(run.runId);})}/></View>;
  if(selected&&showLoadouts&&tier&&state.character)return <View style={{flex:1}}>{retry}<CoopLoadoutSelection state={state} language={language} dungeonId={selected.id} dungeonName={selected.name} tier={tier} mode={mode} loadouts={entry?.loadouts??[]} notice={notice} refreshing={loading||busy} onBack={()=>{setShowLoadouts(false);setNotice('')}} onRefresh={()=>void load()} onIntent={intent=>void action(async()=>{if(entrySource.kind!=='real'){setNotice(clt(language,'intentOnly'));return;}if(intent.mode==='live'){if(!coopLiveReadyEnabled)throw new Error('Live matchmaking is not enabled yet.');await coopClient.joinLive({requestId:coopRequestId(),dungeonId:intent.dungeonId,tier:intent.tier,characterId:intent.characterId,loadoutId:intent.loadoutId,loadoutRevision:intent.loadoutRevision});setShowLive(true);return;}const started=await realCoopQModeSource.start(intent,coopRequestId());setRun(started.run);})}/></View>;
  if(selected)return <CoopDungeonDetails language={language} dungeon={selected} currentLevel={state.character?.level??0} mode={mode} tier={tier} notice={notice} onBack={()=>{setSelected(undefined);setNotice('')}} onMode={next=>{setMode(next);setNotice('')}} onTier={next=>{setTier(next);setNotice('')}} onContinue={()=>setShowLoadouts(true)}/>;
  return <View style={{flex:1}}>{retry}{entrySource.kind==='real'&&entry?.gameVersion&&<View style={{padding:12}}><Text style={{color:C.muted}}>Sharing an Echo lets other players recruit a snapshot of your character for 24 hours.</Text><GameButton title={entry.echoSharing?'Stop sharing my Echo':'Share my Echo'} disabled={busy} onPress={()=>void action(async()=>{await coopClient.shareEcho(entry.gameVersion!,!entry.echoSharing);await load();})}/>{!!notice&&<Text accessibilityRole="alert" style={{color:C.warning}}>{notice}</Text>}</View>}<CoopDungeonList language={language} dungeons={dungeons} eventExpeditions={entry?.eventExpeditions??[]} loading={loading} error={error} activeRun={entry?.activeRun} onBack={onClose} onRetry={()=>void load()} onSelect={chooseDungeon} onResume={()=>{if(entry?.activeRun)setRun(entry.activeRun)}}/></View>;
}

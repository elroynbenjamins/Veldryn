import {useCallback,useEffect,useMemo,useState} from 'react';
import {BackHandler} from 'react-native';
import {CoopDungeonDetails,CoopDungeonList} from '../components/coop/CoopDungeonBrowser';
import {CoopLoadoutSelection} from '../components/coop/CoopLoadoutSelection';
import {CoopRunOverview} from '../components/coop/CoopRunOverview';
import {presentCoopDungeon,validateCoopDungeonView,type CoopDungeonView,type CoopTier} from '../core/coop-dungeon-browsing';
import type {CoopMode,CoopRunView} from '../core/coop-presentation';
import type {Language} from '../i18n';
import type {CoopEntryData} from '../online/coop-client';
import {realCoopEntrySource,type CoopEntrySource} from '../online/coop-entry-source';
import type {GameState} from '../core/types';
import {clt} from '../i18n';
import {validateCoopEventExpeditionPreview} from '../core/coop-event-expeditions';

export function CoopExpeditionScreen({onClose,language,state,entrySource=realCoopEntrySource}:{onClose:()=>void;language:Language;state:GameState;entrySource?:CoopEntrySource}){
  const [entry,setEntry]=useState<CoopEntryData>();
  const [selected,setSelected]=useState<CoopDungeonView>();
  const [mode,setMode]=useState<CoopMode>('qmode');
  const [tier,setTier]=useState<CoopTier>();
  const [run,setRun]=useState<CoopRunView>();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [showLoadouts,setShowLoadouts]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{const next=await entrySource.load();next.dungeons.forEach(source=>validateCoopDungeonView(presentCoopDungeon(source)));next.eventExpeditions?.forEach(validateCoopEventExpeditionPreview);setEntry(next)}catch(reason){setEntry(undefined);setError(reason instanceof Error?reason.message:String(reason))}finally{setLoading(false)}
  },[entrySource]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{if(!showLoadouts&&!selected&&!run)return;const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(run){setRun(undefined);return true}if(showLoadouts){setShowLoadouts(false);setNotice('');return true}if(selected){setSelected(undefined);setNotice('');return true}return false});return()=>subscription.remove()},[showLoadouts,selected,run]);
  const dungeons=useMemo(()=>(entry?.dungeons??[]).map(presentCoopDungeon),[entry]);
  function chooseDungeon(dungeon:CoopDungeonView){setSelected(dungeon);setTier(dungeon.difficulties[0]);setNotice('')}
  if(run)return <CoopRunOverview language={language} run={run} onBack={()=>setRun(undefined)}/>;
  if(selected&&showLoadouts&&tier&&state.character)return <CoopLoadoutSelection state={state} language={language} dungeonId={selected.id} dungeonName={selected.name} tier={tier} mode={mode} loadouts={entry?.loadouts??[]} notice={notice} refreshing={loading} onBack={()=>{setShowLoadouts(false);setNotice('')}} onRefresh={()=>void load()} onIntent={()=>setNotice(clt(language,'intentOnly'))}/>;
  if(selected)return <CoopDungeonDetails language={language} dungeon={selected} currentLevel={state.character?.level??0} mode={mode} tier={tier} notice={notice} onBack={()=>{setSelected(undefined);setNotice('')}} onMode={next=>{setMode(next);setNotice('')}} onTier={next=>{setTier(next);setNotice('')}} onContinue={()=>setShowLoadouts(true)}/>;
  return <CoopDungeonList language={language} dungeons={dungeons} eventExpeditions={entry?.eventExpeditions??[]} loading={loading} error={error} activeRun={entry?.activeRun} onBack={onClose} onRetry={()=>void load()} onSelect={chooseDungeon} onResume={()=>{if(entry?.activeRun)setRun(entry.activeRun)}}/>;
}

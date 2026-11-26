import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AppState,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useSocialText} from '../i18n/social';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {LoadingState} from './LoadingState';
import {GuildPveEncounterCard} from './GuildRaidEncounter';
export {GuildPveEncounterCard} from './GuildRaidEncounter';
import {onlineConfigured} from '../online/supabase';
import {attemptGuildPve,guildPveAttemptKey,claimGuildPve,guildPveTreasury} from '../online/social';
import {invalidateGuildPveBoard,loadGuildPveBoard} from '../online/guild-pve-read';
import {guildEventBossSections,guildWeeklyBossSections,guildPveView,guildRaidEncountersForTab,type GuildBossTab,type GuildPveEncounter} from '../core/guild-pve-encounters';
import type {GameState} from '../core/types';
import {eventLifecycle} from '../core/live-events';
import {RaidAttemptRetryKeys,reconcileRaidRow,validRaidStartReceipt,type RaidStartReceipt} from '../core/guild-raid-recovery';
const sharedRetryKeys=new RaidAttemptRetryKeys(guildPveAttemptKey);

export function OnlineGuildPve({state,numberMode='abbreviated',authoritative=false,initialEncounterKind='weekly',onCombat,onRewardsChanged,headerHelp,raidScope}:{raidScope?:string;state?:GameState;numberMode?:'abbreviated'|'exact';authoritative?:boolean;initialEncounterKind?:GuildBossTab;onCombat?:()=>void;onRewardsChanged?:()=>void|Promise<unknown>;headerHelp?:ReactNode}){
 const st=useSocialText(),C=useGameTheme(),language=useGameLanguage();const [rows,setRows]=useState<GuildPveEncounter[]>([]),[treasury,setTreasury]=useState<{gold:number;materials:Record<string,number>;guildXp:number}|null>(null),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[manualRefreshing,setManualRefreshing]=useState(false),[error,setError]=useState(''),[encounterKind,setEncounterKind]=useState<GuildBossTab>(initialEncounterKind),[clockNow,setClockNow]=useState(Date.now());const treasuryLastRead=useRef(0),treasuryRead=useRef<Promise<void>|null>(null),pending=useRef(false),reading=useRef(false),revision=useRef(0),mounted=useRef(true),queuedForce=useRef(false),localRetryKeys=useRef(new RaidAttemptRetryKeys(guildPveAttemptKey)),confirmedStarts=useRef<Record<string,RaidStartReceipt>>({}),confirmedClaims=useRef<Record<string,number[]>>({});
 const retryKeys=raidScope?sharedRetryKeys:localRetryKeys.current,scope=raidScope??'local';
 // Confirmed receipts protect against a stale board following a successful write.
 const applyBoard=(next:GuildPveEncounter[])=>{const reconciled=next.map(row=>{retryKeys.observe(scope,row);const result=reconcileRaidRow(row,confirmedStarts.current[row.id],confirmedClaims.current[row.id]??[]);if(!result.startPending)delete confirmedStarts.current[row.id];if(!result.claimsPending)delete confirmedClaims.current[row.id];return result.row});setRows(reconciled);setLoaded(true);setError('')};
 const refreshTreasury=async(expected=revision.current,force=false)=>{if(treasuryRead.current){if(!force)return;await treasuryRead.current;if(!mounted.current||expected!==revision.current)return;}if(!force&&Date.now()-treasuryLastRead.current<60000)return;const work=(async()=>{try{const next=await guildPveTreasury();if(mounted.current&&expected===revision.current){setTreasury(next);treasuryLastRead.current=Date.now()}}catch{/* retain last confirmed treasury */}})();treasuryRead.current=work;try{await work}finally{if(treasuryRead.current===work)treasuryRead.current=null}};
 const load=async(force=false)=>{if(!mounted.current||!onlineConfigured||!authoritative)return;if(pending.current||reading.current){if(force)queuedForce.current=true;return;}queuedForce.current=false;reading.current=true;const expected=revision.current;try{const next=await loadGuildPveBoard(force,state?.character?.id);if(mounted.current&&expected===revision.current){applyBoard(next);if(next.length)void refreshTreasury(expected);else {setTreasury(null);treasuryLastRead.current=0}}}catch{if(mounted.current&&expected===revision.current){setLoaded(true);setError(st('Guild PvE is unavailable. Please try again.'))}}finally{reading.current=false;if(queuedForce.current&&!pending.current&&mounted.current&&AppState.currentState==='active')void load(true)}};
 useEffect(()=>{mounted.current=true;if(AppState.currentState!=='background')void load();const subscription=AppState.addEventListener('change',status=>{if(status==='active'){setClockNow(Date.now());void load(true)}});const timer=setInterval(()=>{if(AppState.currentState==='active')void load()},60000);return()=>{mounted.current=false;revision.current++;queuedForce.current=false;subscription.remove();clearInterval(timer)}},[authoritative]);
 useEffect(()=>{const timer=setInterval(()=>{if(AppState.currentState==='active')setClockNow(Date.now())},30000);return()=>clearInterval(timer)},[]);
 const claim=async(id:string,percent:number)=>{if(pending.current||!mounted.current)return;pending.current=true;revision.current++;setBusy(true);let confirmed=false;try{await claimGuildPve(id,percent);confirmed=true;confirmedClaims.current[id]=[...(confirmedClaims.current[id]??[]),percent];if(mounted.current){setRows(previous=>previous.map(row=>row.id===id?reconcileRaidRow(row,undefined,[percent]).row:row));setError('')}invalidateGuildPveBoard();if(mounted.current)void Promise.resolve().then(()=>onRewardsChanged?.()).catch(()=>{})}catch{if(mounted.current)setError(st('Unable to claim. Refresh and try again.'))}finally{pending.current=false;if(mounted.current){setBusy(false);if(confirmed){void load(true);void refreshTreasury(revision.current,true)}else if(queuedForce.current)void load(true)}}};
 const attempt=async(id:string)=>{if(pending.current||!mounted.current)return;const row=rows.find(candidate=>candidate.id===id);if(!row||!guildPveView(row,Date.now()).canContribute)return;pending.current=true;revision.current++;setBusy(true);const key=retryKeys.get(scope,row);let confirmed=false;try{const receipt=await attemptGuildPve(id,key);if(!validRaidStartReceipt(receipt))throw new Error('Invalid raid start receipt');retryKeys.confirm(scope,id,key);confirmed=true;confirmedStarts.current[id]=receipt;if(mounted.current){setRows(previous=>previous.map(row=>row.id===id?reconcileRaidRow(row,receipt,[]).row:row));setError('')}invalidateGuildPveBoard();if(mounted.current)void Promise.resolve().then(()=>onRewardsChanged?.()).catch(()=>{})}catch{if(mounted.current)setError(st('Guild PvE is unavailable. Please try again.'))}finally{pending.current=false;if(mounted.current){setBusy(false);if(confirmed||queuedForce.current)void load(true)}}};
 // The board owns settlement polling, including while the theater is open.
 const nextResolution=rows.filter(row=>(row.pendingAttempts??0)>0&&row.nextAttemptResolvesAt).map(row=>Date.parse(row.nextAttemptResolvesAt!)).filter(Number.isFinite).sort((a,b)=>a-b)[0];
 useEffect(()=>{if(nextResolution===undefined)return;let retry:ReturnType<typeof setInterval>|undefined;const refresh=()=>{if(AppState.currentState==='active')void load(true)};const timeout=setTimeout(()=>{refresh();retry=setInterval(refresh,12000)},Math.max(0,nextResolution-Date.now()));return()=>{clearTimeout(timeout);if(retry)clearInterval(retry)}},[nextResolution,authoritative]);
 const manualRefresh=async()=>{if(reading.current||pending.current)return;setManualRefreshing(true);try{await load(true)}finally{if(mounted.current)setManualRefreshing(false)}};
 const {active:eventBosses,rewards:expiredEventRewards}=guildEventBossSections(rows,clockNow);
 const {rewards:expiredWeeklyRewards}=guildWeeklyBossSections(rows,clockNow);
 const visibleEncounters=guildRaidEncountersForTab(rows,encounterKind,clockNow);
 useEffect(()=>{if(encounterKind==='event'&&rows.length>0&&eventBosses.length===0)setEncounterKind('weekly')},[encounterKind,rows.length,eventBosses.length]);
 const guildRewards=state?.character?eventLifecycle(state)?.definition.milestones(state.character.classId).filter(entry=>entry.reward.kind.startsWith('guild_')).map(entry=>entry.reward)??[]:[];
 if(!onlineConfigured||!authoritative)return <Panel><Text style={{color:C.text,fontSize:18,fontWeight:'800'}}>{st('Guild PvE')}</Text><Text style={{color:C.muted,lineHeight:21}}>{st('Connect to your online guild to fight shared bosses and claim rewards.')}</Text></Panel>;
 return <View style={{gap:12}}>{!rows.length&&headerHelp?<View style={{alignItems:'flex-end'}}>{headerHelp}</View>:null}{error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}{!rows.length&&!error?(!loaded?<LoadingState compact label={st('Loading Guild PvE…')}/>:<Panel><Text style={{color:C.muted}}>{st('Join a guild to unlock shared encounters.')}</Text></Panel>):null}{rows.length>0?<View style={{gap:12}}><View><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Text accessibilityRole="header" style={{flex:1,color:C.text,fontSize:26,fontWeight:'800'}}>{st('The Raid Gate')}</Text>{headerHelp}</View>{treasury?<Text style={{color:C.accent,lineHeight:20,fontWeight:'800'}}>{st('Guild Bank')} · {treasury.gold.toLocaleString(language)} {st('Gold')} · {Object.values(treasury.materials).reduce((sum,n)=>sum+n,0).toLocaleString(language)} {st('Materials')} · {treasury.guildXp.toLocaleString(language)} {st('Guild XP')}</Text>:null}</View><View style={{flexDirection:'row',gap:8}}>{(['weekly',...(eventBosses.length?['event']:[])] as GuildBossTab[]).map(kind=><View key={kind} style={{flex:1}}><GameButton compact tone="secondary" selected={encounterKind===kind} title={st(kind==='event'?'Event boss':'Weekly boss')} onPress={()=>setEncounterKind(kind)}/></View>)}</View></View>:null}{encounterKind==='weekly'&&expiredWeeklyRewards.length>0?<Panel>
 <Text accessibilityRole="header" style={{color:C.text,fontSize:17,fontWeight:'800'}}>{st('Previous weekly rewards')}</Text>
 <Text style={{color:C.muted,lineHeight:20}}>{st('This boss has rotated out. You can still claim earned milestones until the claim deadline.')}</Text>
 {expiredWeeklyRewards.map(row=><View key={row.id} style={{gap:8}}>
  <Text style={{color:C.text,fontWeight:'700'}}>{row.name} · {st('Claim by {date}',{date:new Date(row.claimEndsAt).toLocaleDateString(language)})}</Text>
  {guildPveView(row,clockNow).milestones.filter(m=>m.ready).map(m=><View key={m.percent} style={{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'space-between'}}>
   <Text style={{color:C.muted,flex:1}}>{st('{percent}% milestone unlocked',{percent:m.percent})}</Text>
   <GameButton compact title={st('Claim')} loading={busy} disabled={busy} onPress={()=>void claim(row.id,m.percent)}/>
  </View>)}
 </View>)}
</Panel>:null}{expiredEventRewards.length>0?<Panel>
 <Text accessibilityRole="header" style={{color:C.text,fontSize:17,fontWeight:'800'}}>{st('Unclaimed event rewards')}</Text>
 <Text style={{color:C.muted,lineHeight:20}}>{st('The event boss has ended. Earned rewards remain claimable until the deadline.')}</Text>
 {expiredEventRewards.map(row=><View key={row.id} style={{gap:8}}>
  <Text style={{color:C.text,fontWeight:'700'}}>{row.name} · {st('Claim by {date}',{date:new Date(row.claimEndsAt).toLocaleDateString(language)})}</Text>
  {guildPveView(row,clockNow).milestones.filter(m=>m.ready).map(m=><View key={m.percent} style={{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'space-between'}}>
   <Text style={{color:C.muted,flex:1}}>{st('{percent}% milestone unlocked',{percent:m.percent})}</Text>
   <GameButton compact title={st('Claim')} loading={busy} disabled={busy} onPress={()=>void claim(row.id,m.percent)}/>
  </View>)}
 </View>)}
</Panel>:null}{visibleEncounters.map(row=><GuildPveEncounterCard state={state} key={row.id} row={row} numberMode={numberMode} busy={busy} guildRewards={row.kind==='event'?guildRewards:[]} onClaim={percent=>claim(row.id,percent)} onAttempt={()=>attempt(row.id)} onCombat={onCombat} onRefresh={()=>load(true)}/>)}{rows.length>0&&encounterKind==='event'&&visibleEncounters.length===0?<Text style={{color:C.muted,lineHeight:20}}>{st('Event bosses appear here during active festivals.')}</Text>:null}<GameButton title={st('Refresh')} tone="secondary" loading={manualRefreshing} disabled={busy||manualRefreshing} onPress={()=>void manualRefresh()}/></View>;
}

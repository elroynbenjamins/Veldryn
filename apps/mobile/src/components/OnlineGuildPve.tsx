import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AppState,Text,View} from 'react-native';
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

export function OnlineGuildPve({state,numberMode='abbreviated',authoritative=false,initialEncounterKind='weekly',onCombat,onRewardsChanged,headerHelp}:{state?:GameState;numberMode?:'abbreviated'|'exact';authoritative?:boolean;initialEncounterKind?:GuildBossTab;onCombat?:()=>void;onRewardsChanged?:()=>void|Promise<unknown>;headerHelp?:ReactNode}){
 const st=useSocialText(),C=useGameTheme();const [rows,setRows]=useState<GuildPveEncounter[]>([]),[treasury,setTreasury]=useState<{gold:number;materials:Record<string,number>;guildXp:number}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[encounterKind,setEncounterKind]=useState<GuildBossTab>(initialEncounterKind),[clockNow,setClockNow]=useState(Date.now());const pending=useRef(false),mounted=useRef(true),attemptKeys=useRef<Record<string,string>>({});
 const refreshTreasury=async()=>{try{const next=await guildPveTreasury();if(mounted.current)setTreasury(next)}catch{if(mounted.current)setTreasury(null)}};
 const load=async(force=false)=>{if(!onlineConfigured||!authoritative||pending.current)return;pending.current=true;setBusy(true);try{const next=await loadGuildPveBoard(force);if(mounted.current){setRows(next);setError('')}void refreshTreasury()}catch{if(mounted.current)setError(st('Guild PvE is unavailable. Please try again.'))}finally{pending.current=false;if(mounted.current)setBusy(false)}};
 useEffect(()=>{mounted.current=true;if(AppState.currentState!=='background')void load();const subscription=AppState.addEventListener('change',status=>{if(status==='active')void load()});const timer=setInterval(()=>{if(AppState.currentState==='active')void load()},60000);return()=>{mounted.current=false;subscription.remove();clearInterval(timer)}},[authoritative]);
 useEffect(()=>{const timer=setInterval(()=>setClockNow(Date.now()),30000);return()=>clearInterval(timer)},[]);
 const claim=async(id:string,percent:number)=>{if(pending.current)return;pending.current=true;setBusy(true);try{await claimGuildPve(id,percent);invalidateGuildPveBoard();await onRewardsChanged?.();const next=await loadGuildPveBoard(true);if(mounted.current){setRows(next);setError('')}void refreshTreasury()}catch{if(mounted.current)setError(st('Unable to claim. Refresh and try again.'))}finally{pending.current=false;if(mounted.current)setBusy(false)}};
 const attempt=async(id:string)=>{if(pending.current)return;pending.current=true;setBusy(true);const key=attemptKeys.current[id]??guildPveAttemptKey();attemptKeys.current[id]=key;try{await attemptGuildPve(id,key);delete attemptKeys.current[id];invalidateGuildPveBoard();await onRewardsChanged?.();const next=await loadGuildPveBoard(true);if(mounted.current){setRows(next);setError('')}}catch{if(mounted.current)setError(st('Guild PvE is unavailable. Please try again.'))}finally{pending.current=false;if(mounted.current)setBusy(false)}};
 const {active:eventBosses,rewards:expiredEventRewards}=guildEventBossSections(rows,clockNow);
 const {rewards:expiredWeeklyRewards}=guildWeeklyBossSections(rows,clockNow);
 const visibleEncounters=guildRaidEncountersForTab(rows,encounterKind,clockNow);
 useEffect(()=>{if(encounterKind==='event'&&rows.length>0&&eventBosses.length===0)setEncounterKind('weekly')},[encounterKind,rows.length,eventBosses.length]);
 const guildRewards=state?.character?eventLifecycle(state)?.definition.milestones(state.character.classId).filter(entry=>entry.reward.kind.startsWith('guild_')).map(entry=>entry.reward)??[]:[];
 if(!onlineConfigured||!authoritative)return <Panel><Text style={{color:C.text,fontSize:18,fontWeight:'800'}}>{st('Guild PvE')}</Text><Text style={{color:C.muted,lineHeight:21}}>{st('Connect to your online guild to fight shared bosses and claim rewards.')}</Text></Panel>;
 return <View style={{gap:12}}>{!rows.length&&headerHelp?<View style={{alignItems:'flex-end'}}>{headerHelp}</View>:null}{error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}{!rows.length&&!error?(busy?<LoadingState compact label={st('Loading Guild PvE…')}/>:<Panel><Text style={{color:C.muted}}>{st('Join a guild to unlock shared encounters.')}</Text></Panel>):null}{rows.length>0?<View style={{gap:12}}><View><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Text accessibilityRole="header" style={{flex:1,color:C.text,fontSize:26,fontWeight:'800'}}>{st('The Raid Gate')}</Text>{headerHelp}</View>{treasury?<Text style={{color:C.accent,lineHeight:20,fontWeight:'800'}}>Guild Bank · {treasury.gold.toLocaleString()} Gold · {Object.values(treasury.materials).reduce((sum,n)=>sum+n,0).toLocaleString()} materials · {treasury.guildXp.toLocaleString()} Guild XP</Text>:null}</View><View style={{flexDirection:'row',gap:8}}>{(['weekly',...(eventBosses.length?['event']:[])] as GuildBossTab[]).map(kind=><View key={kind} style={{flex:1}}><GameButton compact tone="secondary" selected={encounterKind===kind} title={st(kind==='event'?'Event boss':'Weekly boss')} onPress={()=>setEncounterKind(kind)}/></View>)}</View></View>:null}{encounterKind==='weekly'&&expiredWeeklyRewards.length>0?<Panel>
 <Text accessibilityRole="header" style={{color:C.text,fontSize:17,fontWeight:'800'}}>{st('Previous weekly rewards')}</Text>
 <Text style={{color:C.muted,lineHeight:20}}>{st('This boss has rotated out. You can still claim earned milestones until the claim deadline.')}</Text>
 {expiredWeeklyRewards.map(row=><View key={row.id} style={{gap:8}}>
  <Text style={{color:C.text,fontWeight:'700'}}>{row.name} · {st('Claim by {date}',{date:new Date(row.claimEndsAt).toLocaleDateString()})}</Text>
  {guildPveView(row,clockNow).milestones.filter(m=>m.ready).map(m=><View key={m.percent} style={{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'space-between'}}>
   <Text style={{color:C.muted,flex:1}}>{st('{percent}% milestone unlocked',{percent:m.percent})}</Text>
   <GameButton compact title={st('Claim')} loading={busy} disabled={busy} onPress={()=>void claim(row.id,m.percent)}/>
  </View>)}
 </View>)}
</Panel>:null}{expiredEventRewards.length>0?<Panel>
 <Text accessibilityRole="header" style={{color:C.text,fontSize:17,fontWeight:'800'}}>{st('Unclaimed event rewards')}</Text>
 <Text style={{color:C.muted,lineHeight:20}}>{st('The event boss has ended. Earned rewards remain claimable until the deadline.')}</Text>
 {expiredEventRewards.map(row=><View key={row.id} style={{gap:8}}>
  <Text style={{color:C.text,fontWeight:'700'}}>{row.name} · {st('Claim by {date}',{date:new Date(row.claimEndsAt).toLocaleDateString()})}</Text>
  {guildPveView(row,clockNow).milestones.filter(m=>m.ready).map(m=><View key={m.percent} style={{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'space-between'}}>
   <Text style={{color:C.muted,flex:1}}>{st('{percent}% milestone unlocked',{percent:m.percent})}</Text>
   <GameButton compact title={st('Claim')} loading={busy} disabled={busy} onPress={()=>void claim(row.id,m.percent)}/>
  </View>)}
 </View>)}
</Panel>:null}{visibleEncounters.map(row=><GuildPveEncounterCard state={state} key={row.id} row={row} numberMode={numberMode} busy={busy} guildRewards={row.kind==='event'?guildRewards:[]} onClaim={percent=>claim(row.id,percent)} onAttempt={()=>attempt(row.id)} onCombat={onCombat}/>)}{rows.length>0&&encounterKind==='event'&&visibleEncounters.length===0?<Text style={{color:C.muted,lineHeight:20}}>{st('Event bosses appear here during active festivals.')}</Text>:null}<GameButton title={st('Refresh')} tone="secondary" loading={busy} disabled={busy} onPress={()=>void load(true)}/></View>;
}

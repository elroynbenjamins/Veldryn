import {useEffect,useRef,useState} from 'react';
import {AppState,Text,View} from 'react-native';
import {useSocialText} from '../i18n/social';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {GuildPveEncounterCard} from './GuildRaidEncounter';
export {GuildPveEncounterCard} from './GuildRaidEncounter';
import {onlineConfigured} from '../online/supabase';
import {attemptGuildPve,guildPveAttemptKey,claimGuildPve} from '../online/social';
import {invalidateGuildPveBoard,loadGuildPveBoard} from '../online/guild-pve-read';
import {type GuildPveEncounter} from '../core/guild-pve-encounters';
import type {GameState} from '../core/types';
import {eventLifecycle} from '../core/live-events';

export function OnlineGuildPve({state,numberMode='abbreviated',authoritative=false,onCombat,onRewardsChanged}:{state?:GameState;numberMode?:'abbreviated'|'exact';authoritative?:boolean;onCombat?:()=>void;onRewardsChanged?:()=>void|Promise<unknown>}){
 const st=useSocialText(),C=useGameTheme();const [rows,setRows]=useState<GuildPveEncounter[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[encounterKind,setEncounterKind]=useState<'weekly'|'event'>('weekly');const pending=useRef(false),mounted=useRef(true),attemptKeys=useRef<Record<string,string>>({});
 const load=async(force=false)=>{if(!onlineConfigured||!authoritative||pending.current)return;pending.current=true;setBusy(true);try{const next=await loadGuildPveBoard(force);if(mounted.current){setRows(next);setError('')}}catch{if(mounted.current)setError(st('Guild PvE is unavailable. Please try again.'))}finally{pending.current=false;if(mounted.current)setBusy(false)}};
 useEffect(()=>{mounted.current=true;if(AppState.currentState!=='background')void load();const subscription=AppState.addEventListener('change',status=>{if(status==='active')void load()});const timer=setInterval(()=>{if(AppState.currentState==='active')void load()},60000);return()=>{mounted.current=false;subscription.remove();clearInterval(timer)}},[authoritative]);
 const claim=async(id:string,percent:number)=>{if(pending.current)return;pending.current=true;setBusy(true);try{await claimGuildPve(id,percent);await onRewardsChanged?.();invalidateGuildPveBoard();const next=await loadGuildPveBoard(true);if(mounted.current){setRows(next);setError('')}}catch{if(mounted.current)setError(st('Unable to claim. Refresh and try again.'))}finally{pending.current=false;if(mounted.current)setBusy(false)}};
 const attempt=async(id:string)=>{if(pending.current)return;pending.current=true;setBusy(true);const key=attemptKeys.current[id]??guildPveAttemptKey();attemptKeys.current[id]=key;try{await attemptGuildPve(id,key);delete attemptKeys.current[id];await onRewardsChanged?.();invalidateGuildPveBoard();const next=await loadGuildPveBoard(true);if(mounted.current){setRows(next);setError('')}}catch{if(mounted.current)setError(st('Guild PvE is unavailable. Please try again.'))}finally{pending.current=false;if(mounted.current)setBusy(false)}};
 const guildRewards=state?.character?eventLifecycle(state)?.definition.milestones(state.character.classId).filter(entry=>entry.reward.kind.startsWith('guild_')).map(entry=>entry.reward)??[]:[];
 if(!onlineConfigured||!authoritative)return <Panel><Text style={{color:C.text,fontSize:18,fontWeight:'800'}}>{st('Guild PvE')}</Text><Text style={{color:C.muted,lineHeight:21}}>{st('Connect to your online guild to fight shared bosses and claim rewards.')}</Text></Panel>;
 return <View style={{gap:12}}>{error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}{!rows.length&&!error?<Panel><Text style={{color:C.muted}}>{busy?st('Loading Guild PvE…'):st('Join a guild to unlock shared encounters.')}</Text></Panel>:null}{rows.length>0?<View style={{gap:12}}><View><Text accessibilityRole="header" style={{color:C.text,fontSize:26,fontWeight:'800'}}>{st('The Raid Gate')}</Text><Text style={{color:C.muted,lineHeight:20}}>{st('Choose your guild encounter.')}</Text></View><View style={{flexDirection:'row',gap:8}}>{(['weekly','event'] as const).map(kind=><View key={kind} style={{flex:1}}><GameButton compact tone="secondary" selected={encounterKind===kind} title={st(kind==='event'?'Event boss':'Weekly boss')} onPress={()=>setEncounterKind(kind)}/></View>)}</View></View>:null}{rows.filter(row=>row.kind===encounterKind).map(row=><GuildPveEncounterCard state={state} key={row.id} row={row} numberMode={numberMode} busy={busy} guildRewards={row.kind==='event'?guildRewards:[]} onClaim={percent=>claim(row.id,percent)} onAttempt={()=>attempt(row.id)} onCombat={onCombat}/>)}{rows.length>0&&encounterKind==='event'&&!rows.some(row=>row.kind==='event')?<Text style={{color:C.muted,lineHeight:20}}>{st('Event bosses appear here during active festivals.')}</Text>:null}<GameButton title={st('Refresh')} tone="secondary" loading={busy} disabled={busy} onPress={()=>void load(true)}/></View>;
}

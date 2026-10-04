import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {systemNotifications,type SystemNotice} from '../core/system-notifications';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatLog} from './ChatLog';
import {onlineConfigured} from '../online/supabase';
import {worldMilestoneFeedV43,type WorldMilestoneFeedRow} from '../online/world-milestones-v43';
import {navigationText} from '../i18n/navigation';
import {progressionText} from '../i18n/progression';
import type {Language} from '../i18n/languages';

export function SystemNoticeLog({state,now:providedNow,active=true}:{state:GameState;now?:number;active?:boolean}){
 const tr=(text:string)=>navigationText(state.settings.language,text);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[worldRows,setWorldRows]=useState<WorldMilestoneFeedRow[]>([]),[clock,setClock]=useState(Date.now);
 const lastLoadedAt=useRef(0),inFlight=useRef(false),mounted=useRef(true),now=providedNow??clock;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  if(!active)return;
  let alive=true;
  const load=async()=>{
   if(!alive||AppState.currentState!=='active')return;
   if(Date.now()-lastLoadedAt.current<30000)return;
   setClock(Date.now());
   if(!onlineConfigured||inFlight.current)return;
   inFlight.current=true;
   try{const rows=await worldMilestoneFeedV43(20);if(mounted.current){setWorldRows(rows);lastLoadedAt.current=Date.now();}}
   catch{/* Retain the visible feed while reconnecting. */}
   finally{inFlight.current=false;}
  };
  void load();const timer=setInterval(()=>void load(),30000);
  const foreground=AppState.addEventListener('change',next=>{if(next==='active')void load();});
  return()=>{alive=false;clearInterval(timer);foreground.remove();};
 },[active]);
 const items=useMemo(()=>[...systemNotifications(state,now),...worldRows.slice().reverse().map(row=>worldNotice(row,state.settings.language))],[state,now,worldRows]);
 return <ChatLog active={active} channelKey="system" items={items} emptyText={tr("No system notices right now.")} renderItem={item=><NoticeRow item={item}/>}/>;
}

function worldNotice(row:WorldMilestoneFeedRow,language:Language):SystemNotice{return {id:'world:'+row.feed_id,title:`${row.display_name} · ${progressionText(language,kindLabel(row.kind))}`,body:`${row.subject_name}${row.detail?' · '+row.detail:''}`,tone:'info'};}
function kindLabel(kind:string){return kind.replace(/_/g,' ').replace(/\b\w/g,char=>char.toUpperCase());}
function NoticeRow({item}:{item:SystemNotice}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),color=item.tone==='warning'?C.warning:item.tone==='good'?C.good:C.info;return <View style={[s.row,{borderColor:color}]}><View style={[s.dot,{backgroundColor:color}]}/><View style={s.copy}><Text style={s.title}>{item.title}</Text><Text style={s.body}>{item.body}</Text></View></View>}
function makeStyles(C:ThemeColors){return StyleSheet.create({row:{flexDirection:'row',alignItems:'flex-start',gap:10,marginVertical:4,padding:12,borderWidth:1,borderRadius:14,backgroundColor:C.panel2},dot:{width:8,height:8,borderRadius:4,marginTop:6},copy:{flex:1,minWidth:0,gap:2},title:{fontSize:13,lineHeight:18,color:C.text,fontWeight:'900'},body:{fontSize:12,lineHeight:18,color:C.muted}});}

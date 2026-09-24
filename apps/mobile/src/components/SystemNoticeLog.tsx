import {useEffect,useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {systemNotifications,type SystemNotice} from '../core/system-notifications';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatLog} from './ChatLog';
import {onlineConfigured} from '../online/supabase';
import {worldMilestoneFeedV43,type WorldMilestoneFeedRow} from '../online/world-milestones-v43';

export function SystemNoticeLog({state,now=Date.now()}:{state:GameState;now?:number}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[worldRows,setWorldRows]=useState<WorldMilestoneFeedRow[]>([]);
 useEffect(()=>{if(!onlineConfigured){setWorldRows([]);return;}let active=true;const load=()=>void worldMilestoneFeedV43(20).then(rows=>{if(active)setWorldRows(rows);}).catch(()=>{});load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer)};},[]);
 const items=[...systemNotifications(state,now),...worldRows.slice().reverse().map(worldNotice)];
 return <ChatLog channelKey="system" items={items} emptyText="No system notices right now." renderItem={item=><NoticeRow item={item}/>}/>;
}

function worldNotice(row:WorldMilestoneFeedRow):SystemNotice{return {id:'world:'+row.feed_id,title:`${row.display_name} · ${kindLabel(row.kind)}`,body:`${row.subject_name}${row.detail?' · '+row.detail:''}`,tone:'info'};}
function kindLabel(kind:string){return kind.replace(/_/g,' ').replace(/\b\w/g,char=>char.toUpperCase());}
function NoticeRow({item}:{item:SystemNotice}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),color=item.tone==='warning'?C.warning:item.tone==='good'?C.good:C.info;return <View style={[s.row,{borderColor:color}]}><View style={[s.dot,{backgroundColor:color}]}/><View style={s.copy}><Text style={s.title}>{item.title}</Text><Text style={s.body}>{item.body}</Text></View></View>}
function makeStyles(C:ThemeColors){return StyleSheet.create({row:{flexDirection:'row',alignItems:'flex-start',gap:10,marginVertical:4,padding:12,borderWidth:1,borderRadius:14,backgroundColor:C.panel2},dot:{width:8,height:8,borderRadius:4,marginTop:6},copy:{flex:1,minWidth:0,gap:2},title:{fontSize:13,lineHeight:18,color:C.text,fontWeight:'900'},body:{fontSize:12,lineHeight:18,color:C.muted}});}

import {recentScreenText} from '../i18n/recent-screens';
import {useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {homeSessionSummary,type HomeReadyKind} from '../core/dashboard';
import {bucketedMs} from '../core/use-delayed-busy';
import {earlyFeatureUnlocked} from '../core/feature-unlocks';
import {GameButton} from './GameButton';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {eventLifecycle} from '../core/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';

export function HomeSessionOverview({state,nowMs,onQuests,onDaily,onEvents,onWeekly,onForge,onCompanions,onNew,compact=false}:{compact?:boolean;state:GameState;nowMs:number;onQuests:()=>void;onDaily:()=>void;onEvents:()=>void;onWeekly:()=>void;onForge:()=>void;onCompanions:()=>void;onNew:()=>void}){
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>recentScreenText(language,text,params);

 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [showAllReady,setShowAllReady]=useState(false);
 // homeSessionSummary aggregates quests, dailies, events, forge, companions —
 // bucketing nowMs cuts the aggregation to one recompute per 10s.
 const summaryMs=bucketedMs(nowMs,10_000);
 const summary=useMemo(()=>homeSessionSummary(state,summaryMs),[state,summaryMs]);
 const {width,fontScale}=useWindowDimensions(),stackCells=width<350||fontScale>=1.25,weeklyUnlocked=earlyFeatureUnlocked(state,'contracts');
 const openReady=(kind:HomeReadyKind)=>{if(kind==='quests')onQuests();else if(kind==='daily')onDaily();else if(kind==='events')onEvents();else if(kind==='weekly')onWeekly();else if(kind==='forge')onForge();else if(kind==='companions')onCompanions();};
 const parts:string[]=[];
 if(summary.storyRewards)parts.push(a('{count} story',{count:summary.storyRewards}));
 if(summary.dailyReady)parts.push(a('daily claim'));
 if(summary.eventRewards)parts.push(a('{count} event',{count:summary.eventRewards}));
 if(summary.forgeReady)parts.push(a('{count} forge',{count:summary.forgeReady}));
 if(summary.weeklyRewards)parts.push(a('{count} contract',{count:summary.weeklyRewards}));
 if(summary.companionAttention)parts.push(a('{count} companion',{count:summary.companionAttention}));
 const visibleParts=parts.slice(0,4),hiddenPartCount=Math.max(0,parts.length-visibleParts.length),readyDisplay=summary.readyTotal>99?'99+':String(summary.readyTotal);
 const event=eventLifecycle(state,nowMs),eventBadge=summary.primaryReady?.kind==='events'&&event?liveEventVisuals(event.definition.visualKey).badgeIcon:undefined;
 const readyRows=[
  ...(summary.forgeReady?[{id:'forge',title:summary.forgeReady===1?'Forge craft ready':summary.forgeReady+' Forge crafts ready',detail:'Collect finished equipment',onPress:onForge,mark:'⚒'}]:[]),
  ...(summary.storyRewards?[{id:'story',title:summary.storyRewards===1?'Story reward ready':summary.storyRewards+' story rewards ready',detail:'Claim your completed chapter',onPress:onQuests,mark:'✦'}]:[]),
  ...(summary.dailyReady?[{id:'daily',title:'Daily Supplies ready',detail:'Claim today’s account-wide supplies',onPress:onDaily,mark:'☀'}]:[]),
  ...(summary.eventRewards?[{id:'event',title:summary.eventRewards+' Event reward'+(summary.eventRewards===1?'':'s')+' ready',detail:'Open the active Event',onPress:onEvents,mark:'✧'}]:[]),
  ...(summary.companionAttention?[{id:'companion',title:summary.companionAttention+' Companion action'+(summary.companionAttention===1?'':'s')+' ready',detail:'Review companion progression',onPress:onCompanions,mark:'♙'}]:[]),
  ...(summary.weeklyRewards?[{id:'weekly',title:summary.weeklyRewards+' Contract rewards',detail:'Review the weekly board',onPress:onWeekly,mark:'▤'}]:[]),
 ];
 if(compact)return summary.readyTotal>0?<View style={s.readySection}>
   <View style={s.readyHeading}><Text style={s.readyTitle}>{a('READY NOW')}</Text><Text style={s.readySummary}>{a('{count} actions need attention',{count:summary.readyTotal})}</Text></View>
   {(showAllReady?readyRows:readyRows.slice(0,3)).map(row=><Pressable key={row.id} accessibilityRole="button" accessibilityLabel={a(row.title)} accessibilityHint={a(row.detail)} onPress={row.onPress} style={({pressed})=>[s.readyRow,pressed&&s.pressed]}>
    <View style={s.readyMark}><Text style={s.readyMarkText}>{row.mark}</Text></View>
    <View style={s.flex}><Text numberOfLines={2} style={s.readyRowTitle}>{a(row.title)}</Text><Text numberOfLines={2} style={s.readyRowDetail}>{a(row.detail)}</Text></View>
    <Text style={s.readyStatus}>{a('READY')}</Text><Text style={s.readyArrow}>›</Text>
   </Pressable>)}
   {readyRows.length>3?<Pressable accessibilityRole="button" accessibilityState={{expanded:showAllReady}} onPress={()=>setShowAllReady(value=>!value)} style={s.moreReady}><Text style={s.moreReadyText}>{showAllReady?a('Show fewer'):a('Show {count} more',{count:readyRows.length-3})}</Text></Pressable>:null}
  </View>:null;
 return <View style={[s.root,summary.readyTotal>0&&s.readyRoot]}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{a('SESSION OVERVIEW')}</Text><Text style={s.title}>{a(summary.primaryReady?.title??'No immediate claims')}</Text><Text style={s.meta}>{summary.primaryReady?a(summary.primaryReady.detail):a(weeklyUnlocked?'Your next progression step is shown above. Use this row to jump into weekly progress.':'Keep following the campaign to unlock weekly systems.')}</Text></View>{summary.readyTotal>0?<Text style={s.readyBadge}>{a('{count} READY',{count:readyDisplay})}</Text>:<Text style={s.clearBadge}>{a('CLEAR')}</Text>}</View>
  <View style={s.cells}>
   <SessionCell label={a("READY")} value={readyDisplay} tone={summary.readyTotal?'good':'muted'} emphasized={summary.readyTotal>0} stack={stackCells} onPress={summary.primaryReady?()=>openReady(summary.primaryReady!.kind):undefined}/>
   <SessionCell label={a('WEEKLY')} value={weeklyUnlocked?(summary.weeklyRewards?a('{count} ready',{count:summary.weeklyRewards}):summary.weeklyComplete+'/'+summary.weeklyTotal):a("LOCKED")} tone={weeklyUnlocked?(summary.weeklyRewards?'good':summary.weeklyTotal&&summary.weeklyComplete===summary.weeklyTotal?'good':'accent'):'muted'} emphasized={weeklyUnlocked&&(summary.weeklyRewards>0||summary.weeklyTotal>0)} stack={stackCells} onPress={weeklyUnlocked?onWeekly:undefined}/>
   <SessionCell label={a('NEW')} value={String(summary.newUnlocks)} tone={summary.newUnlocks?'special':'muted'} emphasized={summary.newUnlocks>0} stack={stackCells} onPress={onNew}/>
  </View>
  {visibleParts.length?<Text style={s.breakdown}>{a('Ready now · {items}{more}',{items:visibleParts.join(' · '),more:hiddenPartCount?a(' · +{count} more',{count:hiddenPartCount}):''})}</Text>:null}
  {summary.primaryReady?<GameButton compact title={a(summary.primaryReady.button)} onPress={()=>openReady(summary.primaryReady!.kind)}/>:null}
 </View>;
}

function SessionCell({label,value,tone,emphasized=false,stack=false,onPress}:{label:string;value:string;tone:'good'|'info'|'special'|'accent'|'muted';emphasized?:boolean;stack?:boolean;onPress?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),color=tone==='good'?C.good:tone==='info'?C.info:tone==='special'?C.special:tone==='accent'?C.accent:C.muted,surface=tone==='good'?C.goodSurface:tone==='info'?C.infoSurface:tone==='special'?C.specialSurface:tone==='accent'?C.accentSurface:C.panel2;
 const style=[s.cell,stack&&s.cellStack,emphasized&&{borderColor:color,backgroundColor:surface}];
 const body=<><Text style={s.cellLabel}>{label}</Text><Text style={[s.cellValue,{color}]}>{value}</Text>{onPress?<Text style={[s.cellArrow,{color}]}>›</Text>:null}</>;
 return onPress?<Pressable accessibilityRole="button" accessibilityLabel={label+' '+value} onPress={onPress} style={({pressed})=>[style,pressed&&s.pressed]}>{body}</Pressable>:<View style={style}>{body}</View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 readySection:{gap:6},
  readyHeading:{minHeight:23,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  readyTitle:{fontSize:10,lineHeight:15,fontWeight:'900',color:C.accent,letterSpacing:.8},
  readySummary:{fontSize:10,lineHeight:14,color:C.muted},
  readyRow:{minHeight:54,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:C.good,borderRadius:10,backgroundColor:C.goodSurface},
  readyMark:{width:35,height:35,borderWidth:1,borderColor:C.line,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:C.panel},
  readyMarkText:{fontSize:19,lineHeight:24,color:C.accent},
  readyRowTitle:{fontSize:12,lineHeight:17,fontWeight:'900',color:C.text},
  readyRowDetail:{fontSize:10,lineHeight:14,color:C.muted},
  readyStatus:{fontSize:9,lineHeight:12,fontWeight:'900',color:C.good},
  readyArrow:{fontSize:23,lineHeight:26,color:C.accent},
  moreReady:{minHeight:44,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
  moreReadyText:{fontSize:11,fontWeight:'800',color:C.info},
  root:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 readyRoot:{borderLeftWidth:4,borderLeftColor:C.good},
 head:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted,lineHeight:16},
 readyBadge:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.5},clearBadge:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.5},
 cells:{flexDirection:'row',flexWrap:'wrap',gap:5},cell:{position:'relative',flex:1,minWidth:0,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},cellStack:{flex:0,flexBasis:'48%'},cellLabel:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.55},cellValue:{...typography.bodyStrong,fontWeight:'900'},cellArrow:{position:'absolute',right:7,top:15,fontSize:14,fontWeight:'900'},breakdown:{fontSize:9,color:C.muted,fontWeight:'700'},pressed:{opacity:.7,transform:[{translateY:1}]}
});}

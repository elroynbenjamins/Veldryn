import {useEffect,useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import {StatusPill} from './StatusPill';
import {GUILD_ACTIVITY_MILESTONE_DEFS,guildActivityNextMilestone} from '../core/guild-activity';
import {loadOnlineGuildActivityState,type OnlineGuildActivityState} from '../online/guild-muster';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildActivitySummaryPanel({compact=false}:{compact?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[state,setState]=useState<OnlineGuildActivityState|null>(null);
 useEffect(()=>{let active=true;void loadOnlineGuildActivityState().then(value=>{if(active)setState(value)}).catch(()=>{if(active)setState(null)});return()=>{active=false}},[]);
 if(!state)return null;
 const next=guildActivityNextMilestone(Math.min(100,state.activityPercent)),reserve=Math.max(0,state.activityPercent-100);
 const decayLabel=state.decayMode==='protected'?'Protected today':state.decayMode==='partial'?'-'+state.partialDecayPercent+'% if today ends here':'-'+state.inactiveDecayPercent+'% if inactive';
 const unlocked=GUILD_ACTIVITY_MILESTONE_DEFS.filter(row=>state.activityPercent>=row.threshold);
 return <Panel>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>ACTIVE GUILD</Text><Text style={s.title}>{state.activityPercent}% Guild Activity</Text></View><StatusPill label={state.activityPercent>=100?'MAX ACTIVITY':state.decayMode==='protected'?'PROTECTED':'BUILDING'} tone={state.activityPercent>=60?'good':'info'}/></View>
  <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:state.activityPercent}} style={s.track}><View style={[s.fill,{width:((Math.min(100,state.activityPercent)/110*100)+'%') as any}]}/>{reserve>0?<View style={[s.reserve,{left:((100/110*100)+'%') as any,width:((reserve/110*100)+'%') as any}]}/>:null}</View>
  <View style={s.metaRow}><Text style={s.meta}>{state.activeMemberCount} recently active member{state.activeMemberCount===1?'':'s'} · target {state.activityTargetUnits} units</Text><Text style={s.decay}>{decayLabel}</Text></View>
  {reserve>0?<Text style={s.reserveText}>Activity Reserve {reserve}/10% · bonuses remain capped at 100%; reserve absorbs future decay.</Text>:null}
  {next?<Text style={s.next}>{Math.max(0,next.threshold-state.activityPercent)}% until {next.name} · {next.description}</Text>:<Text style={s.next}>All Guild Activity milestones active.</Text>}
  {!compact?<View style={s.milestones}>{GUILD_ACTIVITY_MILESTONE_DEFS.map(row=><View key={row.threshold} style={[s.milestone,state.activityPercent>=row.threshold&&s.on]}><Text style={[s.pct,state.activityPercent>=row.threshold&&s.pctOn]}>{row.threshold}%</Text><View style={s.flex}><Text style={s.name}>{row.name}</Text><Text style={s.copy}>{row.description}</Text></View></View>)}</View>:<Text style={s.copy}>{unlocked.length}/5 milestones active · Guild Quests, Muster and completed Projects sustain this meter.</Text>}
 </Panel>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},
 track:{height:9,borderRadius:5,overflow:'hidden',backgroundColor:C.panel2,marginVertical:8,position:'relative'},fill:{height:'100%',backgroundColor:C.accent},reserve:{position:'absolute',top:0,bottom:0,backgroundColor:C.info},reserveText:{fontSize:8.5,color:C.info,fontWeight:'900',marginTop:3},
 metaRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:6},meta:{fontSize:8.5,color:C.muted,fontWeight:'700'},decay:{fontSize:8.5,color:C.info,fontWeight:'900'},
 next:{fontSize:9.5,lineHeight:13,color:C.text,fontWeight:'800',marginTop:6},milestones:{gap:5,marginTop:8},milestone:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,opacity:.58},on:{opacity:1,borderColor:C.good,backgroundColor:C.goodSurface},pct:{width:36,fontSize:9.5,color:C.muted,fontWeight:'900'},pctOn:{color:C.good},name:{fontSize:9.5,color:C.text,fontWeight:'900'},copy:{fontSize:8.5,lineHeight:12,color:C.muted}
});}

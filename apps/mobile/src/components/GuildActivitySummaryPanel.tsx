import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import {StatusPill} from './StatusPill';
import {GUILD_ACTIVITY_MILESTONE_DEFS,guildActivityNextMilestone} from '../core/guild-activity';
import {loadOnlineGuildActivityState,type OnlineGuildActivityState} from '../online/guild-muster';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildActivitySummaryPanel({compact=false}:{compact?:boolean}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[state,setState]=useState<OnlineGuildActivityState|null>(null);
 useEffect(()=>{let active=true;void loadOnlineGuildActivityState().then(value=>{if(active)setState(value)}).catch(()=>{if(active)setState(null)});return()=>{active=false}},[]);
 if(!state)return null;
 return <GuildActivityMeter state={state} compact={compact}/>;
}

export function GuildActivityMeter({state,compact=false}:{state:OnlineGuildActivityState;compact?:boolean}){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[detailsOpen,setDetailsOpen]=useState(false);
 const next=guildActivityNextMilestone(Math.min(100,state.activityPercent)),reserve=Math.max(0,state.activityPercent-100);
 const decayLabel=state.decayMode==='protected'?'Protected today':state.decayMode==='partial'?'-'+state.partialDecayPercent+'% if today ends here':'-'+state.inactiveDecayPercent+'% if inactive';
 const unlocked=GUILD_ACTIVITY_MILESTONE_DEFS.filter(row=>state.activityPercent>=row.threshold);
 return <Panel style={compact?s.compact:undefined}>
  <View style={s.head}><View style={s.flex}>{!compact?<Text style={s.kicker}>{st("ACTIVE GUILD")}</Text>:null}<Text style={[s.title,compact&&s.compactTitle]}>{state.activityPercent}% Guild Activity</Text></View><StatusPill label={state.activityPercent>=100?st("MAX ACTIVITY"):state.decayMode==='protected'?st("PROTECTED"):st("BUILDING")} tone={state.activityPercent>=60?'good':'info'}/></View>
  <View accessibilityRole="progressbar" accessibilityLabel="Guild Activity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,state.activityPercent)} accessibilityValue={{min:0,max:100,now:Math.min(100,state.activityPercent)}} style={s.track}><View style={[s.fill,{width:((Math.min(100,state.activityPercent))+'%') as any}]}/>{GUILD_ACTIVITY_MILESTONE_DEFS.filter(row=>row.threshold<100).map(row=><View key={row.threshold} accessible={false} pointerEvents="none" style={{position:'absolute',top:0,bottom:0,width:1,left:(row.threshold+'%') as any,backgroundColor:C.stage}}/>)}</View>
  {reserve>0?<Text style={s.reserveText}>{st("Activity Reserve")} {reserve}/10% · bonuses remain capped at 100%; reserve absorbs future decay.</Text>:null}
  {next?<Text style={s.next}>{compact?`Next: ${next.threshold}% · ${next.name}`:`${Math.max(0,next.threshold-state.activityPercent)}% until ${next.name} · ${next.description}`}</Text>:<Text style={s.next}>{st("All Guild Activity milestones active.")}</Text>}
  {compact?<Pressable accessibilityRole="button" accessibilityLabel="Guild Activity details" aria-expanded={detailsOpen} accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsOpen(value=>!value)} style={s.disclosure}><Text style={s.copy}>{unlocked.length}/5 milestones active</Text><Text style={s.detailLink}>{detailsOpen?'Less −':'Details +'}</Text></Pressable>:null}
  {!compact||detailsOpen?<>
   <View style={s.metaRow}><Text style={s.meta}>{state.activeMemberCount} recently active member{state.activeMemberCount===1?'':'s'} · target {state.activityTargetUnits} units</Text><Text style={s.decay}>{decayLabel}</Text></View>
   <View style={s.milestones}>{GUILD_ACTIVITY_MILESTONE_DEFS.map(row=><View key={row.threshold} style={[s.milestone,state.activityPercent>=row.threshold&&s.on]}><Text style={[s.pct,state.activityPercent>=row.threshold&&s.pctOn]}>{row.threshold}%</Text><View style={s.flex}><Text style={s.name}>{row.name}</Text><Text style={s.copy}>{row.description}</Text></View></View>)}</View>
   <Text style={s.copy}>Guild Quests, Muster and completed Projects sustain this meter.</Text>
  </>:null}
 </Panel>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 compact:{gap:2},compactTitle:{fontSize:17,lineHeight:23},
 disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},detailLink:{fontSize:12,lineHeight:18,color:C.info,fontWeight:'600'},head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},
 track:{height:9,borderRadius:5,overflow:'hidden',backgroundColor:C.panel2,marginVertical:8,position:'relative'},fill:{height:'100%',backgroundColor:C.good},reserve:{position:'absolute',top:0,bottom:0,backgroundColor:C.info},reserveText:{fontSize:12,color:C.info,fontWeight:'900',marginTop:3},
 metaRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:6},meta:{fontSize:12,color:C.muted,fontWeight:'700'},decay:{fontSize:12,color:C.info,fontWeight:'900'},
 next:{fontSize:13,lineHeight:19,color:C.text,fontWeight:'800',marginTop:6},milestones:{gap:5,marginTop:8},milestone:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,opacity:.58},on:{opacity:1,borderColor:C.good,backgroundColor:C.goodSurface},pct:{width:36,fontSize:13,color:C.muted,fontWeight:'900'},pctOn:{color:C.good},name:{fontSize:13,color:C.text,fontWeight:'900'},copy:{fontSize:12,lineHeight:18,color:C.muted}
});}

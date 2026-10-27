import {useSocialText} from '../i18n/social';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import {QuestBoard} from './QuestBoard';
import {QuestPosting} from './QuestPosting';
import {ActivityArtwork} from './ActivityArtwork';
import {GameButton} from './GameButton';
import {LoadingState} from './LoadingState';
import {StatBar} from './StatBar';
import {StatusPill} from './StatusPill';
import {loadOnlineGuildQuests,type OnlineGuildQuest} from '../online/guild-quests';
import {rarityMeta} from '../core/item-rarity';
import {GUILD_ACTIVITY_MILESTONE_DEFS} from '../core/guild-activity';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildQuestPanel(){
 const st=useSocialText();
 const [quests,setQuests]=useState<OnlineGuildQuest[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const refresh=useCallback(async(force=false)=>{
  setLoading(true);
  try{setQuests(await loadOnlineGuildQuests(force));setError('');}
  catch(e){setError(e instanceof Error?e.message:st('Could not load Guild Quests.'));}
  finally{setLoaded(true);setLoading(false);}
 },[]);
 useEffect(()=>{
  if(AppState.currentState!=='background')void refresh();
  const listener=AppState.addEventListener('change',next=>{if(next==='active')void refresh()});
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh()},60_000);
  return()=>{listener.remove();clearInterval(timer);};
 },[refresh]);
 const C=useGameTheme();
 if(loading&&!loaded)return <LoadingState compact label={st('Loading this week’s objectives…')}/>;
 if(error&&!loaded)return <Panel><Text style={{color:C.bad}}>{error}</Text><GameButton title={st('TRY AGAIN')} tone="secondary" loading={loading} disabled={loading} onPress={()=>void refresh(true)}/></Panel>;
 return <View style={{gap:8}}><GuildQuestBoard quests={quests}/>{error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}<GameButton compact title={loading?st('Refreshing…'):st('Refresh')} tone="secondary" loading={loading} disabled={loading} onPress={()=>void refresh(true)}/></View>;
}

/** Shared projection renderer for production and memory-only visual fixtures. */
export function GuildQuestBoard({quests}:{quests:OnlineGuildQuest[]}){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const completed=quests.filter(q=>q.completed).length,totalActivity=quests.filter(q=>q.completed).reduce((sum,q)=>sum+q.activityReward,0);
 const remaining=quests.length?Math.max(0,Math.ceil((Date.parse(quests[0].weekEndsAt)-Date.now())/86400000)):0;
 const ordered=[...quests].sort((a,b)=>Number(a.completed)-Number(b.completed)||Number(b.featured)-Number(a.featured)||a.boardSlot-b.boardSlot);
 const transition=quests.find(q=>q.newlyCompleted&&q.activityBeforePercent!=null&&q.activityAfterPercent!=null);
 return <QuestBoard style={s.board}>
  <View style={s.head}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>{st('Guild Quests')}</Text><Text style={s.copy}>{completed} / {quests.length} completed · +{totalActivity} {st('ACTIVITY EARNED')}</Text></View>{quests.length?<StatusPill label={remaining<=1?st('ENDS SOON'):remaining+'D LEFT'} tone={remaining<=1?'warning':'info'}/>:null}</View>
  {transition?<ActivityTransition quest={transition}/>:null}
  {!quests.length?<Text style={s.copy}>No weekly Guild Quests are posted. Join a Guild or check back after the board refreshes.</Text>:null}
  {ordered.map(q=><Quest key={`${q.boardSlot}:${q.questKey}`} quest={q}/>)}
  {quests.length?<Text style={s.foot}>Five quests are fixed for the week. Completed quests stay visible until the weekly reset; there are no rerolls.</Text>:null}
 </QuestBoard>;
}
function ActivityTransition({quest:q}:{quest:OnlineGuildQuest}){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]),before=q.activityBeforePercent??0,after=q.activityAfterPercent??before;
 const crossed=GUILD_ACTIVITY_MILESTONE_DEFS.filter(m=>before<m.threshold&&after>=m.threshold);
 return <View accessibilityRole="alert" style={s.transition}><Text style={s.title}>{st('Guild Activity increased')} · {before}% → {after}%</Text><Text style={s.copy}>{q.title} completed · +{q.activityReward} Activity units.{after>100?` Reserve ${after-100}/10%.`:''}</Text>{crossed.map(m=><Text key={m.threshold} style={s.reward}>✓ {m.name} active · {m.description}</Text>)}</View>;
}
function Quest({quest:q}:{quest:OnlineGuildQuest}){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[expanded,setExpanded]=useState(false),rarity=rarityMeta(q.rarity);
 const duration=q.estimatedMinutes>=60?`${q.estimatedMinutes/60}h`:`${q.estimatedMinutes}m`;
 return <QuestPosting style={q.completed?s.done:undefined}>
  <View style={s.head}><View style={s.flex}><Text style={s.category}>{q.featured?'FEATURED · ':''}{q.category.toUpperCase()} · {rarity.label.toUpperCase()} · ~{duration}</Text><Text accessibilityRole="header" style={s.questTitle}>{q.title}</Text></View><ActivityArtwork id={q.category==='Combat'?'combat':q.category==='Crafting'?'smithing':q.category==='Skilling'?'herbalism':'exploration'} size={42}/></View>
  {q.completed?<StatusPill label={st('COMPLETE')} tone="good"/>:null}
  <Text style={s.copy}>{q.description}</Text>
  <StatBar rounded label="Shared guild progress" current={Math.min(q.progress,q.target)} max={q.target}/>
  <View style={s.personal}><Text style={s.personalLabel}>{st('YOUR CONTRIBUTION')}</Text>{q.personalProgress.length?q.personalProgress.map(o=><Text key={o.key} style={s.copy}>{objectiveLabel(o.key)}: {Math.min(o.progress,o.target).toLocaleString()} / {o.target.toLocaleString()}</Text>):<Text style={s.copy}>No contribution recorded yet.</Text>}<Text style={s.foot}>{q.contributorCount} contributor{q.contributorCount===1?'':'s'} this week · personal daily credit is capped</Text></View>
  <Text style={s.reward}>+{q.activityReward} {q.completed?'Guild Activity secured':'Guild Activity on completion'}</Text>
  {q.objectiveProgress.length?<><Pressable accessibilityRole="button" aria-expanded={expanded} accessibilityState={{expanded}} accessibilityLabel={`Objective breakdown · ${q.title}`} onPress={()=>setExpanded(value=>!value)} style={s.disclosure}><Text style={s.disclosureText}>Objective breakdown</Text><Text style={s.disclosureText}>{expanded?'−':'+'}</Text></Pressable>{expanded?q.objectiveProgress.map(o=><Text key={o.key} style={s.copy}>{objectiveLabel(o.key)}: {Math.min(o.progress,o.target).toLocaleString()} / {o.target.toLocaleString()}</Text>):null}</>:null}
 </QuestPosting>;
}
function objectiveLabel(key:string){return key.replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());}
function styles(C:ThemeColors){return StyleSheet.create({board:{borderWidth:0,padding:0,paddingTop:0,backgroundColor:'transparent',gap:10},head:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1,minWidth:0,gap:4},title:{fontSize:18,lineHeight:24,color:C.text,fontWeight:'700'},questTitle:{fontSize:17,lineHeight:23,color:C.text,fontWeight:'700'},copy:{fontSize:13,lineHeight:19,color:C.muted},foot:{fontSize:12,lineHeight:18,color:C.muted},category:{fontSize:11,lineHeight:15,color:C.info,fontWeight:'700',letterSpacing:.8},personal:{gap:3,paddingTop:8,borderTopWidth:1,borderTopColor:C.line},personalLabel:{fontSize:11,lineHeight:15,color:C.info,fontWeight:'700',letterSpacing:.6},reward:{fontSize:13,lineHeight:19,color:C.good,fontWeight:'600'},done:{borderColor:C.good},transition:{gap:8,padding:12,borderWidth:1,borderColor:C.info,borderRadius:10,backgroundColor:C.infoSurface},disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:C.line,gap:10},disclosureText:{fontSize:12,lineHeight:17,color:C.info}});}

import {useCallback,useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import {StatusPill} from './StatusPill';
import {loadOnlineGuildQuests,type OnlineGuildQuest} from '../online/guild-quests';
import {rarityMeta} from '../core/item-rarity';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildQuestPanel(){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[quests,setQuests]=useState<OnlineGuildQuest[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{setQuests(await loadOnlineGuildQuests())}catch(e){setError(e instanceof Error?e.message:'Could not load Guild Quests.')}finally{setLoading(false)}},[]);
 useEffect(()=>{void refresh()},[refresh]);
 if(loading)return <Panel><Text style={s.kicker}>GUILD QUESTS</Text><Text style={s.copy}>Loading this week’s objectives…</Text></Panel>;
 if(error)return <Panel><Text style={s.kicker}>GUILD QUESTS</Text><Text style={s.copy}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>void refresh()} style={s.retry}><Text style={s.retryText}>TRY AGAIN</Text></Pressable></Panel>;
 if(!quests.length)return null;
 const completed=quests.filter(q=>q.completed).length,ends=new Date(quests[0].weekEndsAt),remaining=Math.max(0,Math.ceil((ends.getTime()-Date.now())/86400000));
 return <Panel>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>WEEKLY GUILD QUESTS</Text><Text style={s.title}>{completed}/{quests.length} completed</Text></View><StatusPill label={remaining<=1?'ENDS SOON':remaining+'D LEFT'} tone={remaining<=1?'warning':'info'}/></View>
  <Text style={s.copy}>Five quests are fixed for the week: two approachable objectives, two varied objectives and one featured challenge. Completed quests remain visible until the weekly reset; there are no rerolls.</Text>
  <View style={s.stack}>{quests.map(q=><Quest key={q.questKey} quest={q}/>)}</View>
 </Panel>;
}
function Quest({quest:q}:{quest:OnlineGuildQuest}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),pct=Math.min(100,Math.floor(q.progress/q.target*100)),rarity=rarityMeta(q.rarity);
 const duration=q.estimatedMinutes>=60?`${q.estimatedMinutes/60}h`:`${q.estimatedMinutes}m`;
 return <View style={[s.quest,{borderColor:rarity.color,borderWidth:rarity.borderWidth,backgroundColor:q.completed?C.goodSurface:rarity.surface}]}>
  <View style={s.head}><View style={s.flex}><Text style={[s.category,{color:rarity.color}]}>{q.featured?'FEATURED · ':''}{rarity.label.toUpperCase()} · {q.category.toUpperCase()} · ~{duration}</Text><Text style={s.questTitle}>{q.title}</Text></View><StatusPill label={q.completed?'COMPLETE':pct+'%'} tone={q.completed?'good':'muted'}/></View>
  <Text style={s.questCopy}>{q.description}</Text>
  {q.objectiveProgress.length?<View style={s.objectives}>{q.objectiveProgress.map(o=><Text key={o.key} style={s.objective}>{o.key.replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase())}: {Math.min(o.progress,o.target).toLocaleString()} / {o.target.toLocaleString()}</Text>)}</View>:null}
  <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:q.target,now:Math.min(q.target,q.progress)}} style={s.track}><View style={[s.fill,{width:(pct+'%') as any}]}/></View>
  <View style={s.meta}><Text style={s.metaText}>{Math.min(q.progress,q.target).toLocaleString()} / {q.target.toLocaleString()}</Text><Text style={s.reward}>+{q.activityReward} Activity units</Text></View>
  <Text style={s.foot}>{q.contributorCount} contributor{q.contributorCount===1?'':'s'} this week · personal daily credit is capped</Text>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 title:{...typography.title,color:C.text},copy:{fontSize:9.5,lineHeight:13,color:C.muted,marginTop:3},stack:{gap:7,marginTop:9},
 quest:{gap:4,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},done:{borderColor:C.good,backgroundColor:C.goodSurface},objectives:{gap:2,marginTop:2},objective:{fontSize:8.5,color:C.text,fontWeight:'800'},
 category:{fontSize:7.5,color:C.accentSoft,fontWeight:'900',letterSpacing:.65},questTitle:{fontSize:11,color:C.text,fontWeight:'900'},questCopy:{fontSize:9,lineHeight:12.5,color:C.muted},
 track:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.panel,marginTop:3},fill:{height:'100%',backgroundColor:C.accent},
 meta:{flexDirection:'row',justifyContent:'space-between',gap:8},metaText:{fontSize:8.5,color:C.muted,fontWeight:'800'},reward:{fontSize:8.5,color:C.good,fontWeight:'900'},
 foot:{fontSize:8,color:C.muted},retry:{alignSelf:'flex-start',marginTop:8,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md},retryText:{fontSize:8,color:C.text,fontWeight:'900'}
});}

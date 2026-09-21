import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {GUILD_HALL_FACILITIES,DEFAULT_GUILD_HALL_POLICY} from '../core/guild-hall-v44';
import {loadOnlineGuildHallV44} from '../online/guild-hall-v44';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Projection=Awaited<ReturnType<typeof loadOnlineGuildHallV44>>;

export function OnlineGuildHallPanel(){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [projection,setProjection]=useState<Projection>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{setProjection(await loadOnlineGuildHallV44())}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load Guild Hall.')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 if(loading&&!projection)return <Panel><Text style={s.title}>Guild Hall</Text><ActivityIndicator color={C.accent}/></Panel>;
 if(error&&!projection)return <Panel><Text style={s.title}>Guild Hall</Text><Text style={s.error}>{error}</Text><GameButton title="Retry" tone="secondary" onPress={()=>void load()}/></Panel>;
 if(!projection)return <Panel><Text style={s.title}>Guild Hall</Text><Text style={s.sub}>Join a Guild to unlock long-term Guild Hall progression.</Text></Panel>;
 const {state,level,stage,benefits}=projection;
 const nextThreshold=DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[level]??DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds.length-1];
 const prev=DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[Math.max(0,level-1)]??0;
 const pct=level>=20?100:Math.max(0,Math.min(100,(state.hallProgress-prev)/Math.max(1,nextThreshold-prev)*100));
 return <View style={s.root}>
  <Panel>
   <View style={s.between}><View style={s.flex}><Text style={s.kicker}>GUILD HALL</Text><Text style={s.title}>{stage}</Text><Text style={s.sub}>{state.hallProgress.toLocaleString()} Hall Progress · {state.lifetimeProjectsCompleted} completed projects</Text></View><View style={s.levelBadge}><Text style={s.level}>Lv {level}</Text><Text style={s.levelMax}>/20</Text></View></View>
   <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:pct}} style={s.track}><View style={[s.fill,{width:(pct+'%') as any}]}/></View>
   <Text style={s.note}>{level<20?Math.max(0,nextThreshold-state.hallProgress).toLocaleString()+' Hall Progress to level '+(level+1):'Maximum Hall level reached.'}</Text>
  </Panel>
  <Panel>
   <View style={s.sectionHead}><Text style={s.title}>Facilities</Text><Text style={s.sectionMeta}>Automatic progression</Text></View>
   <Text style={s.sub}>Facilities improve through authored Guild Projects. Hall Progress is never spent.</Text>
   {GUILD_HALL_FACILITIES.map(def=>{const facility=state.facilities[def.id];return <View key={def.id} style={s.facility}><View style={s.flex}><Text style={s.facilityName}>{def.name}</Text><Text style={s.note}>{def.description}</Text></View><View style={s.tier}><Text style={s.tierText}>T{facility.tier}/5</Text></View></View>})}
  </Panel>
  <Panel>
   <View style={s.sectionHead}><Text style={s.title}>Current Hall Benefits</Text><Text style={s.sectionMeta}>Account-safe power</Text></View>
   <View style={s.benefits}><View style={s.benefit}><Text style={s.value}>+{(benefits.skillXpBonusBps/100).toFixed(2)}%</Text><Text style={s.note}>Skill XP</Text></View><View style={s.benefit}><Text style={s.value}>+{(benefits.craftingProcessingSpeedBps/100).toFixed(2)}%</Text><Text style={s.note}>Crafting / processing</Text></View><View style={s.benefit}><Text style={s.value}>+{benefits.extraProjectDraftChoices}</Text><Text style={s.note}>Project choices</Text></View></View>
   <Text style={s.cap}>Caps: +0.50% XP, +0.50% crafting/processing speed, +2 project choices.</Text>
  </Panel>
  <Panel>
   <View style={s.sectionHead}><Text style={s.title}>Trophy Room</Text><Text style={s.sectionMeta}>{state.trophies.length} recorded</Text></View>
   {state.trophies.slice(0,5).map(trophy=><View key={trophy.trophyKey} style={s.trophy}><Text style={s.facilityName}>{trophy.label}</Text><Text style={s.note}>{trophy.description||trophy.sourceKind} · {new Date(trophy.earnedAtMs).toLocaleDateString()}</Text></View>)}
   {!state.trophies.length?<View style={s.empty}><Text style={s.emptyTitle}>No trophies yet</Text><Text style={s.note}>Completed eligible Guild Projects and raids will appear here.</Text></View>:null}
  </Panel>
  <GameButton compact title={loading?'Refreshing…':'Refresh Guild Hall'} tone="secondary" disabled={loading} onPress={()=>void load()}/>
  {!!error&&<Text style={s.error}>{error}</Text>}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},title:{...typography.title,color:C.text},sub:{fontSize:10,lineHeight:14,color:C.muted,marginTop:2},note:{fontSize:9,lineHeight:12,color:C.muted},
 between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},flex:{flex:1,minWidth:0},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},sectionMeta:{fontSize:8.5,color:C.muted,fontWeight:'800'},
 levelBadge:{flexDirection:'row',alignItems:'baseline',paddingHorizontal:8,paddingVertical:5,borderRadius:radii.md,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.warningSurface},
 level:{color:C.accent,fontSize:16,fontWeight:'900'},levelMax:{color:C.muted,fontSize:9},
 track:{height:8,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2,marginTop:8},fill:{height:'100%',backgroundColor:C.accent},
 facility:{minHeight:54,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line,paddingVertical:7},facilityName:{fontSize:10.5,color:C.text,fontWeight:'900'},
 tier:{minWidth:50,height:28,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},tierText:{fontSize:9,color:C.accent,fontWeight:'900'},
 benefits:{flexDirection:'row',gap:5,marginTop:7},benefit:{flex:1,minWidth:0,padding:7,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},value:{color:C.good,fontSize:14,fontWeight:'900'},cap:{fontSize:8.5,lineHeight:12,color:C.muted,marginTop:6},
 trophy:{paddingVertical:7,borderTopWidth:1,borderTopColor:C.line},empty:{minHeight:64,alignItems:'center',justifyContent:'center',gap:2,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},emptyTitle:{fontSize:10.5,color:C.text,fontWeight:'900'},error:{color:C.bad},
});}

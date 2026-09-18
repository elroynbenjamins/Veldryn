import {useEffect,useState} from 'react';
import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {GUILD_HALL_FACILITIES,DEFAULT_GUILD_HALL_POLICY} from '../core/guild-hall-v44';
import {loadOnlineGuildHallV44} from '../online/guild-hall-v44';
import {C,radii,spacing,typography} from '../theme/theme';

type Projection=Awaited<ReturnType<typeof loadOnlineGuildHallV44>>;

export function OnlineGuildHallPanel(){
 const [projection,setProjection]=useState<Projection>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{setProjection(await loadOnlineGuildHallV44())}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load Guild Hall.')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 if(loading&&!projection)return <Panel><Text style={s.title}>Guild Hall</Text><ActivityIndicator color={C.accent}/></Panel>;
 if(error&&!projection)return <Panel><Text style={s.title}>Guild Hall</Text><Text style={s.error}>{error}</Text><GameButton title="Retry" tone="secondary" onPress={()=>void load()}/></Panel>;
 if(!projection)return <Panel><Text style={s.title}>Guild Hall</Text><Text style={s.sub}>Join a guild to unlock long-term Guild Hall progression.</Text></Panel>;
 const {state,level,stage,benefits}=projection;
 const nextThreshold=DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[level]??DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds.length-1];
 const prev=DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[Math.max(0,level-1)]??0;
 const pct=level>=20?100:Math.max(0,Math.min(100,(state.hallProgress-prev)/Math.max(1,nextThreshold-prev)*100));
 return <View style={s.root}>
  <Panel><View style={s.between}><View><Text style={s.kicker}>GUILD HALL</Text><Text style={s.title}>{stage}</Text></View><View style={s.levelBadge}><Text style={s.level}>Lv {level}</Text><Text style={s.levelMax}>/20</Text></View></View><Text style={s.sub}>{state.hallProgress.toLocaleString()} permanent Hall Progress · {state.lifetimeProjectsCompleted} completed projects</Text><View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:pct}} style={s.track}><View style={[s.fill,{width:(pct+'%') as any}]}/></View>{level<20?<Text style={s.note}>{Math.max(0,nextThreshold-state.hallProgress).toLocaleString()} Hall Progress to level {level+1}</Text>:<Text style={s.note}>Maximum Hall level reached.</Text>}</Panel>
  <Panel><Text style={s.title}>Facilities</Text><Text style={s.sub}>Facilities improve automatically through authored Guild Projects. Hall Progress is never spent.</Text>{GUILD_HALL_FACILITIES.map(def=>{const facility=state.facilities[def.id];return <View key={def.id} style={s.facility}><View style={s.flex}><Text style={s.facilityName}>{def.name}</Text><Text style={s.note}>{def.description}</Text></View><View style={s.tier}><Text style={s.tierText}>T{facility.tier}/5</Text></View></View>})}</Panel>
  <Panel><Text style={s.title}>Current Hall Benefits</Text><View style={s.benefits}><View style={s.benefit}><Text style={s.value}>+{(benefits.skillXpBonusBps/100).toFixed(2)}%</Text><Text style={s.note}>Skill XP</Text></View><View style={s.benefit}><Text style={s.value}>+{(benefits.craftingProcessingSpeedBps/100).toFixed(2)}%</Text><Text style={s.note}>Crafting / processing speed</Text></View><View style={s.benefit}><Text style={s.value}>+{benefits.extraProjectDraftChoices}</Text><Text style={s.note}>Project choices</Text></View></View><Text style={s.cap}>Power remains deliberately small: +0.50% XP max, +0.50% crafting/processing speed max, +2 project choices max.</Text></Panel>
  <Panel><View style={s.between}><Text style={s.title}>Trophy Room</Text><Text style={s.note}>{state.trophies.length} recorded</Text></View>{state.trophies.slice(0,5).map(trophy=><View key={trophy.trophyKey} style={s.trophy}><Text style={s.facilityName}>{trophy.label}</Text><Text style={s.note}>{trophy.description||trophy.sourceKind} · {new Date(trophy.earnedAtMs).toLocaleDateString()}</Text></View>)}{!state.trophies.length?<Text style={s.sub}>Completed eligible Guild Projects and raids will appear here.</Text>:null}</Panel>
  <GameButton title={loading?'Refreshing…':'Refresh Guild Hall'} tone="secondary" disabled={loading} onPress={()=>void load()}/>
  {!!error&&<Text style={s.error}>{error}</Text>}
 </View>;
}
const s=StyleSheet.create({root:{gap:spacing.md},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted,marginTop:4},note:{...typography.caption,color:C.muted},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},levelBadge:{flexDirection:'row',alignItems:'baseline',paddingHorizontal:10,paddingVertical:6,borderRadius:radii.md,borderWidth:1,borderColor:C.accent,backgroundColor:'#272417'},level:{color:C.accent,fontSize:18,fontWeight:'900'},levelMax:{color:C.muted,fontSize:10},track:{height:10,borderRadius:5,overflow:'hidden',backgroundColor:C.panel2,marginTop:10},fill:{height:'100%',backgroundColor:C.accent},facility:{minHeight:62,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line,paddingVertical:8},flex:{flex:1,minWidth:0},facilityName:{color:C.text,fontWeight:'900'},tier:{minWidth:54,height:32,borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},tierText:{color:C.accent,fontWeight:'900'},benefits:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},benefit:{flexGrow:1,minWidth:95,padding:9,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},value:{color:C.good,fontSize:16,fontWeight:'900'},cap:{...typography.caption,color:C.muted,marginTop:8},trophy:{paddingVertical:8,borderTopWidth:1,borderTopColor:C.line},error:{color:C.bad}});
import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Image,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {BoardTabs} from './BoardTabs';
import {QuestBoard} from './QuestBoard';
import {GuildSpecializationPaths} from './GuildSpecializationPaths';
import {StatBar} from './StatBar';
import {guildFacilityArtwork} from '../theme/guild-remaster-art';
import {GUILD_HALL_FACILITIES,DEFAULT_GUILD_HALL_POLICY} from '../core/guild-hall-v44';
import {loadOnlineGuildHallV44} from '../online/guild-hall-v44';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Projection=Awaited<ReturnType<typeof loadOnlineGuildHallV44>>;
type HallSection='Facilities'|'Skills'|'Trophies';
interface HallNavigation{activeSection?:HallSection;onSectionChange?:(section:HallSection|'Shop')=>void;}
export function OnlineGuildHallPanel(navigation:HallNavigation){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [projection,setProjection]=useState<Projection>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async(force=false)=>{setLoading(true);setError('');try{setProjection(await loadOnlineGuildHallV44(force))}catch(reason){setError(reason instanceof Error?reason.message:st('Unable to load Guild Hall.'))}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const navigationTabs=navigation.onSectionChange?<BoardTabs compact label="Guild Hall sections" items={(['Facilities','Skills','Trophies','Shop'] as const).map(id=>({id,label:id}))} value={navigation.activeSection??'Facilities'} onChange={navigation.onSectionChange}/>:null;
 if(loading&&!projection)return <View style={s.root}>{navigationTabs}<Panel><Text style={s.title}>{st('Guild Hall')}</Text><ActivityIndicator color={C.accent}/></Panel></View>;
 if(error&&!projection)return <View style={s.root}>{navigationTabs}<Panel><Text style={s.title}>{st('Guild Hall')}</Text><Text style={s.error}>{error}</Text><GameButton title={st('Retry')} tone="secondary" loading={loading} disabled={loading} onPress={()=>void load(true)}/></Panel></View>;
 if(!projection)return <View style={s.root}>{navigationTabs}<Panel><Text style={s.title}>{st('Guild Hall')}</Text><Text style={s.sub}>{st('Join a Guild to unlock long-term Guild Hall progression.')}</Text></Panel></View>;
 return <GuildHallView {...navigation} projection={projection} loading={loading} error={error} onRefresh={()=>void load(true)}/>;
}
export function GuildHallView({projection,loading=false,error='',onRefresh,activeSection,onSectionChange}:{projection:NonNullable<Projection>;loading?:boolean;error?:string;onRefresh?:()=>void}&HallNavigation){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[localSection,setSection]=useState<HallSection>('Facilities');
 const section=activeSection??localSection;
 const {state,level,stage}=projection;
 const nextThreshold=DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[level]??DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[9],prev=DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[Math.max(0,level-1)]??0;
 return <View style={s.root}>
  <BoardTabs compact label="Guild Hall sections" items={(onSectionChange?['Facilities','Skills','Trophies','Shop'] as const:['Facilities','Skills','Trophies'] as const).map(id=>({id,label:id}))} value={section} onChange={value=>{if(onSectionChange)onSectionChange(value);else if(value!=='Shop')setSection(value)}}/>
  <Panel><View style={s.between}><View style={s.flex}><Text style={s.kicker}>GUILD HALL</Text><Text accessibilityRole="header" style={s.title}>{stage}</Text><Text style={s.sub}>{state.lifetimeProjectsCompleted} completed projects</Text></View><View style={s.levelBadge}><Text style={s.level}>Lv {level}</Text><Text style={s.levelMax}>/10</Text></View></View><StatBar rounded label="Hall Progress" current={level>=10?1:state.hallProgress-prev} max={level>=10?1:nextThreshold-prev}/><Text style={s.note}>{level<10?Math.max(0,nextThreshold-state.hallProgress).toLocaleString()+' Hall Progress to level '+(level+1):'Launch Hall level cap reached.'}</Text></Panel>
  {section==='Facilities'?<View style={s.root}><Text style={s.kicker}>{st('Automatic progression')}</Text><Text style={s.sub}>Facilities improve through authored Guild Projects. Hall Progress is never spent.</Text>
   {GUILD_HALL_FACILITIES.map(def=>{const facility=state.facilities[def.id],tier=facility.tier,threshold=DEFAULT_GUILD_HALL_POLICY.facilityProgressThresholds[tier],requiredLevel=def.tierHallLevels[tier];return <View key={def.id} style={s.facility}>
    <View style={s.between}><Image source={guildFacilityArtwork(def.id)} resizeMode="contain" style={{width:56,height:56}}/><View style={s.flex}><Text style={s.facilityName}>{def.name}</Text><Text style={s.note}>{tier>=5?'Max tier':`Tier ${tier} → ${tier+1}`}</Text></View><Text style={s.tierText}>T{tier}/5</Text></View><Text style={s.sub}>{def.description}</Text>
    {tier<5?<><StatBar rounded label="Facility progress" current={Math.min(facility.progress,threshold)} max={threshold}/><Text style={[s.note,{color:level<requiredLevel?C.warning:C.muted}]}>{level<requiredLevel?`Hall Level ${requiredLevel} required · `:''}{Math.max(0,threshold-facility.progress).toLocaleString()} more facility progress from Projects</Text></>:null}
   </View>})}
  </View>:null}
  {section==='Skills'?<View style={s.root}><Panel><Text style={s.title}>Guild Skill Trees</Text><Text style={s.sub}>Permanent bonuses are chosen through three Guild Skill Trees. Hall facilities represent progression visually; their tiers do not automatically stack stat bonuses.</Text></Panel><GuildSpecializationPaths/></View>:null}
  {section==='Trophies'?<QuestBoard><View style={s.between}><Text style={s.title}>{st('Trophy Room')}</Text><Text style={s.note}>{state.trophies.length} recorded</Text></View>
   <Text style={s.sub}>Future Guild Legacy will preserve major trophies and season records permanently.</Text>
   {state.trophies.slice(0,10).map(trophy=><View key={trophy.trophyKey} style={s.facility}><Text style={s.facilityName}>{trophy.label}</Text><Text style={s.sub}>{trophy.description||trophy.sourceKind}</Text><Text style={s.note}>{new Date(trophy.earnedAtMs).toLocaleDateString()}</Text></View>)}
   {!state.trophies.length?<Text style={s.sub}>No trophies yet. Completed eligible Guild Projects and raids will appear here.</Text>:null}
  </QuestBoard>:null}
  {onRefresh?<GameButton compact title={loading?st('Refreshing…'):st('Refresh Guild Hall')} tone="secondary" disabled={loading} onPress={onRefresh}/>:null}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{gap:12},kicker:{fontSize:11,lineHeight:16,color:C.info,fontWeight:'700',letterSpacing:.7},title:{fontSize:19,lineHeight:25,color:C.text,fontWeight:'700'},sub:{fontSize:13,lineHeight:19,color:C.muted},note:{fontSize:12,lineHeight:18,color:C.muted},between:{flexDirection:'row',alignItems:'center',gap:10,justifyContent:'space-between'},flex:{flex:1,minWidth:0,gap:4},levelBadge:{flexDirection:'row',alignItems:'baseline',paddingHorizontal:8,paddingVertical:5,borderRadius:8,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.warningSurface},level:{color:C.accent,fontSize:18,fontWeight:'700'},levelMax:{color:C.muted,fontSize:12},facility:{padding:12,gap:10,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panelRaised},facilityName:{fontSize:15,lineHeight:21,color:C.text,fontWeight:'700'},tierText:{fontSize:13,color:C.accent,fontWeight:'600'},error:{fontSize:13,lineHeight:19,color:C.bad}});}

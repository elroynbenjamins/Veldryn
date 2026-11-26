import {useMemo} from 'react';
import {recentScreenText} from '../i18n/recent-screens';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {earlyFeatureUnlocked} from '../core/feature-unlocks';
import {activityQueueCapacity,normalizeActivityQueue} from '../core/activity-queue';
import {ThemedIcon} from './ThemedNavigationIcon';
import type {UiIconName} from '../theme/ui-icons';

type Props={state:GameState;forgeReadyCount:number;onGuild:()=>void;onDungeons:()=>void;onContracts:()=>void;onForge:()=>void;onQueue:()=>void};
export function HomeCommandDeck({state,forgeReadyCount,onGuild,onDungeons,onContracts,onForge,onQueue}:Props){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const a=(source:string,params?:Record<string,string|number>)=>recentScreenText(state.settings.language,source,params);
 const guild=earlyFeatureUnlocked(state,'guild'),social=earlyFeatureUnlocked(state,'social'),contracts=earlyFeatureUnlocked(state,'contracts');
 const capacity=activityQueueCapacity(state),queue=normalizeActivityQueue(state.character?.activityQueue,capacity);
 const member=!!state.account.guildMember;
 return <View style={s.section}>
  <View style={s.head}><View style={s.headCopy}><Text style={s.kicker}>{a('QUICK ACTIONS')}</Text><Text style={s.title}>{a('Your next moves')}</Text></View><Text style={s.sub}>{a('QUICK ACCESS')}</Text></View>
  {guild&&!member?<Pressable accessibilityRole="button" accessibilityLabel={member?a('Open Guild Hall'):a('Find a Guild')} onPress={onGuild} style={({pressed})=>[s.guild,pressed&&s.pressed]}>
    <View style={s.guildMark}><ThemedIcon name="guild" size={31}/></View>
    <View style={s.flex}><Text style={s.tileName}>{member?a('Guild Hall'):a('Find your Guild')}</Text><Text style={s.tileHint}>{member?a('Projects · Guild Shop · Chat'):a('Guild projects, events and co-op rewards')}</Text></View><Text style={s.chevron}>›</Text>
  </Pressable>:null}
  <View style={s.grid}>
    <DeckAction label={a('Activity queue')} detail={a('{count} / {capacity} queued',{count:queue.length,capacity})} mark="calendar" onPress={onQueue} s={s}/>
    {social?<DeckAction label={a('Dungeons')} detail={a('Co-op expeditions')} mark="dungeon" onPress={onDungeons} s={s}/>:null}
    {contracts?<DeckAction label={a('Contracts')} detail={a('Weekly objectives')} mark="quests" onPress={onContracts} s={s}/>:null}
    <DeckAction label={a('Forge')} detail={a('Queue, mastery & rewards')} mark="skills" onPress={onForge} badgeCount={forgeReadyCount} s={s}/>
  </View>
 </View>;
}
function DeckAction({label,detail,mark,onPress,badgeCount=0,s}:{label:string;detail:string;mark:UiIconName;onPress:()=>void;badgeCount?:number;s:ReturnType<typeof styles>}){
 const count=Number.isFinite(badgeCount)?Math.max(0,Math.floor(badgeCount)):0;
 return <Pressable accessibilityRole="button" accessibilityLabel={count>0?`${label}, ${count} ready to claim`:label} accessibilityHint={detail} onPress={onPress} style={({pressed})=>[s.tile,pressed&&s.pressed]}>
  <ThemedIcon name={mark} size={27}/><View style={s.flex}><Text numberOfLines={2} style={s.tileName}>{label}</Text><Text numberOfLines={2} style={s.tileHint}>{detail}</Text></View><Text style={s.chevron}>›</Text>
  {count>0?<View pointerEvents="none" accessible={false} style={s.readyBadge}><Text style={s.readyBadgeText}>{count>99?'99+':count}</Text></View>:null}
 </Pressable>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 section:{gap:7},head:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:8},headCopy:{flex:1,minWidth:0},
 kicker:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:1},
 title:{fontSize:16,fontWeight:'900',color:C.text,marginTop:2},sub:{fontSize:9,color:C.muted,fontWeight:'800',letterSpacing:.5,flexShrink:1,textAlign:'right'},
 guild:{flexDirection:'row',alignItems:'center',gap:11,padding:11,minHeight:70,borderWidth:1,borderRadius:13,borderColor:C.special,backgroundColor:C.specialSurface},
 guildMark:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:11,borderWidth:1,borderColor:C.special,backgroundColor:C.panel},
 guildGlyph:{fontSize:26,color:C.special},flex:{flex:1,minWidth:0,gap:3},
 tileName:{fontSize:13,fontWeight:'900',color:C.text},tileHint:{fontSize:10,color:C.muted},
 chevron:{color:C.accent,fontSize:21,fontWeight:'900'},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 tile:{position:'relative',flexBasis:'47%',flexGrow:1,minWidth:130,minHeight:68,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderRadius:10,borderColor:C.line,backgroundColor:C.panel},
 readyBadge:{position:'absolute',top:5,right:5,minWidth:19,height:19,borderRadius:10,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.panel,backgroundColor:C.notification},readyBadgeText:{fontSize:9,lineHeight:12,fontWeight:'900',color:C.notificationText},
 mark:{fontSize:22,color:C.info},pressed:{opacity:.73}
});}

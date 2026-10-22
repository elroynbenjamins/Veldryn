import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {earlyFeatureUnlocked} from '../core/feature-unlocks';
import {activityQueueCapacity,normalizeActivityQueue} from '../core/activity-queue';

type Props={state:GameState;onGuild:()=>void;onDungeons:()=>void;onContracts:()=>void;onForge:()=>void;onQueue:()=>void};
export function HomeCommandDeck({state,onGuild,onDungeons,onContracts,onForge,onQueue}:Props){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const guild=earlyFeatureUnlocked(state,'guild'),social=earlyFeatureUnlocked(state,'social'),contracts=earlyFeatureUnlocked(state,'contracts');
 const capacity=activityQueueCapacity(state),queue=normalizeActivityQueue(state.character?.activityQueue,capacity);
 const member=!!state.account.guildMember;
 return <View style={s.section}>
  <View style={s.head}><View><Text style={s.kicker}>ADVENTURER'S COMMAND DECK</Text><Text style={s.title}>Your next moves</Text></View><Text style={s.sub}>QUICK ACCESS</Text></View>
  {guild?<Pressable accessibilityRole="button" accessibilityLabel={member?'Open Guild Hall':'Find a Guild'} onPress={onGuild} style={({pressed})=>[s.guild,pressed&&s.pressed]}>
    <View style={s.guildMark}><Text style={s.guildGlyph}>⚑</Text></View>
    <View style={s.flex}><Text style={s.tileName}>{member?'Guild Hall':'Find your Guild'}</Text><Text style={s.tileHint}>{member?'Projects · Guild Shop · Chat':'Guild projects, events and co-op rewards'}</Text></View><Text style={s.chevron}>›</Text>
  </Pressable>:null}
  <View style={s.grid}>
    <DeckAction label="Activity queue" detail={queue.length+' / '+capacity+' queued'} mark="☷" onPress={onQueue} C={C} s={s}/>
    {social?<DeckAction label="Dungeons" detail="Co-op expeditions" mark="◇" onPress={onDungeons} C={C} s={s}/>:null}
    {contracts?<DeckAction label="Contracts" detail="Weekly objectives" mark="✧" onPress={onContracts} C={C} s={s}/>:null}
    <DeckAction label="Forge" detail="Crafting & upgrades" mark="⚒" onPress={onForge} C={C} s={s}/>
  </View>
 </View>;
}
function DeckAction({label,detail,mark,onPress,C,s}:{label:string;detail:string;mark:string;onPress:()=>void;C:ThemeColors;s:ReturnType<typeof styles>}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} onPress={onPress} style={({pressed})=>[s.tile,pressed&&s.pressed]}>
  <Text style={s.mark}>{mark}</Text><View style={s.flex}><Text numberOfLines={1} style={s.tileName}>{label}</Text><Text numberOfLines={1} style={s.tileHint}>{detail}</Text></View><Text style={s.chevron}>›</Text>
 </Pressable>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 section:{gap:9},head:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:8},
 kicker:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:1},
 title:{fontSize:18,fontWeight:'900',color:C.text,marginTop:3},sub:{fontSize:9,color:C.muted,fontWeight:'800',letterSpacing:.5},
 guild:{flexDirection:'row',alignItems:'center',gap:11,padding:11,minHeight:70,borderWidth:1,borderRadius:13,borderColor:C.special,backgroundColor:C.specialSurface},
 guildMark:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:11,borderWidth:1,borderColor:C.special,backgroundColor:C.panel},
 guildGlyph:{fontSize:26,color:C.special},flex:{flex:1,minWidth:0,gap:3},
 tileName:{fontSize:13,fontWeight:'900',color:C.text},tileHint:{fontSize:10,color:C.muted},
 chevron:{color:C.accent,fontSize:21,fontWeight:'900'},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 tile:{flexBasis:'47%',flexGrow:1,minWidth:130,minHeight:64,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingVertical:9,borderWidth:1,borderRadius:11,borderColor:C.line,backgroundColor:C.panel},
 mark:{fontSize:22,color:C.info},pressed:{opacity:.73}
});}

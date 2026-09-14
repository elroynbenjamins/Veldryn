import {Pressable,StyleSheet,Text,View} from 'react-native';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import type {GameState} from '../core/types';
import {C,equipmentColors,typography} from '../theme/theme';
import {ActivityArtwork} from './ActivityArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';

const labels={combat:'HUNTING',mining:'MINING',woodcutting:'WOODCUTTING',fishing:'FISHING'} as const;
function elapsed(startedAtMs:number,nowMs:number){const total=Math.max(0,Math.floor((nowMs-startedAtMs)/1000)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return hours?`${hours}h ${minutes}m`:minutes?`${minutes}m ${seconds}s`:`${seconds}s`;}

export function ActiveActivityBar({state,nowMs,onOpen}:{state:GameState;nowMs:number;onOpen:()=>void}){
 const activity=state.activity;
 if(!activity)return null;
 const monster=activity.kind==='combat'?MONSTERS.find(entry=>entry.id===activity.targetId):undefined;
 const gathering=activity.kind!=='combat'?GATHERING.find(entry=>entry.id===activity.targetId):undefined;
 const name=monster?.name??gathering?.name??activity.targetId;
 const cycleSeconds=Math.max(1,monster?.secondsPerKill??gathering?.seconds??1);
 const cycleElapsedSeconds=Math.max(0,(nowMs-activity.lastClaimAtMs)/1000);
 const progress=`${Math.round((cycleElapsedSeconds%cycleSeconds)/cycleSeconds*100)}%` as `${number}%`;
 const combat=activity.kind==='combat';
 return <Pressable accessibilityRole="button" accessibilityLabel={`${labels[activity.kind]} ${name}, active for ${elapsed(activity.startedAtMs,nowMs)}`} accessibilityHint="Opens the active activity" onPress={onOpen} style={({pressed})=>[s.root,combat?s.combat:s.skilling,pressed&&s.pressed]}>
  <View style={s.art}>{monster?<MonsterPortraitFrame monster={monster} size={38} active framed={false}/>:<ActivityArtwork id={activity.kind} size={36}/>}</View>
  <View style={s.copy}><View style={s.line}><Text numberOfLines={1} style={s.name}>{name}</Text><Text style={s.time}>{elapsed(activity.startedAtMs,nowMs)}</Text></View><View style={s.meta}><Text style={[s.kind,combat?s.combatText:s.skillText]}>{labels[activity.kind]}</Text><Text style={s.cycle}>{combat?'NEXT ENCOUNTER':'NEXT ACTION'}</Text></View><View style={s.track}><View style={[s.fill,combat?s.combatFill:s.skillFill,{width:progress}]}/></View></View>
  <Text style={s.chevron}>›</Text>
 </Pressable>;
}
const s=StyleSheet.create({root:{minHeight:64,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:8,backgroundColor:'#101724',borderBottomWidth:1},combat:{borderBottomColor:'#A74D58'},skilling:{borderBottomColor:'#3D93A8'},pressed:{opacity:.78},art:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#09111C'},copy:{flex:1,minWidth:0,gap:4},line:{flexDirection:'row',alignItems:'baseline',gap:8},name:{...typography.bodyStrong,color:C.text,flex:1},time:{...typography.caption,color:C.muted,fontVariant:['tabular-nums']},meta:{flexDirection:'row',alignItems:'center',gap:8},kind:{fontSize:10,lineHeight:13,fontWeight:'900',letterSpacing:.8},combatText:{color:'#F09A9F'},skillText:{color:'#83D3E1'},cycle:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'800'},track:{height:5,overflow:'hidden',borderRadius:3,backgroundColor:'#273142'},fill:{height:'100%',borderRadius:3},combatFill:{backgroundColor:'#E15B66'},skillFill:{backgroundColor:'#55C8DB'},chevron:{color:equipmentColors.goldSoft,fontSize:28,lineHeight:32}});

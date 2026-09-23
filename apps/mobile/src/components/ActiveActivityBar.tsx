import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import type {GameState} from '../core/types';
import {typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ActivityArtwork} from './ActivityArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {challengeHuntLabel} from '../core/challenge-hunts';
import {activeGatheringRuntimeProjection,activityProgressFeedback} from '../core/balance-projection';
import {activeCombatRuntimeProjection} from '../core/game';

const labels:Record<string,string>={combat:'HUNTING',mining:'MINING',woodcutting:'WOODCUTTING',fishing:'FISHING',herbalism:'HERBALISM',alchemy:'ALCHEMY',processing:'PROCESSING',faith:'FAITH',training:'TRAINING',hunting:'HUNTING',exploration:'EXPLORATION'};
function elapsed(startedAtMs:number,nowMs:number){const total=Math.max(0,Math.floor((nowMs-startedAtMs)/1000)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return hours?`${hours}h ${minutes}m`:minutes?`${minutes}m ${seconds}s`:`${seconds}s`;}

export function ActiveActivityBar({state,nowMs,onOpen}:{state:GameState;nowMs:number;onOpen:()=>void}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const activity=state.activity;
 if(!activity)return null;
 const combat=activity.kind==='combat';
 const monster=combat?MONSTERS.find(entry=>entry.id===activity.targetId):undefined;
 const gathering=!combat?[...GATHERING,...HERB_NODES].find(entry=>entry.id===activity.targetId):undefined,crafting=activity.kind==='processing'||activity.kind==='alchemy'?RECIPES.find(entry=>entry.id===activity.targetId):undefined;
 const combatRuntime=combat?activeCombatRuntimeProjection(state):undefined,gatherRuntime=!combat?activeGatheringRuntimeProjection(state):undefined;
 const name=monster?challengeHuntLabel(activity.combatChallengeId,monster.name,activity.combatAffixId):crafting?.name??gathering?.name??activity.targetId;
 const cycleSeconds=Math.max(1,combatRuntime?.killCycleSeconds??gatherRuntime?.cycleSeconds??activity.processing?.cycleSeconds??activity.brew?.cycleSeconds??gathering?.seconds??crafting?.seconds??1);
 const cycleElapsedSeconds=Math.max(0,(nowMs-activity.lastClaimAtMs)/1000),cycleProgressSeconds=(activity.progressFraction??0)*cycleSeconds+cycleElapsedSeconds;
 const completedCycles=Math.floor(cycleProgressSeconds/cycleSeconds),progressPct=Math.round((cycleProgressSeconds%cycleSeconds)/cycleSeconds*100),progress=`${progressPct}%` as `${number}%`;
 const progressKind=combat?'combat':activity.kind==='alchemy'||activity.kind==='processing'?'crafting':activity.kind==='faith'?'faith':activity.kind==='training'?'training':activity.kind==='exploration'?'exploration':'gathering',phase=activityProgressFeedback(progressKind,progressPct/100),cycleRemaining=Math.max(1,Math.ceil(cycleSeconds-(cycleProgressSeconds%cycleSeconds)));
 const sessionKills=combat?(activity.sessionKills??0)+completedCycles:0;
 const cycleCopy=combat?`NEXT KILL · ${cycleRemaining}s`:`${phase.replace('…','').toUpperCase()} · ${cycleRemaining}s`;
 return <Pressable accessibilityRole="button" accessibilityLabel={`${labels[activity.kind]} ${name}, active for ${elapsed(activity.startedAtMs,nowMs)}`} accessibilityHint="Opens the active activity" onPress={onOpen} style={({pressed})=>[s.root,combat?s.combat:s.skilling,pressed&&s.pressed]}>
  <View style={s.art}>{monster?<MonsterPortraitFrame monster={monster} size={38} active reduceMotion={state.settings.reduceMotion} framed={false}/>:<ActivityArtwork id={(crafting?.skillId??activity.kind) as any} size={36}/>}</View>
  <View style={s.copy}><View style={s.line}><Text numberOfLines={1} style={s.name}>{name}</Text><Text style={s.time}>{elapsed(activity.startedAtMs,nowMs)}</Text></View><View style={s.meta}><Text style={[s.kind,combat?s.combatText:s.skillText]}>{labels[activity.kind]}</Text><Text numberOfLines={1} style={s.cycle}>{cycleCopy}</Text></View>{combat?<><View style={s.combatStats}><Text style={s.hpText}>KILL #{sessionKills+1}</Text><Text style={s.damageText}>~{Math.round(combatRuntime?.killsPerHour??0)}/hr</Text><Text style={s.takenText}>~{Math.round(combatRuntime?.xpPerHour??0)} XP/hr</Text></View><View style={s.track}><View style={[s.fill,s.combatFill,{width:progress}]}/></View></>:<View style={s.track}><View style={[s.fill,s.skillFill,{width:progress}]}/></View>}</View>
  <Text style={s.chevron}>›</Text>
 </Pressable>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{minHeight:64,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:8,backgroundColor:C.panel,borderBottomWidth:1},combat:{borderBottomColor:C.bad},skilling:{borderBottomColor:C.info},pressed:{opacity:.78},art:{width:42,height:42,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:C.stage},copy:{flex:1,minWidth:0,gap:4},line:{flexDirection:'row',alignItems:'baseline',gap:8},name:{...typography.bodyStrong,color:C.text,flex:1},time:{...typography.caption,color:C.muted,fontVariant:['tabular-nums']},meta:{flexDirection:'row',alignItems:'center',gap:8},kind:{fontSize:10,lineHeight:13,fontWeight:'900',letterSpacing:.8},combatText:{color:C.bad},skillText:{color:C.info},cycle:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'800'},combatStats:{flexDirection:'row',alignItems:'center',gap:8},hpText:{fontSize:10,color:C.warning,fontWeight:'800'},damageText:{fontSize:10,color:C.bad,fontWeight:'900'},takenText:{fontSize:10,color:C.good,fontWeight:'800',marginLeft:'auto'},track:{height:6,overflow:'hidden',borderRadius:3,backgroundColor:C.panel2,position:'relative'},fill:{height:'100%',borderRadius:3},combatFill:{backgroundColor:C.bad},skillFill:{backgroundColor:C.info},chevron:{color:equipmentColors.goldSoft,fontSize:28,lineHeight:32}});}

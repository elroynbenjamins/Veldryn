import React,{useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {explorationRouteForRegion} from '../content/exploration';
import {WORLD_ZONES} from '../content/world-map';
import {MONSTERS} from '../content/monsters';
import {currentRegionId} from '../core/combat-region';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function ExplorationPanel({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),c=state.character;if(!c)return null;
 const regionId=currentRegionId(state),region=WORLD_ZONES.find(item=>item.id===regionId),route=explorationRouteForRegion(regionId);
 const explorationLevel=state.skills.find(skill=>skill.skillId==='exploration')?.level??1;
 if(!route)return <Panel><Text style={s.eyebrow}>EXPLORATION</Text><Text style={s.title}>No scouting route here yet</Text><Text style={s.body}>This region does not currently have an authored Exploration route.</Text></Panel>;
 const levelReady=c.level>=route.requiredLevel,explorationReady=explorationLevel>=route.requiredExplorationLevel,ready=levelReady&&explorationReady;
 const found=!!route.unlockMonsterId&&state.unlockedMonsterIds.includes(route.unlockMonsterId);
 const monster=route.unlockMonsterId?MONSTERS.find(item=>item.id===route.unlockMonsterId):undefined;
 const nextRegion=route.unlockRegionId?WORLD_ZONES.find(item=>item.id===route.unlockRegionId):undefined;
 const stateLabel=found?'DISCOVERED':!levelReady?`CHAR LV ${route.requiredLevel}`:!explorationReady?`EXP LV ${route.requiredExplorationLevel}`:'READY';
 return <Panel>
  <View style={s.heading}><View style={s.flex}><Text style={s.eyebrow}>REGIONAL EXPLORATION</Text><Text style={s.title}>{route.name}</Text><Text style={s.body}>Exploration reveals hidden encounters and charts safe routes toward the next region. Character level still controls combat readiness.</Text></View><View style={s.regionBadge}><Text style={s.regionBadgeLabel}>CURRENT</Text><Text numberOfLines={2} style={s.regionBadgeValue}>{region?.name??regionId}</Text></View></View>
  <View style={[s.route,ready&&s.routeReady]}>
   <View style={s.inline}><Text style={s.routeName}>{route.seconds}s scouting route</Text><Text style={[s.tag,found?s.tagFound:ready?s.tagReady:s.tagLocked]}>{stateLabel}</Text></View>
   <Text style={s.routeMeta}>{route.xp} Exploration XP · Requires Level {route.requiredLevel} + Exploration {route.requiredExplorationLevel}</Text>
   <View style={s.discoveryList}>
    {monster?<View style={s.discoveryRow}><Text style={s.discoveryMark}>{found?'◆':'◇'}</Text><View style={s.flex}><Text style={s.discoveryTitle}>{monster.name}</Text><Text style={s.discoveryMeta}>{found?'Encounter discovered':`Hidden encounter · combat requires Level ${monster.unlockLevel}`}</Text></View></View>:null}
    {nextRegion?<View style={s.discoveryRow}><Text style={s.discoveryMark}>{found?'◆':'◇'}</Text><View style={s.flex}><Text style={s.discoveryTitle}>Road to {nextRegion.name}</Text><Text style={s.discoveryMeta}>{found?`Route charted · travel requires Level ${nextRegion.minLevel}`:'Complete one scouting action to chart this road'}</Text></View></View>:null}
   </View>
   <GameButton compact title={found&&ready?'Scout again':ready?'Scout region':!levelReady?`Requires character level ${route.requiredLevel}`:`Requires Exploration ${route.requiredExplorationLevel}`} disabled={!ready} tone={ready?'primary':'secondary'} onPress={()=>void onCommand({type:'explore',args:{id:route.id}})}/>
  </View>
  {nextRegion?<View style={s.frontier}><View style={s.flex}><Text style={s.frontierLabel}>NEXT FRONTIER</Text><Text style={s.frontierTitle}>{nextRegion.name}</Text><Text style={s.frontierMeta}>{found?'Road discovered':'Road not discovered'} · Character Level {c.level}/{nextRegion.minLevel}</Text></View><Text style={[s.frontierState,found&&c.level>=nextRegion.minLevel?s.frontierReady:s.frontierLocked]}>{found&&c.level>=nextRegion.minLevel?'READY':found?'LEVEL':'SCOUT'}</Text></View>:null}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},heading:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},eyebrow:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.9},title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},regionBadge:{maxWidth:112,alignItems:'flex-end',paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.info,borderRadius:10,backgroundColor:C.infoSurface},regionBadgeLabel:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.7},regionBadgeValue:{...typography.caption,color:C.text,fontWeight:'800',textAlign:'right'},
 route:{gap:8,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},routeReady:{padding:spacing.sm,borderWidth:1,borderColor:C.selectionLine,borderRadius:10,backgroundColor:C.selection},inline:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6},routeName:{...typography.bodyStrong,color:C.text},routeMeta:{...typography.caption,color:C.muted},tag:{fontSize:9,fontWeight:'900',letterSpacing:.7},tagReady:{color:C.good},tagFound:{color:C.special},tagLocked:{color:C.warning},
 discoveryList:{gap:6},discoveryRow:{minHeight:42,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},discoveryMark:{fontSize:14,color:C.info,fontWeight:'900'},discoveryTitle:{...typography.bodyStrong,color:C.text},discoveryMeta:{...typography.caption,color:C.muted},
 frontier:{minHeight:58,flexDirection:'row',alignItems:'center',gap:8,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},frontierLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.8},frontierTitle:{...typography.bodyStrong,color:C.text},frontierMeta:{...typography.caption,color:C.muted},frontierState:{fontSize:9,fontWeight:'900',letterSpacing:.7},frontierReady:{color:C.good},frontierLocked:{color:C.warning}
});}

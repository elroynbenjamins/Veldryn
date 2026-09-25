import React,{useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {EXPLORATION_ROUTES} from '../content/exploration';
import {WORLD_ZONES} from '../content/world-map';
import {currentRegionId} from '../core/combat-region';
import {explorationRouteCompleted} from '../core/exploration-progression';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function ExplorationPanel({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),c=state.character;if(!c)return null;
 const regionId=currentRegionId(state),region=WORLD_ZONES.find(item=>item.id===regionId),explorationLevel=state.skills.find(skill=>skill.skillId==='exploration')?.level??1;
 const routes=[...EXPLORATION_ROUTES].sort((a,b)=>Number(b.zoneId===regionId)-Number(a.zoneId===regionId)||a.requiredLevel-b.requiredLevel);
 return <Panel>
  <View style={s.heading}><View style={s.flex}><Text style={s.eyebrow}>SCOUTING ROUTES</Text><Text style={s.title}>Explore the world</Text><Text style={s.body}>Scouting is the fastest way to train Exploration. Combat also grants a small amount passively as you learn a region. First route completions reveal encounters and open roads to later regions.</Text></View><View style={s.regionBadge}><Text style={s.regionBadgeLabel}>CURRENT</Text><Text numberOfLines={2} style={s.regionBadgeValue}>{region?.name??regionId}</Text></View></View>
  {routes.map(route=>{const zone=WORLD_ZONES.find(item=>item.id===route.zoneId),nextZone=route.unlockRegionId?WORLD_ZONES.find(item=>item.id===route.unlockRegionId):undefined,here=regionId===route.zoneId,characterReady=c.level>=route.requiredLevel,explorationReady=explorationLevel>=route.requiredExplorationLevel,ready=here&&characterReady&&explorationReady,completed=explorationRouteCompleted(state,route.id),found=!!route.unlockMonsterId&&state.unlockedMonsterIds.includes(route.unlockMonsterId);const stateLabel=completed?'SCOUTED':!characterReady?`CHAR LV ${route.requiredLevel}`:!explorationReady?`EXP LV ${route.requiredExplorationLevel}`:!here?'TRAVEL':'READY';return <View key={route.id} style={[s.route,ready&&s.routeReady]}>
   <View style={s.routeTop}><View style={s.flex}><View style={s.inline}><Text style={s.routeName}>{route.name}</Text><Text style={[s.tag,ready?s.tagReady:completed?s.tagFound:s.tagLocked]}>{stateLabel}</Text></View><Text style={s.routeMeta}>{zone?.name??route.zoneId} · {route.seconds}s · {route.xp} Exploration XP · requires Exp Lv {route.requiredExplorationLevel}</Text>
   {route.unlockMonsterId?<Text style={s.reward}>{found?'Encounter revealed':'First completion reveals a regional encounter'}</Text>:null}
   {nextZone?<Text style={s.reward}>{completed?`${nextZone.name} route discovered`:`First completion discovers the road to ${nextZone.name}`}</Text>:null}</View></View>
   <GameButton compact title={completed&&ready?'Scout again':ready?'Scout':!characterReady?`Requires Level ${route.requiredLevel}`:!explorationReady?`Requires Exploration ${route.requiredExplorationLevel}`:`Travel to ${zone?.name??route.zoneId}`} disabled={!ready} tone={ready?'primary':'secondary'} onPress={()=>void onCommand({type:'explore',args:{id:route.id}})}/>
  </View>})}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},heading:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},eyebrow:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.9},title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},regionBadge:{maxWidth:112,alignItems:'flex-end',paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.info,borderRadius:10,backgroundColor:C.infoSurface},regionBadgeLabel:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.7},regionBadgeValue:{...typography.caption,color:C.text,fontWeight:'800',textAlign:'right'},
 route:{gap:7,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},routeReady:{padding:spacing.sm,borderWidth:1,borderColor:C.selectionLine,borderRadius:10,backgroundColor:C.selection},routeTop:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},inline:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6},routeName:{...typography.bodyStrong,color:C.text},routeMeta:{...typography.caption,color:C.muted,marginTop:2},reward:{...typography.caption,color:C.info,fontWeight:'800',marginTop:2},tag:{fontSize:8.5,fontWeight:'900',letterSpacing:.65,paddingHorizontal:6,paddingVertical:2,borderWidth:1,borderRadius:99},tagReady:{color:C.good,borderColor:C.good,backgroundColor:C.goodSurface},tagFound:{color:C.info,borderColor:C.info,backgroundColor:C.infoSurface},tagLocked:{color:C.muted,borderColor:C.line,backgroundColor:C.panel2},
 });}

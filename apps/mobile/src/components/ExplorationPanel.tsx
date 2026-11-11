import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import React,{useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {EXPLORATION_ROUTES,explorationGatheringSpeedBonus,explorationScoutingSpeedMultiplier,unmetScoutingPrerequisite} from '../content/exploration';
import {WORLD_ZONES,worldZoneInDevelopment} from '../content/world-map';
import {regionalArea} from '../content/regional-areas';
import {currentRegionId} from '../core/combat-region';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function ExplorationPanel({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
 const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
 const p=(text:string)=>progressionText(language,text);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),c=state.character;
 const [showOtherRegions,setShowOtherRegions]=useState(false);
 if(!c)return null;
 const regionId=currentRegionId(state),region=WORLD_ZONES.find(item=>item.id===regionId);
 const exploration=state.skills.find(skill=>skill.skillId==='exploration')?.level??1;
 const currentRoutes=EXPLORATION_ROUTES.filter(route=>route.zoneId===regionId);
 const otherRoutes=EXPLORATION_ROUTES.filter(route=>route.zoneId!==regionId);
 const shownRoutes=showOtherRegions?[...currentRoutes,...otherRoutes]:currentRoutes;
 const explored=state.exploredRouteIds??[];
 const mapped=currentRoutes.filter(route=>explored.includes(route.id)).length;
 const gatheringPercent=Math.round(explorationGatheringSpeedBonus(exploration)*100);
 const scoutPercent=Math.round((explorationScoutingSpeedMultiplier(exploration)-1)*100);
 const nextPerkLevel=exploration>=100?undefined:Math.min(100,(Math.floor(exploration/10)+1)*10);

 return <Panel>
  <View style={s.heading}>
   <View style={s.flex}>
    <Text style={s.eyebrow}>{t('SCOUTING ROUTES')}</Text>
    <Text style={s.title}>{t('Explore the world')}</Text>
    <Text style={s.body}>{p('Scouting reveals encounters and discovers routes between regions. Combat also earns passive Exploration XP.')}</Text>
   </View>
   <View style={s.regionBadge}><Text style={s.regionBadgeLabel}>{t('CURRENT')}</Text><Text numberOfLines={2} style={s.regionBadgeValue}>{region?.name??regionId}</Text></View>
  </View>

  <View style={s.mastery}>
   <Text style={s.masteryLabel}>{p('TRAILCRAFT · PASSIVE BENEFITS')}</Text>
   <Text style={s.masteryValue}>{p('Gathering speed')} +{gatheringPercent}%  ·  {p('Scouting speed')} +{scoutPercent}%</Text>
   <Text style={s.masteryHint}>{nextPerkLevel? p('Next Trailcraft upgrade at Exploration Lv')+' '+nextPerkLevel : p('Trailcraft fully mastered')}</Text>
  </View>

  <View style={s.sectionHeading}>
   <Text style={s.sectionTitle}>{p('CURRENT REGION SURVEYS')}</Text>
   <Text style={s.sectionProgress}>{mapped}/{currentRoutes.length} {t('MAPPED')}</Text>
  </View>
  {!currentRoutes.length?<Text style={s.body}>{p('No scouting surveys are available in this region yet.')}</Text>:null}
  {shownRoutes.map(route=>{
   const zone=WORLD_ZONES.find(item=>item.id===route.zoneId);
   const area=route.areaId?regionalArea(route.zoneId,route.areaId):undefined;
   const here=regionId===route.zoneId,completed=explored.includes(route.id);
   const available=!!zone&&!worldZoneInDevelopment(zone);
   const characterReady=c.level>=route.requiredLevel,explorationReady=exploration>=route.requiredExplorationLevel;
   const prerequisite=unmetScoutingPrerequisite(route,explored);
   const ready=here&&available&&characterReady&&explorationReady&&!prerequisite;
   const found=!!route.unlockMonsterId&&state.unlockedMonsterIds.includes(route.unlockMonsterId);
   const stateLabel=completed?t('MAPPED'):!available?t('In Development'):!characterReady?'CHAR LV '+route.requiredLevel:!explorationReady?'EXP LV '+route.requiredExplorationLevel:prerequisite?p('PRIOR SURVEY'):!here?t('TRAVEL'):t('READY');
   const buttonLabel=!available?t('In Development'):!characterReady?p('Character Lv')+' '+route.requiredLevel:!explorationReady?p('Exploration Lv')+' '+route.requiredExplorationLevel:prerequisite?p('Finish prior survey'):!here?p('Travel to')+' '+(zone?.name??route.zoneId):completed?t('Scout again'):t('Scout');
   return <View key={route.id} style={[s.route,ready&&s.routeReady]}>
    <View style={s.inline}>
     <View style={s.flex}><Text style={s.routeName}>{route.name}</Text>{area?<Text style={s.areaName}>{p(area.name)}</Text>:null}</View>
     <Text style={[s.tag,ready?s.tagReady:completed?s.tagFound:s.tagLocked]}>{stateLabel}</Text>
    </View>
    <Text style={s.routeMeta}>{zone?.name??route.zoneId} · {Math.round(route.seconds/explorationScoutingSpeedMultiplier(exploration))}s · {route.xp} {p('Exploration XP')} · {p('Exp Lv')} {route.requiredExplorationLevel}</Text>
    {prerequisite?<Text style={s.prerequisite}>{p('First map')} {prerequisite.name}</Text>:null}
    {route.unlockMonsterId?<Text style={s.reward}>{found?t('Encounter revealed'):t('Reveals a regional encounter')}</Text>:null}
    {route.unlockZoneId?<Text style={s.reward}>{completed?p('Route discovered to'):p('Discovers the route to')} {WORLD_ZONES.find(item=>item.id===route.unlockZoneId)?.name??route.unlockZoneId}</Text>:null}
    <GameButton compact title={buttonLabel} disabled={!ready} tone={ready?'primary':'secondary'} onPress={()=>onCommand({type:'explore',args:{id:route.id}})}/>
   </View>;
  })}
  {otherRoutes.length?<Pressable accessibilityRole="button" accessibilityState={{expanded:showOtherRegions}} onPress={()=>setShowOtherRegions(open=>!open)} style={({pressed})=>[s.otherToggle,pressed&&s.pressed]}>
   <Text style={s.otherLabel}>{showOtherRegions?p('Hide other regions'):p('View other regions')} ({otherRoutes.length})</Text>
   <Text style={s.otherMark}>{showOtherRegions?'−':'+'}</Text>
  </Pressable>:null}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},
 heading:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
 eyebrow:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.9},
 title:{...typography.title,color:C.text},
 body:{...typography.body,color:C.muted},
 regionBadge:{maxWidth:112,alignItems:'flex-end',paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.info,borderRadius:10,backgroundColor:C.infoSurface},
 regionBadgeLabel:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.7},
 regionBadgeValue:{...typography.caption,color:C.text,fontWeight:'800',textAlign:'right'},
 mastery:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel2},
 masteryLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.7},
 masteryValue:{...typography.bodyStrong,color:C.good,fontSize:12},
 masteryHint:{...typography.caption,color:C.muted},
 sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:spacing.xs},
 sectionTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.6},
 sectionProgress:{...typography.caption,color:C.good,fontWeight:'900'},
 route:{gap:6,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},
 routeReady:{padding:spacing.sm,borderWidth:1,borderColor:C.selectionLine,borderRadius:10,backgroundColor:C.selection},
 inline:{flexDirection:'row',alignItems:'center',gap:6},
 routeName:{...typography.bodyStrong,color:C.text},
 areaName:{...typography.caption,color:C.info},
 routeMeta:{...typography.caption,color:C.muted},
 prerequisite:{...typography.caption,color:C.warning},
 reward:{...typography.caption,color:C.accent},
 tag:{fontSize:9,fontWeight:'900',letterSpacing:.7},
 tagReady:{color:C.good},tagFound:{color:C.special},tagLocked:{color:C.warning},
 otherToggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel},
 otherLabel:{...typography.bodyStrong,color:C.text},
 otherMark:{fontSize:20,color:C.accent,fontWeight:'900'},
 pressed:{opacity:.7}
});}

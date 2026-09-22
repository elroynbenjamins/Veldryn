import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState,GatheringSkillId} from '../core/types';
import {GATHERING,type GatherDef} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {itemDef} from '../content/items';
import {GATHER_TIME_SCALE} from '../core/game';
import {environmentEffect,environmentForZone} from '../core/world-weather';
import {gatheringPacing} from '../core/gathering-tools';
import {characterPermanentMultipliers} from '../core/permanent-boosts';
import {currentRegionId} from '../core/combat-region';
import {WORLD_ZONES} from '../content/world-map';
import {formatGameNumber} from '../core/number-format';
import {Panel} from './Panel';
import {ResourceArtwork} from './ResourceArtwork';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function metrics(state:GameState,activity:GatherDef,offlineHours:number){
 const environment=environmentForZone(activity.zoneId),effect=environmentEffect(activity.skillId,environment),pacing=gatheringPacing(state,activity),permanent=characterPermanentMultipliers(state);
 const cycle=activity.seconds*GATHER_TIME_SCALE*pacing.timeMultiplier*effect.actionTimeMultiplier/permanent.gatheringSpeedMultiplier;
 const actionsPerHour=3600/Math.max(.1,cycle);
 const itemsPerHour=actionsPerHour*((activity.min+activity.max)/2)*effect.itemMultiplier;
 const xpPerHour=actionsPerHour*activity.xp*effect.xpMultiplier*permanent.skillXpMultiplier;
 const capActions=Math.floor(offlineHours*3600/cycle);
 return {cycle,itemsPerHour,xpPerHour,capActions,baselineItems:Math.floor(capActions*activity.min*effect.itemMultiplier),capXp:Math.floor(capActions*activity.xp*effect.xpMultiplier*permanent.skillXpMultiplier),pacing};
}

export function GatheringActivityList({state,skillId,skillLevel,offlineHours,queueFull,preferredActionId,onGather,onQueueGather}:{state:GameState;skillId:GatheringSkillId;skillLevel:number;offlineHours:number;queueFull:boolean;preferredActionId?:string;onGather:(id:string)=>void;onQueueGather:(id:string)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const all=[...GATHERING,...HERB_NODES].filter(row=>row.skillId===skillId);
 const regionId=currentRegionId(state),region=WORLD_ZONES.find(row=>row.id===regionId)??WORLD_ZONES[0];
 const regional=all.filter(row=>row.zoneId===region.id).sort((a,b)=>Number(b.id===preferredActionId)-Number(a.id===preferredActionId)||a.unlockLevel-b.unlockLevel).map(activity=>({activity,view:metrics(state,activity,offlineHours)}));
 const fastest=[...regional].filter(row=>skillLevel>=row.activity.unlockLevel).sort((a,b)=>b.view.xpPerHour-a.view.xpPerHour)[0];
 const next=[...all].filter(row=>row.unlockLevel>skillLevel).sort((a,b)=>a.unlockLevel-b.unlockLevel)[0];
 const nextZone=next?WORLD_ZONES.find(row=>row.id===next.zoneId):undefined;
 return <>
  <View style={s.guidanceRow}>
   <View style={[s.guidanceCard,s.fastCard]}><Text style={s.guidanceLabel}>FASTEST XP HERE</Text><Text numberOfLines={1} style={s.guidanceValue}>{fastest?.activity.name??'No unlocked node'}</Text><Text style={s.guidanceHint}>{fastest?formatGameNumber(Math.round(fastest.view.xpPerHour),state.settings.numberMode)+' XP/hr':'Travel or level up to continue.'}</Text></View>
   <View style={s.guidanceCard}><Text style={s.guidanceLabel}>NEXT SKILL UNLOCK</Text><Text numberOfLines={1} style={s.guidanceValue}>{next?'Lv '+next.unlockLevel+' · '+next.name:'Skill path complete'}</Text><Text style={s.guidanceHint}>{next?(nextZone?.name??next.zoneId):'No higher-level node configured.'}</Text></View>
  </View>
  {regional.map(({activity,view})=>{
   const active=state.activity?.targetId===activity.id,target=preferredActionId===activity.id,unlocked=skillLevel>=activity.unlockLevel,fastestXp=fastest?.activity.id===activity.id,resource=itemDef(activity.itemId),pacing=view.pacing;
   return <Panel key={activity.id} accentColor={active?C.good:target?C.accent:fastestXp?C.info:undefined}>
    <View style={s.heading}><ResourceArtwork itemId={activity.itemId} size={58}/><View style={s.flex}><View style={s.nameRow}><Text style={s.name}>{activity.name}</Text>{target?<Text style={s.targetTag}>TARGET</Text>:null}{fastestXp?<Text style={s.fastTag}>FASTEST XP</Text>:null}{!unlocked?<Text style={s.lockTag}>LV {activity.unlockLevel}</Text>:null}</View><Text style={s.sub}>{resource.name} · every {view.cycle.toFixed(1)}s</Text></View>{activity.recommendedToolTier>0?<View style={[s.tierBadge,pacing.atRecommendedTier?s.tierReady:s.tierSlow]}><Text style={s.tierText}>T{activity.recommendedToolTier}</Text></View>:<View style={[s.tierBadge,s.handBadge]}><Text style={s.handText}>HAND</Text></View>}</View>
    <View style={s.rateStrip}><View style={s.rateCell}><Text style={s.rateLabel}>EXPECTED / HR</Text><Text numberOfLines={1} style={s.rateValue}>~{formatGameNumber(Math.round(view.itemsPerHour),state.settings.numberMode)} {resource.name}</Text></View><View style={s.rateCell}><Text style={s.rateLabel}>SKILL XP / HR</Text><Text style={s.rateValue}>{formatGameNumber(Math.round(view.xpPerHour),state.settings.numberMode)}</Text></View></View>
    <Text style={pacing.atRecommendedTier?s.readyText:s.slowText}>{pacing.atRecommendedTier?(pacing.tool?pacing.tool.name+' meets the recommended pace for this node.':'No tool tier is required for this node.'):'Recommended: '+(pacing.recommended?.name??'higher-tier tool')+'. Current pace is ×'+pacing.timeMultiplier.toFixed(2)+' before weather.'}</Text>
    <Text style={s.pacing}>{offlineHours}h AFK estimate: {formatGameNumber(view.capActions,state.settings.numberMode)} actions · {formatGameNumber(view.baselineItems,state.settings.numberMode)}+ items · {formatGameNumber(view.capXp,state.settings.numberMode)} XP</Text>
    <View style={s.actions}><View style={s.queue}><GameButton disabled={!unlocked||queueFull} title={queueFull?'Queue full':'Queue'} tone="secondary" onPress={()=>onQueueGather(activity.id)}/></View><View style={s.start}><GameButton disabled={!unlocked||active} title={active?'Currently gathering':!unlocked?'Requires '+skillId+' level '+activity.unlockLevel:'Gather '+activity.name} onPress={()=>onGather(activity.id)}/></View></View>
   </Panel>;
  })}
  {regional.length===0?<Text style={s.unavailable}>No {skillId} activity is available in {region.name}. Travel to another region from World.</Text>:null}
 </>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},guidanceRow:{flexDirection:'row',gap:8},guidanceCard:{flex:1,minWidth:0,padding:9,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},fastCard:{borderColor:C.info,backgroundColor:C.infoSurface},guidanceLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.7},guidanceValue:{...typography.bodyStrong,color:C.text},guidanceHint:{...typography.caption,color:C.muted},
 heading:{minHeight:62,flexDirection:'row',alignItems:'center',gap:spacing.sm},nameRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6},name:{...typography.title,color:C.text},sub:{...typography.caption,color:C.muted},targetTag:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:.6},fastTag:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.6},lockTag:{fontSize:9,color:C.warning,fontWeight:'900',letterSpacing:.6},
 tierBadge:{minWidth:42,height:36,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:8},handBadge:{borderColor:C.special,backgroundColor:C.specialSurface},handText:{fontSize:9,color:C.special,fontWeight:'900',letterSpacing:.5},tierReady:{borderColor:C.good,backgroundColor:C.goodSurface},tierSlow:{borderColor:C.warning,backgroundColor:C.warningSurface},tierText:{...typography.bodyStrong,color:C.text},
 rateStrip:{flexDirection:'row',gap:8,paddingVertical:2},rateCell:{flex:1,minWidth:0},rateLabel:{fontSize:8.5,color:C.muted,fontWeight:'900',letterSpacing:.65},rateValue:{...typography.caption,color:C.text,fontWeight:'800'},
 readyText:{...typography.caption,color:C.good,fontWeight:'800',paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderWidth:1,borderColor:C.good,borderRadius:8,backgroundColor:C.goodSurface},slowText:{...typography.caption,color:C.warning,fontWeight:'800',paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderWidth:1,borderColor:C.warning,borderRadius:8,backgroundColor:C.warningSurface},pacing:{...typography.caption,color:C.info},
 actions:{flexDirection:'row',gap:8},queue:{flex:1},start:{flex:2},unavailable:{...typography.body,color:C.muted,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel}
});}

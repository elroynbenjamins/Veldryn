import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState,GatheringSkillId} from '../core/types';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {itemDef} from '../content/items';
import {currentRegionId} from '../core/combat-region';
import {WORLD_ZONES} from '../content/world-map';
import {formatGameNumber} from '../core/number-format';
import {ResourceArtwork} from './ResourceArtwork';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {gatheringProgressionAction} from '../core/skill-progression-navigation';
import type {WorkingTowardDestination} from '../core/working-toward';
import {gatheringBalanceProjection} from '../core/balance-projection';

/** A normal gathering skill is deliberately one tap: select a resource and begin. */
export function GatheringActivityList({state,skillId,skillLevel,preferredActionId,onGather,onNavigate}:{state:GameState;skillId:GatheringSkillId;skillLevel:number;preferredActionId?:string;onGather:(id:string)=>void;onNavigate?:(destination:WorkingTowardDestination)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const regionId=currentRegionId(state),region=WORLD_ZONES.find(row=>row.id===regionId)??WORLD_ZONES[0];
 const nodes=[...GATHERING,...HERB_NODES].filter(row=>row.skillId===skillId).sort((a,b)=>Number(b.zoneId===region.id)-Number(a.zoneId===region.id)||Number(b.id===preferredActionId)-Number(a.id===preferredActionId)||a.unlockLevel-b.unlockLevel);
 const stock=(itemId:string)=>[...state.inventory.stacks,...state.bank.stacks].filter(row=>row.itemId===itemId).reduce((total,row)=>total+row.quantity,0);
 return <View style={s.root}>
  <Text style={s.instruction}>Tap a resource to begin gathering.</Text>
  {nodes.map(activity=>{
   const active=state.activity?.targetId===activity.id,inCurrentRegion=activity.zoneId===region.id,unlocked=skillLevel>=activity.unlockLevel,resource=itemDef(activity.itemId),nodeRegion=WORLD_ZONES.find(row=>row.id===activity.zoneId),view=gatheringBalanceProjection(state,activity,0),available=stock(activity.itemId);
   const start=()=>{if(active||!inCurrentRegion)return;if(unlocked)onGather(activity.id);else onNavigate?.(gatheringProgressionAction(state,activity).destination);};
   return <Pressable key={activity.id} accessibilityRole="button" accessibilityLabel={active?`${activity.name} is currently gathering`:!inCurrentRegion?`${activity.name} is in ${nodeRegion?.name??activity.zoneId}`:unlocked?`Gather ${activity.name}`:`Train to gather ${activity.name}`} accessibilityState={{disabled:active||!inCurrentRegion,selected:active||inCurrentRegion}} disabled={active||!inCurrentRegion||(!unlocked&&!onNavigate)} onPress={start} style={({pressed})=>[s.card,inCurrentRegion&&s.cardCurrent,active&&s.cardActive,(!unlocked||!inCurrentRegion)&&s.cardLocked,pressed&&!active&&inCurrentRegion&&s.pressed]}>
    <ResourceArtwork itemId={activity.itemId} size={34}/>
    <View style={s.copy}><View style={s.topLine}><View style={s.nameLine}><Text style={s.name}>{activity.name}</Text>{inCurrentRegion&&<Text style={s.regionTag}>HERE</Text>}</View><Text style={s.xp}>+{formatGameNumber(Math.round(activity.xp),state.settings.numberMode)} XP</Text></View><Text style={active?s.activeMeta:s.meta}>{active?'Gathering now':!inCurrentRegion?`Region: ${nodeRegion?.name??activity.zoneId}`:unlocked?`Have: ${formatGameNumber(available,state.settings.numberMode)} ${resource.name} · ${view.cycleSeconds.toFixed(1)}s`:`Unlocks at ${skillId} level ${activity.unlockLevel}`}</Text></View>
   </Pressable>;
  })}
  {!nodes.length&&<Text style={s.empty}>No {skillId} resources are configured.</Text>}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:8},instruction:{fontSize:13,lineHeight:19,color:C.muted,textAlign:'center',fontWeight:'600',paddingBottom:2},card:{minHeight:64,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},cardCurrent:{borderColor:C.selectionLine,backgroundColor:C.selection},cardActive:{borderColor:C.good,backgroundColor:C.goodSurface},cardLocked:{opacity:.6},copy:{flex:1,minWidth:0,gap:3},topLine:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:8},nameLine:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:6},name:{flexShrink:1,fontSize:14,lineHeight:20,color:C.text,fontWeight:'800'},regionTag:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.7},xp:{fontSize:11,lineHeight:16,color:C.accentSoft,fontWeight:'800'},meta:{fontSize:11,lineHeight:16,color:C.muted},activeMeta:{fontSize:11,lineHeight:16,color:C.good,fontWeight:'800'},pressed:{opacity:.76},empty:{fontSize:13,lineHeight:20,color:C.muted,textAlign:'center',padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel}
});}

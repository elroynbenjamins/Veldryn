import {useGameplayText} from '../i18n/gameplay';
import {useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
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
import {gatheringDropPercent,gatheringDropPreview,type GatheringDropPreviewRow} from '../core/gathering-drop-preview';
import {petArtSource} from '../theme/pet-art';

/** A normal gathering skill is deliberately one tap: select a resource and begin. */
export function GatheringActivityList({state,skillId,skillLevel,preferredActionId,onGather,onNavigate,currentRegionOnly=false,showInstruction=true}:{state:GameState;skillId:GatheringSkillId;skillLevel:number;preferredActionId?:string;onGather:(id:string)=>void;onNavigate?:(destination:WorkingTowardDestination)=>void;currentRegionOnly?:boolean;showInstruction?:boolean}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [expandedDropId,setExpandedDropId]=useState<string|null>(null);
 const regionId=currentRegionId(state),region=WORLD_ZONES.find(row=>row.id===regionId)??WORLD_ZONES[0];
 const nodes=[...GATHERING,...HERB_NODES].filter(row=>row.skillId===skillId&&(!currentRegionOnly||row.zoneId===region.id)).sort((a,b)=>Number(b.zoneId===region.id)-Number(a.zoneId===region.id)||Number(b.id===preferredActionId)-Number(a.id===preferredActionId)||a.unlockLevel-b.unlockLevel);
 const stock=(itemId:string)=>[...state.inventory.stacks,...state.bank.stacks].filter(row=>row.itemId===itemId).reduce((total,row)=>total+row.quantity,0);
 return <View style={s.root}>
  {showInstruction?<Text style={s.instruction}>{gt("Tap a resource to begin gathering.")}</Text>:null}
  {nodes.map(activity=>{
   const active=state.activity?.targetId===activity.id,inCurrentRegion=activity.zoneId===region.id,unlocked=skillLevel>=activity.unlockLevel,resource=itemDef(activity.itemId),nodeRegion=WORLD_ZONES.find(row=>row.id===activity.zoneId),view=gatheringBalanceProjection(state,activity,0),available=stock(activity.itemId);
   const start=()=>{if(active||!inCurrentRegion)return;if(unlocked)onGather(activity.id);else onNavigate?.(gatheringProgressionAction(state,activity).destination);};
   const expanded=expandedDropId===activity.id;
   // Drop rows are not assembled until the player expands this resource.
   const drops=expanded?gatheringDropPreview(activity,state):[];
   const actionLabel=active?`${activity.name} is currently gathering`:!inCurrentRegion?`${activity.name} is in ${nodeRegion?.name??activity.zoneId}`:unlocked?`Gather ${activity.name}`:`Train to gather ${activity.name}`;
   return <View key={activity.id} style={[s.card,inCurrentRegion&&s.cardCurrent,active&&s.cardActive]}>
    <View style={s.cardRow}>
     <Pressable accessibilityRole="button" accessibilityLabel={actionLabel}
      accessibilityState={{disabled:active||!inCurrentRegion,selected:active||inCurrentRegion}}
      disabled={active||!inCurrentRegion||(!unlocked&&!onNavigate)} onPress={start}
      style={({pressed})=>[s.activityTap,(!unlocked||!inCurrentRegion)&&s.cardLocked,pressed&&!active&&inCurrentRegion&&s.pressed]}>
      <ResourceArtwork itemId={activity.itemId} size={34}/>
      <View style={s.copy}>
       <View style={s.topLine}>
        <View style={s.nameLine}><Text numberOfLines={1} style={s.name}>{activity.name}</Text>{inCurrentRegion&&<Text style={s.regionTag}>{gt("HERE")}</Text>}</View>
        <Text style={s.xp}>+${formatGameNumber(Math.round(activity.xp),state.settings.numberMode,state.settings.language)} XP</Text>
       </View>
       <Text numberOfLines={1} style={active?s.activeMeta:s.meta}>{active?gt("Gathering now"):!inCurrentRegion?`Region: ${nodeRegion?.name??activity.zoneId}`:unlocked?`Have: ${formatGameNumber(available,state.settings.numberMode,state.settings.language)} ${resource.name} · ${Math.ceil(view.cycleSeconds)}s`:`Unlocks at ${skillId} level ${activity.unlockLevel}`}</Text>
      </View>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={`${gt('Drops')}: ${gl(activity.name)}`} accessibilityState={{expanded}}
      onPress={()=>setExpandedDropId(value=>value===activity.id?null:activity.id)}
      style={s.dropsToggle}><Text style={s.dropsLabel}>{gt('Drops')}</Text><Text style={s.chevron}>{expanded?'⌃':'⌄'}</Text></Pressable>
    </View>
    {expanded?<View style={s.dropDetails}>
     {drops.map(drop=><GatheringDropLine key={drop.id} drop={drop} gl={gl} s={s}
      suffix={drop.kind==='yield'?gt('per action'):drop.kind==='essence'?gt('base chance'):drop.kind==='event_discovery'?gt('per event minute'):drop.kind==='event_currency'?gt('Event'):''}
      petLabel={gt('Pet')} ownedLabel={gt('Owned')}/>)}
     {drops.some(drop=>drop.kind==='pet')?<Text style={s.dropHint}>{drops.some(drop=>drop.kind==='pet'&&drop.locked)?gt('Pet drops unlock with the Pet collection.'):gt('Pet chances are per completed gathering action.')}</Text>:null}
     {drops.some(drop=>drop.kind==='essence')?<Text style={s.dropHint}>{gt('Essence chances are base rates; bonuses may change them.')}</Text>:null}
    </View>:null}
   </View>;
  })}
  {!nodes.length&&<Text style={s.empty}>No {skillId} resources are configured.</Text>}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:8},
 instruction:{fontSize:13,lineHeight:19,color:C.muted,textAlign:'center',fontWeight:'600',paddingBottom:2},
 card:{minHeight:64,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
 cardCurrent:{borderColor:C.selectionLine,backgroundColor:C.selection},cardActive:{borderColor:C.good,backgroundColor:C.goodSurface},
 cardRow:{flexDirection:'row',alignItems:'center',gap:6},
 activityTap:{flex:1,minWidth:0,minHeight:44,flexDirection:'row',alignItems:'center',gap:10},
 cardLocked:{opacity:.6},pressed:{opacity:.76},
 dropsToggle:{minWidth:58,minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:3,paddingHorizontal:2},
 dropsLabel:{color:C.accent,fontSize:11,fontWeight:'800'},chevron:{color:C.accent,fontSize:17,lineHeight:20,fontWeight:'700'},
 copy:{flex:1,minWidth:0,gap:3},topLine:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:5},
 nameLine:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:4},
 name:{flexShrink:1,fontSize:14,lineHeight:20,color:C.text,fontWeight:'800'},
 regionTag:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.7},
 xp:{fontSize:11,lineHeight:16,color:C.accentSoft,fontWeight:'800'},
 meta:{fontSize:11,lineHeight:16,color:C.muted},activeMeta:{fontSize:11,lineHeight:16,color:C.good,fontWeight:'800'},
 dropDetails:{marginTop:8,paddingTop:8,borderTopWidth:1,borderColor:C.line,gap:5},
 dropRow:{minHeight:24,flexDirection:'row',alignItems:'center',gap:7},
 dropIcon:{width:20,height:20},dropSymbol:{width:20,fontSize:16,textAlign:'center',color:C.accent},
 dropName:{flex:1,minWidth:0,fontSize:12,lineHeight:17,color:C.text},
 dropRate:{fontSize:11,lineHeight:17,fontWeight:'700',color:C.accentSoft},
 dropHint:{fontSize:10,lineHeight:14,color:C.muted},
 empty:{fontSize:13,lineHeight:20,color:C.muted,textAlign:'center',padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel}
});}

type GatheringDropStyles=ReturnType<typeof makeStyles>;
function GatheringDropLine({drop,gl,s,suffix,petLabel,ownedLabel}:{
 drop:GatheringDropPreviewRow;gl:(text:string)=>string;s:GatheringDropStyles;
 suffix:string;petLabel:string;ownedLabel:string;
}){
 const petSource=drop.petId?petArtSource(drop.petId):undefined;
 const amount=drop.min===drop.max?String(drop.min):`${drop.min}–${drop.max}`;
 const rate=drop.kind==='yield'?`${amount} / ${suffix}`
  :drop.chance!==undefined?`${gatheringDropPercent(drop.chance)}${suffix?' '+suffix:''}`:suffix;
 return <View style={s.dropRow}>
  {drop.itemId?<ResourceArtwork itemId={drop.itemId} size={20} framed={false}/>:petSource?<Image source={petSource} resizeMode="contain" style={s.dropIcon}/>:<Text style={s.dropSymbol}>✦</Text>}
  <Text numberOfLines={1} style={s.dropName}>{gl(drop.name)}{drop.kind==='pet'?` · ${petLabel}${drop.owned?` (${ownedLabel})`:''}`:''}</Text>
  <Text style={s.dropRate}>{rate}</Text>
 </View>;
}

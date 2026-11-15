import {useGameplayText} from '../i18n/gameplay';
import {localizedItemName} from '../i18n/starter-item-names';
import {useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState,GatheringSkillId} from '../core/types';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import type {Language} from '../i18n/languages';
import {currentRegionId} from '../core/combat-region';
import {WORLD_ZONES} from '../content/world-map';
import {regionalArea} from '../content/regional-areas';
import {regionTravelAvailability,regionTravelLockReason} from '../core/world-navigation';
import {formatGameNumber} from '../core/number-format';
import {ResourceArtwork} from './ResourceArtwork';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {gatheringProgressionAction} from '../core/skill-progression-navigation';
import type {WorkingTowardDestination} from '../core/working-toward';
import {gatheringBalanceProjection} from '../core/balance-projection';
import {gatheringDropPercent,gatheringDropPreview,type GatheringDropPreviewRow} from '../core/gathering-drop-preview';
import {petArtSource} from '../theme/pet-art';
import {DisclosureControl} from './DisclosureControl';

const IRONWOOD_T2_BINDING_RECIPE=RECIPES.find(recipe=>recipe.id==='BREW_IRONWOOD_BINDING_RESIN');

/** A normal gathering skill is deliberately one tap: select a resource and begin. */
export function GatheringActivityList({state,skillId,skillLevel,preferredActionId,onGather,onNavigate,currentRegionOnly=false,areaId,showInstruction=true}:{state:GameState;skillId:GatheringSkillId;skillLevel:number;preferredActionId?:string;onGather:(id:string)=>void;onNavigate?:(destination:WorkingTowardDestination)=>void;currentRegionOnly?:boolean;areaId?:string;showInstruction?:boolean}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [expandedDropId,setExpandedDropId]=useState<string|null>(null);
 const regionId=currentRegionId(state),region=WORLD_ZONES.find(row=>row.id===regionId)??WORLD_ZONES[0];
 // A node is only doable if its skill, zone travel and regional area are all unlocked.
 // Check the same world-travel rules used by the World tab; being above a zone's
 // minimum level alone does not prove that story/scouting progression is complete.
 const entries=[...GATHERING,...HERB_NODES]
  .filter(activity=>activity.skillId===skillId&&(!currentRegionOnly||activity.zoneId===region.id)&&(!areaId||activity.zoneId!==region.id||activity.areaId===areaId))
  .map(activity=>{
   const nodeRegion=WORLD_ZONES.find(row=>row.id===activity.zoneId);
   const inCurrentRegion=activity.zoneId===region.id;
   const skillReady=skillLevel>=activity.unlockLevel;
   const area=regionalArea(activity.zoneId,activity.areaId);
   const areaReady=!area||(state.character?.level??1)>=area.minLevel;
   const zoneStatus=nodeRegion?regionTravelAvailability(state,nodeRegion):'locked';
   const readyHere=inCurrentRegion&&skillReady&&areaReady&&zoneStatus==='available';
   const travelReady=!inCurrentRegion&&skillReady&&areaReady&&zoneStatus==='available';
   const rank=readyHere?0:travelReady?1:zoneStatus==='inDevelopment'?5:zoneStatus==='locked'?4:!areaReady?3:2;
   return {activity,nodeRegion,inCurrentRegion,skillReady,area,areaReady,zoneStatus,readyHere,travelReady,rank};
  })
  .sort((a,b)=>a.rank-b.rank||Number(b.activity.id===preferredActionId)-Number(a.activity.id===preferredActionId)||a.activity.unlockLevel-b.activity.unlockLevel);
 const readyCount=entries.filter(entry=>entry.readyHere).length;
 const travelCount=entries.filter(entry=>entry.travelReady).length;
 const lockedCount=entries.length-readyCount-travelCount;
 const stock=(itemId:string)=>[...state.inventory.stacks,...state.bank.stacks].filter(row=>row.itemId===itemId).reduce((total,row)=>total+row.quantity,0);
 return <View style={s.root}>
  {showInstruction?<Text style={s.instruction}>{gt("Ready nodes appear first. Travel to another unlocked region for more resources.")}</Text>:null}
  {entries.length>0?<View style={s.availabilitySummary}>
   <Text style={s.summaryReady}>{gt('Ready now')}: {readyCount}</Text>
   <Text style={s.summaryTravel}>{gt('Can travel')}: {travelCount}</Text>
   <Text style={s.summaryLocked}>{gt('Locked')}: {lockedCount}</Text>
  </View>:null}
  {entries.map(({activity,nodeRegion,inCurrentRegion,skillReady,area,areaReady,zoneStatus,readyHere,travelReady})=>{
   const active=state.activity?.targetId===activity.id,view=gatheringBalanceProjection(state,activity,0),available=stock(activity.itemId);
   const canTap=!active&&(readyHere||(travelReady&&!!onNavigate)||(inCurrentRegion&&zoneStatus==='available'&&areaReady&&!skillReady&&!!onNavigate));
   const start=()=>{
    if(active)return;
    if(readyHere){onGather(activity.id);return;}
    if(travelReady){onNavigate?.({kind:'skills',skillId,mode:'gathering',actionId:activity.id,regionId:activity.zoneId,button:gt('Travel to {region}',{region:gl(nodeRegion?.name??activity.zoneId)}),detail:gt('Travel here to gather {name}.',{name:gl(activity.name)})});return;}
    if(inCurrentRegion&&areaReady&&!skillReady)onNavigate?.(gatheringProgressionAction(state,activity).destination);
   };
   const expanded=expandedDropId===activity.id;
   // Drop rows are not assembled until the player expands this resource.
   const drops=expanded?gatheringDropPreview(activity,state):[];
   const activityName=gl(activity.name),resourceName=localizedItemName(language,activity.itemId),regionName=gl(nodeRegion?.name??activity.zoneId);
   const locked=!readyHere&&!travelReady;
   const status=active?gt('ACTIVE'):readyHere?gt('READY NOW'):travelReady?gt('CAN TRAVEL'):zoneStatus==='inDevelopment'?gt('COMING SOON'):zoneStatus==='locked'?gt('ZONE LOCKED'):!areaReady?gt('AREA LOCKED'):gt('SKILL LOCKED');
   const lockReason=zoneStatus!=='available'&&nodeRegion?regionTravelLockReason(state,nodeRegion):undefined;
   const detail=active?gt('Gathering now')
    :readyHere?gt('Have: {count} {resource} · {seconds}s',{count:formatGameNumber(available,state.settings.numberMode,language),resource:resourceName,seconds:Math.ceil(view.cycleSeconds)})
    :travelReady?gt('{region} · Ready to gather',{region:regionName})
    :zoneStatus==='inDevelopment'?gt('{region} is in development',{region:regionName})
    :zoneStatus==='locked'?gt('{region} · {reason}',{region:regionName,reason:lockReason??gt('Region not unlocked')})
    :!areaReady?gt('Character level {level} · {area}',{level:area?.minLevel??1,area:gl(area?.name??regionName)})
    :gt('{skill} level {level} needed · {region}',{skill:gl(skillId),level:activity.unlockLevel,region:regionName});
   const actionLabel=active?gt('{name} is currently gathering',{name:activityName})
    :readyHere?gt('Gather {name}',{name:activityName})
    :travelReady?gt('Travel to {region} to gather {name}',{region:regionName,name:activityName})
    :gt('{name} is locked. {reason}',{name:activityName,reason:detail});
   return <View key={activity.id} style={[s.card,readyHere&&s.cardReady,travelReady&&s.cardTravel,active&&s.cardActive]}>
    <View style={s.cardRow}>
     <Pressable accessibilityRole="button" accessibilityLabel={actionLabel}
      accessibilityState={{disabled:!canTap,selected:active||readyHere}}
      disabled={!canTap} onPress={start}
      style={({pressed})=>[s.activityTap,locked&&s.cardLocked,pressed&&canTap&&s.pressed]}>
      <ResourceArtwork itemId={activity.itemId} size={34}/>
      <View style={s.copy}>
       <View style={s.topLine}>
        <Text numberOfLines={2} style={s.name}>{activityName}</Text>
        <Text style={s.xp}>{`+${formatGameNumber(Math.round(activity.xp),state.settings.numberMode,state.settings.language)} XP`}</Text>
       </View>
       <View style={s.metaLine}>
        <Text style={[s.statusTag,(active||readyHere)&&s.statusReady,travelReady&&s.statusTravel,locked&&s.statusLocked]}>{status}</Text>
        <Text numberOfLines={2} style={[s.meta,(active||readyHere)&&s.activeMeta]}>{detail}</Text>
       </View>
      </View>
     </Pressable>
     <DisclosureControl label={gt('Drops')} expanded={expanded}
      onPress={()=>setExpandedDropId(value=>value===activity.id?null:activity.id)}/>
    </View>
    {expanded?<View style={s.dropDetails}>
     {drops.map(drop=><GatheringDropLine key={drop.id} drop={drop} gl={gl} language={language} s={s}
      suffix={drop.kind==='yield'?gt('per action'):drop.kind==='essence'?gt('base chance'):drop.kind==='event_discovery'?gt('per event minute'):drop.kind==='event_currency'?gt('Event'):''}
      petLabel={gt('Pet')} ownedLabel={gt('Owned')}/>)}
     {drops.some(drop=>drop.kind==='pet')?<Text style={s.dropHint}>{drops.some(drop=>drop.kind==='pet'&&drop.locked)?gt('Pet drops unlock with the Pet collection.'):gt('Pet chances are per completed gathering action.')}</Text>:null}
     {drops.some(drop=>drop.kind==='essence')?<Text style={s.dropHint}>{gt('Essence chances are base rates; bonuses may change them.')}</Text>:null}
     {activity.id==='IRONWOOD_TREE'&&IRONWOOD_T2_BINDING_RECIPE?<Pressable accessibilityRole="button" accessibilityLabel={gt('Open Alchemy recipe for {name}',{name:localizedItemName(language,IRONWOOD_T2_BINDING_RECIPE.output.itemId)})} disabled={!onNavigate} onPress={()=>onNavigate?.({kind:'skills',skillId:'alchemy',mode:'crafting',recipeId:IRONWOOD_T2_BINDING_RECIPE.id,button:gt('Open Alchemy'),detail:gt('Craft the T2 equipment binding resin in Alchemy.')})} style={s.relatedCraft}>
      <ResourceArtwork itemId={IRONWOOD_T2_BINDING_RECIPE.output.itemId} size={24} framed={false}/>
      <View style={s.copy}>
       <Text numberOfLines={1} style={s.relatedCraftName}>{gt('T2 equipment')} · {localizedItemName(language,IRONWOOD_T2_BINDING_RECIPE.output.itemId)}</Text>
       <Text style={s.dropHint}>{gt('Alchemy Lv {level} · Crafted, not a Woodcutting drop',{level:IRONWOOD_T2_BINDING_RECIPE.level})}</Text>
      </View>
      {onNavigate?<Text style={s.chevron}>›</Text>:null}
     </Pressable>:null}
    </View>:null}
   </View>;
  })}
  {!entries.length&&<Text style={s.empty}>{gt('No {skill} resources are configured.',{skill:gl(skillId)})}</Text>}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:8},
 instruction:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center',fontWeight:'600',paddingBottom:2},
 availabilitySummary:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12,paddingHorizontal:4,paddingBottom:2},
 summaryReady:{fontSize:11,fontWeight:'800',color:C.good},
 summaryTravel:{fontSize:11,fontWeight:'800',color:C.info},
 summaryLocked:{fontSize:11,fontWeight:'700',color:C.muted},
 card:{minHeight:64,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
 cardReady:{borderColor:C.good,backgroundColor:C.goodSurface},cardTravel:{borderColor:C.info,backgroundColor:C.infoSurface},cardActive:{borderColor:C.good,backgroundColor:C.goodSurface},
 cardRow:{flexDirection:'row',alignItems:'center',gap:8}, 
 activityTap:{flex:1,minWidth:0,minHeight:44,flexDirection:'row',alignItems:'center',gap:10},
 cardLocked:{opacity:.75},pressed:{opacity:.76},
 chevron:{color:C.accent,fontSize:17,lineHeight:20,fontWeight:'700'}, 
 copy:{flex:1,minWidth:0,gap:5},
 topLine:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:7,minWidth:0},
 name:{flex:1,minWidth:0,fontSize:14,lineHeight:19,color:C.text,fontWeight:'800',flexShrink:1},
 xp:{flexShrink:0,fontSize:11,lineHeight:18,color:C.accentSoft,fontWeight:'800',textAlign:'right'},
 metaLine:{flexDirection:'row',alignItems:'center',gap:6,minWidth:0,flexWrap:'wrap'},
 statusTag:{fontSize:9,lineHeight:15,fontWeight:'900',letterSpacing:.3,paddingHorizontal:6,paddingVertical:2,borderRadius:6,borderWidth:1,overflow:'hidden',flexShrink:0},
 statusReady:{color:C.good,borderColor:C.good,backgroundColor:C.goodSurface},
 statusTravel:{color:C.info,borderColor:C.info,backgroundColor:C.infoSurface},
 statusLocked:{color:C.warning,borderColor:C.lineStrong,backgroundColor:C.panel2},
 meta:{flex:1,minWidth:115,fontSize:11,lineHeight:16,color:C.muted},
 activeMeta:{flex:1,minWidth:0,fontSize:11,lineHeight:16,color:C.good,fontWeight:'800'},
 dropDetails:{marginTop:8,paddingTop:8,borderTopWidth:1,borderColor:C.line,gap:5},
 dropRow:{minHeight:24,flexDirection:'row',alignItems:'center',gap:7},
 dropIcon:{width:20,height:20},dropSymbol:{width:20,fontSize:16,textAlign:'center',color:C.accent},
 dropName:{flex:1,minWidth:0,fontSize:12,lineHeight:17,color:C.text},
 dropRate:{fontSize:11,lineHeight:17,fontWeight:'700',color:C.accentSoft},
 dropHint:{fontSize:10,lineHeight:14,color:C.muted},
 relatedCraft:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line,marginTop:4,paddingTop:8,paddingBottom:2},
 relatedCraftName:{fontSize:11,lineHeight:16,fontWeight:'800',color:C.text},
 empty:{fontSize:13,lineHeight:20,color:C.muted,textAlign:'center',padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel}
});}

type GatheringDropStyles=ReturnType<typeof makeStyles>;
function GatheringDropLine({drop,gl,language,s,suffix,petLabel,ownedLabel}:{
 drop:GatheringDropPreviewRow;gl:(text:string)=>string;language:Language;s:GatheringDropStyles;
 suffix:string;petLabel:string;ownedLabel:string;
}){
 const petSource=drop.petId?petArtSource(drop.petId):undefined;
 const amount=drop.min===drop.max?String(drop.min):`${drop.min}–${drop.max}`;
 const rate=drop.kind==='yield'?`${amount} / ${suffix}`
  :drop.chance!==undefined?`${gatheringDropPercent(drop.chance)}${suffix?' '+suffix:''}`:suffix;
 return <View style={s.dropRow}>
  {drop.itemId?<ResourceArtwork itemId={drop.itemId} size={20} framed={false}/>:petSource?<Image source={petSource} resizeMode="contain" style={s.dropIcon}/>:<Text style={s.dropSymbol}>✦</Text>}
  <Text numberOfLines={1} style={s.dropName}>{drop.itemId?localizedItemName(language,drop.itemId):gl(drop.name)}{drop.kind==='pet'?` · ${petLabel}${drop.owned?` (${ownedLabel})`:''}`:''}</Text>
  <Text style={s.dropRate}>{rate}</Text>
 </View>;
}

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
import {gatheringNodeAvailability} from '../core/regional-gathering';
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
export function GatheringActivityList({state,skillId,skillLevel,preferredActionId,startingGatherId,onGather,onNavigate,currentRegionOnly=false,areaId,showInstruction=true}:{state:GameState;skillId:GatheringSkillId;skillLevel:number;preferredActionId?:string;startingGatherId?:string|null;onGather:(id:string)=>void;onNavigate?:(destination:WorkingTowardDestination)=>void;currentRegionOnly?:boolean;areaId?:string;showInstruction?:boolean}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [expandedDropId,setExpandedDropId]=useState<string|null>(null);
 const [doableOnly,setDoableOnly]=useState(false);
 const regionId=currentRegionId(state),region=WORLD_ZONES.find(row=>row.id===regionId)??WORLD_ZONES[0];
 // Use one availability rule for every profession and both gathering screens.
 const entries=useMemo(()=>[...GATHERING,...HERB_NODES]
  .filter(activity=>activity.skillId===skillId&&(!currentRegionOnly||activity.zoneId===region.id)&&(!areaId||activity.zoneId!==region.id||activity.areaId===areaId))
  .map(activity=>gatheringNodeAvailability(state,activity,skillLevel))
  .sort((a,b)=>a.rank-b.rank||Number(b.activity.id===preferredActionId)-Number(a.activity.id===preferredActionId)||a.activity.unlockLevel-b.activity.unlockLevel)
  .map(entry=>({...entry,cycleSeconds:entry.readyHere&&!entry.active?Math.ceil(gatheringBalanceProjection(state,entry.activity,0).cycleSeconds):0})),
  [state,skillId,skillLevel,currentRegionOnly,region.id,areaId,preferredActionId]);
 const readyCount=entries.filter(entry=>entry.readyHere||entry.active).length;
 const travelCount=entries.filter(entry=>entry.travelReady).length;
 const lockedCount=entries.length-readyCount-travelCount;
 const visibleEntries=doableOnly?entries.filter(entry=>entry.readyHere||entry.travelReady||entry.active):entries;
 const stock=(itemId:string)=>[...state.inventory.stacks,...state.bank.stacks].filter(row=>row.itemId===itemId).reduce((total,row)=>total+row.quantity,0);
 return <View style={s.root}>
  {showInstruction?<Text style={s.instruction}>{gt('Ready resources appear first. Travel to other unlocked regions for more.')}</Text>:null}
  {entries.length>0?<View style={s.availabilitySummary}>
   <View style={s.summaryCounts}>
    <Text style={s.summaryReady}>{gt('Ready')}: {readyCount}</Text>
    {!currentRegionOnly?<Text style={s.summaryTravel}>{gt('Travel')}: {travelCount}</Text>:null}
    <Text style={s.summaryLocked}>{gt('Locked')}: {lockedCount}</Text>
   </View>
   <Pressable accessibilityRole="button" accessibilityState={{selected:doableOnly}}
    accessibilityLabel={doableOnly?gt('Show all resources'):gt('Show doable resources only')}
    onPress={()=>setDoableOnly(value=>!value)} style={s.filterButton}>
    <Text style={s.filterText}>{doableOnly?gt('Show all'):gt('Doable only')}</Text>
   </Pressable>
  </View>:null}
  {visibleEntries.map(({activity,cycleSeconds,zone,area,inCurrentRegion,skillReady,areaReady,zoneStatus,active,status,readyHere,travelReady,zoneLockReason})=>{
   const starting=startingGatherId===activity.id;
   const canTap=!active&&!(readyHere&&startingGatherId)&&(readyHere||(travelReady&&!!onNavigate)||(status==='skill-locked'&&inCurrentRegion&&!!onNavigate));
   const start=()=>{
    if(active)return;
    if(readyHere){onGather(activity.id);return;}
    if(travelReady){
     onNavigate?.({kind:'skills',skillId,mode:'gathering',actionId:activity.id,regionId:activity.zoneId,
      button:gt('Travel to {region}',{region:gl(zone?.name??activity.zoneId)}),
      detail:gt('Travel here to gather {name}.',{name:gl(activity.name)})});
     return;
    }
    if(status==='skill-locked'&&inCurrentRegion)onNavigate?.(gatheringProgressionAction(state,activity).destination);
   };
   const expanded=expandedDropId===activity.id;
   // Drop rows are not assembled until the player expands this resource.
   const drops=expanded?gatheringDropPreview(activity,state):[];
   const activityName=gl(activity.name),resourceName=localizedItemName(language,activity.itemId),regionName=gl(zone?.name??activity.zoneId);
   const locked=!readyHere&&!travelReady&&!active;
   const statusLabel=starting?gt('Starting…'):active?gt('ACTIVE'):readyHere?gt('READY NOW'):travelReady?gt('CAN TRAVEL')
    :status==='upcoming'?gt('COMING SOON'):status==='zone-locked'?gt('ZONE LOCKED')
    :status==='area-locked'?gt('AREA LOCKED'):gt('SKILL LOCKED');
   const missingRequirements:string[]=[];
   if(!skillReady)missingRequirements.push(gt('{skill} Lv {level}',{skill:gl(skillId),level:activity.unlockLevel}));
   if(!areaReady)missingRequirements.push(gt('Character Lv {level} ({area})',{level:area?.minLevel??1,area:gl(area?.name??regionName)}));
   if(zoneStatus==='locked')missingRequirements.push(zoneLockReason??gt('Region not unlocked'));
   const detail=active?gt('Gathering now')
    :readyHere?gt('Have: {count} {resource} · {seconds}s',{count:formatGameNumber(stock(activity.itemId),state.settings.numberMode,language),resource:resourceName,seconds:cycleSeconds})
    :travelReady?gt('Ready to gather after travel')
    :status==='upcoming'?gt('Region in development')
    :missingRequirements.join(' · ');
   const actionLabel=active?gt('{name} is currently gathering',{name:activityName})
    :readyHere?gt('Gather {name}',{name:activityName})
    :travelReady?gt('Travel to {region} to gather {name}',{region:regionName,name:activityName})
    :gt('{name} is locked. {reason}',{name:activityName,reason:detail});
   return <View key={activity.id} style={[s.card,readyHere&&s.cardReady,travelReady&&s.cardTravel,active&&s.cardActive]}>
    <View style={s.cardRow}>
     <Pressable accessibilityRole="button" accessibilityLabel={actionLabel}
      accessibilityState={{disabled:!canTap,busy:starting,selected:active}}
      disabled={!canTap} onPress={start}
      style={({pressed})=>[s.activityTap,locked&&s.cardLocked,pressed&&canTap&&s.pressed]}>
      <ResourceArtwork itemId={activity.itemId} size={34}/>
      <View style={s.copy}>
       <View style={s.topLine}>
        <Text numberOfLines={2} style={s.name}>{activityName}</Text>
        <Text style={s.xp}>{`+${formatGameNumber(Math.round(activity.xp),state.settings.numberMode,state.settings.language)} XP`}</Text>
       </View>
       <View style={s.metaLine}>
        <Text style={[s.statusTag,(active||readyHere)&&s.statusReady,travelReady&&s.statusTravel,locked&&s.statusLocked]}>{statusLabel}</Text>
        <Text numberOfLines={1} style={s.locationMeta}>{area?gl(area.name):inCurrentRegion?gt('Here'):regionName}</Text>
       </View>
       <Text numberOfLines={3} style={[s.meta,(active||readyHere)&&s.activeMeta]}>{detail}</Text>
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
  {doableOnly&&visibleEntries.length===0&&entries.length>0?<Text style={s.empty}>{gt('Nothing doable yet. Show all resources to check unlock requirements.')}</Text>:null}
  {!entries.length&&<Text style={s.empty}>{gt('No {skill} resources are configured.',{skill:gl(skillId)})}</Text>}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:8},
 instruction:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center',fontWeight:'600',paddingBottom:2},
 availabilitySummary:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:4,paddingBottom:2},
 summaryCounts:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10},
 filterButton:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel2},
 filterText:{fontSize:11,lineHeight:15,fontWeight:'800',color:C.text},
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
 metaLine:{flexDirection:'row',alignItems:'center',gap:6,minWidth:0},
 statusTag:{fontSize:9,lineHeight:15,fontWeight:'900',letterSpacing:.3,paddingHorizontal:6,paddingVertical:2,borderRadius:6,borderWidth:1,overflow:'hidden',flexShrink:0},
 statusReady:{color:C.good,borderColor:C.good,backgroundColor:C.goodSurface},
 statusTravel:{color:C.info,borderColor:C.info,backgroundColor:C.infoSurface},
 statusLocked:{color:C.warning,borderColor:C.lineStrong,backgroundColor:C.panel2},
 locationMeta:{flex:1,minWidth:0,fontSize:11,lineHeight:16,color:C.muted},
 meta:{minWidth:0,fontSize:11,lineHeight:16,color:C.muted},
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

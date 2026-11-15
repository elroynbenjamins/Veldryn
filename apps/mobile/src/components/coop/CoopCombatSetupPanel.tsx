import {useMemo,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../../core/types';
import {POTIONS} from '../../content/alchemy';
import type {DungeonTonicPreference} from '../../core/coop-dungeon-tonic-preference';
import {coopCombatSetup} from '../../core/coop-combat-setup';
import {companionArtSource} from '../../theme/companion-art';
import {ItemArtwork} from '../ItemArtwork';
import {UiIcon} from '../UiIcon';
import {useSocialText} from '../../i18n/social';
import {useCoopStyles} from '../../theme/useCoopStyles';
import type {CoopColors} from '../../theme/coop-ui-theme';

/** The tonic picker saves only a preference. Consumption remains server-owned. */
function tonicEffect(potion:(typeof POTIONS)[number]):string{
 const effect=potion.effect;
 if(effect.kind!=='preparation')return '';
 const parts:string[]=[];
 if(effect.damageDealtFraction)parts.push('+'+Math.round(effect.damageDealtFraction*100)+'% damage');
 if(effect.damageReductionFraction)parts.push('−'+Math.round(effect.damageReductionFraction*100)+'% damage taken');
 if(effect.healingStrengthFraction)parts.push('+'+Math.round(effect.healingStrengthFraction*100)+'% healing/shields');
 return parts.join(' · ');
}
type SetupProps={state:GameState;compact?:boolean;onChooseCompanion?:()=>void;companionDisabled?:boolean;tonicPreference?:DungeonTonicPreference;onTonicPreferenceChange?:(next:DungeonTonicPreference)=>void};
export function CoopCombatSetupPanel({state,compact=false,onChooseCompanion,companionDisabled=false,tonicPreference,onTonicPreferenceChange}:SetupProps){
 const {colors:C,styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
 const setup=useMemo(()=>coopCombatSetup(state),[state]);
 const [expanded,setExpanded]=useState<'companion'|'healing'|null>(null);
 const [tonicPickerVisible,setTonicPickerVisible]=useState(false);
 const tonics=useMemo(()=>POTIONS.filter(p=>p.effect.kind==='preparation').map(p=>({
  id:p.id,name:p.name,tier:p.tier,effect:tonicEffect(p),
  owned:state.inventory.stacks.filter(stack=>stack.itemId===p.id&&Number.isFinite(stack.quantity)&&stack.quantity>0).reduce((sum,stack)=>sum+Math.floor(stack.quantity),0),
 })).sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name)),[state.inventory.stacks]);
 const selectedTonic=tonics.find(p=>p.id===tonicPreference?.potionId);
 const autoUse=Boolean(selectedTonic&&tonicPreference?.autoUse);
 const canEdit=Boolean(onTonicPreferenceChange&&tonicPreference);
 const chooseTonic=(id:string|null)=>{
  if(!canEdit||!tonicPreference)return;
  onTonicPreferenceChange?.({potionId:id,autoUse:id?tonicPreference.autoUse:false});
  setTonicPickerVisible(false);
 };
 const art=setup.companion?companionArtSource(setup.companion.id):undefined;
 const toggle=(id:'companion'|'healing')=>setExpanded(current=>current===id?null:id);
 return <><View style={[s.panel,compact&&s.compactPanel]}>
  <View style={s.heading}>
   <Text style={s.headingText}>{st('Your combat setup')}</Text>
   <Text style={s.caption}>{st('Current selection')}</Text>
  </View>
  <View style={s.twoColumns}>
   <Pressable accessibilityRole="button" accessibilityLabel={st('Companion')+': '+(setup.companion?.name??st('None equipped'))}
    accessibilityState={{expanded:!onChooseCompanion&&expanded==='companion',disabled:Boolean(onChooseCompanion&&companionDisabled)}} accessibilityHint={onChooseCompanion?st('Choose dungeon companion'):st('Tap to view companion')}
    disabled={Boolean(onChooseCompanion&&companionDisabled)}
    onPress={onChooseCompanion??(()=>toggle('companion'))} style={({pressed})=>[s.tile,compact&&s.compactTile,pressed&&s.pressed]}>
    <View style={s.itemTop}>
     <View style={s.artFrame}>
      {art?<Image source={art} resizeMode="contain" style={s.art}/>:<UiIcon name="companions" size={30}/>}
     </View>
     <View style={s.itemContent}>
      <Text style={s.tileLabel}>{st('Companion')}</Text>
      <Text style={s.itemName} numberOfLines={2}>{setup.companion?.name??st('None equipped')}</Text>
     </View>
    </View>
    <View style={s.tileFooter}>
     <Text style={[s.status,setup.companion?s.positive:s.muted]} numberOfLines={1}>{setup.companion?st('Equipped'):st('Not equipped')}</Text>
     {onChooseCompanion?<Text style={s.change}>{st('Change companion')} ›</Text>:null}
    </View>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={st('Healing potion')+': '+(setup.healing?.name??st('None selected'))}
    accessibilityState={{expanded:expanded==='healing'}} accessibilityHint={st('Healing uses carried potions; food is disabled in dungeons.')}
    onPress={()=>toggle('healing')} style={({pressed})=>[s.tile,compact&&s.compactTile,pressed&&s.pressed]}>
    <View style={s.itemTop}>
     <View style={s.artFrame}>{setup.healing?<ItemArtwork itemId={setup.healing.id} size={30}/>:<UiIcon name="inventory" size={30}/>}</View>
     <View style={s.itemContent}>
      <Text style={s.tileLabel}>{st('Healing potion')}</Text>
      <Text style={s.itemName} numberOfLines={2}>{setup.healing?.name??st('None selected')}</Text>
     </View>
    </View>
    <Text style={[s.status,setup.healing&&setup.healing.carried>0?s.positive:setup.healing?s.warning:s.muted]} numberOfLines={1}>
     {setup.healing?st('{percent}% HP · {count} carried',{percent:setup.healing.percent,count:setup.healing.carried}):st('Select in HP menu')}
    </Text>
   </Pressable>
  </View>
  <View style={s.tonicContainer}>
   <Pressable accessibilityRole="button" accessibilityLabel={st('Choose dungeon tonic')}
    accessibilityHint={st('Select a tonic from your inventory. Selection does not spend it.')}
    disabled={!canEdit} onPress={()=>setTonicPickerVisible(true)}
    style={({pressed})=>[s.tonicRow,compact&&s.compactTonic,pressed&&s.pressed]}>
    <View style={s.tonicIcon}>{selectedTonic?<ItemArtwork itemId={selectedTonic.id} size={26}/>:setup.tonicPreviewId?<ItemArtwork itemId={setup.tonicPreviewId} size={26}/>:<UiIcon name="skills" size={23}/>}</View>
    <View style={s.tonicText}>
     <Text style={s.tonicTitle}>{selectedTonic?.name??st('Choose enhancement tonic')}</Text>
     <Text style={s.caption} numberOfLines={2}>{selectedTonic?selectedTonic.effect:st('Select a tonic for this dungeon')}</Text>
    </View>
    <Text numberOfLines={1} style={[s.count,selectedTonic?.owned?s.positive:s.muted]}>{selectedTonic?st('{count} carried',{count:selectedTonic.owned}):st('{count} total',{count:setup.tonicCount})}</Text>
    <Text style={s.chevron}>›</Text>
   </Pressable>
   <Pressable accessibilityRole="checkbox" accessibilityLabel={st('Auto-use selected tonic')}
    accessibilityState={{checked:autoUse,disabled:!canEdit||!selectedTonic}}
    disabled={!canEdit||!selectedTonic}
    onPress={()=>tonicPreference&&onTonicPreferenceChange?.({...tonicPreference,autoUse:!autoUse})}
    style={({pressed})=>[s.autoRow,pressed&&s.pressed]}>
    <View style={[s.checkBox,autoUse&&s.checkBoxOn]}><Text style={s.checkMark}>{autoUse?'✓':''}</Text></View>
    <View style={s.tonicText}>
     <Text style={s.tonicTitle}>{st('Auto-use selected tonic')}</Text>
     <Text style={s.caption}>{selectedTonic&&autoUse&&selectedTonic.owned===0?st('Out of stock — select or craft more before the run.'):st('Uses one before the first room, never while queueing.')}</Text>
    </View>
   </Pressable>
  </View>
  {expanded?<View style={s.detail} accessibilityLiveRegion="polite">
   <Text style={s.detailText}>{expanded==='companion'?
    (setup.companion?st('Companion assists are part of your dungeon loadout.'):st('Equip a companion before joining a queue.')):
    (setup.healing?st('Healing uses carried potions; food is disabled in dungeons.'):st('Choose your healing potion in the HP menu before queuing.'))}</Text>
  </View>:null}
 </View>
 <Modal visible={tonicPickerVisible} transparent animationType="fade" onRequestClose={()=>setTonicPickerVisible(false)}>
  <View style={s.overlay}>
   <View style={s.sheet}>
    <View style={s.modalHeader}>
     <View style={s.tonicText}>
      <Text accessibilityRole="header" style={s.modalTitle}>{st('Choose dungeon tonic')}</Text>
      <Text style={s.caption}>{st('Select one buff tonic for your dungeon. It is consumed before the first room, lasts the whole run, and is not refunded on failure.')}</Text>
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={st('Close')} onPress={()=>setTonicPickerVisible(false)} style={s.close}><Text style={s.closeText}>×</Text></Pressable>
    </View>
    <ScrollView style={s.tonicScroll} contentContainerStyle={s.tonicList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
     {tonics.map(option=>{
      const selected=tonicPreference?.potionId===option.id,disabled=option.owned<=0;
      return <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.name+', '+option.owned+' carried'} accessibilityState={{selected,disabled}}
       disabled={disabled} onPress={()=>chooseTonic(option.id)}
       style={({pressed})=>[s.option,selected&&s.optionSelected,disabled&&s.optionUnavailable,pressed&&s.pressed]}>
       <ItemArtwork itemId={option.id} size={34}/>
       <View style={s.tonicText}>
        <Text style={s.optionTitle}>{option.name} · T{option.tier}</Text>
        <Text style={s.caption}>{option.effect}</Text>
       </View>
       <Text style={[s.optionCount,disabled?s.muted:s.positive]}>{option.owned}× {selected?'✓':''}</Text>
      </Pressable>;
     })}
     <Pressable accessibilityRole="radio" accessibilityState={{selected:!tonicPreference?.potionId}} onPress={()=>chooseTonic(null)}
      style={[s.option,!tonicPreference?.potionId&&s.optionSelected]}>
      <UiIcon name="skills" size={30}/>
      <View style={s.tonicText}><Text style={s.optionTitle}>{st('No automatic tonic')}</Text><Text style={s.caption}>{st('You can still prepare a tonic manually during the run.')}</Text></View>
      {!tonicPreference?.potionId?<Text style={s.optionCount}>✓</Text>:null}
     </Pressable>
    </ScrollView>
    <Text style={s.caption}>{st('One buff tonic per run, plus one selected healing potion type. You can use multiple carried healing potions between rooms.')}</Text>
   </View>
  </View>
 </Modal></>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 panel:{padding:12,gap:10,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.surface},
 compactPanel:{padding:9,gap:7},compactTile:{minHeight:76,padding:7,gap:4},compactTonic:{minHeight:44,paddingHorizontal:7},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 headingText:{color:C.text,fontSize:14,lineHeight:19,fontWeight:'700',flexShrink:1},
 caption:{color:C.textMuted,fontSize:11,lineHeight:16},
 twoColumns:{flexDirection:'row',gap:8},
 tile:{flex:1,minWidth:0,minHeight:90,borderWidth:1,borderColor:C.line,borderRadius:10,padding:8,gap:6,justifyContent:'space-between',backgroundColor:C.surfaceRaised},
 itemTop:{flexDirection:'row',gap:7,alignItems:'center'},
 artFrame:{width:34,height:34,alignItems:'center',justifyContent:'center',flexShrink:0},
 art:{width:34,height:34},
 itemContent:{flex:1,minWidth:0},
 tileLabel:{fontSize:10,lineHeight:14,fontWeight:'700',color:C.textMuted},
 itemName:{fontSize:12,lineHeight:16,fontWeight:'700',color:C.text},
 status:{fontSize:11,lineHeight:15,fontWeight:'600'},tileFooter:{flexDirection:'row',gap:4,alignItems:'center',justifyContent:'space-between'},change:{fontSize:10,lineHeight:15,fontWeight:'700',color:C.cyan},
 positive:{color:C.success},muted:{color:C.textMuted},warning:{color:C.danger},
 tonicContainer:{gap:5},autoRow:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:7,paddingVertical:6},checkBox:{width:20,height:20,borderWidth:1,borderColor:C.lineStrong,borderRadius:5,alignItems:'center',justifyContent:'center'},checkBoxOn:{backgroundColor:C.success,borderColor:C.success},checkMark:{color:C.surface,fontWeight:'900',fontSize:14},
 tonicRow:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:9,minHeight:46,backgroundColor:C.surfaceRaised},
 tonicIcon:{width:26,height:30,alignItems:'center',justifyContent:'center'},
 tonicText:{flex:1,minWidth:0},
 tonicTitle:{color:C.text,fontWeight:'700',fontSize:12,lineHeight:17},
 count:{fontSize:11,lineHeight:16,fontWeight:'700'},
 chevron:{fontSize:20,lineHeight:24,color:C.textMuted},
 detail:{backgroundColor:C.surfaceRaised,borderRadius:10,paddingVertical:8,paddingHorizontal:10,borderLeftWidth:2,borderLeftColor:C.lineStrong},
 detailText:{fontSize:12,lineHeight:18,color:C.textSecondary},
 overlay:{flex:1,backgroundColor:'rgba(0,0,0,.74)',justifyContent:'center',paddingHorizontal:12,paddingVertical:24},
 sheet:{maxHeight:'85%',borderRadius:14,backgroundColor:C.surface,borderColor:C.lineStrong,borderWidth:1,padding:12,gap:10},
 modalHeader:{flexDirection:'row',alignItems:'center',gap:10},modalTitle:{color:C.gold,fontSize:16,fontWeight:'800'},
 close:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},closeText:{fontSize:26,color:C.text},
 tonicScroll:{flexGrow:0},tonicList:{gap:7,paddingVertical:4},option:{flexDirection:'row',alignItems:'center',gap:9,padding:9,minHeight:60,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.surfaceRaised},
 optionSelected:{borderColor:C.gold},optionUnavailable:{opacity:.48},optionTitle:{color:C.text,fontWeight:'700',fontSize:12},optionCount:{color:C.textSecondary,fontWeight:'700',fontSize:11},
 pressed:{opacity:.74}
});

import {useMemo,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../../core/types';
import {coopCombatSetup} from '../../core/coop-combat-setup';
import {companionArtSource} from '../../theme/companion-art';
import {ItemArtwork} from '../ItemArtwork';
import {UiIcon} from '../UiIcon';
import {useSocialText} from '../../i18n/social';
import {useCoopStyles} from '../../theme/useCoopStyles';
import type {CoopColors} from '../../theme/coop-ui-theme';

/** Consumables are display-only. A companion change uses the game's trusted command path. */
export function CoopCombatSetupPanel({state,compact=false,onChooseCompanion,companionDisabled=false}:{state:GameState;compact?:boolean;onChooseCompanion?:()=>void;companionDisabled?:boolean}){
 const {colors:C,styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
 const setup=useMemo(()=>coopCombatSetup(state),[state]);
 const [expanded,setExpanded]=useState<'companion'|'healing'|'tonics'|null>(null);
 const art=setup.companion?companionArtSource(setup.companion.id):undefined;
 const toggle=(id:'companion'|'healing'|'tonics')=>setExpanded(current=>current===id?null:id);
 return <View style={[s.panel,compact&&s.compactPanel]}>
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
  <Pressable accessibilityRole="button" accessibilityLabel={st('Enhancement tonics')}
   accessibilityState={{expanded:expanded==='tonics'}} onPress={()=>toggle('tonics')}
   style={({pressed})=>[s.tonicRow,compact&&s.compactTonic,pressed&&s.pressed]}>
   <View style={s.tonicIcon}>{setup.tonicPreviewId?<ItemArtwork itemId={setup.tonicPreviewId} size={26}/>:<UiIcon name="skills" size={23}/>}</View>
   <View style={s.tonicText}>
    <Text style={s.tonicTitle}>{st('Enhancement tonics')}</Text>
    <Text style={s.caption}>{st('No potion is spent while queueing')}</Text>
   </View>
   <Text numberOfLines={1} style={[s.count,setup.tonicCount>0?s.positive:s.muted]}>{st('{count} carried',{count:setup.tonicCount})}</Text>
   <Text style={s.chevron}>{expanded==='tonics'?'−':'›'}</Text>
  </Pressable>
  {expanded?<View style={s.detail} accessibilityLiveRegion="polite">
   <Text style={s.detailText}>{expanded==='companion'?
    (setup.companion?st('Companion assists are part of your dungeon loadout.'):st('Equip a companion before joining a queue.')):
    expanded==='healing'?
    (setup.healing?st('Healing uses carried potions; food is disabled in dungeons.'):st('Choose your healing potion in the HP menu before queuing.')):
    st('Tonics in your inventory are not automatically used when you join a queue.')}</Text>
  </View>:null}
 </View>;
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
 tonicRow:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:9,minHeight:46,backgroundColor:C.surfaceRaised},
 tonicIcon:{width:26,height:30,alignItems:'center',justifyContent:'center'},
 tonicText:{flex:1,minWidth:0},
 tonicTitle:{color:C.text,fontWeight:'700',fontSize:12,lineHeight:17},
 count:{fontSize:11,lineHeight:16,fontWeight:'700'},
 chevron:{fontSize:20,lineHeight:24,color:C.textMuted},
 detail:{backgroundColor:C.surfaceRaised,borderRadius:10,paddingVertical:8,paddingHorizontal:10,borderLeftWidth:2,borderLeftColor:C.lineStrong},
 detailText:{fontSize:12,lineHeight:18,color:C.textSecondary},
 pressed:{opacity:.74}
});

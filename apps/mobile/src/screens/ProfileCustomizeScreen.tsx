import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {OnlineProfileExtensionPanel} from '../components/OnlineProfileExtensionPanel';
import {ProfileAudiencePreviewModal} from '../components/ProfileAudiencePreviewModal';
import {ProfileEditor} from '../components/ProfileEditor';
import type {GameState} from '../core/types';
import type {ProfileCustomizationDestination} from '../core/profile-customization';
import type {ProfileExtensionSelfV43} from '../online/profile-extension-v43';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Section='Appearance'|'Identity';

export function ProfileCustomizeScreen({state,onChange,onNavigateSource,onDirtyChange}:{state:GameState;onChange:(next:GameState)=>void;onNavigateSource?:(destination:ProfileCustomizationDestination)=>void;onDirtyChange?:(dirty:boolean)=>void}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const [section,setSection]=useState<Section>('Appearance');
 const [appearanceDirty,setAppearanceDirty]=useState(false),[identityDirty,setIdentityDirty]=useState(false);
 const [appearancePreview,setAppearancePreview]=useState<GameState|null>(null),[identityDraft,setIdentityDraft]=useState<ProfileExtensionSelfV43|null>(null);
 const [previewOpen,setPreviewOpen]=useState(false);
 const dirty=appearanceDirty||identityDirty;
 useEffect(()=>{onDirtyChange?.(dirty)},[dirty,onDirtyChange]);
 useEffect(()=>()=>onDirtyChange?.(false),[onDirtyChange]);

 return <><ScrollView contentContainerStyle={s.root}>
  <View style={s.headingRow}>
   <View style={s.flex}><Text style={s.kicker}>PROFILE CUSTOMIZATION</Text><Text accessibilityRole="header" style={s.heading}>Customize Profile</Text></View>
   <View style={[s.liveBadge,dirty&&s.liveBadgeDirty]}><Text style={[s.liveBadgeText,dirty&&s.liveBadgeTextDirty]}>{dirty?'UNSAVED CHANGES':section==='Appearance'?'LIVE PREVIEW':'PROFILE SETTINGS'}</Text></View>
  </View>
  <Text style={s.intro}>Shape the identity other players see. Appearance is saved per character; social details and showcases belong to your account profile.</Text>
  <View style={s.previewAction}><GameButton compact title="Preview as others see me" tone="secondary" onPress={()=>setPreviewOpen(true)}/></View>

  <View accessibilityRole="tablist" style={s.tabs}>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:section==='Appearance'}} onPress={()=>setSection('Appearance')} style={({pressed})=>[s.tab,section==='Appearance'&&s.tabOn,pressed&&s.pressed]}>
    <Text style={[s.tabTitle,section==='Appearance'&&s.tabTitleOn]}>Appearance</Text>
    <Text style={s.tabMeta}>Background · border · title · Pet</Text>
   </Pressable>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:section==='Identity'}} onPress={()=>setSection('Identity')} style={({pressed})=>[s.tab,section==='Identity'&&s.tabOn,pressed&&s.pressed]}>
    <Text style={[s.tabTitle,section==='Identity'&&s.tabTitleOn]}>Identity & Showcases</Text>
    <Text style={s.tabMeta}>Bio · privacy · favorites · featured slots</Text>
   </Pressable>
  </View>

  <View style={section==='Appearance'?s.sectionShown:s.sectionHidden} pointerEvents={section==='Appearance'?'auto':'none'}>
   <ProfileEditor state={state} onChange={onChange} showLoadouts={false} onNavigateSource={onNavigateSource} onDirtyChange={setAppearanceDirty} onPreviewStateChange={setAppearancePreview}/>
  </View>
  <View style={section==='Identity'?s.sectionShown:s.sectionHidden} pointerEvents={section==='Identity'?'auto':'none'}>
   <OnlineProfileExtensionPanel state={state} onDirtyChange={setIdentityDirty} onDraftChange={setIdentityDraft}/>
  </View>
 </ScrollView>
 <ProfileAudiencePreviewModal visible={previewOpen} state={appearancePreview??state} identityDraft={identityDraft} onClose={()=>setPreviewOpen(false)}/>
 </>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},
 headingRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
 flex:{flex:1,minWidth:0},
 kicker:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
 heading:{...typography.hero,color:C.text},
 intro:{...typography.body,color:C.muted,lineHeight:20},
 previewAction:{alignSelf:'flex-start',minWidth:190},
 liveBadge:{paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.goodSurface},
 liveBadgeDirty:{borderColor:C.warning,backgroundColor:C.warningSurface},
 liveBadgeText:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.65},
 liveBadgeTextDirty:{color:C.warning},
 tabs:{flexDirection:'row',gap:6,padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.bg},
 tab:{flex:1,minHeight:64,justifyContent:'center',paddingHorizontal:10,paddingVertical:8,borderRadius:radii.md,borderWidth:1,borderColor:'transparent'},
 tabOn:{backgroundColor:C.selection,borderColor:C.selectionLine},
 pressed:{opacity:.72},
 tabTitle:{...typography.bodyStrong,color:C.muted},
 tabTitleOn:{color:C.text},
 tabMeta:{fontSize:9,lineHeight:12,color:C.muted,marginTop:2},
 sectionShown:{display:'flex'},
 sectionHidden:{display:'none'},
});}

import {profileT,profileText} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,type ScrollViewInstance} from 'react-native';
import {GameButton} from '../components/GameButton';
import {ProfileAudiencePreviewModal} from '../components/ProfileAudiencePreviewModal';
import {ProfileIdentityPanel} from '../components/profile/ProfileIdentityPanel';
import {ProfileLookPanel,WARDROBE_ASSETS,type ChipKind,type ProfileEquipNotice} from '../components/profile/ProfileLookPanel';
import {ProfileShowcasePanel} from '../components/profile/ProfileShowcasePanel';
import {ProfileStage} from '../components/profile/ProfileStage';
import {ProfileWardrobeChips} from '../components/profile/ProfileWardrobeChips';
import type {GameState} from '../core/types';
import {normalizePlayerNameStyle,savePlayerNameStyle,type PlayerNameStylePreference} from '../core/player-name-style';
import type {SavePlayerNameStyle} from '../core/player-name-style-save';
import type {ProfileCustomizationDestination} from '../core/profile-customization';
import {profileWardrobe,wardrobeProgress} from '../core/profile-wardrobe';
import {useAuthSession} from '../online/AuthSessionProvider';
import {invalidatePlayerIdentity} from '../online/player-identity-cache';
import {useProfileExtensionDraft} from '../online/useProfileExtensionDraft';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

/** Legacy callers still ask for 'Appearance'; it resolves to the Look tab. */
export type Section='Look'|'Identity'|'Showcase'|'Appearance';
type Tab='Look'|'Identity'|'Showcase';
const TABS:readonly Tab[]=['Look','Identity','Showcase'];
const resolveTab=(section:Section):Tab=>section==='Appearance'?'Look':section;
const COLLAPSE_AT=56,NOTICE_MS=6000;

export function ProfileCustomizeScreen({state,onChange,onSaveNameStyle,onNavigateSource,onDirtyChange,initialSection='Look'}:{
 state:GameState;onChange:(next:GameState)=>void|Promise<void>;onSaveNameStyle:SavePlayerNameStyle;
 onNavigateSource?:(destination:ProfileCustomizationDestination)=>void;onDirtyChange?:(dirty:boolean)=>void;initialSection?:Section;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const accountId=useAuthSession().session?.user.id??'';
 const [tab,setTab]=useState<Tab>(resolveTab(initialSection));
 useEffect(()=>{setTab(resolveTab(initialSection))},[initialSection]);
 const [appearanceDirty,setAppearanceDirty]=useState(false),[nameInputDirty,setNameInputDirty]=useState(false);
 const [appearancePreview,setAppearancePreview]=useState<GameState|null>(null);
 const [previewOpen,setPreviewOpen]=useState(false);
 const [scrolled,setScrolled]=useState(false),[expandOverride,setExpandOverride]=useState<boolean|null>(null);
 const [chip,setChip]=useState<ChipKind>('icon');
 const [notice,setNotice]=useState<ProfileEquipNotice|null>(null),[headerHeight,setHeaderHeight]=useState(0);
 const scrollRef=useRef<ScrollViewInstance>(null);
 const openTab=(next:Tab)=>{setTab(next);scrollRef.current?.scrollTo({y:0,animated:false});setScrolled(false);setExpandOverride(null)};

 const draft=useProfileExtensionDraft(state.character?.id);
 const identityDraft=useMemo(()=>draft.value?{...draft.value,bio:draft.bio}:null,[draft.value,draft.bio]);
 const identityDirty=draft.dirty||nameInputDirty;
 const dirty=appearanceDirty||identityDirty;
 useEffect(()=>{onDirtyChange?.(dirty)},[dirty,onDirtyChange]);
 useEffect(()=>()=>onDirtyChange?.(false),[onDirtyChange]);

 // The name style belongs to the account rather than the character, so it keeps its own
 // draft here and feeds the stage and the audience preview alongside the wardrobe draft.
 const [nameStyle,setNameStyle]=useState<PlayerNameStylePreference>(normalizePlayerNameStyle(state.account.playerNameStyle));
 const [nameResetVersion,setNameResetVersion]=useState(0);
 const savedNameStyleKey=JSON.stringify(normalizePlayerNameStyle(state.account.playerNameStyle)),previousSavedNameStyle=useRef(savedNameStyleKey);
 useEffect(()=>{
  const previous=previousSavedNameStyle.current;previousSavedNameStyle.current=savedNameStyleKey;
  if(previous!==savedNameStyleKey&&!nameInputDirty)setNameStyle(current=>JSON.stringify(normalizePlayerNameStyle(current))===previous?JSON.parse(savedNameStyleKey) as PlayerNameStylePreference:current);
 },[savedNameStyleKey,nameInputDirty]);
 const applyNameStyle:SavePlayerNameStyle=async style=>{
  let saved:PlayerNameStylePreference;
  if(onSaveNameStyle)saved=await onSaveNameStyle(style);
  else{const next=savePlayerNameStyle(state,style);await onChange(next);saved=normalizePlayerNameStyle(next.account.playerNameStyle)}
  setNameStyle(normalizePlayerNameStyle(saved));setNameResetVersion(value=>value+1);if(accountId)invalidatePlayerIdentity(accountId);return saved;
 };

 const previewState=useMemo(()=>{const base=appearancePreview??state;
  return {...base,account:{...base.account,playerNameStyle:nameStyle}} as GameState},[appearancePreview,state,nameStyle]);
 const categories=useMemo(()=>profileWardrobe(state,WARDROBE_ASSETS),[state]);
 const progress=useMemo(()=>wardrobeProgress(categories),[categories]);

 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),NOTICE_MS);return()=>clearTimeout(timer)},[notice]);
 const collapsed=expandOverride===null?scrolled:!expandOverride;

 return <><ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.root} stickyHeaderIndices={[0]} scrollEventThrottle={32}
   onScroll={({nativeEvent:{contentOffset}})=>{const next=contentOffset.y>COLLAPSE_AT;
    setScrolled(previous=>previous===next?previous:next);if(!next)setExpandOverride(null)}}
   keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <View style={s.header} onLayout={({nativeEvent:{layout}})=>setHeaderHeight(previous=>previous===layout.height?previous:layout.height)}>
   <View style={s.headRow}>
    <Text accessibilityRole="header" style={s.heading}>{profileT(language,"Customize")}</Text>
    <View style={[s.pill,dirty&&s.pillDirty]}><Text style={[s.pillText,dirty&&s.pillTextDirty]}>
     {dirty?profileT(language,"UNSAVED CHANGES"):profileT(language,'Collection {percent}%',{percent:progress.percent})}</Text></View>
   </View>
   <ProfileStage state={previewState} collapsed={collapsed} onToggle={()=>setExpandOverride(collapsed)} onAudiencePreview={()=>setPreviewOpen(true)}/>
   <View accessibilityRole="tablist" style={s.tabs}>
    {TABS.map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:tab===value}} onPress={()=>openTab(value)}
      style={({pressed})=>[s.tab,tab===value&&s.tabOn,pressed&&s.pressed]}>
     <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.tabText,tab===value&&s.tabTextOn]}>{profileText(language,value)}</Text>
    </Pressable>)}
   </View>
   {tab==='Look'?<ProfileWardrobeChips categories={categories} chip={chip} onChange={setChip} reduceMotion={state.settings.reduceMotion}/>:null}
  </View>

  <View style={tab==='Look'?s.sectionShown:s.sectionHidden} pointerEvents={tab==='Look'?'auto':'none'}>
   <ProfileLookPanel state={state} chip={chip} onChange={onChange} active={tab==='Look'} onNavigateSource={onNavigateSource}
    onDirtyChange={setAppearanceDirty} onPreviewStateChange={setAppearancePreview} onNotice={setNotice}/>
  </View>
  <View style={tab==='Identity'?s.sectionShown:s.sectionHidden} pointerEvents={tab==='Identity'?'auto':'none'}>
   <ProfileIdentityPanel state={state} draft={draft} nameStyle={nameStyle} onNameStyleChange={setNameStyle} onSaveNameStyle={applyNameStyle}
    onNameInputDirtyChange={setNameInputDirty} nameResetVersion={nameResetVersion} active={tab==='Identity'}/>
  </View>
  <View style={tab==='Showcase'?s.sectionShown:s.sectionHidden} pointerEvents={tab==='Showcase'?'auto':'none'}>
   <ProfileShowcasePanel state={state} draft={draft}/>
  </View>

  <View style={s.footer}><GameButton compact title={profileT(language,"Preview as others see me")} tone="secondary" onPress={()=>setPreviewOpen(true)}/></View>
 </ScrollView>

 {notice?<View accessibilityLiveRegion="polite" style={[s.toast,{top:headerHeight+spacing.md}]}>
  <Text numberOfLines={2} style={s.toastText}>{profileT(language,'{name} equipped',{name:notice.name})}</Text>
  <Pressable accessibilityRole="button" accessibilityLabel={profileT(language,"Undo")} onPress={()=>{notice.undo();setNotice(null)}} style={({pressed})=>[s.undo,pressed&&s.pressed]}>
   <Text style={s.undoText}>{profileT(language,"UNDO")}</Text>
  </Pressable>
 </View>:null}

 <ProfileAudiencePreviewModal visible={previewOpen} state={previewState} identityDraft={identityDraft} onClose={()=>setPreviewOpen(false)}/>
 </>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 scroll:{flex:1},
 root:{padding:spacing.lg,paddingTop:spacing.sm,gap:spacing.md,paddingBottom:140},
 header:{gap:9,paddingBottom:9,backgroundColor:C.bg,borderBottomWidth:1,borderBottomColor:C.line},
 headRow:{flexDirection:'row',alignItems:'center',gap:8},
 heading:{...typography.title,color:C.text,flex:1,minWidth:0},
 pill:{maxWidth:'62%',paddingHorizontal:8,paddingVertical:4,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},
 pillDirty:{borderColor:C.warning,backgroundColor:C.warningSurface},
 pillText:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.6},
 pillTextDirty:{color:C.warning},
 tabs:{flexDirection:'row',gap:4,padding:3,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 tab:{flex:1,minWidth:0,minHeight:44,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,borderWidth:1,borderColor:'transparent'},
 tabOn:{backgroundColor:C.selection,borderColor:C.selectionLine},
 tabText:{...typography.bodyStrong,color:C.muted},
 tabTextOn:{color:C.text},
 pressed:{opacity:.72},
 sectionShown:{display:'flex'},
 sectionHidden:{display:'none'},
 footer:{paddingTop:4},
 toast:{position:'absolute',left:spacing.lg,right:spacing.lg,minHeight:52,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,
  borderRadius:radii.md,borderWidth:1,borderColor:C.info,backgroundColor:C.infoSurface,
  shadowColor:'#000',shadowOpacity:.45,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:8},
 toastText:{flex:1,minWidth:0,...typography.caption,color:C.text,fontWeight:'800'},
 undo:{minHeight:44,justifyContent:'center',paddingHorizontal:4},
 undoText:{fontSize:10.5,color:C.info,fontWeight:'900',letterSpacing:.7},
});}

import {ULTRA_LUXE_FULL_SET_DEFINITIONS,verifiedUltraLuxeFullSetPlan} from '../../core/ultra-luxe-full-set-command';
import {confirmUltraLuxeFullSetReadback,ultraLuxeFullSetEquipped,ultraLuxeFullSetNamePreset,type FullSetPlan,type VerifiedFullSetNames} from '../../core/ultra-luxe-full-set-name';
import type {OnlineSnapshot} from '../../core/online-game-repository';
import {quickCosmeticSets,quickSetEquipped,quickSetSelection,undoQuickSet} from '../../core/profile-quick-set-equip';
import {ownedUltraLuxeTitleColor} from '../../core/ultra-luxe-titles';
import {AscendantBlessingPicker} from './AscendantBlessingPicker';
import {profileT,profileText,profileSourceText} from '../../i18n/profile';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {memo,useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../../core/types';
import type {ProfileCustomizationDestination} from '../../core/profile-customization';
import {
 applyWardrobeEquipped,profileWardrobe,wardrobeEquipped,wardrobeSelection,wardrobeChanges,
 type WardrobeAssets,type WardrobeEquipped,type WardrobeKind,type WardrobeRow,
} from '../../core/profile-wardrobe';
import {PROFILE_BACKGROUND_PREVIEWS,profileBackgroundPreviewById} from '../../theme/profile-background-assets';
import {profileBorderSourceById} from '../../theme/profile-border-assets';
import {BASE_PROFILE_BACKGROUNDS} from '../../core/profile-cosmetics';
import {petArtSource} from '../../theme/pet-art';
import {useAuthSession} from '../../online/AuthSessionProvider';

import {radii,typography,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {GameButton} from '../GameButton';
import {GameTextInput} from '../GameTextInput';
import {PlayerBadgeSettings} from '../PlayerBadgeSettings';
import {ProfileFrameOverlay} from '../ProfileFrameOverlay';
import {ProfileIcon} from '../ProfileIcon';
import {RegionArtwork} from '../RegionArtwork';
import {ProfileUnlockSheet} from './ProfileUnlockSheet';
import {PROFILE_ALL_EFFECTS,profileAnimatedBorderDefinition} from '../../core/profile-effects';
import {cosmeticArtByBorder,cosmeticArtByEffect} from '../../theme/profile-cosmetic-render-art';
import {profileCosmeticRuntimeByEffect} from '../../theme/profile-cosmetic-runtime-v1';
import {wardrobeVisualSections,wardrobeCollectionLabel} from './wardrobe-visual-tiers';
import {ProfileEffectThumbnail} from '../ProfileCosmeticMotion';

/** Image ids/names only; the wardrobe model itself stays free of asset requires. */
export const WARDROBE_ASSETS:WardrobeAssets={
 scenes:[...BASE_PROFILE_BACKGROUNDS.map(row=>({id:row.id,name:row.name})),...PROFILE_BACKGROUND_PREVIEWS.map(row=>({id:row.id,name:row.name}))],
 frames:[...new Set([...profileBorderSourceById.keys(),...PROFILE_ALL_EFFECTS.map(row=>row.borderId)])],
 effects:PROFILE_ALL_EFFECTS.map(row=>({id:row.id,name:row.name})),
};
/** Badges have their own owned-state provider, so they ride beside the wardrobe chips. */
export type ChipKind=WardrobeKind|'badge';
const COMMIT_DELAY_MS=700;
export interface ProfileEquipNotice{name:string;undo:()=>void}
/** Optional port, supplied only after the combined command and fresh self-only name readback are available. */
export interface UltraLuxeFullSetPort{names:VerifiedFullSetNames;apply:(plan:FullSetPlan)=>Promise<OnlineSnapshot>}
const LUXE_LABELS=['Celestial Sovereign','Draconic Dominion','Abyssal Majesty','Paradox Eternal','Sakura Enchantment','Stormforged Sovereign'];
const LUXE_ACCENTS=['#F3C86F','#FF9460','#55C8C9','#B9A0F9','#F5A6C8','#63CFFF'];

export function ProfileLookPanel({state,chip,onChange,onNavigateSource,onPreviewStateChange,onDirtyChange,onNotice,fullSetPort,active=true}:{
 state:GameState;chip:ChipKind;onChange:(next:GameState)=>void|Promise<void>;onNavigateSource?:(destination:ProfileCustomizationDestination)=>void;
 onPreviewStateChange?:(preview:GameState)=>void;onDirtyChange?:(dirty:boolean)=>void;onNotice?:(notice:ProfileEquipNotice|null)=>void;fullSetPort?:UltraLuxeFullSetPort;active?:boolean;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const character=state.character;
 const accountId=useAuthSession().session?.user.id??'';
 const [tryOn,setTryOn]=useState<WardrobeRow|null>(null),[sheet,setSheet]=useState<WardrobeRow|null>(null);
 const [fullSetBusy,setFullSetBusy]=useState(false),[fullSetStatus,setFullSetStatus]=useState('');
 const fullSetInFlight=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 const [gridWidth,setGridWidth]=useState(0),[quickOpen,setQuickOpen]=useState(false);
 const saved=useMemo(()=>wardrobeEquipped(state),[state]);
 const [selection,setSelection]=useState<WardrobeEquipped>(saved);
 const [customTitle,setCustomTitle]=useState(saved.title);
 const selectionRef=useRef(saved);
 const scope=JSON.stringify([accountId,character?.id??null]),selectionScopeRef=useRef(scope);
 const accountRef=useRef(accountId),stateRef=useRef(state),pendingRef=useRef<{accountId:string;characterId:string;patch:Partial<WardrobeEquipped>}|null>(null),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const onChangeRef=useRef(onChange),sentRef=useRef<string|null>(null),chainRef=useRef<Promise<void>>(Promise.resolve());
 stateRef.current=state;accountRef.current=accountId;onChangeRef.current=onChange;

 // A cosmetic tap is committed as one write per burst: tapping through a gallery must not
 // fire one server profile command per tile, while the stage still reacts immediately.
 // Writes are chained, because a second write computed against a state the first write has
 // not landed in yet looks like a no-op and is dropped — which is exactly what undo does.
 const flush=useCallback(()=>{
  if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null}
  const next=pendingRef.current;pendingRef.current=null;
  if(!next)return;
  chainRef.current=chainRef.current.then(async()=>{
   const base=stateRef.current;
   if(accountRef.current!==next.accountId||!base.character||base.character.id!==next.characterId)return;
   const rebased={...wardrobeEquipped(base),...next.patch};
   sentRef.current=JSON.stringify(rebased);
   await onChangeRef.current(applyWardrobeEquipped(base,rebased));

   // Let the committed state reach this component before the next write reads it.
   await new Promise<void>(resolve=>setTimeout(resolve,0));
  }).catch(()=>{});
 },[accountId]);
 const queueCommit=useCallback((next:WardrobeEquipped)=>{
  const changed=wardrobeChanges(selectionRef.current,next);
  selectionRef.current=next;
  if(!Object.keys(changed).length)return;
  const characterId=stateRef.current.character?.id;
  if(!characterId)return;
  const owner=accountRef.current,previous=pendingRef.current;
  pendingRef.current={accountId:owner,characterId,patch:{...(previous?.accountId===owner&&previous.characterId===characterId?previous.patch:{}),...changed}};
  if(timerRef.current)clearTimeout(timerRef.current);
  timerRef.current=setTimeout(flush,COMMIT_DELAY_MS);
 },[flush]);
 useEffect(()=>()=>flush(),[flush]);
 // Another surface (or the server) changing the saved look re-seeds the local selection.
 // A state that is still catching up with our own writes is not such a change.
 const savedKey=JSON.stringify(saved);
 useEffect(()=>{
  if(selectionScopeRef.current!==scope){
   selectionScopeRef.current=scope;
   if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;}
   pendingRef.current=null;sentRef.current=null;
   const next=JSON.parse(savedKey) as WardrobeEquipped;
   selectionRef.current=next;setSelection(next);setCustomTitle(next.title);setTryOn(null);setSheet(null);setQuickOpen(false);setFullSetStatus('');
   return;
  }
  if(pendingRef.current)return;
  if(sentRef.current&&sentRef.current!==savedKey)return;
  sentRef.current=null;
  const next=JSON.parse(savedKey) as WardrobeEquipped;
  selectionRef.current=next;setSelection(next);
 },[savedKey,scope]);
 useEffect(()=>{setCustomTitle(saved.title)},[saved.title]);

 const categories=useMemo(()=>profileWardrobe(state,WARDROBE_ASSETS),[state]);
 const quickSets=useMemo(()=>{
  const legacy=quickCosmeticSets(state);
  if(!fullSetPort||!state.character)return legacy;
  const scope={accountId,characterId:state.character.id},current=wardrobeEquipped(state);
  const ordinary=legacy.filter(set=>!ultraLuxeFullSetNamePreset(set.id));
  const canonical=ULTRA_LUXE_FULL_SET_DEFINITIONS.flatMap((def,i)=>{
   const plan=verifiedUltraLuxeFullSetPlan(state,scope,def[0],current,fullSetPort.names);
   if(!plan)return [];
   const {scene,frame,pet,title,effect}=plan.after.wardrobe;
   return [{id:def[0],name:LUXE_LABELS[i],accent:LUXE_ACCENTS[i],choices:[{id:def[0],name:LUXE_LABELS[i],namePresetId:ultraLuxeFullSetNamePreset(def[0]),patch:{scene,frame,pet,title,effect}}]}];
  });
  return [...ordinary,...canonical];
 },[state,accountId,fullSetPort]);
 const live=useMemo(()=>({...selection,title:customTitle.trim()||selection.title}),[selection,customTitle]);
 const preview=useMemo(()=>{
  const equipped=tryOn?wardrobeSelection(live,tryOn):live;
  return applyWardrobeEquipped(state,equipped);
 },[state,live,tryOn]);
 useEffect(()=>{onPreviewStateChange?.(preview)},[preview,onPreviewStateChange]);
 const titleDirty=customTitle.trim()!==saved.title&&!!customTitle.trim();
 useEffect(()=>{onDirtyChange?.(titleDirty)},[titleDirty,onDirtyChange]);
 useEffect(()=>()=>onDirtyChange?.(false),[onDirtyChange]);

 const equip=(row:WardrobeRow)=>{
  if(fullSetInFlight.current)return;
  if(!row.unlocked){setSheet(row);return}
  const before=selection,next=wardrobeSelection(before,row);
  if(tryOn)setTryOn(null);
  setSelection(next);queueCommit(next);
  onNotice?.({name:row.name,undo:()=>{setSelection(before);queueCommit(before);onNotice?.(null)}});
 };
 const equipSet=(setId:string,choiceId:string,name:string)=>{
  if(fullSetInFlight.current)return;
  if(fullSetPort&&ultraLuxeFullSetNamePreset(setId)){
   const owner=accountRef.current,characterId=stateRef.current.character?.id;
   if(!characterId||selectionScopeRef.current!==scope||pendingRef.current||sentRef.current){setFullSetStatus('Finish saving your current look first.');return;}
   const plan=verifiedUltraLuxeFullSetPlan(stateRef.current,{accountId:owner,characterId},setId,wardrobeEquipped(stateRef.current),fullSetPort.names);
   if(!plan){setFullSetStatus('Full set ownership could not be confirmed.');return;}
   fullSetInFlight.current=true;setFullSetBusy(true);setFullSetStatus('');setTryOn(null);setSheet(null);onNotice?.(null);
   void fullSetPort.apply(plan).then(next=>{
    if(!mounted.current||accountRef.current!==owner||stateRef.current.character?.id!==characterId)return;
    if(confirmUltraLuxeFullSetReadback(plan,{accountId:owner,characterId},{replayed:next.ultraLuxeFullSetReplayed,gameplay:next,nameSelection:next.ultraLuxeNameSelection})!=='confirmed')throw Error('unconfirmed_full_set');
    const confirmed=wardrobeEquipped(next.state);
    selectionRef.current=confirmed;setSelection(confirmed);setCustomTitle(confirmed.title);
    setFullSetStatus('Full set equipped, including animated name.');
   }).catch(()=>{if(mounted.current&&accountRef.current===owner&&stateRef.current.character?.id===characterId)setFullSetStatus('Full set equip could not be confirmed.');}).finally(()=>{fullSetInFlight.current=false;if(mounted.current)setFullSetBusy(false);});
   return;
  }
  const owner=accountRef.current,characterId=stateRef.current.character?.id;
  const before=selectionRef.current,next=quickSetSelection(stateRef.current,before,setId,choiceId);
  if(selectionScopeRef.current!==scope||!characterId||!next||!Object.keys(wardrobeChanges(before,next)).length)return;
  setTryOn(null);setSheet(null);setSelection(next);
  if(next.title!==before.title)setCustomTitle(next.title);
  queueCommit(next);
  onNotice?.({name,undo:()=>{
   if(accountRef.current!==owner||stateRef.current.character?.id!==characterId)return;
   const current=selectionRef.current,restored=undoQuickSet(current,before,next);
   setSelection(restored);
   if(restored.title!==current.title)setCustomTitle(restored.title);
   queueCommit(restored);onNotice?.(null);
  }});
 };
 const saveCustomTitle=()=>{
  if(fullSetInFlight.current)return;
  const value=customTitle.trim();if(!value)return;
  const next={...selection,title:value};setSelection(next);setCustomTitle(value);queueCommit(next);
  onNotice?.({name:value,undo:()=>{setSelection(selection);setCustomTitle(saved.title);queueCommit(selection);onNotice?.(null)}});
 };

 if(!character)return null;
 const category=categories.find(row=>row.kind===chip);
 const sections=wardrobeVisualSections(category?.rows??[]);
 const artwork=(row:WardrobeRow,size:number):ReactNode=>{
  if(row.kind==='icon')return <ProfileIcon id={row.id} classId={character.classId} size={size}/>;
  if(row.kind==='scene'){const scene=profileBackgroundPreviewById.get(row.id),base=BASE_PROFILE_BACKGROUNDS.find(item=>item.id===row.id);
   return scene?<Image source={scene.source} resizeMode="cover" style={s.fill}/>:base?<View style={s.fill}><RegionArtwork regionId={base.region}/></View>:null}
  if(row.kind==='frame'){const animated=profileAnimatedBorderDefinition(row.id),source=cosmeticArtByBorder.get(row.id)?.border??profileBorderSourceById.get(row.id)??(animated?profileBorderSourceById.get(animated.fallbackBorderId):undefined);
   return source?<View style={s.fill}><RegionArtwork regionId="KINGS_ROAD" muted/><ProfileFrameOverlay source={source}/></View>:<View style={s.blank}><Text style={s.blankMark}>◇</Text></View>}
  if(row.kind==='effect'){const art=cosmeticArtByEffect.get(row.id),runtime=profileCosmeticRuntimeByEffect.get(row.id);
   return art?<Image source={art.staticEffect} resizeMode="stretch" style={s.fill}/>:runtime?<ProfileEffectThumbnail runtime={runtime}/>:<View style={s.blank}><Text style={s.effectMark}>✦</Text></View>}
  if(row.kind==='pet'){const source=petArtSource(row.id);
   return source?<Image source={source} resizeMode="contain" style={s.petImage}/>:<View style={s.blank}><Text style={s.blankMark}>{row.clear?profileT(language,"Solo"):"—"}</Text></View>}
  return null;
 };
 const tileWidth=gridWidth>0?Math.floor((gridWidth-2*8)/3):104;
 const selectedId=chip==='icon'?live.icon:chip==='scene'?live.scene:chip==='frame'?live.frame:chip==='effect'?live.effect:chip==='pet'?live.pet:'';

 return <View style={s.root}>
  {chip==='badge'?<PlayerBadgeSettings/>:category?<>
   {chip==='frame'&&quickSets.length>0?<View style={s.quickSets}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:quickOpen}} onPress={()=>setQuickOpen(v=>!v)} style={s.quickHeader}>
     <Text style={s.label}>{profileT(language,"Quick set equip")} · {quickSets.length}</Text><Text style={s.useMark}>{quickOpen?'⌃':'⌄'}</Text>
    </Pressable>
    {quickOpen?<><Text style={s.rowMeta}>{fullSetPort?'Ultra Luxe sets also equip their animated account name. Badges stay unchanged.':profileT(language,"Equip owned matching pieces on this character. Badges stay unchanged.")}</Text>
    {fullSetBusy||fullSetStatus?<Text accessibilityLiveRegion="polite" style={s.rowMeta}>{fullSetBusy?'Saving full set…':fullSetStatus}</Text>:null}
    {quickSets.map(set=><View key={set.id} style={[s.quickRow,{borderColor:set.accent}]}>
     <Text style={s.rowName}>{set.name}</Text>
     <View style={s.quickChoices}>
      {set.choices.map(choice=>{
       const equipped=fullSetPort&&choice.namePresetId?ultraLuxeFullSetEquipped(selection,choice.patch,set.id,fullSetPort.names,{accountId,characterId:character.id}):quickSetEquipped(selection,choice);
       return <Pressable key={choice.id} accessibilityRole="button" accessibilityLabel={set.name+', '+choice.name+', '+profileT(language,equipped?"Equipped":"Equip set")}
        accessibilityState={{selected:equipped,disabled:equipped||fullSetBusy}} disabled={equipped||fullSetBusy} onPress={()=>equipSet(set.id,choice.id,set.name)}
        style={({pressed})=>[s.quickChoice,equipped&&s.tileOn,pressed&&s.pressed]}>
        {set.choices.length>1?<Text style={s.quickChoiceName}>{choice.name}</Text>:null}
        <Text style={equipped?s.equippedMark:s.useMark}>{profileT(language,equipped?"Equipped":"Equip set")}</Text>
       </Pressable>;
      })}
     </View>
    </View>)}</>:null}
   </View>:null}
   {chip==='icon'?<Text style={s.label}>{profileText(language,'Account-wide')}</Text>:null}
   {chip==='title'?<View style={s.titleList}>
    <View style={s.customTitle}>
     <Text style={s.label}>{profileT(language,"CUSTOM TITLE")}</Text>
     <GameTextInput accessibilityLabel={profileT(language,"Profile title")} value={customTitle} onChangeText={setCustomTitle} maxLength={32} placeholder={profileT(language,"New Adventurer")}/>
     <GameButton compact title={titleDirty?profileT(language,"Save title"):profileT(language,"Title saved")} disabled={!titleDirty} onPress={saveCustomTitle}/>
    </View>
    {category.rows.map(row=><Pressable key={row.kind+':'+row.id} accessibilityRole="button" accessibilityState={{selected:live.title===row.name}}
      accessibilityHint={row.unlocked?profileT(language,"Use this earned title"):profileT(language,"Open the unlock source")} onPress={()=>equip(row)}
      style={({pressed})=>[s.titleRow,live.title===row.name&&s.titleRowOn,pressed&&s.pressed]}>
     <View style={s.flex}>
      <Text style={[s.rowName,!row.unlocked&&s.lockedText,row.unlocked&&ownedUltraLuxeTitleColor(state,row.name,C.dark)?{color:ownedUltraLuxeTitleColor(state,row.name,C.dark)}:undefined]}>{row.name}</Text>
      <Text numberOfLines={2} style={s.rowMeta}>{row.unlocked?profileText(language,row.group):profileSourceText(language,row.sourceLabel??'')+' · '+profileSourceText(language,row.sourceDetail??'')}</Text>
     </View>
     {live.title===row.name?<Text style={s.equippedMark}>{profileT(language,"EQUIPPED")}</Text>
      :row.unlocked?<Text style={s.useMark}>{profileT(language,"USE")}</Text>
      :<Text style={s.sourceMark}>{row.lockTag} ›</Text>}
    </Pressable>)}
   </View>:<View style={s.wardrobeSections} onLayout={({nativeEvent:{layout}})=>setGridWidth(previous=>previous===layout.width?previous:layout.width)}>
    {sections.standard.length>0?<>
     {sections.animated.length+sections.premium.length>0?<View style={s.sectionDivider} accessibilityRole="header"><Text style={s.sectionLabel}>{profileT(language,"Static cosmetics")}</Text><View style={s.sectionLine}/></View>:null}
     <View style={s.grid}>
     {sections.standard.map(row=><WardrobeTile key={row.kind+':'+row.id} row={row} width={tileWidth}
      equipped={selectedId===row.id} tryingOn={tryOn?.kind===row.kind&&tryOn?.id===row.id}
      onPress={()=>equip(row)}>{artwork(row,Math.round(tileWidth*.72))}</WardrobeTile>)}
    </View></>:null}
    {sections.animated.length>0?<>
     <View style={s.sectionDivider} accessibilityRole="header">
      <Text style={s.sectionLabel}>✦ {profileT(language,"Animated sets")}</Text>
      <View style={s.sectionLine}/>
     </View>
     <View style={s.grid}>
      {sections.animated.map(row=><WardrobeTile key={row.kind+':'+row.id} row={row} width={tileWidth}
       equipped={selectedId===row.id} tryingOn={tryOn?.kind===row.kind&&tryOn?.id===row.id}
       onPress={()=>equip(row)}>{artwork(row,Math.round(tileWidth*.72))}</WardrobeTile>)}
     </View>
    </>:null}
    {sections.premium.length>0?<>
     <View style={s.sectionDivider} accessibilityRole="header">
      <Text style={s.sectionLabel}>✦ {profileT(language,"Premium animated sets")}</Text>
      <View style={s.sectionLine}/>
     </View>
     <View style={s.grid}>
      {sections.premium.map(row=><WardrobeTile key={row.kind+':'+row.id} row={row} width={tileWidth}
       equipped={selectedId===row.id} tryingOn={tryOn?.kind===row.kind&&tryOn?.id===row.id}
       onPress={()=>equip(row)}>{artwork(row,Math.round(tileWidth*.72))}</WardrobeTile>)}
     </View>
    </>:null}
   </View>}
  </>:null}

  {chip==='pet'?<AscendantBlessingPicker state={state} slot="pet" onChange={onChange}/>:chip==='scene'?<AscendantBlessingPicker state={state} slot="background" onChange={onChange}/>:null}
  <ProfileUnlockSheet row={sheet} reduceMotion={state.settings.reduceMotion||!active} tryingOn={!!sheet&&tryOn?.id===sheet.id&&tryOn?.kind===sheet.kind}
   artwork={sheet?artwork(sheet,70):null} onClose={()=>setSheet(null)}
   onTryOn={()=>{setTryOn(current=>current&&sheet&&current.id===sheet.id&&current.kind===sheet.kind?null:sheet);setSheet(null)}}
   onNavigateSource={onNavigateSource}/>
 </View>;
}

const WardrobeTile=memo(function WardrobeTile({row,width,equipped,tryingOn,onPress,children}:{
 row:WardrobeRow;width:number;equipped:boolean;tryingOn:boolean;onPress:()=>void;children:ReactNode;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const collection=wardrobeCollectionLabel(row);
 const status=equipped?profileT(language,"Equipped"):tryingOn?profileT(language,"Trying on"):row.unlocked?profileText(language,row.group):profileT(language,"Locked");
 return <Pressable accessibilityRole="button" accessibilityLabel={(collection?.fullName??row.name)+', '+status} accessibilityState={{selected:equipped}} onPress={onPress}
   style={({pressed})=>[s.tile,{width},equipped&&s.tileOn,tryingOn&&s.tileTry,pressed&&s.pressed]}>
  <View style={s.tileArt}>
   <View style={[s.artLayer,!row.unlocked&&s.dim]}>{children}</View>
   {equipped?<View style={s.tick}><Text style={s.tickMark}>✓</Text></View>:null}
   {!row.unlocked&&row.lockTag?<View style={s.source}><Text numberOfLines={1} style={s.sourceText}>{row.lockTag}</Text></View>:null}
  </View>
  {collection?<View style={s.tileName}>
   <Text numberOfLines={1} style={s.tileCollection}>{collection.short}</Text>
   <Text numberOfLines={1} style={[s.tilePiece,!row.unlocked&&s.lockedText]}>{collection.item}</Text>
  </View>:<Text numberOfLines={2} style={[s.tileName,!row.unlocked&&s.lockedText]}>{row.name}</Text>}
  <Text numberOfLines={1} style={s.tileMeta}>{status}</Text>
 </Pressable>;
},(previous,next)=>previous.row===next.row&&previous.width===next.width&&previous.equipped===next.equipped&&previous.tryingOn===next.tryingOn&&previous.children===next.children);

function makeStyles(C:ThemeColors){return StyleSheet.create({
 quickSets:{gap:7,padding:9,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 quickHeader:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 quickRow:{gap:6,padding:8,borderRadius:radii.sm,borderWidth:1,backgroundColor:C.panel},
 quickChoices:{flexDirection:'row',flexWrap:'wrap',gap:6},
 quickChoice:{flexGrow:1,minWidth:100,minHeight:44,padding:7,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,justifyContent:'center',alignItems:'center',gap:3},
 quickChoiceName:{fontSize:11,lineHeight:15,color:C.text,fontWeight:'700',textAlign:'center'},
 root:{gap:10},flex:{flex:1,minWidth:0},pressed:{opacity:.74},
 wardrobeSections:{gap:8},
 sectionDivider:{flexDirection:'row',alignItems:'center',gap:8,paddingTop:3},
 sectionLabel:{fontSize:10.5,lineHeight:15,fontWeight:'800',color:C.accent},
 sectionLine:{flex:1,height:StyleSheet.hairlineWidth,backgroundColor:C.lineStrong},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 tile:{padding:5,gap:4,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 tileOn:{borderColor:C.selectionLine,backgroundColor:C.selection},
 tileTry:{borderColor:C.warning,backgroundColor:C.warningSurface},
 tileArt:{width:'100%',aspectRatio:1,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,overflow:'hidden',backgroundColor:C.bg},
 artLayer:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center'},dim:{opacity:.46},
 fill:{width:'100%',height:'100%'},
 petImage:{width:'86%',height:'86%'},
 blank:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center',backgroundColor:C.panel},
 blankMark:{...typography.bodyStrong,color:C.muted},effectMark:{fontSize:22,lineHeight:26,color:C.accent,fontWeight:'900'},
 tick:{position:'absolute',top:4,right:4,width:18,height:18,borderRadius:99,alignItems:'center',justifyContent:'center',backgroundColor:C.selectionLine},
 tickMark:{fontSize:10,lineHeight:12,color:C.bg,fontWeight:'900'},
 source:{position:'absolute',left:3,right:3,bottom:3,paddingVertical:2,borderRadius:4,borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface},
 sourceText:{fontSize:7.5,lineHeight:10,color:C.warning,fontWeight:'900',textAlign:'center',letterSpacing:.3},
 tileName:{height:28,fontSize:10.5,lineHeight:14,color:C.text,fontWeight:'700'},
 tileCollection:{fontSize:9,lineHeight:12,fontWeight:'800',color:C.accent},
 tilePiece:{fontSize:10.5,lineHeight:14,color:C.text,fontWeight:'700'},
 tileMeta:{fontSize:8.5,lineHeight:11,color:C.disabled,fontWeight:'700'},
 lockedText:{color:C.muted},
 titleList:{gap:7},
 customTitle:{gap:7,padding:10,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 label:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.75},
 titleRow:{minHeight:56,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingVertical:8,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 titleRowOn:{borderColor:C.selectionLine,backgroundColor:C.selection},
 rowName:{...typography.bodyStrong,color:C.text},
 rowMeta:{...typography.caption,color:C.muted,marginTop:2,lineHeight:15},
 equippedMark:{fontSize:8.5,color:C.good,fontWeight:'900',letterSpacing:.55},
 useMark:{fontSize:8.5,color:C.accent,fontWeight:'900',letterSpacing:.55},
 sourceMark:{fontSize:8.5,color:C.warning,fontWeight:'900',letterSpacing:.55},
});}

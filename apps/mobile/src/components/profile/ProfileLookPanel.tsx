import {profileT,profileText,profileSourceText} from '../../i18n/profile';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {memo,useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../../core/types';
import type {ProfileCustomizationDestination} from '../../core/profile-customization';
import {
 applyWardrobeEquipped,profileWardrobe,wardrobeEquipped,wardrobeSelection,
 type WardrobeAssets,type WardrobeEquipped,type WardrobeKind,type WardrobeRow,
} from '../../core/profile-wardrobe';
import {PROFILE_BACKGROUND_PREVIEWS,profileBackgroundPreviewById} from '../../theme/profile-background-assets';
import {profileBorderSourceById} from '../../theme/profile-border-assets';
import {BASE_PROFILE_BACKGROUNDS} from '../../core/profile-cosmetics';
import {petArtSource} from '../../theme/pet-art';
import {useAuthSession} from '../../online/AuthSessionProvider';
import {invalidatePlayerIdentity,publishOwnProfileIcon} from '../../online/player-identity-cache';
import {radii,typography,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {GameButton} from '../GameButton';
import {GameTextInput} from '../GameTextInput';
import {PlayerBadgeSettings} from '../PlayerBadgeSettings';
import {ProfileFrameOverlay} from '../ProfileFrameOverlay';
import {ProfileIcon} from '../ProfileIcon';
import {RegionArtwork} from '../RegionArtwork';
import {ProfileUnlockSheet} from './ProfileUnlockSheet';

/** Image ids/names only; the wardrobe model itself stays free of asset requires. */
export const WARDROBE_ASSETS:WardrobeAssets={
 scenes:[...BASE_PROFILE_BACKGROUNDS.map(row=>({id:row.id,name:row.name})),...PROFILE_BACKGROUND_PREVIEWS.map(row=>({id:row.id,name:row.name}))],
 frames:[...profileBorderSourceById.keys()],
};
/** Badges have their own owned-state provider, so they ride beside the wardrobe chips. */
export type ChipKind=WardrobeKind|'badge';
const COMMIT_DELAY_MS=700;
export interface ProfileEquipNotice{name:string;undo:()=>void}

export function ProfileLookPanel({state,chip,onChange,onNavigateSource,onPreviewStateChange,onDirtyChange,onNotice,active=true}:{
 state:GameState;chip:ChipKind;onChange:(next:GameState)=>void|Promise<void>;onNavigateSource?:(destination:ProfileCustomizationDestination)=>void;
 onPreviewStateChange?:(preview:GameState)=>void;onDirtyChange?:(dirty:boolean)=>void;onNotice?:(notice:ProfileEquipNotice|null)=>void;active?:boolean;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const character=state.character;
 const accountId=useAuthSession().session?.user.id??'';
 const [tryOn,setTryOn]=useState<WardrobeRow|null>(null),[sheet,setSheet]=useState<WardrobeRow|null>(null);
 const [gridWidth,setGridWidth]=useState(0);
 const saved=useMemo(()=>wardrobeEquipped(state),[state]);
 const [selection,setSelection]=useState<WardrobeEquipped>(saved);
 const [customTitle,setCustomTitle]=useState(saved.title);
 const stateRef=useRef(state),pendingRef=useRef<WardrobeEquipped|null>(null),timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const onChangeRef=useRef(onChange),sentRef=useRef<string|null>(null),chainRef=useRef<Promise<void>>(Promise.resolve());
 stateRef.current=state;onChangeRef.current=onChange;

 // A cosmetic tap is committed as one write per burst: tapping through a gallery must not
 // fire one server profile command per tile, while the stage still reacts immediately.
 // Writes are chained, because a second write computed against a state the first write has
 // not landed in yet looks like a no-op and is dropped — which is exactly what undo does.
 const flush=useCallback(()=>{
  if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null}
  const next=pendingRef.current;pendingRef.current=null;
  if(!next)return;
  sentRef.current=JSON.stringify(next);
  chainRef.current=chainRef.current.then(async()=>{
   const base=stateRef.current;
   if(!base.character)return;
   await onChangeRef.current(applyWardrobeEquipped(base,next));
   if(accountId){publishOwnProfileIcon(accountId,next.icon,base.character.classId);invalidatePlayerIdentity(accountId)}
   // Let the committed state reach this component before the next write reads it.
   await new Promise<void>(resolve=>setTimeout(resolve,0));
  }).catch(()=>{});
 },[accountId]);
 const queueCommit=useCallback((next:WardrobeEquipped)=>{
  pendingRef.current=next;
  if(timerRef.current)clearTimeout(timerRef.current);
  timerRef.current=setTimeout(flush,COMMIT_DELAY_MS);
 },[flush]);
 useEffect(()=>()=>flush(),[flush]);
 // Another surface (or the server) changing the saved look re-seeds the local selection.
 // A state that is still catching up with our own writes is not such a change.
 const savedKey=JSON.stringify(saved);
 useEffect(()=>{
  if(pendingRef.current)return;
  if(sentRef.current&&sentRef.current!==savedKey)return;
  sentRef.current=null;
  setSelection(JSON.parse(savedKey) as WardrobeEquipped);
 },[savedKey]);
 useEffect(()=>{setCustomTitle(saved.title)},[saved.title]);

 const categories=useMemo(()=>profileWardrobe(state,WARDROBE_ASSETS),[state]);
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
  if(!row.unlocked){setSheet(row);return}
  const before=selection,next=wardrobeSelection(before,row);
  if(tryOn)setTryOn(null);
  setSelection(next);queueCommit(next);
  onNotice?.({name:row.name,undo:()=>{setSelection(before);queueCommit(before);onNotice?.(null)}});
 };
 const saveCustomTitle=()=>{
  const value=customTitle.trim();if(!value)return;
  const next={...selection,title:value};setSelection(next);setCustomTitle(value);queueCommit(next);
  onNotice?.({name:value,undo:()=>{setSelection(selection);setCustomTitle(saved.title);queueCommit(selection);onNotice?.(null)}});
 };

 if(!character)return null;
 const category=categories.find(row=>row.kind===chip);
 const artwork=(row:WardrobeRow,size:number):ReactNode=>{
  if(row.kind==='icon')return <ProfileIcon id={row.id} classId={character.classId} size={size}/>;
  if(row.kind==='scene'){const scene=profileBackgroundPreviewById.get(row.id),base=BASE_PROFILE_BACKGROUNDS.find(item=>item.id===row.id);
   return scene?<Image source={scene.source} resizeMode="cover" style={s.fill}/>:base?<View style={s.fill}><RegionArtwork regionId={base.region}/></View>:null}
  if(row.kind==='frame'){const source=profileBorderSourceById.get(row.id);
   return source?<View style={s.fill}><RegionArtwork regionId="KINGS_ROAD" muted/><ProfileFrameOverlay source={source}/></View>:<View style={s.blank}><Text style={s.blankMark}>◇</Text></View>}
  if(row.kind==='pet'){const source=petArtSource(row.id);
   return source?<Image source={source} resizeMode="contain" style={s.petImage}/>:<View style={s.blank}><Text style={s.blankMark}>{profileT(language,"Solo")}</Text></View>}
  return null;
 };
 const tileWidth=gridWidth>0?Math.floor((gridWidth-2*8)/3):104;
 const selectedId=chip==='icon'?live.icon:chip==='scene'?live.scene:chip==='frame'?live.frame:chip==='pet'?live.pet:'';

 return <View style={s.root}>
  {chip==='badge'?<PlayerBadgeSettings/>:category?<>
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
      <Text style={[s.rowName,!row.unlocked&&s.lockedText]}>{row.name}</Text>
      <Text numberOfLines={2} style={s.rowMeta}>{row.unlocked?profileText(language,row.group):profileSourceText(language,row.sourceLabel??'')+' · '+profileSourceText(language,row.sourceDetail??'')}</Text>
     </View>
     {live.title===row.name?<Text style={s.equippedMark}>{profileT(language,"EQUIPPED")}</Text>
      :row.unlocked?<Text style={s.useMark}>{profileT(language,"USE")}</Text>
      :<Text style={s.sourceMark}>{row.lockTag} ›</Text>}
    </Pressable>)}
   </View>:<View style={s.grid} onLayout={({nativeEvent:{layout}})=>setGridWidth(previous=>previous===layout.width?previous:layout.width)}>
    {category.rows.map(row=><WardrobeTile key={row.kind+':'+row.id} row={row} width={tileWidth}
      equipped={selectedId===row.id} tryingOn={tryOn?.kind===row.kind&&tryOn?.id===row.id}
      onPress={()=>equip(row)}>{artwork(row,Math.round(tileWidth*.72))}</WardrobeTile>)}
   </View>}
  </>:null}

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
 const status=equipped?profileT(language,"Equipped"):tryingOn?profileT(language,"Trying on"):row.unlocked?profileText(language,row.group):profileT(language,"Locked");
 return <Pressable accessibilityRole="button" accessibilityLabel={row.name+', '+status} accessibilityState={{selected:equipped}} onPress={onPress}
   style={({pressed})=>[s.tile,{width},equipped&&s.tileOn,tryingOn&&s.tileTry,pressed&&s.pressed]}>
  <View style={s.tileArt}>
   <View style={[s.artLayer,!row.unlocked&&s.dim]}>{children}</View>
   {equipped?<View style={s.tick}><Text style={s.tickMark}>✓</Text></View>:null}
   {!row.unlocked&&row.lockTag?<View style={s.source}><Text numberOfLines={1} style={s.sourceText}>{row.lockTag}</Text></View>:null}
  </View>
  <Text numberOfLines={2} style={[s.tileName,!row.unlocked&&s.lockedText]}>{row.name}</Text>
  <Text numberOfLines={1} style={s.tileMeta}>{status}</Text>
 </Pressable>;
},(previous,next)=>previous.row===next.row&&previous.width===next.width&&previous.equipped===next.equipped&&previous.tryingOn===next.tryingOn&&previous.children===next.children);

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},flex:{flex:1,minWidth:0},pressed:{opacity:.74},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 tile:{padding:5,gap:4,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 tileOn:{borderColor:C.selectionLine,backgroundColor:C.selection},
 tileTry:{borderColor:C.warning,backgroundColor:C.warningSurface},
 tileArt:{width:'100%',aspectRatio:1,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,overflow:'hidden',backgroundColor:C.bg},
 artLayer:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center'},dim:{opacity:.46},
 fill:{width:'100%',height:'100%'},
 petImage:{width:'86%',height:'86%'},
 blank:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center',backgroundColor:C.panel},
 blankMark:{...typography.bodyStrong,color:C.muted},
 tick:{position:'absolute',top:4,right:4,width:18,height:18,borderRadius:99,alignItems:'center',justifyContent:'center',backgroundColor:C.selectionLine},
 tickMark:{fontSize:10,lineHeight:12,color:C.bg,fontWeight:'900'},
 source:{position:'absolute',left:3,right:3,bottom:3,paddingVertical:2,borderRadius:4,borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface},
 sourceText:{fontSize:7.5,lineHeight:10,color:C.warning,fontWeight:'900',textAlign:'center',letterSpacing:.3},
 tileName:{height:28,fontSize:10.5,lineHeight:14,color:C.text,fontWeight:'700'},
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

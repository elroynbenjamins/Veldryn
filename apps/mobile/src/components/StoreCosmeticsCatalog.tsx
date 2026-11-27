import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {PROFILE_COSMETIC_STORE_COLLECTIONS,profileCosmeticCollectionOwnership,type ProfileCosmeticCollectionId} from '../content/profile-cosmetic-store';
import {profileCosmeticRuntimeByEffect} from '../theme/profile-cosmetic-runtime-v1';
import {profileBorderSourceById,resolveProfileBorderArtworkId} from '../theme/profile-border-assets';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {ProfileFrameOverlay} from './ProfileFrameOverlay';
import {ProfileEffectThumbnail} from './ProfileCosmeticMotion';
import {StoreCosmeticSetPreview,type StorePreviewSelection} from './StoreCosmeticSetPreview';
import {NEXT_PREMIUM_SETS} from '../core/next-premium-set-review';

/** Authored catalog preview only. No price lookup, checkout callback, Play product id or entitlement mutation exists here. */
export function StoreCosmeticsCatalog({state}:{state:GameState}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [selected,setSelected]=useState<ProfileCosmeticCollectionId>('gloamward');
 const [preview,setPreview]=useState<StorePreviewSelection|null>(null);
 const collection=PROFILE_COSMETIC_STORE_COLLECTIONS.find(row=>row.id===selected)??PROFILE_COSMETIC_STORE_COLLECTIONS[0];
 const owned=profileCosmeticCollectionOwnership(state,collection);
 const runtime=profileCosmeticRuntimeByEffect.get(collection.effect.itemId);
 const borderSource=runtime?profileBorderSourceById.get(resolveProfileBorderArtworkId(runtime.borderId,runtime.fallbackBorderId)):undefined;
 const status=(value:boolean)=>value?'OWNED':'INCLUDED';
 return <View style={s.root}>
  <View style={s.between}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>Profile Cosmetics</Text><Text style={s.copy}>Standard cosmetic sets · Account-wide ownership · Per-character equipment</Text></View><Text style={s.disabled}>CHECKOUT OFF</Text></View>
  <Text style={s.copy}>These smaller collections are sold only as complete sets. Each set unlocks four cosmetics together: the animated border, showcase effect and two human portrait icons. All four remain independently equippable afterward.</Text>

  <View accessibilityRole="tablist" accessibilityLabel="Cosmetic sets" style={s.tabs}>
   {PROFILE_COSMETIC_STORE_COLLECTIONS.map(row=><Pressable key={row.id} accessibilityRole="tab" accessibilityState={{selected:selected===row.id}} onPress={()=>setSelected(row.id)}
    style={({pressed})=>[s.tab,{borderColor:selected===row.id?row.accent:C.line,backgroundColor:selected===row.id?C.selection:C.panel},pressed&&s.pressed]}>
    <Text numberOfLines={1} style={[s.tabText,{color:selected===row.id?C.text:C.muted}]}>{row.name}</Text>
   </Pressable>)}
  </View>

  <View style={[s.hero,{borderColor:collection.accent}]}>
   <View style={s.preview}>
    {runtime&&!preview?<ProfileEffectThumbnail runtime={runtime}/>:null}
    {borderSource?<ProfileFrameOverlay source={borderSource}/>:null}
   </View>
   <View style={s.heroCopy}><Text style={s.eyebrow}>STANDARD COSMETIC SET</Text><Text style={[s.collectionName,{color:collection.accent}]}>{collection.name}</Text><Text style={s.copy}>{collection.description}</Text></View>
  </View>

  <Pressable accessibilityRole="button" onPress={()=>setPreview({kind:'standard',collection})} style={[s.previewButton,{borderColor:collection.accent}]}><Text style={s.previewLabel}>Preview full animated set</Text></Pressable>
  <View style={[s.setCard,{borderColor:owned.setOwned?C.good:collection.accent}]}>
   <View style={s.between}><View style={s.flex}><Text style={s.pieceType}>SET ONLY</Text><Text style={s.setName}>{collection.set.name}</Text></View><Text style={[s.bundleCount,{color:owned.setOwned?C.good:collection.accent}]}>{owned.ownedPieces}/4</Text></View>
   <Text style={s.copy}>The Store does not sell any of the four set contents separately.</Text>
   <View style={s.contents}>
    <View style={s.contentRow}><View style={s.flex}><Text style={s.contentLabel}>BORDER</Text><Text style={s.contentName}>{collection.border.name}</Text></View><Text style={[s.status,{color:owned.borderOwned?C.good:C.muted}]}>{status(owned.borderOwned)}</Text></View>
    <View style={s.contentRow}><View style={s.flex}><Text style={s.contentLabel}>SHOWCASE EFFECT</Text><Text style={s.contentName}>{collection.effect.name}</Text></View><Text style={[s.status,{color:owned.effectOwned?C.good:C.muted}]}>{status(owned.effectOwned)}</Text></View>
    {collection.portraits.map((portrait,index)=><View key={portrait.id} style={s.contentRow}><View style={s.flex}><Text style={s.contentLabel}>PROFILE ICON</Text><Text style={s.contentName}>{portrait.name}</Text></View><Text style={[s.status,{color:owned.portraitsOwned[index]?C.good:C.muted}]}>{status(owned.portraitsOwned[index])}</Text></View>)}
   </View>
   <Text style={s.copy}>Once owned, the border, effect and either portrait icon can be equipped independently and mixed with other compatible profile cosmetics.</Text>
   <Text style={s.noPrice}>Price and checkout are intentionally not registered in this build.</Text>
  </View>

  <View style={[s.setCard,{borderColor:NEXT_PREMIUM_SETS[0].colors[0]}]}>
   <Text style={s.pieceType}>ASCENDANT · PREVIEW ONLY</Text><Text style={[s.setName,{color:NEXT_PREMIUM_SETS[0].colors[0]}]}>{NEXT_PREMIUM_SETS[0].name}</Text>
   <Text style={s.copy}>See the native full-set showcase. This is not a registered purchase offer.</Text>
   <Pressable accessibilityRole="button" onPress={()=>setPreview({kind:'sakura'})} style={[s.previewButton,{borderColor:NEXT_PREMIUM_SETS[0].colors[0]}]}><Text style={s.previewLabel}>Preview Sakura Enchantment</Text></Pressable>
  </View>
  {preview?<StoreCosmeticSetPreview state={state} selection={preview} onClose={()=>setPreview(null)}/>:null}
  <View style={[s.note,{borderColor:C.info,backgroundColor:C.infoSurface}]}>
   <Text style={s.noteTitle}>Prepared, not released</Text>
   <Text style={s.copy}>This catalog performs no purchase, grant, restore or entitlement write. Google Play set products will be connected only after native QA and server migration approval.</Text>
  </View>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 previewButton:{minHeight:44,justifyContent:'center',alignItems:'center',borderWidth:1,borderRadius:radii.sm,paddingHorizontal:10,backgroundColor:C.panel},previewLabel:{color:C.text,fontSize:12,fontWeight:'800'},
 root:{gap:12},flex:{flex:1,minWidth:0},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 title:{...typography.title,color:C.text},copy:{fontSize:11.5,lineHeight:17,color:C.muted},
 disabled:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.65,color:C.warning,borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,paddingHorizontal:7,paddingVertical:4},
 tabs:{flexDirection:'row',flexWrap:'wrap',gap:6},tab:{minHeight:44,justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderRadius:radii.sm},
 tabText:{fontSize:10.5,fontWeight:'800'},pressed:{opacity:.72},
 hero:{flexDirection:'row',gap:12,minHeight:126,padding:11,borderWidth:1,borderRadius:radii.md,backgroundColor:C.panelRaised},
 preview:{width:112,height:92,overflow:'hidden',borderRadius:radii.sm,backgroundColor:C.stage,borderWidth:1,borderColor:C.line},
 heroCopy:{flex:1,minWidth:0,gap:4,justifyContent:'center'},eyebrow:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.65,color:C.accent},
 collectionName:{fontSize:20,lineHeight:25,fontWeight:'900'},pieceType:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.55,color:C.accent},
 status:{fontSize:8.5,lineHeight:12,fontWeight:'900'},setCard:{gap:8,padding:11,borderWidth:1,borderRadius:radii.md,backgroundColor:C.panelRaised},
 setName:{fontSize:15,lineHeight:20,fontWeight:'900',color:C.text,marginTop:2},bundleCount:{fontSize:20,lineHeight:24,fontWeight:'900'},
 contents:{gap:6,paddingTop:2},contentRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},
 contentLabel:{fontSize:8.5,lineHeight:12,fontWeight:'900',letterSpacing:.5,color:C.accent},contentName:{fontSize:12,lineHeight:17,fontWeight:'800',color:C.text},
 noPrice:{fontSize:10,lineHeight:15,fontWeight:'800',color:C.warning},note:{gap:4,padding:11,borderWidth:1,borderRadius:radii.md},noteTitle:{fontSize:12.5,lineHeight:18,fontWeight:'900',color:C.info},
});}

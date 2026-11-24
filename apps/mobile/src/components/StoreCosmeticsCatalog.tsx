import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {PROFILE_COSMETIC_STORE_COLLECTIONS,profileCosmeticCollectionOwnership,type ProfileCosmeticCollectionId} from '../content/profile-cosmetic-store';
import {profileCosmeticRuntimeByEffect} from '../theme/profile-cosmetic-runtime-v1';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {ProfileFrameOverlay} from './ProfileFrameOverlay';
import {ProfileEffectThumbnail} from './ProfileCosmeticMotion';

/** Authored catalog preview only. No price lookup, checkout callback, Play product id or entitlement mutation exists here. */
export function StoreCosmeticsCatalog({state}:{state:GameState}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [selected,setSelected]=useState<ProfileCosmeticCollectionId>('gloamward');
 const collection=PROFILE_COSMETIC_STORE_COLLECTIONS.find(row=>row.id===selected)??PROFILE_COSMETIC_STORE_COLLECTIONS[0];
 const owned=profileCosmeticCollectionOwnership(state,collection);
 const runtime=profileCosmeticRuntimeByEffect.get(collection.effect.itemId);
 const borderSource=runtime?profileBorderSourceById.get(runtime.fallbackBorderId):undefined;
 const status=(value:boolean)=>value?'OWNED':'NOT OWNED';
 return <View style={s.root}>
  <View style={s.between}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>Profile Cosmetics</Text><Text style={s.copy}>Account-wide ownership · Per-character equipment</Text></View><Text style={s.disabled}>CHECKOUT OFF</Text></View>
  <Text style={s.copy}>Each collection contains a profile border and an independently equippable animated showcase effect. Pieces are modeled separately; the bundle simply contains both.</Text>

  <View accessibilityRole="tablist" accessibilityLabel="Cosmetic collections" style={s.tabs}>
   {PROFILE_COSMETIC_STORE_COLLECTIONS.map(row=><Pressable key={row.id} accessibilityRole="tab" accessibilityState={{selected:selected===row.id}} onPress={()=>setSelected(row.id)}
    style={({pressed})=>[s.tab,{borderColor:selected===row.id?row.accent:C.line,backgroundColor:selected===row.id?C.selection:C.panel},pressed&&s.pressed]}>
    <Text numberOfLines={1} style={[s.tabText,{color:selected===row.id?C.text:C.muted}]}>{row.name}</Text>
   </Pressable>)}
  </View>

  <View style={[s.hero,{borderColor:collection.accent}]}>
   <View style={s.preview}>
    {runtime?<ProfileEffectThumbnail runtime={runtime}/>:null}
    {borderSource?<ProfileFrameOverlay source={borderSource}/>:null}
   </View>
   <View style={s.heroCopy}><Text style={s.eyebrow}>{collection.tagline.toUpperCase()}</Text><Text style={[s.collectionName,{color:collection.accent}]}>{collection.name}</Text><Text style={s.copy}>{collection.description}</Text></View>
  </View>

  <View style={s.pieces}>
   <View style={[s.piece,{borderColor:owned.borderOwned?C.good:C.line}]}>
    <View style={s.between}><Text style={s.pieceType}>BORDER</Text><Text style={[s.status,{color:owned.borderOwned?C.good:C.muted}]}>{status(owned.borderOwned)}</Text></View>
    <Text style={s.pieceName}>{collection.border.name}</Text>
    <Text style={s.copy}>Full animated collection border. Ownership does not grant the matching effect.</Text>
   </View>
   <View style={[s.piece,{borderColor:owned.effectOwned?C.good:C.line}]}>
    <View style={s.between}><Text style={s.pieceType}>SHOWCASE EFFECT</Text><Text style={[s.status,{color:owned.effectOwned?C.good:C.muted}]}>{status(owned.effectOwned)}</Text></View>
    <Text style={s.pieceName}>{collection.effect.name}</Text>
    <Text style={s.copy}>Animated scene effect. Can be equipped with this border, another border, or no border.</Text>
   </View>
  </View>

  <View style={[s.bundle,{borderColor:owned.bundleOwned?C.good:collection.accent}]}>
   <View style={s.between}><View style={s.flex}><Text style={s.pieceType}>TWO-PIECE BUNDLE</Text><Text style={s.bundleName}>{collection.bundle.name}</Text></View><Text style={[s.bundleCount,{color:owned.bundleOwned?C.good:collection.accent}]}>{owned.ownedPieces}/2</Text></View>
   <Text style={s.copy}>Includes exactly the border and showcase effect above. Existing ownership of either piece remains valid and independent.</Text>
   <Text style={s.noPrice}>Price and checkout are intentionally not registered in this build.</Text>
  </View>

  <View style={[s.note,{borderColor:C.info,backgroundColor:C.infoSurface}]}>
   <Text style={s.noteTitle}>Prepared, not released</Text>
   <Text style={s.copy}>This catalog performs no purchase, grant, restore or entitlement write. Google Play products will be connected only after native QA and server migration approval.</Text>
  </View>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:12},flex:{flex:1,minWidth:0},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 title:{...typography.title,color:C.text},copy:{fontSize:11.5,lineHeight:17,color:C.muted},
 disabled:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.65,color:C.warning,borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,paddingHorizontal:7,paddingVertical:4},
 tabs:{flexDirection:'row',flexWrap:'wrap',gap:6},tab:{minHeight:44,justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderRadius:radii.sm},
 tabText:{fontSize:10.5,fontWeight:'800'},pressed:{opacity:.72},
 hero:{flexDirection:'row',gap:12,minHeight:126,padding:11,borderWidth:1,borderRadius:radii.md,backgroundColor:C.panelRaised},
 preview:{width:112,height:92,overflow:'hidden',borderRadius:radii.sm,backgroundColor:C.stage,borderWidth:1,borderColor:C.line},
 heroCopy:{flex:1,minWidth:0,gap:4,justifyContent:'center'},eyebrow:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.65,color:C.accent},
 collectionName:{fontSize:20,lineHeight:25,fontWeight:'900'},pieces:{flexDirection:'row',gap:8},
 piece:{flex:1,minWidth:0,gap:5,padding:10,borderWidth:1,borderRadius:radii.md,backgroundColor:C.panel},
 pieceType:{fontSize:9,lineHeight:13,fontWeight:'900',letterSpacing:.55,color:C.accent},pieceName:{fontSize:12.5,lineHeight:18,fontWeight:'800',color:C.text},
 status:{fontSize:8.5,lineHeight:12,fontWeight:'900'},bundle:{gap:6,padding:11,borderWidth:1,borderRadius:radii.md,backgroundColor:C.panelRaised},
 bundleName:{fontSize:15,lineHeight:20,fontWeight:'900',color:C.text,marginTop:2},bundleCount:{fontSize:20,lineHeight:24,fontWeight:'900'},
 noPrice:{fontSize:10,lineHeight:15,fontWeight:'800',color:C.warning},note:{gap:4,padding:11,borderWidth:1,borderRadius:radii.md},noteTitle:{fontSize:12.5,lineHeight:18,fontWeight:'900',color:C.info},
});}

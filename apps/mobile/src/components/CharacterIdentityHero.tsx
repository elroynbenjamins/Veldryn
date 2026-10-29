import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {CLASSES} from '../content/classes';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {profileT,profileText} from '../i18n/profile';
import {useGameTheme} from '../theme/ThemeContext';
import {CharacterPortrait} from './CharacterVisual';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';

export function CharacterIdentityHero({state,onProfile,compact=false}:{state:GameState;onProfile?:()=>void;compact?:boolean}){
 const C=useGameTheme(),language=useGameLanguage(),{width,fontScale}=useWindowDimensions(),s=useMemo(()=>StyleSheet.create({
  hero:{borderWidth:1,borderColor:C.line,borderRadius:14,overflow:'hidden',backgroundColor:C.panel},
  shade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(0,0,0,.55)':'rgba(255,255,255,.86)'},
  body:{padding:16,flexDirection:'row',alignItems:'center',gap:12},compactBody:{padding:10,gap:8},copy:{flex:1,minWidth:0,gap:7},compactCopy:{gap:2},headingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  title:{fontSize:27,lineHeight:34,fontWeight:'800',color:C.text},compactTitle:{fontSize:20,lineHeight:25,flexShrink:1},name:{fontSize:19,lineHeight:25,fontWeight:'700',color:C.text},compactName:{fontSize:15,lineHeight:20},
  meta:{fontSize:12,lineHeight:18,color:C.muted},edit:{minHeight:44,alignSelf:'flex-start',justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel},editText:{fontSize:13,fontWeight:'600',color:C.text},compactEdit:{minHeight:44,maxWidth:132,paddingHorizontal:8,justifyContent:'center',borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel},compactEditText:{fontSize:11,fontWeight:'700',color:C.text},
  portrait:{width:112,height:112},compactPortrait:{width:76,height:76},toolkitPortrait:{width:60,height:60},
 }),[C]);
 if(!state.character)return null;
 const c=state.character,className=CLASSES.find(row=>row.id===c.classId)?.name??c.classId;
 return <View style={s.hero}><ZoneSceneArtwork regionId={state.currentRegionId??'GREENFIELDS'}/><View pointerEvents="none" style={s.shade}/><View style={[s.body,compact&&s.compactBody]}><View style={[s.copy,compact&&s.compactCopy]}>
  <View style={s.headingRow}><Text accessibilityRole="header" numberOfLines={1} style={[s.title,compact&&s.compactTitle]}>{profileText(language,'Character')}</Text>
   {compact&&onProfile?<Pressable accessibilityRole="button" accessibilityLabel={profileText(language,'Edit profile')} onPress={onProfile} style={s.compactEdit}><Text numberOfLines={1} style={s.compactEditText}>{profileText(language,'Edit profile')}</Text></Pressable>:null}
  </View><Text numberOfLines={1} style={[s.name,compact&&s.compactName]}>{c.name}</Text><Text style={s.meta}>{className} · {profileT(language,'Level {level}',{level:c.level})}</Text>
  {!compact&&onProfile?<Pressable accessibilityRole="button" onPress={onProfile} style={s.edit}><Text style={s.editText}>{profileText(language,'Edit profile')}</Text></Pressable>:null}
 </View><CharacterPortrait state={state} style={compact?s.toolkitPortrait:width<360||fontScale>=1.3?s.compactPortrait:s.portrait}/></View></View>;
}

import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {CLASSES} from '../content/classes';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {profileT,profileText} from '../i18n/profile';
import {useGameTheme} from '../theme/ThemeContext';
import {CharacterPortrait} from './CharacterVisual';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';

export function CharacterIdentityHero({state,onProfile}:{state:GameState;onProfile?:()=>void}){
 const C=useGameTheme(),language=useGameLanguage(),{width,fontScale}=useWindowDimensions(),s=useMemo(()=>StyleSheet.create({
  hero:{borderWidth:1,borderColor:C.line,borderRadius:14,overflow:'hidden',backgroundColor:C.panel},
  shade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(0,0,0,.55)':'rgba(255,255,255,.86)'},
  body:{padding:16,flexDirection:'row',alignItems:'center',gap:12},copy:{flex:1,minWidth:0,gap:7},
  title:{fontSize:27,lineHeight:34,fontWeight:'800',color:C.text},name:{fontSize:19,lineHeight:25,fontWeight:'700',color:C.text},
  meta:{fontSize:12,lineHeight:18,color:C.muted},edit:{minHeight:44,alignSelf:'flex-start',justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel},editText:{fontSize:13,fontWeight:'600',color:C.text},
  portrait:{width:112,height:112},compactPortrait:{width:76,height:76},
 }),[C]);
 if(!state.character)return null;
 const c=state.character,className=CLASSES.find(row=>row.id===c.classId)?.name??c.classId;
 return <View style={s.hero}><ZoneSceneArtwork regionId={state.currentRegionId??'GREENFIELDS'}/><View pointerEvents="none" style={s.shade}/><View style={s.body}><View style={s.copy}>
  <Text accessibilityRole="header" style={s.title}>{profileText(language,'Character')}</Text><Text style={s.name}>{c.name}</Text><Text style={s.meta}>{className} · {profileT(language,'Level {level}',{level:c.level})}</Text>
  {onProfile?<Pressable accessibilityRole="button" onPress={onProfile} style={s.edit}><Text style={s.editText}>{profileText(language,'Edit profile')}</Text></Pressable>:null}
 </View><CharacterPortrait state={state} style={width<360||fontScale>=1.3?s.compactPortrait:s.portrait}/></View></View>;
}

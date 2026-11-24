import {Image,StyleSheet,View,type StyleProp,type ViewStyle} from 'react-native';
import type {ClassId} from '../core/types';
import {showcaseClassIcons,profileIconArtwork,profileCosmeticPortraitAtlas,profileCosmeticPortraitAtlasCell} from '../theme/profile-icon-assets';

/** Shared artwork for local profiles, social avatars and public profiles. */
export function profileIconSource(id:string|undefined,classId:ClassId){
 return profileIconArtwork(id)??showcaseClassIcons[classId];
}
export function ProfileIcon({id,classId,size=80,style}:{id?:string;classId:ClassId;size?:number;style?:StyleProp<ViewStyle>}){
 const cell=profileCosmeticPortraitAtlasCell(id);
 // Resolve the atlas against the rendered viewport, not the default size prop.
 // Profile scenes can override width/height via style (e.g. 96dp vs compact 64dp).
 if(cell)return <View accessibilityLabel="Profile icon" style={[{width:size,height:size,backgroundColor:'transparent'},style,{overflow:'hidden'}]}>
  <Image source={profileCosmeticPortraitAtlas} resizeMode="stretch" style={{position:'absolute',width:'400%',height:'200%',left:`${-cell.column*100}%`,top:`${-cell.row*100}%`}}/>
 </View>;
 return <View accessibilityLabel="Profile icon" style={[{width:size,height:size,backgroundColor:'transparent'},style]}><Image source={profileIconSource(id,classId)} resizeMode="contain" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/></View>;
}

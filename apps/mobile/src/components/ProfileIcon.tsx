import {Image,StyleSheet,View,type StyleProp,type ViewStyle} from 'react-native';
import type {ClassId} from '../core/types';
import {showcaseClassIcons,profileIconArtwork,profileCosmeticPortraitAtlas,profileCosmeticPortraitAtlasCell} from '../theme/profile-icon-assets';

/** Shared artwork for local profiles, social avatars and public profiles. */
export function profileIconSource(id:string|undefined,classId:ClassId){
 return profileIconArtwork(id)??showcaseClassIcons[classId];
}
export function ProfileIcon({id,classId,size=80,style}:{id?:string;classId:ClassId;size?:number;style?:StyleProp<ViewStyle>}){
 const cell=profileCosmeticPortraitAtlasCell(id);
 if(cell)return <View accessibilityLabel="Profile icon" style={[{width:size,height:size,backgroundColor:'transparent'},style,{overflow:'hidden'}]}>
  <Image source={profileCosmeticPortraitAtlas} resizeMode="stretch" style={{position:'absolute',width:size*4,height:size*2,left:-cell.column*size,top:-cell.row*size}}/>
 </View>;
 return <View accessibilityLabel="Profile icon" style={[{width:size,height:size,backgroundColor:'transparent'},style]}><Image source={profileIconSource(id,classId)} resizeMode="contain" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/></View>;
}

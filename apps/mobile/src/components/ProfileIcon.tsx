import {Image,StyleSheet,View,type StyleProp,type ViewStyle} from 'react-native';
import type {ClassId} from '../core/types';
import {showcaseClassIcons,profileIconArtwork} from '../theme/profile-icon-assets';

/** Shared artwork for local profiles, social avatars and public profiles. */
export function profileIconSource(id:string|undefined,classId:ClassId){
 return profileIconArtwork(id)??showcaseClassIcons[classId];
}
export function ProfileIcon({id,classId,size=80,style}:{id?:string;classId:ClassId;size?:number;style?:StyleProp<ViewStyle>}){
 return <View accessibilityLabel="Profile icon" style={[{width:size,height:size,backgroundColor:'transparent'},style]}><Image source={profileIconSource(id,classId)} resizeMode="contain" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/></View>;
}

import {Image,StyleSheet,View} from 'react-native';
import {resourceIconSource} from '../theme/resource-assets';
import {C,radii} from '../theme/theme';

export function ResourceArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
  const source=resourceIconSource(itemId);if(!source)return null;
  return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><Image source={source} resizeMode="contain" fadeDuration={0} style={s.image}/></View>;
}

const s=StyleSheet.create({art:{alignItems:'center',justifyContent:'center',overflow:'hidden'},frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'},image:{width:'100%',height:'100%'}});

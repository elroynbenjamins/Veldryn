import {Image,StyleSheet,View} from 'react-native';
import {gatheringToolImages} from '../theme/gathering-tool-assets';
import {C,radii} from '../theme/theme';

/** A single, independently bundled tool icon; no atlas offsets or clipping. */
export function GatheringToolArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
  const source=gatheringToolImages[itemId];
  if(!source)return null;
  const inset=framed?5:2;
  return <View style={[s.root,{width:size,height:size},framed&&s.frame]}>
    <Image source={source} resizeMode="contain" fadeDuration={0}
      style={{width:Math.max(1,size-inset*2),height:Math.max(1,size-inset*2)}}/>
  </View>;
}
const s=StyleSheet.create({
  root:{alignItems:'center',justifyContent:'center'},
  frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a',overflow:'hidden'},
});

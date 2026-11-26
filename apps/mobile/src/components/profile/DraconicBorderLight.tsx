import {memo,useMemo} from 'react';
import {Animated,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {DRACONIC_BORDER_PHASE,draconicBorderTracks} from '../../core/draconic-border-motion';
const GLOW=require('../../../assets/ascendant/shared/soft_glow.webp') as ImageSourcePropType;
/** Uses the existing scene clock; only small ornament textures move. */
export const DraconicBorderLight=memo(function DraconicBorderLight({clock,width,height,ember,showcase=false}:{clock:Animated.Value;width:number;height:number;ember:ImageSourcePropType;showcase?:boolean}){
 const tracks=useMemo(()=>draconicBorderTracks(width,height,showcase).map(t=>({
  ...t,
  xTrack:clock.interpolate({inputRange:DRACONIC_BORDER_PHASE,outputRange:t.x,extrapolate:'clamp'}),
  yTrack:clock.interpolate({inputRange:DRACONIC_BORDER_PHASE,outputRange:t.y,extrapolate:'clamp'}),
  alpha:clock.interpolate({inputRange:DRACONIC_BORDER_PHASE,outputRange:t.opacity,extrapolate:'clamp'}),
 })),[clock,width,height,showcase]);
 if(!tracks.length)return null;
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  {tracks.map(t=><Animated.Image key={t.key} source={t.kind==='glow'?GLOW:ember} fadeDuration={0} resizeMode="contain" style={{
   position:'absolute',left:-t.size/2,top:-t.size/2,width:t.size,height:t.size,
   tintColor:t.kind==='glow'?'#ff8b38':undefined,
   opacity:t.alpha,transform:[{translateX:t.xTrack},{translateY:t.yTrack}],
  }}/>)}
 </View>;
});

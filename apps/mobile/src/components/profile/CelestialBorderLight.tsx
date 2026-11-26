import {memo,useMemo} from 'react';
import {Animated,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {CELESTIAL_BORDER_PHASE,celestialBorderTracks} from '../../core/celestial-border-motion';
const GLOW=require('../../../assets/ascendant/shared/soft_glow.webp') as ImageSourcePropType;
/** Borrow the parent's clock. Decorative only; never owns a timer, touch target,
 * or a full-frame animated image. Geometry updates only when the card resizes. */
export const CelestialBorderLight=memo(function CelestialBorderLight({clock,width,height,star,showcase=false}:{clock:Animated.Value;width:number;height:number;star:ImageSourcePropType;showcase?:boolean}){
 const tracks=useMemo(()=>celestialBorderTracks(width,height,showcase).map(t=>({
  ...t,
  translateX:clock.interpolate({inputRange:CELESTIAL_BORDER_PHASE,outputRange:t.x,extrapolate:'clamp'}),
  translateY:clock.interpolate({inputRange:CELESTIAL_BORDER_PHASE,outputRange:t.y,extrapolate:'clamp'}),
  alpha:clock.interpolate({inputRange:CELESTIAL_BORDER_PHASE,outputRange:t.opacity,extrapolate:'clamp'}),
 })),[clock,width,height,showcase]);
 if(!tracks.length)return null;
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  {tracks.map(t=><Animated.Image key={t.key} source={t.kind==='glow'?GLOW:star} fadeDuration={0} resizeMode="contain" style={{
   position:'absolute',left:-t.size/2,top:-t.size/2,width:t.size,height:t.size,
   tintColor:t.kind==='glow'?'#ffe1a0':undefined,
   opacity:t.alpha,transform:[{translateX:t.translateX},{translateY:t.translateY}],
  }}/>)}
 </View>;
});

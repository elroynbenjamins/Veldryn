import {memo,useMemo,useState} from 'react';
import {Animated,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {useCosmeticMotionPolicy,useLoopProgress} from '../anim/motion';
import {ABYSSAL_BORDER_PHASE,abyssalBorderTracks} from '../../core/abyssal-border-motion';
import {ABYSSAL_CYCLE_MS} from '../../core/abyssal-showcase-layout';
type Art={aura:ImageSourcePropType;mote:ImageSourcePropType};
export const AbyssalBorderLight=memo(function AbyssalBorderLight({clock,width,height,art,showcase=false,fullSet=false}:{clock:Animated.Value;width:number;height:number;art:Art;showcase?:boolean;fullSet?:boolean}){
 const tracks=useMemo(()=>abyssalBorderTracks(width,height,showcase,fullSet).map(t=>({
  ...t,xTrack:clock.interpolate({inputRange:ABYSSAL_BORDER_PHASE,outputRange:t.x,extrapolate:'clamp'}),
  yTrack:clock.interpolate({inputRange:ABYSSAL_BORDER_PHASE,outputRange:t.y,extrapolate:'clamp'}),
  alpha:clock.interpolate({inputRange:ABYSSAL_BORDER_PHASE,outputRange:t.opacity,extrapolate:'clamp'}),
 })),[clock,width,height,showcase,fullSet]);
 if(!tracks.length)return null;
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  {tracks.map(t=><Animated.Image key={t.key} source={t.kind==='aura'?art.aura:art.mote} fadeDuration={0} resizeMode="contain" style={{
   position:'absolute',left:-t.size/2,top:-t.size/2,width:t.size,height:t.size,
   opacity:t.alpha,transform:[{translateX:t.xTrack},{translateY:t.yTrack}],
  }}/>)}
 </View>;
});
/** Review-only independent border renderer; caller supplies verified artwork.
 * No production wardrobe or profile registration in this pass. */
export function AbyssalStandardBorderEffects({art,active,reduceMotion=false}:{art:Art;active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0});
 const {running}=useCosmeticMotionPolicy(active,reduceMotion);
 const clock=useLoopProgress(ABYSSAL_CYCLE_MS,running);
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}
  onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize(old=>Math.abs(old.width-width)<.5&&Math.abs(old.height-height)<.5?old:{width,height});}}>
  {running?<AbyssalBorderLight clock={clock} width={size.width} height={size.height} art={art}/>:null}
 </View>;
}

import {useCallback,useEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,View,type ImageSourcePropType} from 'react-native';

/** One short, non-reentrant native reaction. No polling, gameplay change or extra ambient loop.
 * Cancellation follows the parent stage's existing foreground/reduced-motion lifecycle. */
export function useUltraLuxePetReaction(enabled:boolean){
 const reaction=useRef(new Animated.Value(0)).current;
 const playing=useRef(false),generation=useRef(0);
 useEffect(()=>{return()=>{generation.current++;playing.current=false;reaction.stopAnimation();reaction.setValue(0);};},[enabled,reaction]);
 const trigger=useCallback(()=>{
  if(!enabled||playing.current)return;
  playing.current=true;const id=++generation.current;
  reaction.setValue(0);
  Animated.sequence([
   Animated.timing(reaction,{toValue:1,duration:260,easing:Easing.out(Easing.cubic),useNativeDriver:true,isInteraction:false}),
   Animated.timing(reaction,{toValue:0,duration:1040,easing:Easing.inOut(Easing.sin),useNativeDriver:true,isInteraction:false}),
  ]).start(()=>{if(generation.current===id)playing.current=false;});
 },[enabled,reaction]);
 return {reaction,trigger};
}
/** Localized light response in the pet area. No additional layout or identity animation. */
export function UltraLuxePetReaction({reaction,scale:k,theme,particle,glow}:{reaction:Animated.Value;scale:number;theme:'celestial'|'draconic';particle:ImageSourcePropType;glow:ImageSourcePropType}){
 const celestial=theme==='celestial',cx=celestial?279:266,cy=celestial?99:108;
 const expand=reaction.interpolate({inputRange:[0,1],outputRange:[.72,1.28]});
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  <Animated.Image source={glow} resizeMode="contain" style={{position:'absolute',left:(cx-27)*k,top:(cy-25)*k,width:54*k,height:50*k,opacity:Animated.multiply(reaction,.65),transform:[{scale:expand}]}}/>
  {[-1,0,1].map(i=><Animated.Image key={i} source={particle} resizeMode="contain" style={{position:'absolute',left:(cx-4+i*10)*k,top:(cy-7)*k,width:8*k,height:8*k,opacity:reaction,transform:[{translateX:Animated.multiply(reaction,i*10*k)},{translateY:Animated.multiply(reaction,-(12+Math.abs(i)*3)*k)}]}}/>)}
 </View>;
}

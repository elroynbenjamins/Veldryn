import {memo,useCallback,useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {PET_REACTION_TRAJECTORIES,PET_REACTION_GLOW} from '../../core/ultra-luxe-motion';

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
function UltraLuxePetReactionLayer({reaction,scale:k,theme,particle,glow}:{reaction:Animated.Value;scale:number;theme:'celestial'|'draconic';particle:ImageSourcePropType;glow:ImageSourcePropType}){
 const celestial=theme==='celestial',cx=celestial?279:266,cy=celestial?99:108;
 const {expand,opacity,tracks}=useMemo(()=>({
  expand:reaction.interpolate({inputRange:[0,1],outputRange:[.72,PET_REACTION_GLOW[theme].scale]}),
  opacity:Animated.multiply(reaction,PET_REACTION_GLOW[theme].opacity),
  tracks:PET_REACTION_TRAJECTORIES[theme].map(p=>({...p,translateX:Animated.multiply(reaction,p.dx*k),translateY:Animated.multiply(reaction,p.dy*k)})),
 }),[reaction,k,theme]);
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  <Animated.Image source={glow} resizeMode="contain" style={{position:'absolute',left:(cx-27)*k,top:(cy-25)*k,width:54*k,height:50*k,opacity,transform:[{scale:expand}]}}/>
  {tracks.map((p,i)=><Animated.Image key={i} source={particle} fadeDuration={0} resizeMode="contain" style={{position:'absolute',left:(cx-4+p.x)*k,top:(cy-4+p.y)*k,width:8*k,height:8*k,opacity:reaction,transform:[{translateX:p.translateX},{translateY:p.translateY}]}}/>)}
 </View>;
}

export const UltraLuxePetReaction=memo(UltraLuxePetReactionLayer);

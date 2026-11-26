import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,Easing,StyleSheet} from 'react-native';
import {SCREEN_TRANSITION_PRESETS,type ScreenTransitionKind} from '../core/screen-transitions';

/** Honors both Veldryn's setting and Android/iOS accessibility preferences. */
export function useSystemReduceMotion():boolean {
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{
  let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduced(value);}).catch(()=>{});
  const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
  return ()=>{mounted=false;subscription.remove();};
 },[]);
 return reduced;
}

/**
 * Mount the destination immediately; animate opacity using the native driver.
 * Never translate or scale pixel artwork (sub-pixel movement would blur sprites).
 * The parent route provides a key so unrelated game-state updates never replay it.
 */
export function ScreenTransition({kind,reduceMotion,children}:{kind:ScreenTransitionKind;reduceMotion:boolean;children:ReactNode}){
 const preset=SCREEN_TRANSITION_PRESETS[kind];
 const opacity=useRef(new Animated.Value(reduceMotion?1:preset.startOpacity)).current;
 // Run exactly once on route mount. Changing motion preferences mid-screen
 // must not replay the entrance (including while changing Settings).
 useEffect(()=>{
  opacity.stopAnimation();
  if(reduceMotion||preset.durationMs===0){opacity.setValue(1);return;}
  const animation=Animated.timing(opacity,{
   toValue:1,duration:preset.durationMs,easing:Easing.out(Easing.cubic),useNativeDriver:true,
  });
  animation.start();
  return ()=>animation.stop();
 // A changed route remounts this component with a different key.
 },[]);
 useEffect(()=>{
  if(reduceMotion){opacity.stopAnimation();opacity.setValue(1);}
 },[reduceMotion,opacity]);
 return <Animated.View style={[styles.content,{opacity}]}>{children}</Animated.View>;
}
const styles=StyleSheet.create({content:{flex:1}});

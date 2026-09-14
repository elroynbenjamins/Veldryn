import {useEffect,useRef} from 'react';
import {Animated,StyleSheet,Text} from 'react-native';
import {C,radii,typography} from '../theme/theme';
export type FeedbackTone='success'|'info'|'error';
/** Callers provide confirmed results. No timers dismiss information before it can be read. */
export function ActionFeedback({message,tone='success',reduceMotion=true}:{message:string;tone?:FeedbackTone;reduceMotion?:boolean}){
 const enter=useRef(new Animated.Value(1)).current;
 useEffect(()=>{enter.stopAnimation();if(reduceMotion){enter.setValue(1);return;}enter.setValue(0);const animation=Animated.timing(enter,{toValue:1,duration:180,useNativeDriver:true});animation.start();return()=>animation.stop();},[message,tone,reduceMotion,enter]);
 const color=tone==='error'?C.bad:tone==='info'?C.info:C.good;
 return <Animated.View accessibilityLiveRegion={tone==='error'?'assertive':'polite'} style={[s.root,{borderLeftColor:color,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[6,0]})}]}]}><Text accessibilityRole={tone==='error'?'alert':undefined} style={[s.text,{color}]}>{message}</Text></Animated.View>;
}
const s=StyleSheet.create({root:{padding:12,borderLeftWidth:3,borderRadius:radii.sm,backgroundColor:C.panel2},text:{...typography.bodyStrong}});

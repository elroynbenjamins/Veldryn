import {useEffect,useMemo,useRef} from 'react';
import {Animated,StyleSheet,Text,View} from 'react-native';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export type FeedbackTone='success'|'info'|'warning'|'error';

export function ActionFeedback({message,tone='success',reduceMotion=true,compact=false}:{message:string;tone?:FeedbackTone;reduceMotion?:boolean;compact?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const enter=useRef(new Animated.Value(1)).current;
 useEffect(()=>{enter.stopAnimation();if(reduceMotion){enter.setValue(1);return;}enter.setValue(0);const animation=Animated.spring(enter,{toValue:1,damping:18,stiffness:220,mass:.7,useNativeDriver:true});animation.start();return()=>animation.stop();},[message,tone,reduceMotion,enter]);
 const color=tone==='error'?C.bad:tone==='warning'?C.warning:tone==='info'?C.info:C.good;
 const surface=tone==='error'?C.badSurface:tone==='warning'?C.warningSurface:tone==='info'?C.infoSurface:C.goodSurface;
 const mark=tone==='error'?'!':tone==='warning'?'!':tone==='info'?'i':'✓';
 return <Animated.View accessibilityLiveRegion={tone==='error'?'assertive':'polite'} style={[s.root,compact&&s.compact,{borderColor:color,backgroundColor:surface,opacity:enter,transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[5,0]})},{scale:enter.interpolate({inputRange:[0,1],outputRange:[.985,1]})}]}]}>
   <View style={[s.mark,{borderColor:color}]}><Text style={[s.markText,{color}]}>{mark}</Text></View>
   <Text accessibilityRole={tone==='error'?'alert':undefined} style={[s.text,{color:tone==='error'?C.text:color}]}>{message}</Text>
 </Animated.View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderLeftWidth:3,borderRadius:radii.md},
 compact:{minHeight:40,paddingHorizontal:9,paddingVertical:7},
 mark:{width:24,height:24,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:12,backgroundColor:C.panel},
 markText:{fontSize:12,fontWeight:'900'},
 text:{...typography.bodyStrong,flex:1,minWidth:0,lineHeight:18},
});}

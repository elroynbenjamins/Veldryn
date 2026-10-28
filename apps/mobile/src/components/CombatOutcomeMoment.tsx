import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

type CombatOutcome='victory'|'defeat'|'timeout';

/** Plays once when a resolved encounter reaches its final authoritative cue. */
export function CombatOutcomeMoment({outcome,title,detail,reduceMotion=false}:{
 outcome:CombatOutcome;title:string;detail?:string;reduceMotion?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),reveal=useRef(new Animated.Value(reduceMotion?1:0)).current;
 const success=outcome==='victory',accent=success?C.good:outcome==='timeout'?C.warning:C.bad;
 useEffect(()=>{
  reveal.stopAnimation();reveal.setValue(reduceMotion?1:0);
  if(reduceMotion)return;
  Animated.timing(reveal,{toValue:1,duration:450,easing:Easing.out(Easing.back(1.15)),useNativeDriver:true}).start();
  return()=>reveal.stopAnimation();
 },[outcome,title,reduceMotion,reveal]);
 const scale=reveal.interpolate({inputRange:[0,1],outputRange:[.88,1]});
 const lift=reveal.interpolate({inputRange:[0,1],outputRange:[16,0]});
 return <Animated.View accessibilityLiveRegion="polite" style={[s.shell,{borderColor:accent,backgroundColor:success?C.goodSurface:outcome==='timeout'?C.warningSurface:C.badSurface,opacity:reveal,transform:[{scale},{translateY:lift}]}]}>
  <View style={[s.medallion,{borderColor:accent}]}>
   <Text style={[s.medallionText,{color:accent}]}>{success?'✦':outcome==='timeout'?'⌛':'×'}</Text>
  </View>
  <View style={s.copy}>
   <Text style={[s.title,{color:accent}]}>{title}</Text>
   {detail?<Text style={[s.detail,{color:C.text}]}>{detail}</Text>:null}
  </View>
 </Animated.View>;
}

function styles(_C:ThemeColors){return StyleSheet.create({
 shell:{minHeight:82,padding:12,borderWidth:1,borderRadius:15,flexDirection:'row',alignItems:'center',gap:12},
 medallion:{width:54,height:54,borderWidth:2,borderRadius:28,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,.12)'},
 medallionText:{fontSize:29,lineHeight:36,fontWeight:'900'},
 copy:{flex:1,minWidth:0,gap:3},
 title:{fontSize:20,lineHeight:25,fontWeight:'900',letterSpacing:.5},
 detail:{fontSize:11,lineHeight:17,fontWeight:'600'},
 });}

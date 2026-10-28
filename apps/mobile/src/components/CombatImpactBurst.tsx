import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

export type CombatImpactKind='damage'|'critical'|'heal'|'shield'|'interrupt'|'phase'|'cast'|'down';

const strokeAngle=[-55,-18,28,68] as const;

/**
 * A lightweight, entirely client-side burst tied to a real combat event.
 * The effect never predicts HP, damage or the outcome of server-side fights.
 * It runs on native-driver transforms/opacity and owns no frame timer.
 */
export function CombatImpactBurst({eventId,kind,reduceMotion=false,size=66}:{
 eventId:string;kind:CombatImpactKind;reduceMotion?:boolean;size?:number;
}){
 const C=useGameTheme(),styles=useMemo(()=>makeStyles(C),[C]),progress=useRef(new Animated.Value(0)).current;
 const color=kind==='critical'?C.warning:kind==='damage'||kind==='down'?C.bad:kind==='heal'?C.good:kind==='shield'?C.info:kind==='interrupt'?C.accent:kind==='cast'?C.warning:C.special;
 const symbol=kind==='critical'?'✦':kind==='shield'?'◇':kind==='heal'?'+':kind==='interrupt'?'×':kind==='phase'?'✧':kind==='cast'?'!':kind==='down'?'↓':'';
 useEffect(()=>{
  progress.stopAnimation();
  progress.setValue(reduceMotion?1:0);
  if(reduceMotion)return;
  Animated.timing(progress,{toValue:1,duration:kind==='phase'||kind==='cast'?620:440,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
  return()=>progress.stopAnimation();
 },[eventId,kind,reduceMotion,progress]);
 if(reduceMotion)return null;
 const ringOpacity=progress.interpolate({inputRange:[0,.12,.58,1],outputRange:[0,.95,.65,0]});
 const ringScale=progress.interpolate({inputRange:[0,1],outputRange:[.38,1.75]});
 const streakOpacity=progress.interpolate({inputRange:[0,.15,.62,1],outputRange:[0,1,.8,0]});
 const glyphOpacity=progress.interpolate({inputRange:[0,.16,.66,1],outputRange:[0,1,1,0]});
 const centered={width:size,height:size,marginLeft:-size/2,marginTop:-size/2};
 return <View pointerEvents="none" accessible={false} style={[styles.anchor,{width:size,height:size,left:'50%',top:'50%',marginLeft:-size/2,marginTop:-size/2}]}>
  <Animated.View style={[styles.ring,{width:size*.74,height:size*.74,borderRadius:size*.37,marginLeft:-size*.37,marginTop:-size*.37,borderColor:color,opacity:ringOpacity,transform:[{scale:ringScale}]}]}/>
  {strokeAngle.map((deg,index)=>{
   const distance=size*(index%2===0?.52:.43),direction=index%2===0?1:-1;
   const travel=progress.interpolate({inputRange:[0,1],outputRange:[0,distance*direction]});
   const drift=progress.interpolate({inputRange:[0,1],outputRange:[0,distance*(index<2?-.55:.55)]});
   return <Animated.View key={deg} style={[styles.streak,{height:size*.31,width:index===1?3:2,marginLeft:-1.5,marginTop:-size*.155,backgroundColor:color,opacity:streakOpacity,transform:[{translateX:drift},{translateY:travel},{rotate:`${deg}deg`}]}]}/>;
  })}
  {symbol?<Animated.View style={[styles.glyphWrap,{opacity:glyphOpacity,transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[3,-size*.23]})},{scale:progress.interpolate({inputRange:[0,.2,1],outputRange:[.6,1.15,.9]})}]}]}>
   <Text style={[styles.glyph,{fontSize:kind==='critical'?size*.5:size*.4,color}]}>{symbol}</Text>
  </Animated.View>:<Animated.View style={[styles.slash,{width:size*.55,height:3,backgroundColor:color,opacity:streakOpacity,transform:[{rotate:'-38deg'},{scaleX:progress.interpolate({inputRange:[0,.2,1],outputRange:[.1,1.45,.8]})}]}]}/>}
 </View>;
}

function makeStyles(_C:ThemeColors){return StyleSheet.create({
 anchor:{position:'absolute',zIndex:6,overflow:'visible',alignItems:'center',justifyContent:'center'},
 ring:{position:'absolute',left:'50%',top:'50%',borderWidth:2},
 streak:{position:'absolute',top:'50%',left:'50%',borderRadius:3},
 glyphWrap:{alignItems:'center',justifyContent:'center'},
 glyph:{fontWeight:'900',textShadowColor:'rgba(0,0,0,.9)',textShadowRadius:6,textShadowOffset:{width:0,height:2}},
 slash:{position:'absolute',borderRadius:4},
 });}

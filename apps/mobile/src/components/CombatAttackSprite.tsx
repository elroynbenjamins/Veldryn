import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,StyleSheet,Text,View} from 'react-native';
import type {DungeonCombatActorMotion,DungeonCombatFxAccent} from '../core/dungeon-combat-fx';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

type ActionKind='damage'|'heal'|'shield';

/**
 * A small directional attack animation over existing character and enemy art.
 * It is visual feedback for a replay cue, not a client-side combat simulation.
 */
export function CombatAttackSprite({eventId,motion,accent,actionKind='damage',enemy=false,reduceMotion=false}:{
 eventId:string;motion:DungeonCombatActorMotion;accent:DungeonCombatFxAccent;actionKind?:ActionKind;enemy?:boolean;reduceMotion?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),frame=useRef(new Animated.Value(0)).current;
 const tint=accent==='gold'?C.warning:accent==='cyan'?C.info:accent==='danger'?C.bad:accent==='violet'?C.special:C.good;
 const spell=actionKind==='heal'||actionKind==='shield'||motion==='cast'||motion==='pulse';
 const ranged=motion==='projectile';
 const heavy=motion==='smash'||motion==='brace';
 const symbol=actionKind==='heal'?'✚':actionKind==='shield'?'⬡':spell?'✦':ranged?'➤':heavy?'◆':'╱';
 useEffect(()=>{
  frame.stopAnimation();frame.setValue(0);
  if(reduceMotion||motion==='none')return;
  Animated.timing(frame,{toValue:1,duration:heavy?390:spell?440:320,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
  return()=>frame.stopAnimation();
 },[eventId,motion,heavy,spell,reduceMotion,frame]);
 if(reduceMotion||motion==='none')return null;
 const opacity=frame.interpolate({inputRange:[0,.08,.65,1],outputRange:[0,1,.92,0]});
 const translateY=frame.interpolate({inputRange:[0,.35,1],outputRange:[10,enemy?32:ranged?-64:spell?-34:-48,enemy?58:ranged?-108:spell?-55:-69]});
 const translateX=frame.interpolate({inputRange:[0,.4,1],outputRange:[-10,ranged?6:heavy?10:0,ranged?16:heavy?8:0]});
 const scale=frame.interpolate({inputRange:[0,.25,.6,1],outputRange:[.6,1.35,1.15,.85]});
 const rotation=frame.interpolate({inputRange:[0,1],outputRange:[spell?'0deg':heavy?'-30deg':'-55deg',spell?'0deg':heavy?'48deg':'48deg']});
 const wakeScale=frame.interpolate({inputRange:[0,1],outputRange:[.2,2.3]});
 return <View accessible={false} pointerEvents="none" style={s.anchor}>
  <Animated.View style={[s.wake,{borderColor:tint,opacity:opacity,transform:[{scale:wakeScale}]}]}/>
  <Animated.View style={[s.sprite,{opacity,transform:[{translateY},{translateX},{scale},{rotate:rotation}]}]}>
   <Text style={[s.glyph,{color:tint,fontSize:ranged?22:spell?31:35}]}>{symbol}</Text>
   {!spell?<View style={[s.blade,{backgroundColor:tint,width:ranged?30:heavy?36:43,transform:[{rotate:ranged?'0deg':'-45deg'}]}]}/>:<View style={[s.spark,{borderColor:tint}]}/>}
  </Animated.View>
 </View>;
}

function styles(_C:ThemeColors){return StyleSheet.create({
 anchor:{position:'absolute',left:'50%',top:'42%',width:0,height:0,zIndex:8,overflow:'visible',alignItems:'center',justifyContent:'center'},
 wake:{position:'absolute',width:21,height:21,borderWidth:2,borderRadius:12},
 sprite:{position:'absolute',alignItems:'center',justifyContent:'center',width:54,height:54},
 glyph:{fontWeight:'900',textShadowColor:'rgba(0,0,0,.9)',textShadowRadius:7,textShadowOffset:{width:0,height:2}},
 blade:{height:3,position:'absolute',bottom:6,opacity:.9,borderRadius:2},
 spark:{position:'absolute',width:44,height:44,borderWidth:2,borderRadius:25,opacity:.65},
 });}

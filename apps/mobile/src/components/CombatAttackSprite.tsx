import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,StyleSheet,View} from 'react-native';
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
  {spell||heavy?<Animated.View style={[s.wake,{borderColor:tint,opacity:opacity,transform:[{scale:wakeScale}]}]}/>:null}
  <Animated.View style={[s.sprite,{opacity,transform:[{translateY},{translateX},{scale},{rotate:rotation}]}]}>
   <CombatEffectShape kind={actionKind==='heal'?'heal':actionKind==='shield'?'shield':spell?'magic':ranged?'projectile':heavy?'heavy':'slash'} color={tint}/>
  </Animated.View>
 </View>;
}

/** Geometry stays crisp at small sizes and avoids font-dependent combat glyphs. */
export function CombatEffectShape({kind,color}:{kind:'slash'|'heavy'|'projectile'|'magic'|'heal'|'shield';color:string}){
 if(kind==='slash'||kind==='heavy')return <View style={{width:58,height:58,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',width:58,height:46,borderRadius:30,borderTopWidth:kind==='heavy'?6:3,borderRightWidth:2,borderColor:color,transform:[{rotate:'-30deg'}]}}/><View style={{position:'absolute',width:48,height:36,borderRadius:25,borderTopWidth:1,borderColor:'#fff',transform:[{translateY:-3},{rotate:'-30deg'}]}}/><View style={{position:'absolute',width:44,height:34,borderRadius:24,borderTopWidth:2,borderColor:color,opacity:.3,transform:[{translateY:7},{rotate:'-30deg'}]}}/></View>;
 if(kind==='projectile')return <View style={{width:52,height:20,justifyContent:'center'}}><View style={{width:42,height:3,borderRadius:3,backgroundColor:color,opacity:.45}}/><View style={{position:'absolute',right:0,width:18,height:5,borderRadius:4,backgroundColor:'#fff',borderWidth:1,borderColor:color}}/></View>;
 return <View style={{width:48,height:48,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',width:40,height:40,borderRadius:kind==='shield'?12:24,borderWidth:2,borderColor:color,transform:[{rotate:'45deg'}]}}/><View style={{width:24,height:24,borderRadius:14,backgroundColor:color,opacity:.2}}/>{kind==='heal'?<><View style={{position:'absolute',height:19,width:3,borderRadius:2,backgroundColor:'#fff'}}/><View style={{position:'absolute',height:3,width:19,borderRadius:2,backgroundColor:'#fff'}}/></>:<View style={{position:'absolute',width:9,height:9,backgroundColor:'#fff',borderRadius:kind==='shield'?2:6,transform:[{rotate:'45deg'}]}}/>}</View>;
}

function styles(_C:ThemeColors){return StyleSheet.create({
 anchor:{position:'absolute',left:'50%',top:'42%',width:0,height:0,zIndex:8,overflow:'visible',alignItems:'center',justifyContent:'center'},
 wake:{position:'absolute',width:21,height:21,borderWidth:2,borderRadius:12},
 sprite:{position:'absolute',alignItems:'center',justifyContent:'center',width:54,height:54},
 glyph:{fontWeight:'900',textShadowColor:'rgba(0,0,0,.9)',textShadowRadius:7,textShadowOffset:{width:0,height:2}},
 blade:{height:3,position:'absolute',bottom:6,opacity:.9,borderRadius:2},
 spark:{position:'absolute',width:44,height:44,borderWidth:2,borderRadius:25,opacity:.65},
 });}

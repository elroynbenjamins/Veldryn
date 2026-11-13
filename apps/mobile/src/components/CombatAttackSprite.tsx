import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,Image,StyleSheet,View} from 'react-native';
import type {DungeonCombatActorMotion,DungeonCombatFxAccent} from '../core/dungeon-combat-fx';
import {useGameTheme} from '../theme/ThemeContext';
import {COMBAT_ARROW,COMBAT_FX,PIXEL_UNIT} from '../theme/pixel-scene-assets';
import {SpriteFrames,type PixelFxName} from './anim/SpriteFrames';
import {useMotionEnabled} from './anim/motion';

type ActionKind='damage'|'heal'|'shield';
type EffectKind='slash'|'heavy'|'projectile'|'magic'|'heal'|'shield';
const EFFECT_SHEET:Record<Exclude<EffectKind,'projectile'>,PixelFxName>={slash:'slash',heavy:'smash',magic:'bolt',heal:'heal',shield:'ward'};
/** The frame that reads best when an effect is shown as a still. */
const REST_FRAME:Record<PixelFxName,number>={slash:2,smash:1,burst:1,crit:2,heal:1,ward:0,bolt:0};

/**
 * A small directional attack animation over existing character and enemy art.
 * It is visual feedback for a replay cue, not a client-side combat simulation.
 * The art is a pixel sprite sheet stepped on the native driver.
 */
export function CombatAttackSprite({eventId,motion,accent,actionKind='damage',enemy=false,reduceMotion=false}:{
 eventId:string;motion:DungeonCombatActorMotion;accent:DungeonCombatFxAccent;actionKind?:ActionKind;enemy?:boolean;reduceMotion?:boolean;
}){
 const C=useGameTheme(),frame=useRef(new Animated.Value(0)).current;
 const animate=useMotionEnabled(reduceMotion,motion!=='none');
 const tint=accent==='gold'?C.warning:accent==='cyan'?C.info:accent==='danger'?C.bad:accent==='violet'?C.special:C.good;
 const spell=actionKind==='heal'||actionKind==='shield'||motion==='cast'||motion==='pulse';
 const ranged=motion==='projectile';
 const heavy=motion==='smash'||motion==='brace';
 // A physical shot is an arrow; a violet projectile is a spell bolt.
 const kind:EffectKind=actionKind==='heal'?'heal':actionKind==='shield'?'shield':spell||(ranged&&accent==='violet')?'magic':ranged?'projectile':heavy?'heavy':'slash';
 useEffect(()=>{
  frame.stopAnimation();frame.setValue(0);
  if(!animate)return;
  Animated.timing(frame,{toValue:1,duration:heavy?390:spell?440:320,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
  return()=>frame.stopAnimation();
 },[eventId,motion,heavy,spell,animate,frame]);
 if(!animate)return null;
 const opacity=frame.interpolate({inputRange:[0,.08,.65,1],outputRange:[0,1,.92,0]});
 const translateY=frame.interpolate({inputRange:[0,.35,1],outputRange:[10,enemy?32:ranged?-64:spell?-34:-48,enemy?58:ranged?-108:spell?-55:-69]});
 const translateX=frame.interpolate({inputRange:[0,.4,1],outputRange:[-10,ranged?6:heavy?10:0,ranged?16:heavy?8:0]});
 // Sprites face right; turn travelling shots along their path (up for the party, down for enemies).
 const facing=kind==='projectile'||kind==='magic'?(enemy?'90deg':'-90deg'):enemy?'180deg':'0deg';
 return <View accessible={false} pointerEvents="none" style={s.anchor}>
  <Animated.View style={[s.sprite,{opacity,transform:[{translateY},{translateX},{rotate:facing}]}]}>
   <CombatEffectFrames kind={kind} color={tint} progress={frame}/>
  </Animated.View>
 </View>;
}

function CombatEffectFrames({kind,color,progress,frame}:{kind:EffectKind;color:string;progress?:Animated.Value;frame?:number}){
 const name=kind==='projectile'?undefined:EFFECT_SHEET[kind],fx=name?COMBAT_FX[name]:undefined;
 const sheet=useMemo(()=>fx?{frameWidth:fx.frameSize,frameHeight:fx.frameSize,frames:fx.frames,durationsMs:Array.from({length:fx.frames},()=>1)}:undefined,[fx]);
 if(!fx||!sheet||!name)return <Image source={COMBAT_ARROW.source} fadeDuration={0} resizeMode="stretch" style={{width:COMBAT_ARROW.width*PIXEL_UNIT,height:COMBAT_ARROW.height*PIXEL_UNIT}}/>;
 const size=fx.frameSize*PIXEL_UNIT,rest=frame??REST_FRAME[name];
 return <View style={{width:size,height:size}}>
  <SpriteFrames sheet={{...sheet,source:fx.tint}} progress={progress} frame={rest} tintColor={color} style={s.fill}/>
  <SpriteFrames sheet={{...sheet,source:fx.core}} progress={progress} frame={rest} style={s.fill}/>
 </View>;
}

/** A still pixel effect, for places that animate its container themselves. */
export function CombatEffectShape({kind,color}:{kind:EffectKind;color:string}){
 return <CombatEffectFrames kind={kind} color={color}/>;
}

const s=StyleSheet.create({
 anchor:{position:'absolute',left:'50%',top:'42%',width:0,height:0,zIndex:8,overflow:'visible',alignItems:'center',justifyContent:'center'},
 sprite:{position:'absolute',alignItems:'center',justifyContent:'center',width:64,height:64},
 fill:{position:'absolute',left:0,top:0},
});

import {useCosmeticMotionPolicy} from '../anim/motion';
import {useEffect,useState} from 'react';
import {Animated,Easing,Image,StyleSheet,View} from 'react-native';
import {CelestialBorderLight} from './CelestialBorderLight';
import {getCelestialAssetBundle} from '../../theme/celestial-integration-assets';

function useCelestialClock(active:boolean,reduceMotion:boolean,duration:number){
 const [clock]=useState(()=>new Animated.Value(0));
 const {running}=useCosmeticMotionPolicy(active,reduceMotion);
 useEffect(()=>{
  clock.stopAnimation();clock.setValue(0);
  if(!running)return;
  const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
  loop.start();return()=>{loop.stop();clock.stopAnimation();};
 },[running,clock,duration]);
 return {clock,running};
}

/** Light ambient motion for Astral Sanctum when the background is equipped without
 * the complete Celestial scene+frame presentation. Keep protected identity zones clear. */
export function CelestialStandardBackgroundEffects({active,reduceMotion=false}:{active:boolean;reduceMotion?:boolean}){
 const {clock}=useCelestialClock(active,reduceMotion,14000),assets=getCelestialAssetBundle().scene;
 const twinkle=clock.interpolate({inputRange:[0,.2,.45,.7,1],outputRange:[.18,.75,.28,.6,.18]});
 const twinkleAlt=clock.interpolate({inputRange:[0,.35,.65,1],outputRange:[.62,.2,.72,.62]});
 const drift=clock.interpolate({inputRange:[0,.5,1],outputRange:[-3,5,-3]});
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
  <Animated.Image source={assets.star} resizeMode="contain" style={[s.bgStar,s.bgStarA,{opacity:twinkle,transform:[{translateX:drift}]}]}/>
  <Animated.Image source={assets.star} resizeMode="contain" style={[s.bgStar,s.bgStarB,{opacity:twinkleAlt}]}/>
  <Animated.Image source={assets.star} resizeMode="contain" style={[s.bgStar,s.bgStarC,{opacity:twinkle}]}/>
  <Animated.Image source={assets.star} resizeMode="contain" style={[s.bgStarSmall,s.bgStarD,{opacity:twinkleAlt}]}/>
 </View>;
}

/** Crown of the Cosmos keeps a restrained animated identity on ordinary profile layouts.
 * The richer rail/eclipsing signature belongs to CelestialSovereignPreview only. */
export function CelestialStandardBorderEffects({active,reduceMotion=false}:{active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0});
 const {clock,running}=useCelestialClock(active,reduceMotion,12000),star=getCelestialAssetBundle().scene.star;
 return <View onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize(old=>Math.abs(old.width-width)<.5&&Math.abs(old.height-height)<.5?old:{width,height});}} pointerEvents="none" accessible={false}
  importantForAccessibility="no-hide-descendants" style={s.borderLayer}>
  {running?<CelestialBorderLight clock={clock} width={size.width} height={size.height} star={star}/>:null}
 </View>;
}
const s=StyleSheet.create({
 borderLayer:{position:'absolute',top:0,right:0,bottom:0,left:0,zIndex:9},
 bgStar:{position:'absolute',width:13,height:13},bgStarSmall:{position:'absolute',width:8,height:8},
 bgStarA:{right:'10%',top:'18%'},bgStarB:{right:'28%',top:'8%'},bgStarC:{right:'17%',bottom:'20%'},bgStarD:{left:'48%',top:'18%'},
});

import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,StyleSheet,View} from 'react-native';
import {getCelestialAssetBundle} from '../../theme/celestial-integration-assets';

function useCelestialClock(active:boolean,reduceMotion:boolean,duration:number){
 const clock=useRef(new Animated.Value(0)).current;
 const [foreground,setForeground]=useState(AppState.currentState==='active');
 const [systemReduced,setSystemReduced]=useState(true);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>sub.remove();},[]);
 useEffect(()=>{
  let mounted=true,changed=false;
  const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{changed=true;if(mounted)setSystemReduced(value);});
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted&&!changed)setSystemReduced(value);}).catch(()=>{});
  return()=>{mounted=false;sub.remove();};
 },[]);
 useEffect(()=>{
  clock.stopAnimation();clock.setValue(0);
  if(!active||reduceMotion||systemReduced||!foreground)return;
  const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
  loop.start();return()=>{loop.stop();clock.stopAnimation();};
 },[active,clock,duration,foreground,reduceMotion,systemReduced]);
 return clock;
}

/** Light ambient motion for Astral Sanctum when the background is equipped without
 * the complete Celestial scene+frame presentation. Keep protected identity zones clear. */
export function CelestialStandardBackgroundEffects({active,reduceMotion=false}:{active:boolean;reduceMotion?:boolean}){
 const clock=useCelestialClock(active,reduceMotion,14000),assets=getCelestialAssetBundle().scene;
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
 const [width,setWidth]=useState(0),clock=useCelestialClock(active,reduceMotion,12000),star=getCelestialAssetBundle().scene.star;
 const travel=clock.interpolate({inputRange:[0,1],outputRange:[0,Math.max(0,width-42)]});
 const pulse=clock.interpolate({inputRange:[0,.35,.7,1],outputRange:[.25,.85,.35,.25]});
 return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)} pointerEvents="none" accessible={false}
  importantForAccessibility="no-hide-descendants" style={s.borderLayer}>
  <Animated.Image source={star} resizeMode="contain" style={[s.railStar,{opacity:pulse,transform:[{translateX:travel}]}]}/>
  <Animated.Image source={star} resizeMode="contain" style={[s.cornerStar,s.cornerTL,{opacity:pulse}]}/>
  <Animated.Image source={star} resizeMode="contain" style={[s.cornerStar,s.cornerBR,{opacity:pulse}]}/>
 </View>;
}
const s=StyleSheet.create({
 borderLayer:{...StyleSheet.absoluteFillObject,zIndex:9},
 bgStar:{position:'absolute',width:13,height:13},bgStarSmall:{position:'absolute',width:8,height:8},
 bgStarA:{right:'10%',top:'18%'},bgStarB:{right:'28%',top:'8%'},bgStarC:{right:'17%',bottom:'20%'},bgStarD:{left:'48%',top:'18%'},
 railStar:{position:'absolute',left:14,top:2,width:14,height:14},
 cornerStar:{position:'absolute',width:12,height:12},cornerTL:{left:5,top:5},cornerBR:{right:5,bottom:5},
});

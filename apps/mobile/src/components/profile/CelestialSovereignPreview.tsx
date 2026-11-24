import {UltraLuxePetPoseSprite} from './UltraLuxePetPoseSprite';
import {ULTRA_LUXE_CYCLE_MS} from '../../core/ultra-luxe-motion';
import {UltraLuxeEnvironment,UltraLuxeRail,UltraLuxePetAura,UltraLuxeAscendantFlourish,signatureEnergy,petIdleMotion} from './UltraLuxeMotion';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,StyleSheet,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
import {CELESTIAL_STAGE,CELESTIAL_PET_BOX,CELESTIAL_IDENTITY_BOX,celestialPetMode,celestialStageSupported} from '../../core/celestial-showcase-layout';

/** Preview-only stage. No catalogue IDs, entitlement, equip or bonus changes.
 * Caller must explicitly supply the preview artwork, protected identity slots,
 * a standard fallback, and active=true only when the stage is on screen.
 * Reviewed three-state composition: 340 x 205. Caller supplies equipped IDs from the actual profile, never from ownership alone. Native QA before production mounting.
 */
export type CelestialPreviewAssets={
 background:ImageSourcePropType;
 border:ImageSourcePropType;
 petShowcase:ImageSourcePropType;
 poseAtlas?:ImageSourcePropType;
 orrery:ImageSourcePropType;
 star:ImageSourcePropType;
 corona:ImageSourcePropType;
 fallbackGlow:ImageSourcePropType;
};
type Props={
 assets:CelestialPreviewAssets;
 equippedPetId:string|null|undefined;
 matchingPetId:string;
 alternatePetSource?:ImageSourcePropType;
 petAccessibilityLabel?:string;
 portrait:ReactNode;
 identity:ReactNode;
 guild?:ReactNode;
 fallback:ReactNode;
 fullSet?:boolean;
 active?:boolean;
 reduceMotion?:boolean;
};
export function CelestialSovereignPreview({assets,equippedPetId,matchingPetId,alternatePetSource,petAccessibilityLabel,portrait,identity,guild,fallback,fullSet=false,active=false,reduceMotion=false}:Props){
 const clock=useRef(new Animated.Value(0)).current;
 const [width,setWidth]=useState(0);
 const [foreground,setForeground]=useState(AppState.currentState==='active');
 const {fontScale}=useWindowDimensions();
 const [systemReduced,setSystemReduced]=useState(true);
 const supported=celestialStageSupported(width,fontScale);
 const running=supported&&active&&foreground&&!reduceMotion&&!systemReduced;
 const petMode=celestialPetMode(equippedPetId,matchingPetId,alternatePetSource!=null);
 useEffect(()=>{
  let live=true,changed=false;
  const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{changed=true;if(live)setSystemReduced(value);});
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live&&!changed)setSystemReduced(value);}).catch(()=>{});
  return()=>{live=false;sub.remove();};
 },[]);
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>setForeground(s==='active'));return()=>sub.remove();},[]);
 useEffect(()=>{
  clock.stopAnimation();clock.setValue(0);
  if(!running)return;
  const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration:ULTRA_LUXE_CYCLE_MS,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
  loop.start();return()=>{loop.stop();clock.stopAnimation();};
 },[clock,running]);
 const scale=width/CELESTIAL_STAGE.width;
 const pos=(x:number,y:number,w:number,h:number)=>({position:'absolute' as const,left:x*scale,top:y*scale,width:w*scale,height:h*scale});
 const box=(b:{x:number;y:number;width:number;height:number})=>pos(b.x,b.y,b.width,b.height);
 const pulse=signatureEnergy(clock);
 const idle=petIdleMotion(clock,scale,petMode==='alternate'?'alternate':'celestial');
 const orbit=clock.interpolate({inputRange:[0,.25,.5,.75,1],outputRange:['0deg','180deg','360deg','540deg','720deg']});
 return <View style={styles.outer} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
  {!supported?fallback:<View style={[styles.card,{height:CELESTIAL_STAGE.height*scale}]}>
   <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Image source={assets.background} resizeMode="cover" style={styles.fillImage}/>
    <UltraLuxeEnvironment clock={clock} scale={scale} theme="celestial" particle={assets.star}/>
    <Image source={assets.orrery} resizeMode="contain" style={pos(119,26,102,48)}/>
    <Animated.View style={[pos(129,24,82,55),{transform:[{rotate:orbit}]}]}>
     <Image source={assets.star} resizeMode="contain" style={{position:'absolute',left:0,top:21*scale,width:7*scale,height:7*scale}}/>
     <Image source={assets.star} resizeMode="contain" style={{position:'absolute',right:0,top:21*scale,width:7*scale,height:7*scale}}/>
    </Animated.View>
    <Animated.Image source={assets.corona} resizeMode="contain" style={[pos(130,26,80,48),{opacity:pulse}]}/>
    {petMode==='matching'?<>
     <Animated.View style={[StyleSheet.absoluteFill,{transform:[{translateY:idle.lift}]}]}>
      {assets.poseAtlas?<Animated.View style={[box(CELESTIAL_PET_BOX.matching),{transform:[{rotate:idle.tilt},{scaleX:idle.scaleX},{scaleY:idle.scaleY}]}]}><UltraLuxePetPoseSprite source={assets.poseAtlas} clock={clock} theme="celestial" width={CELESTIAL_PET_BOX.matching.width*scale} height={CELESTIAL_PET_BOX.matching.height*scale}/></Animated.View>:<Animated.Image source={assets.petShowcase} resizeMode="contain" style={[box(CELESTIAL_PET_BOX.matching),{transform:[{rotate:idle.tilt},{scaleX:idle.scaleX},{scaleY:idle.scaleY}]}]}/>}
      <UltraLuxePetAura clock={clock} scale={scale} theme="celestial" particle={assets.star}/>
      <Animated.Image source={assets.star} resizeMode="contain" style={[pos(258,80,16,16),{opacity:Animated.add(idle.glow,Animated.multiply(pulse,.35))}]}/>
     </Animated.View>
    </>:petMode==='alternate'&&alternatePetSource?<>
     <Animated.Image source={assets.fallbackGlow} resizeMode="contain" style={[box(CELESTIAL_PET_BOX.glow),{opacity:Animated.add(.55,Animated.multiply(idle.glow,.5))}]}/>
     <Animated.Image source={alternatePetSource} resizeMode="contain" style={[box(CELESTIAL_PET_BOX.alternate),{transform:[{translateY:idle.lift},{rotate:idle.tilt},{scaleX:idle.scaleX},{scaleY:idle.scaleY}]}]}/>
    </>:null}
   </View>
   {petMode!=='none'&&petAccessibilityLabel?<View accessible accessibilityLabel={petAccessibilityLabel} pointerEvents="none" style={box(CELESTIAL_PET_BOX[petMode])}/>:null}
   <View style={[box(CELESTIAL_IDENTITY_BOX.plate),styles.identityPlate]}>
    <View style={pos(4,5,56,56)}>{portrait}</View>
    <View style={pos(66,5,126,60)}>{identity}</View>
   </View>
   {guild!=null?<View style={[box(CELESTIAL_IDENTITY_BOX.guild),styles.guildPlate]}>{guild}</View>:null}
   <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Image source={assets.border} resizeMode="stretch" style={styles.fillImage}/>
    <UltraLuxeRail clock={clock} scale={scale} theme="celestial" particle={assets.star}/>
    {fullSet?<UltraLuxeAscendantFlourish clock={clock} scale={scale} theme="celestial" particle={assets.star}/>:null}
   </View>
  </View>}
 </View>;
}
const styles=StyleSheet.create({
 outer:{width:'100%',maxWidth:480,alignSelf:'center'},
 card:{width:'100%',overflow:'hidden',backgroundColor:'#091225',position:'relative'},
 fillImage:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
 identityPlate:{borderRadius:6,borderWidth:1,borderColor:'#a48b55',backgroundColor:'#0a1228'},
 guildPlate:{borderRadius:4,borderWidth:1,borderColor:'#a48b55',backgroundColor:'#0a1228',justifyContent:'center',alignItems:'stretch'},
});

import {useUltraLuxePetReaction,UltraLuxePetReaction} from './UltraLuxePetReaction';
import {UltraLuxeIdentityMotionProvider} from './UltraLuxeIdentityMotion';
import {UltraLuxePetPoseSprite} from './UltraLuxePetPoseSprite';
import {ULTRA_LUXE_CYCLE_MS,PET_IDLE_PHASE,CELESTIAL_ATLAS_LIFT} from '../../core/ultra-luxe-motion';
import {UltraLuxeEnvironment,UltraLuxeRail,UltraLuxePetAura,UltraLuxeAscendantFlourish,petIdleMotion,awakeningEnergy,awakeningPetLift} from './UltraLuxeMotion';
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,Pressable,StyleSheet,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
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
 smoothPoseAtlas?:ImageSourcePropType;
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
 const reactionEnabled=running&&petMode==='matching';
 const {reaction,trigger}=useUltraLuxePetReaction(reactionEnabled);
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
 const pulse=useMemo(()=>awakeningEnergy(clock,'celestial'),[clock]);
 const signatureLift=useMemo(()=>awakeningPetLift(clock,scale,'celestial'),[clock,scale]);
 const idle=useMemo(()=>petIdleMotion(clock,scale,petMode==='alternate'?'alternate':'celestial'),[clock,scale,petMode]);
 const matchingLift=useMemo(()=>clock.interpolate({inputRange:PET_IDLE_PHASE,outputRange:CELESTIAL_ATLAS_LIFT.map(y=>y*scale)}),[clock,scale]);
 const bodyLift=useMemo(()=>Animated.add(assets.smoothPoseAtlas?matchingLift:idle.lift,signatureLift),[assets.smoothPoseAtlas,matchingLift,idle.lift,signatureLift]);
 const orbit=useMemo(()=>clock.interpolate({inputRange:[0,.25,.5,.75,1],outputRange:['0deg','180deg','360deg','540deg','720deg']}),[clock]);
 return <View style={styles.outer} onLayout={e=>{const next=e.nativeEvent.layout.width;setWidth(old=>Math.abs(old-next)<.5?old:next);}}>
  {!supported?fallback:<View style={[styles.card,{height:CELESTIAL_STAGE.height*scale}]}>
   <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Image source={assets.background} fadeDuration={0} resizeMode="cover" style={styles.fillImage}/>
    {running?<UltraLuxeEnvironment clock={clock} scale={scale} theme="celestial" particle={assets.star}/>:null}
    <Image source={assets.orrery} fadeDuration={0} resizeMode="contain" style={pos(119,26,102,48)}/>
    <Animated.View style={[pos(129,24,82,55),{transform:[{rotate:orbit}]}]}>
     <Image source={assets.star} resizeMode="contain" style={{position:'absolute',left:0,top:21*scale,width:7*scale,height:7*scale}}/>
     <Image source={assets.star} resizeMode="contain" style={{position:'absolute',right:0,top:21*scale,width:7*scale,height:7*scale}}/>
    </Animated.View>
    <Animated.Image source={assets.corona} fadeDuration={0} resizeMode="contain" style={[pos(130,26,80,48),{opacity:pulse}]}/>
    {petMode==='matching'?<>
     <Animated.View style={[StyleSheet.absoluteFill,{transform:[{translateY:bodyLift}]}]}>
      {running&&assets.smoothPoseAtlas?<Animated.View style={box(CELESTIAL_PET_BOX.matching)}><UltraLuxePetPoseSprite source={assets.smoothPoseAtlas} clock={clock} theme="celestial" width={CELESTIAL_PET_BOX.matching.width*scale} height={CELESTIAL_PET_BOX.matching.height*scale}/></Animated.View>:<Animated.Image source={assets.petShowcase} fadeDuration={0} resizeMode="contain" style={[box(CELESTIAL_PET_BOX.matching),{transform:[{rotate:idle.tilt},{scaleX:idle.scaleX},{scaleY:idle.scaleY}]}]}/>}
      {running?<UltraLuxePetAura clock={clock} scale={scale} theme="celestial" particle={assets.star}/>:null}
      {reactionEnabled?<UltraLuxePetReaction reaction={reaction} scale={scale} theme="celestial" particle={assets.star} glow={assets.corona}/>:null}
      <Animated.Image source={assets.star} resizeMode="contain" style={[pos(258,80,16,16),{opacity:Animated.add(Animated.multiply(idle.glow,.65),Animated.multiply(pulse,.55))}]}/>
     </Animated.View>
    </>:petMode==='alternate'&&alternatePetSource?<>
     <Animated.Image source={assets.fallbackGlow} resizeMode="contain" style={[box(CELESTIAL_PET_BOX.glow),{opacity:Animated.add(.55,Animated.multiply(idle.glow,.5))}]}/>
     <Animated.Image source={alternatePetSource} resizeMode="contain" style={[box(CELESTIAL_PET_BOX.alternate),{transform:[{translateY:idle.lift},{rotate:idle.tilt},{scaleX:idle.scaleX},{scaleY:idle.scaleY}]}]}/>
    </>:null}
   </View>
   {reactionEnabled?<Pressable accessibilityRole="button" accessibilityLabel={petAccessibilityLabel??'Aetherion'} onPress={trigger} hitSlop={{top:10*scale,bottom:0,left:0,right:0}} style={box(CELESTIAL_PET_BOX.matching)}/>:petMode!=='none'&&petAccessibilityLabel?<View accessible accessibilityLabel={petAccessibilityLabel} pointerEvents="none" style={box(CELESTIAL_PET_BOX[petMode])}/>:null}
   <UltraLuxeIdentityMotionProvider clock={clock} fullSet={fullSet} active={running}>
   <View style={[box(CELESTIAL_IDENTITY_BOX.plate),styles.identityPlate]}>
    <View style={box(CELESTIAL_IDENTITY_BOX.portrait)}>{portrait}</View>
    <View style={box(CELESTIAL_IDENTITY_BOX.identity)}>{identity}</View>
   </View>
   </UltraLuxeIdentityMotionProvider>
   {guild!=null?<View style={[box(CELESTIAL_IDENTITY_BOX.guild),styles.guildPlate]}>{guild}</View>:null}
   <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Image source={assets.border} fadeDuration={0} resizeMode="stretch" style={styles.fillImage}/>
    {running?<UltraLuxeRail clock={clock} scale={scale} theme="celestial" particle={assets.star}/>:null}
    {running&&fullSet?<UltraLuxeAscendantFlourish clock={clock} scale={scale} theme="celestial" particle={assets.star}/>:null}
   </View>
  </View>}
 </View>;
}
const styles=StyleSheet.create({
 outer:{width:'100%',maxWidth:480,alignSelf:'center'},
 card:{width:'100%',overflow:'hidden',backgroundColor:'#091225',position:'relative'},
 fillImage:{...StyleSheet.absoluteFill,width:'100%',height:'100%'},
 identityPlate:{borderRadius:6,borderWidth:1,borderColor:'#a48b55',backgroundColor:'#0a1228'},
 guildPlate:{borderRadius:4,borderWidth:1,borderColor:'#a48b55',backgroundColor:'#0a1228',justifyContent:'center',alignItems:'stretch'},
});

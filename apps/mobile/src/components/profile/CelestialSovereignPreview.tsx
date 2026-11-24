import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,StyleSheet,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
import {CELESTIAL_STAGE,CELESTIAL_PET_BOX,celestialPetMode,celestialStageSupported} from '../../core/celestial-showcase-layout';

/** Preview-only stage. No catalogue IDs, entitlement, equip or bonus changes.
 * Caller must explicitly supply the preview artwork, protected identity slots,
 * a standard fallback, and active=true only when the stage is on screen.
 * Reviewed three-state composition: 340 x 205. Caller supplies equipped IDs from the actual profile, never from ownership alone. Native QA before production mounting.
 */
export type CelestialPreviewAssets={
 background:ImageSourcePropType;
 border:ImageSourcePropType;
 petShowcase:ImageSourcePropType;
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
 active?:boolean;
 reduceMotion?:boolean;
};
const PHASE=[0,.18,.36,.54,.72,.85,1];
export function CelestialSovereignPreview({assets,equippedPetId,matchingPetId,alternatePetSource,petAccessibilityLabel,portrait,identity,guild,fallback,active=false,reduceMotion=false}:Props){
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
  const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration:24000,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
  loop.start();return()=>{loop.stop();clock.stopAnimation();};
 },[clock,running]);
 const scale=width/CELESTIAL_STAGE.width;
 const pos=(x:number,y:number,w:number,h:number)=>({position:'absolute' as const,left:x*scale,top:y*scale,width:w*scale,height:h*scale});
 const box=(b:{x:number;y:number;width:number;height:number})=>pos(b.x,b.y,b.width,b.height);
 const interp=(outputRange:number[])=>clock.interpolate({inputRange:PHASE,outputRange});
 const pulse=clock.interpolate({inputRange:[0,.72,.83,.90,1],outputRange:[0,0,1,.35,0]});
 const bob=interp([0,-3,0,-3,0,-5,0]);
 const glint=interp([.25,.8,.25,.7,.25,1,.25]);
 const railTravel=clock.interpolate({inputRange:[0,.5,1],outputRange:[0,280*scale,0]});
 const orbit=clock.interpolate({inputRange:[0,.25,.5,.75,1],outputRange:['0deg','180deg','360deg','540deg','720deg']});
 return <View style={styles.outer} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
  {!supported?fallback:<View style={[styles.card,{height:CELESTIAL_STAGE.height*scale}]}>
   <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Image source={assets.background} resizeMode="cover" style={styles.fillImage}/>
    <Image source={assets.orrery} resizeMode="contain" style={pos(119,26,102,48)}/>
    <Animated.View style={[pos(129,24,82,55),{transform:[{rotate:orbit}]}]}>
     <Image source={assets.star} resizeMode="contain" style={{position:'absolute',left:0,top:21*scale,width:7*scale,height:7*scale}}/>
     <Image source={assets.star} resizeMode="contain" style={{position:'absolute',right:0,top:21*scale,width:7*scale,height:7*scale}}/>
    </Animated.View>
    <Animated.Image source={assets.corona} resizeMode="contain" style={[pos(130,26,80,48),{opacity:pulse}]}/>
    {/* Environment glints persist independently of the selected pet. */}
    {[{x:252,y:88},{x:304,y:91},{x:295,y:162}].map((p,i)=><Animated.Image key={i} source={assets.star} resizeMode="contain" style={[pos(p.x,p.y,6,8),{opacity:glint}]}/>)}
    {petMode==='matching'?<>
     <Animated.Image source={assets.petShowcase} resizeMode="contain" style={[box(CELESTIAL_PET_BOX.matching),{transform:[{translateY:Animated.multiply(bob,scale)}]}]}/>
     <Animated.Image source={assets.star} resizeMode="contain" style={[pos(258,80,16,16),{opacity:pulse}]}/>
    </>:petMode==='alternate'&&alternatePetSource?<>
     <Image source={assets.fallbackGlow} resizeMode="contain" style={box(CELESTIAL_PET_BOX.glow)}/>
     <Image source={alternatePetSource} resizeMode="contain" style={box(CELESTIAL_PET_BOX.alternate)}/>
    </>:null}
   </View>
   {petMode!=='none'&&petAccessibilityLabel?<View accessible accessibilityLabel={petAccessibilityLabel} pointerEvents="none" style={box(CELESTIAL_PET_BOX[petMode])}/>:null}
   <View style={[pos(36,74,198,70),styles.identityPlate]}>
    <View style={pos(4,5,56,56)}>{portrait}</View>
    <View style={pos(66,5,126,60)}>{identity}</View>
   </View>
   {guild!=null?<View style={[pos(42,151,188,18),styles.guildPlate]}>{guild}</View>:null}
   <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Image source={assets.border} resizeMode="stretch" style={styles.fillImage}/>
    <Animated.Image source={assets.star} resizeMode="contain" style={[pos(26,10,10,12),{opacity:glint,transform:[{translateX:railTravel}]}]}/>
    {[{x:170,y:13},{x:16,y:102},{x:324,y:102},{x:170,y:192}].map((p,i)=>
     <Animated.Image key={i} source={assets.star} resizeMode="contain" style={[pos(p.x-8,p.y-8,16,16),{opacity:pulse}]}/>)}
   </View>
  </View>}
 </View>;
}
const styles=StyleSheet.create({
 outer:{width:'100%',maxWidth:480,alignSelf:'center'},
 card:{width:'100%',overflow:'hidden',backgroundColor:'#091225',position:'relative'},
 fillImage:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
 identityPlate:{borderRadius:6,borderWidth:1,borderColor:'#a48b55',backgroundColor:'#0a1228'},
 guildPlate:{borderRadius:4,borderWidth:1,borderColor:'#a48b55',backgroundColor:'#0a1228',justifyContent:'center',alignItems:'center'},
});

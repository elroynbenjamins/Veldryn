import {memo,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,StyleSheet,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
import {UltraLuxeIdentityMotionProvider} from './UltraLuxeIdentityMotion';
import {ABYSSAL_BOXES as B,ABYSSAL_STAGE as S,ABYSSAL_BUDGET as Q,ABYSSAL_CYCLE_MS,ABYSSAL_MOTE_PATHS,abyssalAwakeningCurve,abyssalPetMode,abyssalStageSupported} from '../../core/abyssal-showcase-layout';

/** Review component only. All artwork is supplied by its caller; no release registration. */
export type AbyssalSceneAssets={
 background:ImageSourcePropType;border:ImageSourcePropType;leviathan:ImageSourcePropType;
 tide:ImageSourcePropType;mote:ImageSourcePropType;aura:ImageSourcePropType;
};
type Props={assets:AbyssalSceneAssets;equippedPetId?:string|null;alternatePetSource?:ImageSourcePropType;petAccessibilityLabel?:string;portrait:ReactNode;identity:ReactNode;badges?:ReactNode;guild?:ReactNode;fallback:ReactNode;fullSet?:boolean;active?:boolean;reduceMotion?:boolean};
const CURVE=abyssalAwakeningCurve();
const IDLE_PHASE=Array.from({length:49},(_,i)=>i/48);
const periodic=(t:number)=>t===1?0:t;
const IDLE_LIFT=IDLE_PHASE.map(t=>-1.5*(1-Math.cos(2*Math.PI*6*periodic(t)))/2);
const IDLE_TILT=IDLE_PHASE.map(t=>1.4*Math.sin(2*Math.PI*4*periodic(t))+'deg');
const pos=(k:number,x:number,y:number,w:number,h:number)=>({position:'absolute' as const,left:x*k,top:y*k,width:w*k,height:h*k});
const box=(k:number,b:{x:number;y:number;w:number;h:number})=>pos(k,b.x,b.y,b.w,b.h);

/** Fail static until the system motion preference resolves. Suspend when hidden
 * or backgrounded. All visual channels share one native non-interaction clock. */
function useAbyssalClock(enabled:boolean){
 const clock=useRef(new Animated.Value(0)).current;
 const [foreground,setForeground]=useState(false);
 const [systemReduced,setSystemReduced]=useState(true);
 useEffect(()=>{
  if(!enabled)return;
  let live=true,changed=false;
  setSystemReduced(true);
  setForeground(AppState.currentState==='active');
  const app=AppState.addEventListener('change',v=>{if(live)setForeground(v==='active');});
  const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',v=>{changed=true;if(live)setSystemReduced(v);});
  AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live&&!changed)setSystemReduced(v);}).catch(()=>{});
  return()=>{live=false;app.remove();motion.remove();};
 },[enabled]);
 const running=enabled&&foreground&&!systemReduced&&AppState.currentState==='active';
 useEffect(()=>{
  clock.stopAnimation();clock.setValue(0);
  if(!running)return;
  const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration:ABYSSAL_CYCLE_MS,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
  loop.start();
  return()=>{loop.stop();clock.stopAnimation();};
 },[clock,running]);
 return {clock,running};
}
const Decorative=memo(function Decorative({children}:{children:ReactNode}){
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>{children}</View>;
});
const AbyssalTide=memo(function AbyssalTide({clock,k,assets,fullSet}:{clock:Animated.Value;k:number;assets:AbyssalSceneAssets;fullSet:boolean}){
 const motion=useMemo(()=>{
  const energy=clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy});
  const opacity=clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy.map(e=>.14+.55*e)});
  const rise=clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy.map(e=>-9*k*e)});
  const motes=ABYSSAL_MOTE_PATHS.map((p,i)=>{
   const inputRange=p.map((_,j)=>j/(p.length-1));
   return {x:clock.interpolate({inputRange,outputRange:p.map(([x])=>x*k)}),y:clock.interpolate({inputRange,outputRange:p.map(([,y])=>y*k)}),opacity:clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy.map(e=>.38+e*(.42-i*.04))})};
  });
  return {energy,opacity,rise,motes,crest:Animated.multiply(energy,fullSet?.78:.45)};
 },[clock,k,fullSet]);
 const r=Q.moteRadius;
 return <Decorative>
  <Animated.Image source={assets.tide} fadeDuration={0} resizeMode="stretch" style={[pos(k,226,28,84,140),{opacity:motion.opacity,transform:[{translateY:motion.rise}]}]}/>
  {motion.motes.map((m,i)=><Animated.Image key={i} source={assets.mote} fadeDuration={0} resizeMode="contain" style={[pos(k,-r,-r,2*r,2*r),{opacity:m.opacity,transform:[{translateX:m.x},{translateY:m.y}]}]}/>)}
  <Animated.Image source={assets.aura} fadeDuration={0} resizeMode="contain" style={[pos(k,148,8,44,26),{opacity:motion.crest}]}/>
 </Decorative>;
});
const AbyssalPet=memo(function AbyssalPet({clock,k,assets,running,mode,alternatePetSource}:{clock:Animated.Value;k:number;assets:AbyssalSceneAssets;running:boolean;mode:'matching'|'alternate'|'none';alternatePetSource?:ImageSourcePropType}){
 const motion=useMemo(()=>{
  if(!running)return null;
  const lift=clock.interpolate({inputRange:IDLE_PHASE,outputRange:IDLE_LIFT.map(v=>v*k)});
  const tideLift=clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy.map(e=>-1.5*e*k)});
  const tilt=clock.interpolate({inputRange:IDLE_PHASE,outputRange:IDLE_TILT});
  const aura=clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy.map(e=>.28+.55*e)});
  return {lift:Animated.add(lift,tideLift),tilt,aura};
 },[running,clock,k]);
 if(mode==='none')return null;
 if(mode==='alternate'&&alternatePetSource)return <Image source={alternatePetSource} fadeDuration={0} resizeMode="contain" style={box(k,B.alternate)}/>;
 if(mode!=='matching')return null;
 return <Decorative>
  {motion?<Animated.Image source={assets.aura} fadeDuration={0} resizeMode="contain" style={[box(k,B.aura),{opacity:motion.aura}]}/>:<Image source={assets.aura} fadeDuration={0} resizeMode="contain" style={[box(k,B.aura),{opacity:.28}]}/>}
  {motion?<Animated.Image source={assets.leviathan} fadeDuration={0} resizeMode="contain" style={[box(k,B.leviathan),{transform:[{translateY:motion.lift},{rotate:motion.tilt}]}]}/>:<Image source={assets.leviathan} fadeDuration={0} resizeMode="contain" style={box(k,B.leviathan)}/>}
 </Decorative>;
});
export const AbyssalMajestyPreview=memo(function AbyssalMajestyPreview({assets,equippedPetId,alternatePetSource,petAccessibilityLabel,portrait,identity,badges,guild,fallback,fullSet=false,active=false,reduceMotion=false}:Props){
 const [width,setWidth]=useState(0),{fontScale}=useWindowDimensions();
 const supported=abyssalStageSupported(width,fontScale);
 const {clock,running}=useAbyssalClock(active&&supported&&!reduceMotion);
 const k=width/S.width,mode=abyssalPetMode(equippedPetId,!!alternatePetSource);
 const verifiedFullSet=fullSet&&mode==='matching';
 return <View style={s.outer} onLayout={e=>{const next=e.nativeEvent.layout.width;setWidth(old=>Math.abs(old-next)<.5?old:next);}}>
  {!supported?fallback:<View style={[s.card,{height:S.height*k}]}>
   <Decorative>
    <Image source={assets.background} fadeDuration={0} resizeMode="cover" style={s.fill}/>
    {running?<AbyssalTide clock={clock} k={k} assets={assets} fullSet={verifiedFullSet}/>:null}
    <AbyssalPet clock={clock} k={k} assets={assets} running={running} mode={mode} alternatePetSource={alternatePetSource}/>
   </Decorative>
   {mode!=='none'&&petAccessibilityLabel?<View accessible accessibilityLabel={petAccessibilityLabel} pointerEvents="none" style={box(k,mode==='matching'?B.leviathan:B.alternate)}/>:null}
   <View style={[box(k,B.plate),s.plate]}/>
   <View style={[box(k,B.portrait),s.portrait]}>{portrait}</View>
   <UltraLuxeIdentityMotionProvider clock={clock} fullSet={verifiedFullSet} active={running}>
    <View style={[box(k,B.identity),s.protected]}>{identity}</View>
    {badges?<View style={[box(k,B.badges),s.badges]}>{badges}</View>:null}
   </UltraLuxeIdentityMotionProvider>
   {guild?<View style={[box(k,B.guild),s.guild]}>{guild}</View>:null}
   <Decorative><Image source={assets.border} fadeDuration={0} resizeMode="stretch" style={s.fill}/></Decorative>
  </View>}
 </View>;
});
const s=StyleSheet.create({
 outer:{width:'100%',maxWidth:480,alignSelf:'center'},
 card:{width:'100%',position:'relative',overflow:'hidden',backgroundColor:'#05151c'},
 fill:{...StyleSheet.absoluteFill,width:'100%',height:'100%'},
 plate:{backgroundColor:'#071e29',borderColor:'#478e92',borderWidth:1,borderRadius:6},
 portrait:{backgroundColor:'#091b24',borderColor:'#72c9c3',borderWidth:1,borderRadius:5},
 protected:{overflow:'hidden'},
 badges:{justifyContent:'center',alignItems:'flex-start'},
 guild:{backgroundColor:'#10313b',borderColor:'#478e92',borderWidth:1,borderRadius:4,alignItems:'stretch',justifyContent:'center'},
});

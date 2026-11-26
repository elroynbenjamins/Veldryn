import {memo,useMemo,useState,type ReactNode} from 'react';
import {Animated,Image,StyleSheet,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
import {useCosmeticMotionPolicy,useLoopProgress} from '../anim/motion';
import {ParadoxBorderLight} from './ParadoxBorderLight';
import {UltraLuxeIdentityMotionProvider} from './UltraLuxeIdentityMotion';
import {PARADOX_BOXES as B,PARADOX_STAGE as S,PARADOX_CYCLE_MS,PARADOX_IDLE_PHASE,PARADOX_IDLE_LIFT,PARADOX_AMBIENT_PATHS,PARADOX_POSE_ATLAS,paradoxPoseTimeline,paradoxPoseCell,paradoxAwakeningCurve,paradoxStageSupported,paradoxPetMode} from '../../core/paradox-showcase-layout';

export type ParadoxSceneAssets={background:ImageSourcePropType;border:ImageSourcePropType;aeon:ImageSourcePropType;idleAtlas?:ImageSourcePropType;glint:ImageSourcePropType;aura:ImageSourcePropType};
type Props={assets:ParadoxSceneAssets;equippedPetId?:string|null;alternatePetSource?:ImageSourcePropType;petAccessibilityLabel?:string;portrait:ReactNode;identity:ReactNode;badges?:ReactNode;guild?:ReactNode;fallback:ReactNode;fullSet?:boolean;active?:boolean;reduceMotion?:boolean};
const CURVE=paradoxAwakeningCurve();
const pos=(k:number,x:number,y:number,w:number,h:number)=>({position:'absolute' as const,left:x*k,top:y*k,width:w*k,height:h*k});
const box=(k:number,b:{x:number;y:number;w:number;h:number})=>pos(k,b.x,b.y,b.w,b.h);
const Decorative=({children}:{children:ReactNode})=><View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>{children}</View>;
const ParadoxAmbient=memo(function ParadoxAmbient({clock,k,source}:{clock:Animated.Value;k:number;source:ImageSourcePropType}){
 const tracks=useMemo(()=>PARADOX_AMBIENT_PATHS.map((p,i)=>{
  const inputRange=p.map((_,j)=>j/(p.length-1));
  return {x:clock.interpolate({inputRange,outputRange:p.map(([x])=>x*k)}),y:clock.interpolate({inputRange,outputRange:p.map(([,y])=>y*k)}),opacity:clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy.map(e=>.24+(.46-i*.06)*e)})};
 }),[clock,k]);
 return <Decorative>{tracks.map((t,i)=><Animated.Image key={i} source={source} fadeDuration={0} resizeMode="contain" style={[pos(k,-4,-4,8,8),{opacity:t.opacity,transform:[{translateX:t.x},{translateY:t.y}]}]}/>)}</Decorative>;
});
const POSES=paradoxPoseTimeline();
const ParadoxPoseSprite=memo(function ParadoxPoseSprite({source,clock,width,height}:{source:ImageSourcePropType;clock:Animated.Value;width:number;height:number}){
 const a=PARADOX_POSE_ATLAS,ratio=Math.min(width/a.frameWidth,height/a.frameHeight);
 const w=a.frameWidth*ratio,h=a.frameHeight*ratio;
 const phase=useMemo(()=>Animated.modulo(Animated.multiply(clock,a.cycles),1),[clock,a.cycles]);
 const [x,y]=useMemo(()=>[
  phase.interpolate({inputRange:POSES.inputRange,outputRange:POSES.frames.map(f=>-paradoxPoseCell(f).column*w),extrapolate:'clamp'}),
  phase.interpolate({inputRange:POSES.inputRange,outputRange:POSES.frames.map(f=>-paradoxPoseCell(f).row*h),extrapolate:'clamp'}),
 ] as const,[phase,w,h]);
 return <View pointerEvents="none" accessible={false} style={{width,height,alignItems:'center',justifyContent:'center'}}>
  <View style={{width:w,height:h,overflow:'hidden'}}>
   <Animated.Image source={source} fadeDuration={0} resizeMode="stretch" style={{position:'absolute',left:0,top:0,width:w*a.columns,height:h*a.rows,transform:[{translateX:x},{translateY:y}]}}/>
  </View>
 </View>;
});
const ParadoxPet=memo(function ParadoxPet({clock,k,assets,mode,running,alternate}:{clock:Animated.Value;k:number;assets:ParadoxSceneAssets;mode:'matching'|'alternate'|'none';running:boolean;alternate?:ImageSourcePropType}){
 const motion=useMemo(()=>{
  if(!running||mode!=='matching')return null;
  const idle=clock.interpolate({inputRange:PARADOX_IDLE_PHASE,outputRange:PARADOX_IDLE_LIFT.map(v=>v*k)});
  const surge=clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy.map(e=>-1.5*k*e)});
  const glow=clock.interpolate({inputRange:CURVE.phase,outputRange:CURVE.energy.map(e=>.24+.54*e)});
  return {lift:Animated.add(idle,surge),glow};
 },[clock,k,mode,running]);
 if(mode==='alternate'&&alternate)return <Image source={alternate} fadeDuration={0} resizeMode="contain" style={box(k,B.alternate)}/>;
 if(mode!=='matching')return null;
 return <Decorative>
  {motion?<Animated.Image source={assets.aura} fadeDuration={0} resizeMode="contain" style={[box(k,B.aura),{opacity:motion.glow}]}/>:<Image source={assets.aura} fadeDuration={0} resizeMode="contain" style={[box(k,B.aura),{opacity:.24}]}/>}
  {motion&&assets.idleAtlas?<Animated.View style={[box(k,B.aeon),{transform:[{translateY:motion.lift}]}]}><ParadoxPoseSprite source={assets.idleAtlas} clock={clock} width={B.aeon.w*k} height={B.aeon.h*k}/></Animated.View>:motion?<Animated.Image source={assets.aeon} fadeDuration={0} resizeMode="contain" style={[box(k,B.aeon),{transform:[{translateY:motion.lift}]}]}/>:<Image source={assets.aeon} fadeDuration={0} resizeMode="contain" style={box(k,B.aeon)}/>}
 </Decorative>;
});
/** Review-only native showcase. One shared loop; no motion on badge art.
 * All assets supplied by caller; atlas optional with static pose fallback. */
export const ParadoxEternalPreview=memo(function ParadoxEternalPreview({assets,equippedPetId,alternatePetSource,petAccessibilityLabel,portrait,identity,badges,guild,fallback,fullSet=false,active=false,reduceMotion=false}:Props){
 const [width,setWidth]=useState(0),{fontScale}=useWindowDimensions();
 const supported=paradoxStageSupported(width,fontScale),{running}=useCosmeticMotionPolicy(active&&supported,reduceMotion);
 const clock=useLoopProgress(PARADOX_CYCLE_MS,running);
 const k=width/S.width,mode=paradoxPetMode(equippedPetId,!!alternatePetSource),verifiedFullSet=fullSet&&mode==='matching';
 return <View style={s.outer} onLayout={e=>{const w=e.nativeEvent.layout.width;setWidth(old=>Math.abs(old-w)<.5?old:w);}}>
  {!supported?fallback:<View style={[s.card,{height:S.height*k}]}>
   <Decorative>
    <Image source={assets.background} fadeDuration={0} resizeMode="cover" style={s.fill}/>
    {running?<ParadoxAmbient clock={clock} k={k} source={assets.glint}/>:null}
    <ParadoxPet clock={clock} k={k} assets={assets} mode={mode} running={running} alternate={alternatePetSource}/>
   </Decorative>
   {mode!=='none'&&petAccessibilityLabel?<View accessible accessibilityLabel={petAccessibilityLabel} pointerEvents="none" style={box(k,mode==='matching'?B.aeon:B.alternate)}/>:null}
   <View style={[box(k,B.plate),s.plate]}/>
   <View style={[box(k,B.portrait),s.portrait]}>{portrait}</View>
   <UltraLuxeIdentityMotionProvider clock={clock} fullSet={verifiedFullSet} active={running}>
    <View style={[box(k,B.identity),s.protected]}>{identity}</View>
   </UltraLuxeIdentityMotionProvider>
   {badges?<View style={[box(k,B.badges),s.badges]}>{badges}</View>:null}
   {guild?<View style={[box(k,B.guild),s.guild]}>{guild}</View>:null}
   <Decorative><Image source={assets.border} fadeDuration={0} resizeMode="stretch" style={s.fill}/>
    {running?<ParadoxBorderLight clock={clock} width={width} height={S.height*k} art={assets} showcase fullSet={verifiedFullSet}/>:null}
   </Decorative>
  </View>}
 </View>;
});
const s=StyleSheet.create({
 outer:{width:'100%',maxWidth:480,alignSelf:'center'},card:{width:'100%',position:'relative',overflow:'hidden',backgroundColor:'#100e21'},
 fill:{...StyleSheet.absoluteFill,width:'100%',height:'100%'},plate:{backgroundColor:'#151127',borderColor:'#8773af',borderWidth:1,borderRadius:6},
 portrait:{backgroundColor:'#151127',borderColor:'#bca3e5',borderWidth:1,borderRadius:5},protected:{overflow:'hidden'},
 badges:{justifyContent:'center',alignItems:'flex-start'},guild:{backgroundColor:'#211832',borderColor:'#8773af',borderWidth:1,borderRadius:4,justifyContent:'center'},
});

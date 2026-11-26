import {memo,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Easing,Image,StyleSheet,View,type ImageSourcePropType,type LayoutChangeEvent,type NativeScrollEvent,type NativeSyntheticEvent} from 'react-native';
import {profileFrameSegments,profileSceneFrameSegments,profileSceneGlowBounds,profileSceneArtworkGlowBounds} from '../core/profile-frame-layout';
import {sampleCosmeticTrack,cosmeticGlowOpacity,cosmeticViewportVisible,MOTION_STEPS as steps} from '../core/profile-cosmetic-motion-v2';
import type {CosmeticArt} from '../theme/profile-cosmetic-art-v1';
import {usesArtworkGlowAnchors,type ProfileCosmeticRuntime,type ProfileParticleKind} from '../theme/profile-cosmetic-runtime-v1';
import {useCosmeticMotionPolicy} from './anim/motion';
const SW=768,SH=432;
type Segment=ReturnType<typeof profileFrameSegments>[number];
type Rect=readonly [number,number,number,number];
export function mapCosmeticSprite(p:Segment,[sx,sy,sw,sh]:Rect){
 const scaleX=p.imageWidth/SW,scaleY=p.imageHeight/SH;
 const x=p.x+p.imageLeft+sx*scaleX,y=p.y+p.imageTop+sy*scaleY;
 const width=sw*scaleX,height=sh*scaleY;
 const left=Math.max(x,p.x),top=Math.max(y,p.y),right=Math.min(x+width,p.x+p.width),bottom=Math.min(y+height,p.y+p.height);
 if(right<=left||bottom<=top)return null;
 return {left,top,width:right-left,height:bottom-top,imageLeft:x-left,imageTop:y-top,imageWidth:width,imageHeight:height};
}
/** Scroll handlers update React state only when the card enters/leaves the viewport.
 * No polling, measurement bridge calls, or per-frame React animation work. */
export function useCosmeticScrollVisibility(){
 const geometry=useRef({sceneTop:0,sceneHeight:0,scrollTop:0,viewportHeight:0});
 const [visible,setVisible]=useState(false);
 const last=useRef(false);
 const refresh=useCallback(()=>{
  const g=geometry.current,next=cosmeticViewportVisible(g.sceneTop,g.sceneHeight,g.scrollTop,g.viewportHeight);
  if(next!==last.current){last.current=next;setVisible(next);}
 },[]);
 const onSceneLayout=useCallback((event:LayoutChangeEvent)=>{
  const {y,height}=event.nativeEvent.layout;geometry.current.sceneTop=y;geometry.current.sceneHeight=height;refresh();
 },[refresh]);
 const onViewportLayout=useCallback((event:LayoutChangeEvent)=>{
  geometry.current.viewportHeight=event.nativeEvent.layout.height;refresh();
 },[refresh]);
 const onScroll=useCallback((event:NativeSyntheticEvent<NativeScrollEvent>)=>{
  geometry.current.scrollTop=event.nativeEvent.contentOffset.y;geometry.current.viewportHeight=event.nativeEvent.layoutMeasurement.height;refresh();
 },[refresh]);
 return {visible,onSceneLayout,onViewportLayout,onScroll};
}
function useClock(enabled:boolean,period:number){
 const [clock]=useState(()=>new Animated.Value(0));
 const [entryOpacity]=useState(()=>new Animated.Value(0));
 useEffect(()=>{
  clock.stopAnimation();entryOpacity.stopAnimation();entryOpacity.setValue(0);
  if(!enabled)return;
  // Restart behind a short native opacity transition rather than flashing a reset phase.
  clock.setValue(0);
  const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration:period,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
  const entry=Animated.timing(entryOpacity,{toValue:1,duration:180,easing:Easing.out(Easing.quad),useNativeDriver:true,isInteraction:false});
  loop.start();entry.start();
  return()=>{entry.stop();loop.stop();clock.stopAnimation();entryOpacity.stopAnimation();entryOpacity.setValue(0);};
 },[clock,entryOpacity,enabled,period]);
 return {clock,entryOpacity};
}
export const AnimatedProfileBorderGlows=memo(function AnimatedProfileBorderGlows({art,active,reduceMotion:requestedReduceMotion=false}:{art:CosmeticArt;active:boolean;reduceMotion?:boolean}){
 const {reduced:reduceMotion,running}=useCosmeticMotionPolicy(active,requestedReduceMotion);
 const [size,setSize]=useState({width:0,height:0});const enabled=active&&!reduceMotion&&size.width>0&&size.height>0;const {clock,entryOpacity}=useClock(running&&enabled,12000);
 const segments=useMemo(()=>profileSceneFrameSegments(size.width,size.height,16/9),[size.width,size.height]);
 const layers=useMemo(()=>!active||!size.width||!size.height?[]:art.glows.flatMap((g,index)=>{
  const pieces=segments.flatMap(p=>{const box=mapCosmeticSprite(p,g.sourceRect);return box?[{key:p.key,box}]:[];});
  if(!pieces.length)return [];
  // Composite only the sprite's clipped footprint, never a full card per glow.
  const left=Math.min(...pieces.map(p=>p.box.left)),top=Math.min(...pieces.map(p=>p.box.top));
  const right=Math.max(...pieces.map(p=>p.box.left+p.box.width)),bottom=Math.max(...pieces.map(p=>p.box.top+p.box.height));
  const opacity=reduceMotion?g.peakOpacity*.28:clock.interpolate({inputRange:steps,outputRange:steps.map(f=>cosmeticGlowOpacity(art.motionProfile,f,g.periodMs,g.phaseMs,g.peakOpacity,index>=12))});
  return [{g,index,opacity,pieces,left,top,width:right-left,height:bottom-top}];
 }),[active,reduceMotion,art,clock,segments,size.width,size.height]);
 if(!active)return null;
 return <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{zIndex:11,opacity:reduceMotion?1:entryOpacity}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {layers.map(({g,index,opacity,pieces,left,top,width,height})=><Animated.View key={index} style={{position:'absolute',left,top,width,height,opacity}}>{pieces.map(({key,box})=><View key={key} style={{position:'absolute',left:box.left-left,top:box.top-top,width:box.width,height:box.height,overflow:'hidden'}}><Image source={g.source} fadeDuration={0} resizeMode="stretch" style={{position:'absolute',left:box.imageLeft,top:box.imageTop,width:box.imageWidth,height:box.imageHeight}}/></View>)}</Animated.View>)}
 </Animated.View>;
});
export const ProfileCosmeticExteriorMatte=memo(function ProfileCosmeticExteriorMatte({source,color}:{source:ImageSourcePropType;color:string}){
 const [size,setSize]=useState({width:0,height:0});
 const segments=useMemo(()=>profileFrameSegments(size.width,size.height,16/9),[size.width,size.height]);
 return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
 {segments.map(p=><View key={p.key} style={{position:'absolute',left:p.x,top:p.y,width:p.width,height:p.height,overflow:'hidden'}}><Image source={source} fadeDuration={0} resizeMode="stretch" style={{position:'absolute',left:p.imageLeft,top:p.imageTop,width:p.imageWidth,height:p.imageHeight,tintColor:color}}/></View>)}
 </View>;
});
export const ProfileSceneEffect=memo(function ProfileSceneEffect({art,active,reduceMotion:requestedReduceMotion=false}:{art:CosmeticArt;active:boolean;reduceMotion?:boolean}){
 const {reduced:reduceMotion,running}=useCosmeticMotionPolicy(active,requestedReduceMotion);
 const [size,setSize]=useState({width:0,height:0});const enabled=active&&!reduceMotion&&size.width>0&&size.height>0;const {clock,entryOpacity}=useClock(running&&enabled,art.effectPeriodMs);
 const items=useMemo(()=>!enabled?[]:art.tracks.map((t,i)=>{
  const samples=steps.map(f=>sampleCosmeticTrack(t,f,size.width,size.height));
  const interp=(key:'x'|'y'|'opacity')=>clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p[key])});
  const rotation=clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p.rotation+'deg')});
  return {i,source:t.source,width:samples[0].width,height:samples[0].height,opacity:interp('opacity'),x:interp('x'),y:interp('y'),rotation};
 }),[enabled,art,clock,size.width,size.height]);
 if(!active||reduceMotion)return reduceMotion&&active?<View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden'}]}><Image source={art.staticEffect} fadeDuration={0} resizeMode="stretch" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%',opacity:.55}]}/></View>:null;
 if(!active)return null;
 return <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden',opacity:reduceMotion?1:entryOpacity}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
 {size.width>0&&size.height>0&&items.map(p=><Animated.Image key={p.i} source={p.source} fadeDuration={0} resizeMode="contain" style={{position:'absolute',left:0,top:0,width:p.width,height:p.height,opacity:p.opacity,transform:[{translateX:p.x},{translateY:p.y},{rotate:p.rotation}]}}/>)}
 </Animated.View>;
});

const ParticleShape=memo(function ParticleShape({kind,accent,soft,size}:{kind:ProfileParticleKind;accent:string;soft:string;size:number}){
 const bar={position:'absolute' as const,left:'46%' as const,top:'6%' as const,width:'8%' as const,height:'88%' as const,borderRadius:99,backgroundColor:accent};
 if(kind==='snowflake')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={bar}/><View style={[bar,{transform:[{rotate:'60deg'}]}]}/><View style={[bar,{transform:[{rotate:'120deg'}]}]}/><View style={{width:size*.22,height:size*.22,borderRadius:99,backgroundColor:'#FFFFFF'}}/></View>;
 if(kind==='leaf')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{width:size*.70,height:size*.42,borderTopLeftRadius:size*.5,borderBottomRightRadius:size*.5,borderTopRightRadius:size*.18,borderBottomLeftRadius:size*.18,backgroundColor:accent,transform:[{rotate:'-28deg'}]}}/><View style={{position:'absolute',width:size*.62,height:1.2,backgroundColor:soft,transform:[{rotate:'-28deg'}]}}/></View>;
 if(kind==='ember')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{width:size*.55,height:size*.55,borderRadius:size*.18,backgroundColor:accent,transform:[{rotate:'45deg'}]}}/><View style={{position:'absolute',bottom:0,width:size*.18,height:size*.42,borderRadius:99,backgroundColor:soft}}/></View>;
 if(kind==='firefly')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',width:size,height:size,borderRadius:99,backgroundColor:soft,opacity:.20}}/><View style={{width:size*.34,height:size*.34,borderRadius:99,backgroundColor:accent}}/></View>;
 return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',width:size*.78,height:size*.12,borderRadius:99,backgroundColor:soft}}/><View style={{position:'absolute',width:size*.12,height:size*.78,borderRadius:99,backgroundColor:soft}}/><View style={{width:size*.42,height:size*.42,backgroundColor:accent,transform:[{rotate:'45deg'}]}}/></View>;
});
export const ProceduralProfileBorderGlows=memo(function ProceduralProfileBorderGlows({runtime,active,reduceMotion:requestedReduceMotion=false}:{runtime:ProfileCosmeticRuntime;active:boolean;reduceMotion?:boolean}){
 const {reduced:reduceMotion,running}=useCosmeticMotionPolicy(active,requestedReduceMotion);
 const [size,setSize]=useState({width:0,height:0}),{clock,entryOpacity}=useClock(running&&size.width>0&&size.height>0,12000);
 const artworkAnchors=usesArtworkGlowAnchors(runtime.motionProfile);
 const glows=useMemo(()=>!active||!size.width||!size.height?[]:runtime.glows.map(g=>{
  const diameter=Math.min(g.size,Math.max(4,size.width*.035));
  return {g,opacity:reduceMotion?g.peakOpacity*.28:clock.interpolate({inputRange:steps,outputRange:steps.map(f=>cosmeticGlowOpacity(runtime.motionProfile,f,g.periodMs,g.phaseMs,g.peakOpacity))}),bounds:artworkAnchors?profileSceneArtworkGlowBounds(size.width,size.height,g.x,g.y,diameter):profileSceneGlowBounds(size.width,size.height,g.x,g.y,diameter)};
 }),[active,reduceMotion,clock,runtime,size.width,size.height,artworkAnchors]);
 const crystal=runtime.motionProfile==='gloamward'||runtime.motionProfile==='frostbound';
 if(!active)return null;
 return <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{zIndex:11,opacity:reduceMotion?1:entryOpacity}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {glows.map(({opacity,bounds},i)=>{if(!bounds)return null;const d=bounds.width;return <Animated.View key={i} style={{position:'absolute',left:bounds.x,top:bounds.y,width:d,height:d,borderRadius:99,opacity,backgroundColor:artworkAnchors?runtime.softAccent+'66':runtime.softAccent,alignItems:'center',justifyContent:'center'}}><View style={{width:d*.46,height:d*.46,borderRadius:crystal?1:99,backgroundColor:runtime.accent,transform:crystal?[{rotate:'45deg'}]:undefined}}/></Animated.View>})}
 </Animated.View>;
});
export const ProceduralProfileSceneEffect=memo(function ProceduralProfileSceneEffect({runtime,active,reduceMotion:requestedReduceMotion=false}:{runtime:ProfileCosmeticRuntime;active:boolean;reduceMotion?:boolean}){
 const {reduced:reduceMotion,running}=useCosmeticMotionPolicy(active,requestedReduceMotion);
 const [size,setSize]=useState({width:0,height:0}),enabled=active&&!reduceMotion&&size.width>0&&size.height>0,{clock,entryOpacity}=useClock(running&&enabled,runtime.effectPeriodMs);
 const staticItems=useMemo(()=>!active||!reduceMotion||!size.width||!size.height?[]:runtime.tracks.map((t,i)=>({i,t,p:sampleCosmeticTrack(t,.38,size.width,size.height)})),[active,reduceMotion,runtime,size.width,size.height]);
 const items=useMemo(()=>!enabled?[]:runtime.tracks.map((t,i)=>{const samples=steps.map(f=>sampleCosmeticTrack(t,f,size.width,size.height));const interp=(key:'x'|'y'|'opacity')=>clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p[key])});const rotation=clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p.rotation+'deg')});return {i,t,width:samples[0].width,opacity:interp('opacity'),x:interp('x'),y:interp('y'),rotation};}),[enabled,clock,runtime,size.width,size.height]);
 if(!active)return null;
 return <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden',opacity:reduceMotion?1:entryOpacity}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {staticItems.map(({i,t,p})=><View key={i} style={{position:'absolute',left:p.x,top:p.y,opacity:p.opacity*.55}}><ParticleShape kind={t.particle} accent={runtime.accent} soft={runtime.softAccent} size={p.width}/></View>)}
  {items.map(p=><Animated.View key={p.i} style={{position:'absolute',left:0,top:0,width:p.width,height:p.width,opacity:p.opacity,transform:[{translateX:p.x},{translateY:p.y},{rotate:p.rotation}]}}><ParticleShape kind={p.t.particle} accent={runtime.accent} soft={runtime.softAccent} size={p.width}/></Animated.View>)}
 </Animated.View>;
});
export const ProfileEffectThumbnail=memo(function ProfileEffectThumbnail({runtime,size=64}:{runtime:ProfileCosmeticRuntime;size?:number}){
 const [measured,setMeasured]=useState<{width:number;height:number}|null>(null);
 const width=measured?.width??size,height=measured?.height??size;
 const particles=useMemo(()=>runtime.tracks.slice(0,4).map((t,i)=>{
  const p=sampleCosmeticTrack(t,.32+i*.11,width,height),d=Math.min(width,height,Math.max(7,p.width));
  return {t,p,d,x:Math.max(0,Math.min(width-d,p.x+(p.width-d)/2)),y:Math.max(0,Math.min(height-d,p.y+(p.height-d)/2))};
 }),[runtime,width,height]);
 return <View pointerEvents="none" accessible={false} onLayout={({nativeEvent:{layout}})=>setMeasured(old=>old?.width===layout.width&&old?.height===layout.height?old:{width:layout.width,height:layout.height})} style={{width:'100%',height:'100%',overflow:'hidden',backgroundColor:'rgba(0,0,0,.12)'}}>{particles.map(({t,d,x,y},i)=><View key={i} style={{position:'absolute',left:x,top:y,opacity:.7}}><ParticleShape kind={t.particle} accent={runtime.accent} soft={runtime.softAccent} size={d}/></View>)}</View>;
});

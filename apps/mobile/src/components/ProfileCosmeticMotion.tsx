import {memo,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Animated,AppState,Easing,Image,StyleSheet,View,type ImageSourcePropType,type LayoutChangeEvent,type NativeScrollEvent,type NativeSyntheticEvent} from 'react-native';
import {profileFrameSegments,profileSceneFrameSegments,profileSceneGlowBounds} from '../core/profile-frame-layout';
import {sampleCosmeticTrack,cosmeticGlowOpacity,cosmeticViewportVisible,MOTION_STEPS as steps} from '../core/profile-cosmetic-motion-v2';
import type {CosmeticArt} from '../theme/profile-cosmetic-art-v1';
import type {ProfileCosmeticRuntime,ProfileParticleKind} from '../theme/profile-cosmetic-runtime-v1';
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
 const [foreground,setForeground]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
 useEffect(()=>{if(!enabled)return;setForeground(AppState.currentState!=='background'&&AppState.currentState!=='inactive');const sub=AppState.addEventListener('change',s=>setForeground(s==='active'));return ()=>sub.remove()},[enabled]);
 useEffect(()=>{clock.stopAnimation();if(!enabled||!foreground||AppState.currentState==='background'||AppState.currentState==='inactive')return;clock.setValue(0);
 const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration:period,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));loop.start();return()=>{loop.stop();clock.stopAnimation();};},[clock,enabled,foreground,period]);
 return clock;
}
export function AnimatedProfileBorderGlows({art,active,reduceMotion=false}:{art:CosmeticArt;active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0});const enabled=active&&!reduceMotion&&size.width>0&&size.height>0;const clock=useClock(enabled,12000);
 const segments=useMemo(()=>profileSceneFrameSegments(size.width,size.height,16/9),[size.width,size.height]);
 const layers=useMemo(()=>!active||!size.width||!size.height?[]:art.glows.map((g,index)=>({g,opacity:reduceMotion?g.peakOpacity*.28:clock.interpolate({inputRange:steps,outputRange:steps.map(f=>cosmeticGlowOpacity(art.motionProfile,f,g.periodMs,g.phaseMs,g.peakOpacity,index>=12))}),pieces:segments.map(p=>({key:p.key,box:mapCosmeticSprite(p,g.sourceRect)})).filter(p=>p.box!==null)})),[active,reduceMotion,art,clock,segments,size.width,size.height]);
 if(!active)return null;
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{zIndex:11}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {layers.map(({g,opacity,pieces},i)=><Animated.View key={i} style={[StyleSheet.absoluteFill,{opacity}]}>{pieces.map(({key,box})=>box&&<View key={key} style={{position:'absolute',left:box.left,top:box.top,width:box.width,height:box.height,overflow:'hidden'}}><Image source={g.source} fadeDuration={0} resizeMode="stretch" style={{position:'absolute',left:box.imageLeft,top:box.imageTop,width:box.imageWidth,height:box.imageHeight}}/></View>)}</Animated.View>)}
 </View>;
}
export function ProfileCosmeticExteriorMatte({source,color}:{source:ImageSourcePropType;color:string}){
 const [size,setSize]=useState({width:0,height:0});
 const segments=useMemo(()=>profileFrameSegments(size.width,size.height,16/9),[size.width,size.height]);
 return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
 {segments.map(p=><View key={p.key} style={{position:'absolute',left:p.x,top:p.y,width:p.width,height:p.height,overflow:'hidden'}}><Image source={source} fadeDuration={0} resizeMode="stretch" style={{position:'absolute',left:p.imageLeft,top:p.imageTop,width:p.imageWidth,height:p.imageHeight,tintColor:color}}/></View>)}
 </View>;
}
export function ProfileSceneEffect({art,active,reduceMotion=false}:{art:CosmeticArt;active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0});const enabled=active&&!reduceMotion&&size.width>0&&size.height>0;const clock=useClock(enabled,art.effectPeriodMs);
 const items=useMemo(()=>!enabled?[]:art.tracks.map((t,i)=>{
  const samples=steps.map(f=>sampleCosmeticTrack(t,f,size.width,size.height));
  const interp=(key:'x'|'y'|'opacity')=>clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p[key])});
  const rotation=clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p.rotation+'deg')});
  return {i,source:t.source,width:samples[0].width,height:samples[0].height,opacity:interp('opacity'),x:interp('x'),y:interp('y'),rotation};
 }),[enabled,art,clock,size.width,size.height]);
 if(!active||reduceMotion)return reduceMotion&&active?<View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden'}]}><Image source={art.staticEffect} fadeDuration={0} resizeMode="stretch" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%',opacity:.55}]}/></View>:null;
 if(!active)return null;
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden'}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
 {size.width>0&&size.height>0&&items.map(p=><Animated.Image key={p.i} source={p.source} fadeDuration={0} resizeMode="contain" style={{position:'absolute',left:0,top:0,width:p.width,height:p.height,opacity:p.opacity,transform:[{translateX:p.x},{translateY:p.y},{rotate:p.rotation}]}}/>)}
 </View>;
}

const ParticleShape=memo(function ParticleShape({kind,accent,soft,size}:{kind:ProfileParticleKind;accent:string;soft:string;size:number}){
 const bar={position:'absolute' as const,left:'46%' as const,top:'6%' as const,width:'8%' as const,height:'88%' as const,borderRadius:99,backgroundColor:accent};
 if(kind==='snowflake')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={bar}/><View style={[bar,{transform:[{rotate:'60deg'}]}]}/><View style={[bar,{transform:[{rotate:'120deg'}]}]}/><View style={{width:size*.22,height:size*.22,borderRadius:99,backgroundColor:'#FFFFFF'}}/></View>;
 if(kind==='leaf')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{width:size*.70,height:size*.42,borderTopLeftRadius:size*.5,borderBottomRightRadius:size*.5,borderTopRightRadius:size*.18,borderBottomLeftRadius:size*.18,backgroundColor:accent,transform:[{rotate:'-28deg'}]}}/><View style={{position:'absolute',width:size*.62,height:1.2,backgroundColor:soft,transform:[{rotate:'-28deg'}]}}/></View>;
 if(kind==='ember')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{width:size*.55,height:size*.55,borderRadius:size*.18,backgroundColor:accent,transform:[{rotate:'45deg'}]}}/><View style={{position:'absolute',bottom:0,width:size*.18,height:size*.42,borderRadius:99,backgroundColor:soft}}/></View>;
 if(kind==='firefly')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',width:size,height:size,borderRadius:99,backgroundColor:soft,opacity:.20}}/><View style={{width:size*.34,height:size*.34,borderRadius:99,backgroundColor:accent}}/></View>;
 return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',width:size*.78,height:size*.12,borderRadius:99,backgroundColor:soft}}/><View style={{position:'absolute',width:size*.12,height:size*.78,borderRadius:99,backgroundColor:soft}}/><View style={{width:size*.42,height:size*.42,backgroundColor:accent,transform:[{rotate:'45deg'}]}}/></View>;
});
export function ProceduralProfileBorderGlows({runtime,active,reduceMotion=false}:{runtime:ProfileCosmeticRuntime;active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0}),clock=useClock(active&&!reduceMotion&&size.width>0&&size.height>0,12000);
 const glows=useMemo(()=>!active||!size.width||!size.height?[]:runtime.glows.map(g=>({g,opacity:reduceMotion?g.peakOpacity*.28:clock.interpolate({inputRange:steps,outputRange:steps.map(f=>cosmeticGlowOpacity(runtime.motionProfile,f,g.periodMs,g.phaseMs,g.peakOpacity))}),bounds:profileSceneGlowBounds(size.width,size.height,g.x,g.y,Math.min(g.size,Math.max(4,size.width*.035)))})),[active,reduceMotion,clock,runtime,size.width,size.height]);
 if(!active)return null;
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{zIndex:11}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {glows.map(({opacity,bounds},i)=>{if(!bounds)return null;const d=bounds.width;return <Animated.View key={i} style={{position:'absolute',left:bounds.x,top:bounds.y,width:d,height:d,borderRadius:99,opacity,backgroundColor:runtime.softAccent,alignItems:'center',justifyContent:'center'}}><View style={{width:d*.46,height:d*.46,borderRadius:99,backgroundColor:runtime.accent}}/></Animated.View>})}
 </View>;
}
export function ProceduralProfileSceneEffect({runtime,active,reduceMotion=false}:{runtime:ProfileCosmeticRuntime;active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0}),enabled=active&&!reduceMotion&&size.width>0&&size.height>0,clock=useClock(enabled,runtime.effectPeriodMs);
 const staticItems=useMemo(()=>!active||!reduceMotion||!size.width||!size.height?[]:runtime.tracks.map((t,i)=>({i,t,p:sampleCosmeticTrack(t,.38,size.width,size.height)})),[active,reduceMotion,runtime,size.width,size.height]);
 const items=useMemo(()=>!enabled?[]:runtime.tracks.map((t,i)=>{const samples=steps.map(f=>sampleCosmeticTrack(t,f,size.width,size.height));const interp=(key:'x'|'y'|'opacity')=>clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p[key])});const rotation=clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p.rotation+'deg')});return {i,t,width:samples[0].width,opacity:interp('opacity'),x:interp('x'),y:interp('y'),rotation};}),[enabled,clock,runtime,size.width,size.height]);
 if(!active)return null;
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden'}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {staticItems.map(({i,t,p})=><View key={i} style={{position:'absolute',left:p.x,top:p.y,opacity:p.opacity*.55}}><ParticleShape kind={t.particle} accent={runtime.accent} soft={runtime.softAccent} size={p.width}/></View>)}
  {items.map(p=><Animated.View key={p.i} style={{position:'absolute',left:0,top:0,width:p.width,height:p.width,opacity:p.opacity,transform:[{translateX:p.x},{translateY:p.y},{rotate:p.rotation}]}}><ParticleShape kind={p.t.particle} accent={runtime.accent} soft={runtime.softAccent} size={p.width}/></Animated.View>)}
 </View>;
}
export function ProfileEffectThumbnail({runtime,size=64}:{runtime:ProfileCosmeticRuntime;size?:number}){
 const sample=runtime.tracks.slice(0,4);
 return <View style={{width:'100%',height:'100%',overflow:'hidden',backgroundColor:'rgba(0,0,0,.12)'}}>{sample.map((t,i)=>{const p=sampleCosmeticTrack(t,.32+i*.11,size,size);return <View key={i} style={{position:'absolute',left:p.x,top:p.y,opacity:.7}}><ParticleShape kind={t.particle} accent={runtime.accent} soft={runtime.softAccent} size={Math.max(7,p.width)}/></View>})}</View>;
}

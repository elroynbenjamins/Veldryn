import {useEffect,useMemo,useRef,useState} from 'react';
import {Animated,AppState,Easing,Image,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {profileFrameSegments,profileSceneFrameSegments} from '../core/profile-frame-layout';
import {sampleCosmeticTrack,cosmeticGlowOpacity,MOTION_STEPS as steps} from '../core/profile-cosmetic-motion-v2';
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
function useClock(enabled:boolean,period:number){
 const clock=useRef(new Animated.Value(0)).current;
 const [foreground,setForeground]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>setForeground(s==='active'));return ()=>sub.remove()},[]);
 useEffect(()=>{clock.stopAnimation();clock.setValue(0);if(!enabled||!foreground)return;
 const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration:period,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));loop.start();return()=>{loop.stop();clock.stopAnimation();};},[clock,enabled,foreground,period]);
 return clock;
}
export function AnimatedProfileBorderGlows({art,active,reduceMotion=false}:{art:CosmeticArt;active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0});const enabled=active&&!reduceMotion;const clock=useClock(enabled,12000);
 const segments=useMemo(()=>profileSceneFrameSegments(size.width,size.height,16/9),[size.width,size.height]);
 const layers=useMemo(()=>art.glows.map((g,index)=>({g,opacity:clock.interpolate({inputRange:steps,outputRange:steps.map(f=>cosmeticGlowOpacity(art.motionProfile,f,g.periodMs,g.phaseMs,g.peakOpacity,index>=12))}),pieces:segments.map(p=>({key:p.key,box:mapCosmeticSprite(p,g.sourceRect)})).filter(p=>p.box!==null)})),[art,clock,segments]);
 if(!enabled)return null;
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
 const [size,setSize]=useState({width:0,height:0});const enabled=active&&!reduceMotion;const clock=useClock(enabled,art.effectPeriodMs);
 const items=useMemo(()=>art.tracks.map((t,i)=>{
  const samples=steps.map(f=>sampleCosmeticTrack(t,f,size.width,size.height));
  const interp=(key:'x'|'y'|'opacity')=>clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p[key])});
  const rotation=clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p.rotation+'deg')});
  return {i,source:t.source,width:samples[0].width,height:samples[0].height,opacity:interp('opacity'),x:interp('x'),y:interp('y'),rotation};
 }),[art,clock,size.width,size.height]);
 if(!enabled)return reduceMotion&&active?<View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden'}]}><Image source={art.staticEffect} fadeDuration={0} resizeMode="stretch" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%',opacity:.55}]}/></View>:null;
 if(!active)return null;
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden'}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
 {size.width>0&&size.height>0&&items.map(p=><Animated.Image key={p.i} source={p.source} fadeDuration={0} resizeMode="contain" style={{position:'absolute',left:0,top:0,width:p.width,height:p.height,opacity:p.opacity,transform:[{translateX:p.x},{translateY:p.y},{rotate:p.rotation}]}}/>)}
 </View>;
}

function ParticleShape({kind,accent,soft,size}:{kind:ProfileParticleKind;accent:string;soft:string;size:number}){
 const bar={position:'absolute' as const,left:'46%' as const,top:'6%' as const,width:'8%' as const,height:'88%' as const,borderRadius:99,backgroundColor:accent};
 if(kind==='snowflake')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={bar}/><View style={[bar,{transform:[{rotate:'60deg'}]}]}/><View style={[bar,{transform:[{rotate:'120deg'}]}]}/><View style={{width:size*.22,height:size*.22,borderRadius:99,backgroundColor:'#FFFFFF'}}/></View>;
 if(kind==='leaf')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{width:size*.70,height:size*.42,borderTopLeftRadius:size*.5,borderBottomRightRadius:size*.5,borderTopRightRadius:size*.18,borderBottomLeftRadius:size*.18,backgroundColor:accent,transform:[{rotate:'-28deg'}]}}/><View style={{position:'absolute',width:size*.62,height:1.2,backgroundColor:soft,transform:[{rotate:'-28deg'}]}}/></View>;
 if(kind==='ember')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{width:size*.55,height:size*.55,borderRadius:size*.18,backgroundColor:accent,transform:[{rotate:'45deg'}]}}/><View style={{position:'absolute',bottom:0,width:size*.18,height:size*.42,borderRadius:99,backgroundColor:soft}}/></View>;
 if(kind==='firefly')return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',width:size,height:size,borderRadius:99,backgroundColor:soft,opacity:.20}}/><View style={{width:size*.34,height:size*.34,borderRadius:99,backgroundColor:accent}}/></View>;
 return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}><View style={{position:'absolute',width:size*.78,height:size*.12,borderRadius:99,backgroundColor:soft}}/><View style={{position:'absolute',width:size*.12,height:size*.78,borderRadius:99,backgroundColor:soft}}/><View style={{width:size*.42,height:size*.42,backgroundColor:accent,transform:[{rotate:'45deg'}]}}/></View>;
}
export function ProceduralProfileBorderGlows({runtime,active,reduceMotion=false}:{runtime:ProfileCosmeticRuntime;active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0}),clock=useClock(active&&!reduceMotion,12000);
 if(!active)return null;
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{zIndex:11}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {size.width>0&&runtime.glows.map((g,i)=>{const opacity=reduceMotion?g.peakOpacity*.28:clock.interpolate({inputRange:steps,outputRange:steps.map(f=>cosmeticGlowOpacity(runtime.motionProfile,f,g.periodMs,g.phaseMs,g.peakOpacity))});const d=Math.min(g.size,Math.max(4,size.width*.035));return <Animated.View key={i} style={{position:'absolute',left:g.x*size.width-d/2,top:g.y*size.height-d/2,width:d,height:d,borderRadius:99,opacity,backgroundColor:runtime.softAccent,alignItems:'center',justifyContent:'center'}}><View style={{width:d*.46,height:d*.46,borderRadius:99,backgroundColor:runtime.accent}}/></Animated.View>})}
 </View>;
}
export function ProceduralProfileSceneEffect({runtime,active,reduceMotion=false}:{runtime:ProfileCosmeticRuntime;active:boolean;reduceMotion?:boolean}){
 const [size,setSize]=useState({width:0,height:0}),enabled=active&&!reduceMotion,clock=useClock(enabled,runtime.effectPeriodMs);
 const items=useMemo(()=>runtime.tracks.map((t,i)=>{const samples=steps.map(f=>sampleCosmeticTrack(t,f,size.width,size.height));const interp=(key:'x'|'y'|'opacity')=>clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p[key])});const rotation=clock.interpolate({inputRange:steps,outputRange:samples.map(p=>p.rotation+'deg')});return {i,t,width:samples[0].width,opacity:interp('opacity'),x:interp('x'),y:interp('y'),rotation,staticSample:samples[Math.floor(samples.length*.38)]};}),[clock,runtime,size.width,size.height]);
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden'}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
  {size.width>0&&items.map(p=>reduceMotion?<View key={p.i} style={{position:'absolute',left:p.staticSample.x,top:p.staticSample.y,opacity:p.staticSample.opacity*.55}}><ParticleShape kind={p.t.particle} accent={runtime.accent} soft={runtime.softAccent} size={p.width}/></View>:enabled?<Animated.View key={p.i} style={{position:'absolute',left:0,top:0,width:p.width,height:p.width,opacity:p.opacity,transform:[{translateX:p.x},{translateY:p.y},{rotate:p.rotation}]}}><ParticleShape kind={p.t.particle} accent={runtime.accent} soft={runtime.softAccent} size={p.width}/></Animated.View>:null)}
 </View>;
}
export function ProfileEffectThumbnail({runtime,size=64}:{runtime:ProfileCosmeticRuntime;size?:number}){
 const sample=runtime.tracks.slice(0,4);
 return <View style={{width:'100%',height:'100%',overflow:'hidden',backgroundColor:'rgba(0,0,0,.12)'}}>{sample.map((t,i)=>{const p=sampleCosmeticTrack(t,.32+i*.11,size,size);return <View key={i} style={{position:'absolute',left:p.x,top:p.y,opacity:.7}}><ParticleShape kind={t.particle} accent={runtime.accent} soft={runtime.softAccent} size={Math.max(7,p.width)}/></View>})}</View>;
}

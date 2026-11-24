import {useEffect,useMemo,useRef,useState} from 'react';
import {Animated,AppState,Easing,Image,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {profileFrameSegments,profileSceneFrameSegments} from '../core/profile-frame-layout';
import {sampleCosmeticTrack,cosmeticGlowOpacity,MOTION_STEPS as steps} from '../core/profile-cosmetic-motion-v2';
import type {CosmeticArt} from '../theme/profile-cosmetic-art-v1';
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
 return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{overflow:'hidden'}]} onLayout={({nativeEvent:{layout}})=>setSize(old=>old.width===layout.width&&old.height===layout.height?old:{width:layout.width,height:layout.height})}>
 {size.width>0&&size.height>0&&items.map(p=><Animated.Image key={p.i} source={p.source} fadeDuration={0} resizeMode="contain" style={{position:'absolute',left:0,top:0,width:p.width,height:p.height,opacity:p.opacity,transform:[{translateX:p.x},{translateY:p.y},{rotate:p.rotation}]}}/>)}
 </View>;
}

import type {ReactNode} from 'react';
import {Animated,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {FX_POINTS,RAIL_PATH,LOOP_PHASE,ORBIT_X,ORBIT_Y,SIGNATURE_PHASE,SIGNATURE_ENERGY,shiftClosed,PET_IDLE_PHASE,PET_IDLE_POSES,type PetIdleKind} from '../../core/ultra-luxe-motion';
const GLOW=require('../../../assets/ascendant/shared/soft_glow.webp') as ImageSourcePropType;
const HAZE=require('../../../assets/ascendant/shared/drifting_haze.webp') as ImageSourcePropType;
const light=(theme:'celestial'|'draconic')=>theme==='celestial'?'#ffdf9b':'#ff6928';
type Clock=Animated.Value;
type Common={clock:Clock;scale:number;theme:'celestial'|'draconic';particle:ImageSourcePropType};
const pos=(k:number,x:number,y:number,w:number,h:number)=>({position:'absolute' as const,left:x*k,top:y*k,width:w*k,height:h*k});
export function signatureEnergy(clock:Clock){return clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[...SIGNATURE_ENERGY]});}
/** Reuse the scene clock: no JS frame updates or independent pet timers. */
export function petIdleMotion(clock:Clock,k:number,kind:PetIdleKind){
 const frames=PET_IDLE_POSES[kind], inputRange=PET_IDLE_PHASE;
 const channel=(key:'lift'|'scaleX'|'scaleY'|'glow',factor=1)=>clock.interpolate({inputRange,outputRange:frames.map(p=>p[key]*factor)});
 return {lift:channel('lift',k),scaleX:channel('scaleX'),scaleY:channel('scaleY'),glow:channel('glow'),
 tilt:clock.interpolate({inputRange,outputRange:frames.map(p=>p.tilt+'deg')})};
}
function pulse(clock:Clock,index:number){
 return clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed([.25,.65,.35,.9,.3,.65,.25,.45,.25],index)});
}
function Decorative({children}:{children:ReactNode}){
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>{children}</View>;
}
/** Environment is mounted behind the identity plates, in all pet modes. */
export function UltraLuxeEnvironment({clock,scale:k,theme,particle}:Common){
 const celestial=theme==='celestial',energy=signatureEnergy(clock);
 const swell=clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[.85,.85,1.2,1.5,1.12,.85]});
 const drift=clock.interpolate({inputRange:[0,.5,1],outputRange:[-5*k,5*k,-5*k]});
 const glow=clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[.12,.12,.33,.65,.25,.12]});
 return <Decorative>
  {celestial?<CelestialAlignmentLines clock={clock} scale={k}/>:<DraconicHeatChannels clock={clock} scale={k}/>}
  <Animated.Image source={HAZE} resizeMode="stretch" style={[pos(k,112,9,118,75),{tintColor:celestial?'#a9b8ff':'#a95c48',opacity:glow,transform:[{scale:swell},{translateX:drift}]}]}/>
  <Animated.Image source={HAZE} resizeMode="stretch" style={[pos(k,237,46,77,112),{tintColor:light(theme),opacity:Animated.multiply(energy,.65),transform:[{scale:swell}]}]}/>
  {FX_POINTS[theme].map(([x,y],i)=>{
   const size=i%3===0?9:6;
   const dy=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed(celestial?[0,-3,-5,-2,1,3,4,2,0]:[0,-8,-15,-22,-29,-22,-13,-6,0],i).map(v=>v*k)});
   const dx=clock.interpolate({inputRange:[0,.25,.5,.75,1],outputRange:[0,(i%2?4:-4)*k,(i%2?8:-8)*k,2*k,0]});
   return <Animated.Image key={i} source={particle} resizeMode="contain" style={[pos(k,x,y,size,size),{opacity:pulse(clock,i),transform:[{translateX:dx},{translateY:dy}]}]}/>;
  })}
  <Animated.Image source={GLOW} resizeMode="stretch" style={[pos(k,142,24,56,42),{tintColor:light(theme),opacity:Animated.multiply(energy,.95),transform:[{scale:swell}]}]}/>
 </Decorative>;
}
/** Fine constellation links illuminate during alignment, always behind identity. */
function CelestialAlignmentLines({clock,scale:k}:{clock:Clock;scale:number}){
 const energy=signatureEnergy(clock);
 const points=[[42,44],[79,27],[104,51],[128,32],[233,35],[278,30],[302,55]];
 return <>{[[0,1],[1,2],[2,3],[4,5],[5,6]].map(([a,b],i)=>{
  const [x,y]=points[a],[u,v]=points[b],length=Math.hypot(u-x,v-y),angle=Math.atan2(v-y,u-x)*180/Math.PI;
  return <Animated.View key={i} style={[pos(k,(x+u-length)/2,(y+v)/2,length,1),{backgroundColor:'#f8dca0',opacity:Animated.multiply(energy,.72),transform:[{rotate:angle+'deg'}]}]}/>;
 })}</>;
}
/** Narrow molten streaks and a rising heat plume in the open right-side scenery.
 * Layered authored ember/glow art supplies the texture; these are light channels, not smoke simulation. */
function DraconicHeatChannels({clock,scale:k}:{clock:Clock;scale:number}){
 const energy=signatureEnergy(clock);
 const lift=clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[0,0,-7*k,-23*k,-9*k,0]});
 return <>{[[227,174,29,-50],[261,177,31,-68],[292,169,27,-58]].map(([x,y,w,angle],i)=>
  <Animated.Image key={i} source={GLOW} resizeMode="stretch" style={[pos(k,x,y,w,6),{tintColor:'#ff782c',opacity:Animated.multiply(energy,.9),transform:[{translateY:lift},{rotate:angle+'deg'},{scaleX:clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[.65,.65,.95,1.3,.8,.65]})}]}]}/>
 )}</>;
}

/** Closed perimeter paths and crest illumination, not over the readable identity area. */
export function UltraLuxeRail({clock,scale:k,theme,particle}:Common){
 const energy=signatureEnergy(clock);
 return <Decorative>
  {[0,4].map(offset=>{
   const path=shiftClosed(RAIL_PATH,offset);
   const x=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:path.map(p=>p[0]*k)});
   const y=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:path.map(p=>p[1]*k)});
   return <View key={offset} style={StyleSheet.absoluteFill}><Animated.Image source={GLOW} resizeMode="stretch" style={[pos(k,-15,-15,30,30),{tintColor:light(theme),opacity:Animated.multiply(pulse(clock,offset),.85),transform:[{translateX:x},{translateY:y}]}]}/><Animated.Image source={particle} resizeMode="contain" style={[pos(k,-6,-6,12,12),{opacity:pulse(clock,offset),transform:[{translateX:x},{translateY:y}]}]}/></View>;
  })}
  <Animated.Image source={GLOW} resizeMode="stretch" style={[pos(k,147,2,46,25),{tintColor:light(theme),opacity:Animated.multiply(energy,.95),transform:[{scale:clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[.8,.8,1,1.35,1,.8]})}]}]}/>
  {[[10,90],[320,90],[165,184]].map(([x,y],i)=><Animated.Image key={i} source={particle} resizeMode="contain" style={[pos(k,x,y,12,12),{opacity:Animated.multiply(energy,.75)}]}/>)}
 </Decorative>;
}
/** Matching pet only, synchronized with the same native clock. */
export function UltraLuxePetAura({clock,scale:k,theme,particle}:Common){
 const celestial=theme==='celestial',cx=celestial?279:266,cy=147,rx=celestial?27:33,ry=celestial?8:6;
 const energy=signatureEnergy(clock);
 return <Decorative>
  <Animated.Image source={GLOW} resizeMode="stretch" style={[pos(k,cx-34,112,68,36),{tintColor:light(theme),opacity:Animated.multiply(energy,.65)}]}/>
  {[0,4].map(offset=>{
   const x=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed(ORBIT_X,offset).map(v=>v*rx*k)});
   const y=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed(ORBIT_Y,offset).map(v=>v*ry*k)});
   const opacity=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed([.75,.36,.2,.36,.75,1,1,1,.75],offset)});
   return <Animated.Image key={offset} source={particle} resizeMode="contain" style={[pos(k,cx-4,cy-4,8,8),{opacity,transform:[{translateX:x},{translateY:y}]}]}/>;
  })}
 </Decorative>;
}

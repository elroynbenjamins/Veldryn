import type {ReactNode} from 'react';
import {Animated,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {FX_POINTS,RAIL_PATH,LOOP_PHASE,ORBIT_X,ORBIT_Y,SIGNATURE_PHASE,SIGNATURE_ENERGY,shiftClosed} from '../../core/ultra-luxe-motion';
type Clock=Animated.Value;
type Common={clock:Clock;scale:number;theme:'celestial'|'draconic';particle:ImageSourcePropType;halo:ImageSourcePropType};
const pos=(k:number,x:number,y:number,w:number,h:number)=>({position:'absolute' as const,left:x*k,top:y*k,width:w*k,height:h*k});
export function signatureEnergy(clock:Clock){return clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[...SIGNATURE_ENERGY]});}
function pulse(clock:Clock,index:number){
 return clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed([.25,.65,.35,.9,.3,.65,.25,.45,.25],index)});
}
function Decorative({children}:{children:ReactNode}){
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>{children}</View>;
}
/** Environment is mounted behind the identity plates, in all pet modes. */
export function UltraLuxeEnvironment({clock,scale:k,theme,particle,halo}:Common){
 const celestial=theme==='celestial',energy=signatureEnergy(clock);
 const swell=clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[.85,.85,1.2,1.5,1.12,.85]});
 const drift=clock.interpolate({inputRange:[0,.5,1],outputRange:[-5*k,5*k,-5*k]});
 const glow=clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[.12,.12,.33,.65,.25,.12]});
 return <Decorative>
  <Animated.Image source={halo} resizeMode="contain" style={[pos(k,112,9,118,75),{opacity:glow,transform:[{scale:swell},{translateX:drift}]}]}/>
  <Animated.Image source={halo} resizeMode="contain" style={[pos(k,237,46,77,112),{opacity:Animated.multiply(energy,.5),transform:[{scale:swell}]}]}/>
  {FX_POINTS[theme].map(([x,y],i)=>{
   const size=i%3===0?9:6;
   const dy=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed(celestial?[0,-3,-5,-2,1,3,4,2,0]:[0,-8,-15,-22,-29,-22,-13,-6,0],i).map(v=>v*k)});
   const dx=clock.interpolate({inputRange:[0,.25,.5,.75,1],outputRange:[0,(i%2?4:-4)*k,(i%2?8:-8)*k,2*k,0]});
   return <Animated.Image key={i} source={particle} resizeMode="contain" style={[pos(k,x,y,size,size),{opacity:pulse(clock,i),transform:[{translateX:dx},{translateY:dy}]}]}/>;
  })}
  <Animated.Image source={halo} resizeMode="contain" style={[pos(k,142,24,56,42),{opacity:Animated.multiply(energy,.82),transform:[{scale:swell}]}]}/>
 </Decorative>;
}
/** Closed perimeter paths and crest illumination, not over the readable identity area. */
export function UltraLuxeRail({clock,scale:k,particle,halo}:Common){
 const energy=signatureEnergy(clock);
 return <Decorative>
  {[0,4].map(offset=>{
   const path=shiftClosed(RAIL_PATH,offset);
   const x=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:path.map(p=>p[0]*k)});
   const y=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:path.map(p=>p[1]*k)});
   return <Animated.Image key={offset} source={particle} resizeMode="contain" style={[pos(k,-6,-6,12,12),{opacity:pulse(clock,offset),transform:[{translateX:x},{translateY:y}]}]}/>;
  })}
  <Animated.Image source={halo} resizeMode="contain" style={[pos(k,147,2,46,25),{opacity:Animated.multiply(energy,.85),transform:[{scale:clock.interpolate({inputRange:[...SIGNATURE_PHASE],outputRange:[.8,.8,1,1.35,1,.8]})}]}]}/>
  {[[10,90],[320,90],[165,184]].map(([x,y],i)=><Animated.Image key={i} source={particle} resizeMode="contain" style={[pos(k,x,y,12,12),{opacity:Animated.multiply(energy,.75)}]}/>)}
 </Decorative>;
}
/** Matching pet only, synchronized with the same native clock. */
export function UltraLuxePetAura({clock,scale:k,theme,particle,halo}:Common){
 const celestial=theme==='celestial',cx=celestial?279:266,cy=147,rx=celestial?27:33,ry=celestial?8:6;
 const energy=signatureEnergy(clock);
 return <Decorative>
  <Animated.Image source={halo} resizeMode="contain" style={[pos(k,cx-34,76,68,64),{opacity:Animated.multiply(energy,.68)}]}/>
  {[0,4].map(offset=>{
   const x=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed(ORBIT_X,offset).map(v=>v*rx*k)});
   const y=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed(ORBIT_Y,offset).map(v=>v*ry*k)});
   const opacity=clock.interpolate({inputRange:[...LOOP_PHASE],outputRange:shiftClosed([.75,.36,.2,.36,.75,1,1,1,.75],offset)});
   return <Animated.Image key={offset} source={particle} resizeMode="contain" style={[pos(k,cx-4,cy-4,8,8),{opacity,transform:[{translateX:x},{translateY:y}]}]}/>;
  })}
 </Decorative>;
}

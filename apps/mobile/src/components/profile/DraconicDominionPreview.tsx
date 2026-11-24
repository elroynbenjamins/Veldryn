import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,StyleSheet,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
import {DRACONIC_BOXES as B,DRACONIC_STAGE as S,draconicPetMode,draconicStageSupported} from '../../core/draconic-showcase-layout';

export type DraconicSceneAssets={
 background:ImageSourcePropType;border:ImageSourcePropType;dragon:ImageSourcePropType;flames:ImageSourcePropType;ember:ImageSourcePropType;fallbackGlow:ImageSourcePropType;
};
type Props={assets:DraconicSceneAssets;equippedPetId?:string|null;alternatePetSource?:ImageSourcePropType;petAccessibilityLabel?:string;portrait:ReactNode;identity:ReactNode;badges?:ReactNode;guild?:ReactNode;fallback:ReactNode;active?:boolean;reduceMotion?:boolean};

function useEmberClock(active:boolean,reduceMotion:boolean){
 const clock=useRef(new Animated.Value(0)).current;
 const [foreground,setForeground]=useState(AppState.currentState==='active');
 const [systemReduced,setSystemReduced]=useState(true);
 useEffect(()=>{let live=true,changed=false;
  const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',v=>{changed=true;if(live)setSystemReduced(v);});
  AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live&&!changed)setSystemReduced(v);}).catch(()=>{});
  const app=AppState.addEventListener('change',v=>setForeground(v==='active'));
  return()=>{live=false;motion.remove();app.remove();};
 },[]);
 useEffect(()=>{
  clock.stopAnimation();clock.setValue(0);
  if(!active||reduceMotion||systemReduced||!foreground)return;
  const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration:20000,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
  loop.start();return()=>{loop.stop();clock.stopAnimation();};
 },[active,reduceMotion,systemReduced,foreground,clock]);
 return clock;
}
export function DraconicDominionPreview({assets,equippedPetId,alternatePetSource,petAccessibilityLabel,portrait,identity,badges,guild,fallback,active=false,reduceMotion=false}:Props){
 const [width,setWidth]=useState(0),{fontScale}=useWindowDimensions();
 const supported=draconicStageSupported(width,fontScale),clock=useEmberClock(active&&supported,reduceMotion);
 const k=width/S.width;
 const pos=(x:number,y:number,w:number,h:number)=>({position:'absolute' as const,left:x*k,top:y*k,width:w*k,height:h*k});
 const box=(b:{x:number;y:number;w:number;h:number})=>pos(b.x,b.y,b.w,b.h);
 const mode=draconicPetMode(equippedPetId,!!alternatePetSource);
 const pulse=clock.interpolate({inputRange:[0,.68,.8,.86,.94,1],outputRange:[0,0,.85,1,.4,0]});
 const flicker=clock.interpolate({inputRange:[0,.2,.4,.6,.8,1],outputRange:[.2,.65,.35,.8,.4,.2]});
 const rise=clock.interpolate({inputRange:[0,.5,1],outputRange:[0,-16*k,0]});
 const float=clock.interpolate({inputRange:[0,.25,.5,.75,1],outputRange:[0,-3*k,0,-3*k,0]});
 const ringGlow=clock.interpolate({inputRange:[0,.68,.86,1],outputRange:[.72,.72,1,.72]});
 const sweep=clock.interpolate({inputRange:[0,.5,1],outputRange:[0,260*k,0]});
 return <View style={s.outer} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
 {!supported?fallback:<View style={[s.card,{height:S.height*k}]}>
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
   <Image source={assets.background} resizeMode="cover" style={s.fill}/>
   <Animated.View style={[s.heat,{opacity:Animated.multiply(pulse,.18)}]}/>
   {[{x:33,y:112},{x:75,y:146},{x:134,y:63},{x:149,y:119},{x:291,y:55},{x:305,y:146}].map((p,i)=><Animated.Image key={i} source={assets.ember} resizeMode="contain" style={[pos(p.x,p.y,8,8),{opacity:flicker,transform:[{translateY:rise}]}]}/>)}
   {mode==='matching'?<>
    <Animated.View style={[StyleSheet.absoluteFill,{transform:[{translateY:float}]}]}>
     <Animated.Image source={assets.fallbackGlow} resizeMode="stretch" style={[box(B.ring),{opacity:ringGlow}]}/>
     <Image source={assets.dragon} resizeMode="contain" style={[box(B.dragon),{transform:[{scaleX:-1}]}]}/>
     <Animated.Image source={assets.flames} resizeMode="contain" style={[box(B.flames),{opacity:pulse,transform:[{scaleX:-1}]}]}/>
    </Animated.View>
   </>:mode==='alternate'&&alternatePetSource?<><Image source={assets.fallbackGlow} resizeMode="contain" style={box(B.glow)}/><Image source={alternatePetSource} resizeMode="contain" style={box(B.alternate)}/></>:null}
  </View>
  {mode!=='none'&&petAccessibilityLabel?<View accessible accessibilityLabel={petAccessibilityLabel} pointerEvents="none" style={box(mode==='matching'?B.dragon:B.alternate)}/>:null}
  <View style={[box(B.plate),s.plate]}/>
  <View style={[box(B.portrait),s.portrait]}>{portrait}</View>
  <View style={[box(B.identity),s.protected]}>{identity}</View>
  {badges?<View style={[box(B.badges),s.badges]}>{badges}</View>:null}
  {guild?<View style={[box(B.guild),s.guild]}>{guild}</View>:null}
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
   <Image source={assets.border} resizeMode="stretch" style={s.fill}/>
   <Animated.Image source={assets.ember} resizeMode="contain" style={[pos(36,184,12,12),{opacity:flicker,transform:[{translateX:sweep}]}]}/>
   {[{x:12,y:97},{x:316,y:97},{x:163,y:14}].map((p,i)=><Animated.Image key={i} source={assets.ember} resizeMode="contain" style={[pos(p.x,p.y,12,12),{opacity:pulse}]}/>)}
  </View>
 </View>}
 </View>;
}
/** Independent lightweight effects for ordinary layouts. No signature or matching pet effects. */
export function DraconicStandardEffects({ember,kind,active,reduceMotion=false}:{ember:ImageSourcePropType;kind:'background'|'border';active:boolean;reduceMotion?:boolean}){
 const clock=useEmberClock(active,reduceMotion);
 const opacity=clock.interpolate({inputRange:[0,.2,.5,.8,1],outputRange:[.25,.8,.35,.65,.25]});
 const y=clock.interpolate({inputRange:[0,.5,1],outputRange:[0,-14,0]});
 const locations=kind==='background'?[{right:'12%' as const,top:'25%' as const},{right:'27%' as const,bottom:'20%' as const}]:[{left:5,top:5},{right:5,bottom:5}];
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>{locations.map((p,i)=><Animated.Image key={i} source={ember} resizeMode="contain" style={[s.ember,p,{opacity,transform:[{translateY:y}]}]}/>)}</View>;
}
const s=StyleSheet.create({
 outer:{width:'100%',maxWidth:480,alignSelf:'center'},
 card:{width:'100%',position:'relative',overflow:'hidden',backgroundColor:'#170c13'},
 fill:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
 heat:{...StyleSheet.absoluteFillObject,backgroundColor:'#f65d12'},
 plate:{backgroundColor:'#200e17',borderColor:'#b16a34',borderWidth:1,borderRadius:6},
 portrait:{backgroundColor:'#200e17',borderColor:'#c78c46',borderWidth:1,borderRadius:5},
 protected:{overflow:'hidden'},
 badges:{justifyContent:'center',alignItems:'flex-start'},
 guild:{backgroundColor:'#41151a',borderColor:'#b16a34',borderWidth:1,borderRadius:4,alignItems:'center',justifyContent:'center'},
 ember:{position:'absolute',width:12,height:12},
});

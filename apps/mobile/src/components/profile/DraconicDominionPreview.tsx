import {ASCENDANT_SURFACES} from './ascendant-showcase-surfaces';
import {useCosmeticMotionPolicy} from '../anim/motion';
import {useUltraLuxePetReaction,UltraLuxePetReaction} from './UltraLuxePetReaction';
import {DraconicBorderLight} from './DraconicBorderLight';
import {UltraLuxeIdentityMotionProvider} from './UltraLuxeIdentityMotion';
import {UltraLuxePetPoseSprite} from './UltraLuxePetPoseSprite';
import {ULTRA_LUXE_CYCLE_MS} from '../../core/ultra-luxe-motion';
import {UltraLuxeEnvironment,UltraLuxeRail,UltraLuxePetAura,UltraLuxeAscendantFlourish,petIdleMotion,awakeningEnergy,awakeningPetLift} from './UltraLuxeMotion';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Animated,Easing,Image,Pressable,StyleSheet,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
import {DRACONIC_BOXES as B,DRACONIC_STAGE as S,draconicPetMode,draconicStageSupported} from '../../core/draconic-showcase-layout';

export type DraconicSceneAssets={
 background:ImageSourcePropType;border:ImageSourcePropType;dragon:ImageSourcePropType;
 smoothPoseAtlas?:ImageSourcePropType;flames:ImageSourcePropType;ember:ImageSourcePropType;fallbackGlow:ImageSourcePropType;
};
type Props={assets:DraconicSceneAssets;equippedPetId?:string|null;alternatePetSource?:ImageSourcePropType;petAccessibilityLabel?:string;portrait:ReactNode;identity:ReactNode;badges?:ReactNode;guild?:ReactNode;fallback:ReactNode;fullSet?:boolean;active?:boolean;reduceMotion?:boolean};

function useEmberClock(active:boolean,reduceMotion:boolean){
 const [clock]=useState(()=>new Animated.Value(0));
 const {running}=useCosmeticMotionPolicy(active,reduceMotion);
 useEffect(()=>{
  clock.stopAnimation();clock.setValue(0);
  if(!running)return;
  const loop=Animated.loop(Animated.timing(clock,{toValue:1,duration:ULTRA_LUXE_CYCLE_MS,easing:Easing.linear,useNativeDriver:true,isInteraction:false}));
  loop.start();return()=>{loop.stop();clock.stopAnimation();};
 },[running,clock]);
 return {clock,running};
}
export function DraconicDominionPreview({assets,equippedPetId,alternatePetSource,petAccessibilityLabel,portrait,identity,badges,guild,fallback,fullSet=false,active=false,reduceMotion=false}:Props){
 const [width,setWidth]=useState(0),{fontScale}=useWindowDimensions();
 const supported=draconicStageSupported(width,fontScale),{clock,running}=useEmberClock(active&&supported,reduceMotion);
 const k=width/S.width;
 const pos=(x:number,y:number,w:number,h:number)=>({position:'absolute' as const,left:x*k,top:y*k,width:w*k,height:h*k});
 const box=(b:{x:number;y:number;w:number;h:number})=>pos(b.x,b.y,b.w,b.h);
 const mode=draconicPetMode(equippedPetId,!!alternatePetSource);
 const reactionEnabled=running&&mode==='matching';
 const {reaction,trigger}=useUltraLuxePetReaction(reactionEnabled);
 const pulse=useMemo(()=>awakeningEnergy(clock,'draconic'),[clock]);
 const signatureLift=useMemo(()=>awakeningPetLift(clock,k,'draconic'),[clock,k]);
 const idle=useMemo(()=>petIdleMotion(clock,k,mode==='alternate'?'alternate':'draconic'),[clock,k,mode]);
 // Atlas already animates local body parts; do not layer rocking/stretching over it.
 const mirroredBody=assets.smoothPoseAtlas?[{scaleX:-1}]:[{rotate:idle.tilt},{scaleX:Animated.multiply(idle.scaleX,-1)},{scaleY:idle.scaleY}];
 const bodyLift=useMemo(()=>Animated.add(idle.lift,signatureLift),[idle.lift,signatureLift]);
 const ringGlow=useMemo(()=>Animated.add(.72,Animated.multiply(pulse,.28)),[pulse]);
 return <View style={s.outer} onLayout={e=>{const next=e.nativeEvent.layout.width;setWidth(old=>Math.abs(old-next)<.5?old:next);}}>
 {!supported?fallback:<View style={[s.card,{height:S.height*k}]}>
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
   <Image source={assets.background} fadeDuration={0} resizeMode="cover" style={s.fill}/>
   <Animated.View style={[s.heat,{opacity:Animated.multiply(pulse,.12)}]}/>
   {running?<UltraLuxeEnvironment clock={clock} scale={k} theme="draconic" particle={assets.ember}/>:null}
   {mode==='matching'?<>
    <Animated.Image source={assets.fallbackGlow} fadeDuration={0} resizeMode="stretch" style={[box(B.ring),{opacity:ringGlow}]}/>
    <Animated.View style={[StyleSheet.absoluteFill,{transform:[{translateY:bodyLift}]}]}>
     {running&&assets.smoothPoseAtlas?<Animated.View style={[box(B.dragon),{transform:mirroredBody}]}><UltraLuxePetPoseSprite source={assets.smoothPoseAtlas} clock={clock} theme="draconic" width={B.dragon.w*k} height={B.dragon.h*k}/></Animated.View>:<Animated.Image source={assets.dragon} fadeDuration={0} resizeMode="contain" style={[box(B.dragon),{transform:mirroredBody}]}/>}
     <Animated.Image source={assets.flames} fadeDuration={0} resizeMode="contain" style={[box(B.flames),{opacity:Animated.add(Animated.multiply(idle.glow,.18),Animated.multiply(pulse,.82)),transform:mirroredBody}]}/>
     {running?<UltraLuxePetAura clock={clock} scale={k} theme="draconic" particle={assets.ember}/>:null}
     {reactionEnabled?<UltraLuxePetReaction reaction={reaction} scale={k} theme="draconic" particle={assets.ember} glow={assets.fallbackGlow}/>:null}
    </Animated.View>
   </>:mode==='alternate'&&alternatePetSource?<><Animated.Image source={assets.fallbackGlow} resizeMode="contain" style={[box(B.glow),{opacity:Animated.add(.55,Animated.multiply(idle.glow,.5))}]}/><Animated.Image source={alternatePetSource} resizeMode="contain" style={[box(B.alternate),{transform:[{translateY:idle.lift},{rotate:idle.tilt},{scaleX:idle.scaleX},{scaleY:idle.scaleY}]}]}/></>:null}
  </View>
  {reactionEnabled?<Pressable accessibilityRole="button" accessibilityLabel={petAccessibilityLabel??'Vharaxis'} onPress={trigger} hitSlop={{top:5*k,bottom:0,left:0,right:0}} style={box(B.dragon)}/>:mode!=='none'&&petAccessibilityLabel?<View accessible accessibilityLabel={petAccessibilityLabel} pointerEvents="none" style={box(mode==='matching'?B.dragon:B.alternate)}/>:null}
  <View style={[box(B.plate),s.plate]}/>
  <View style={[box(B.portrait),s.portrait]}>{portrait}</View>
  <UltraLuxeIdentityMotionProvider clock={clock} fullSet={fullSet} active={running}>
  <View style={[box(B.identity),s.protected]}>{identity}</View>
  {badges?<View style={[box(B.badges),s.badges]}>{badges}</View>:null}
  </UltraLuxeIdentityMotionProvider>
  {guild?<View style={[box(B.guild),s.guild]}>{guild}</View>:null}
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
   <Image source={assets.border} fadeDuration={0} resizeMode="stretch" style={s.fill}/>
   {running?<UltraLuxeRail clock={clock} scale={k} theme="draconic" particle={assets.ember}/>:null}
    {running&&fullSet?<UltraLuxeAscendantFlourish clock={clock} scale={k} theme="draconic" particle={assets.ember}/>:null}
  </View>
 </View>}
 </View>;
}
/** Independent lightweight effects for ordinary layouts. No signature or matching pet effects. */
export function DraconicStandardEffects({ember,kind,active,reduceMotion=false}:{ember:ImageSourcePropType;kind:'background'|'border';active:boolean;reduceMotion?:boolean}){
 const {clock,running}=useEmberClock(active,reduceMotion);
 const [size,setSize]=useState({width:0,height:0});
 const opacity=clock.interpolate({inputRange:[0,.2,.5,.8,1],outputRange:[.25,.8,.35,.65,.25]});
 const y=clock.interpolate({inputRange:[0,.5,1],outputRange:[0,-14,0]});
 const locations=[{right:'12%' as const,top:'25%' as const},{right:'27%' as const,bottom:'20%' as const}];
 if(kind==='border')return <View onLayout={event=>{const {width,height}=event.nativeEvent.layout;setSize(old=>Math.abs(old.width-width)<.5&&Math.abs(old.height-height)<.5?old:{width,height});}} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>{running?<DraconicBorderLight clock={clock} width={size.width} height={size.height} ember={ember}/>:null}</View>;
 if(!running)return null;
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>{locations.map((p,i)=><Animated.Image key={i} source={ember} resizeMode="contain" style={[s.ember,p,{opacity,transform:[{translateY:y}]}]}/>)}</View>;
}
const s=StyleSheet.create({
 outer:{width:'100%',maxWidth:480,alignSelf:'center'},
 card:{width:'100%',position:'relative',overflow:'hidden',backgroundColor:'#170c13'},
 fill:{...StyleSheet.absoluteFill,width:'100%',height:'100%'},
 heat:{...StyleSheet.absoluteFill,backgroundColor:'#f65d12'},
 plate:ASCENDANT_SURFACES.draconic.identity,
 portrait:ASCENDANT_SURFACES.draconic.portrait,
 protected:{overflow:'hidden'},
 badges:{justifyContent:'center',alignItems:'flex-start'},
 guild:{...ASCENDANT_SURFACES.draconic.guild,alignItems:'stretch',justifyContent:'center'},
 ember:{position:'absolute',width:12,height:12},
});

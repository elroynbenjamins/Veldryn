import {memo,useMemo,useRef,useEffect} from 'react';
import {Animated,Image,View,StyleSheet,Pressable,Easing,type ImageSourcePropType} from 'react-native';
import {NEXT_PREMIUM_PET_ATLAS,nextPremiumPetAtlasTimeline,nextPremiumPetAtlasCell,NEXT_PREMIUM_POSTURE_PHASE,NEXT_PREMIUM_POSTURE_LIFT} from '../../core/next-premium-pet-review';

import {NEXT_PREMIUM_REACTION,type SignatureTheme} from '../../core/next-premium-signature-review';

const A=NEXT_PREMIUM_PET_ATLAS;
const TIMELINE=nextPremiumPetAtlasTimeline();
const CELLS=TIMELINE.frames.map(index=>{
 const cell=nextPremiumPetAtlasCell(index);
 if(!cell)throw new Error('Invalid next premium review atlas frame');
 return cell;
});
type Props={
 source:ImageSourcePropType;
 atlas?:ImageSourcePropType;
 clock:Animated.Value;
 width:number;
 height:number;
 running:boolean;
 reactionTheme?:SignatureTheme;
 reactionLabel?:string;
};
type AtlasProps={source:ImageSourcePropType;clock:Animated.Value;width:number;height:number};
/** Isolated review player. The parent must supply its own visibility, reduced-motion
 * and app-state gated native clock. No production renderer imports this component. */
const NextPremiumAtlas=memo(function NextPremiumAtlas({source,clock,width,height}:AtlasProps){
 const ratio=Math.min(width/A.frameWidth,height/A.frameHeight);
 const w=A.frameWidth*ratio,h=A.frameHeight*ratio;
 const phase=useMemo(()=>Animated.modulo(Animated.multiply(clock,A.cycles),1),[clock]);
 const [x,y]=useMemo(()=>[
  phase.interpolate({inputRange:TIMELINE.inputRange,outputRange:CELLS.map(c=>-c.column*w),extrapolate:'clamp'}),
  phase.interpolate({inputRange:TIMELINE.inputRange,outputRange:CELLS.map(c=>-c.row*h),extrapolate:'clamp'}),
 ] as const,[phase,w,h]);
 return <View pointerEvents="none" accessible={false} style={{width,height,alignItems:'center',justifyContent:'flex-end'}}>
  <View style={{width:w,height:h,overflow:'hidden'}}>
   <Animated.Image source={source} resizeMode="stretch" fadeDuration={0} style={[s.atlas,{width:w*A.columns,height:h*A.rows,transform:[{translateX:x},{translateY:y}]}]}/>
  </View>
 </View>;
});
/** Finite user-triggered native reaction. Never loops, ignores repeated presses
 * while active and stops on unmount (including parent motion/visibility change). */
const ReactingAtlas=memo(function ReactingAtlas({source,clock,width,height,theme,label}:AtlasProps&{theme:SignatureTheme;label:string}){
 const value=useMemo(()=>new Animated.Value(0),[]);
 const animation=useRef<Animated.CompositeAnimation|null>(null);
 const active=useRef(false);
 const cfg=NEXT_PREMIUM_REACTION[theme];
 useEffect(()=>()=>{const current=animation.current;animation.current=null;active.current=false;current?.stop();value.setValue(0);},[theme,value]);
 const style=useMemo(()=>{
  const inputRange=[...cfg.phase],ratio=Math.min(width/74,height/76);
  const posture=clock.interpolate({inputRange:[...NEXT_PREMIUM_POSTURE_PHASE],outputRange:NEXT_PREMIUM_POSTURE_LIFT[theme==='petal-waltz'?'sakura':'stormforged'].map(y=>y*ratio),extrapolate:'clamp'});
  return {transform:[
   {translateY:Animated.add(posture,value.interpolate({inputRange,outputRange:cfg.lift.map(y=>y*ratio),extrapolate:'clamp'}))},
   {scale:value.interpolate({inputRange,outputRange:[...cfg.scale],extrapolate:'clamp'})},
   {rotate:value.interpolate({inputRange,outputRange:cfg.tilt.map(x=>x+'deg'),extrapolate:'clamp'})},
  ]};
 },[value,cfg,clock,theme,width,height]);
 const react=()=>{
  if(active.current)return;
  active.current=true;value.setValue(0);
  const next=Animated.timing(value,{toValue:1,duration:cfg.duration,easing:Easing.linear,useNativeDriver:true,isInteraction:false});
  animation.current=next;
  next.start(()=>{if(animation.current!==next)return;animation.current=null;active.current=false;value.setValue(0);});
 };
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Play pet reaction" onPress={react}
  style={{width,height,overflow:'visible'}}>
  <Animated.View pointerEvents="none" style={[{width,height},style]}>
   <NextPremiumAtlas source={source} clock={clock} width={width} height={height}/>
  </Animated.View>
 </Pressable>;
});
/** Mount atlas animation nodes only while the parent authorizes motion.
 * Static source is required; a missing atlas is never replaced by another pet. */
export const NextPremiumPetReviewSprite=memo(function NextPremiumPetReviewSprite({source,atlas,clock,width,height,running,reactionTheme,reactionLabel}:Props){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 if(running&&atlas&&reactionTheme&&reactionLabel)return <ReactingAtlas source={atlas} clock={clock} width={width} height={height} theme={reactionTheme} label={reactionLabel}/>;
 if(running&&atlas)return <NextPremiumAtlas source={atlas} clock={clock} width={width} height={height}/>;
 return <Image accessible={false} pointerEvents="none" source={source} resizeMode="contain" fadeDuration={0} style={{width,height}}/>;
});
const s=StyleSheet.create({atlas:{position:'absolute',left:0,top:0}});

import {memo,useMemo} from 'react';
import {Animated,Image,View,StyleSheet,type ImageSourcePropType} from 'react-native';
import {NEXT_PREMIUM_PET_ATLAS,nextPremiumPetAtlasTimeline,nextPremiumPetAtlasCell} from '../../core/next-premium-pet-review';

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
/** Mount atlas animation nodes only while the parent authorizes motion.
 * Static source is required; a missing atlas is never replaced by another pet. */
export const NextPremiumPetReviewSprite=memo(function NextPremiumPetReviewSprite({source,atlas,clock,width,height,running}:Props){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 if(running&&atlas)return <NextPremiumAtlas source={atlas} clock={clock} width={width} height={height}/>;
 return <Image accessible={false} pointerEvents="none" source={source} resizeMode="contain" fadeDuration={0} style={{width,height}}/>;
});
const s=StyleSheet.create({atlas:{position:'absolute',left:0,top:0}});

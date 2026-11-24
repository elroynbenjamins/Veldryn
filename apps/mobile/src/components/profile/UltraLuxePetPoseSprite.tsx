import {Animated,StyleSheet,View,type ImageSourcePropType} from 'react-native';
import {ULTRA_LUXE_POSE_ATLASES,poseAtlasTimeline,poseAtlasCell,type PoseTheme} from '../../core/ultra-luxe-pet-poses';
const TIMELINE=poseAtlasTimeline();
type Props={source:ImageSourcePropType;clock:Animated.Value;theme:PoseTheme;width:number;height:number};
/** One decoded atlas, clipped to a single pose; native transforms only.
 * The caller owns the scene lifecycle, accessibility and reduced-motion behavior. */
export function UltraLuxePetPoseSprite({source,clock,theme,width,height}:Props){
 const a=ULTRA_LUXE_POSE_ATLASES[theme],ratio=Math.min(width/a.frameWidth,height/a.frameHeight);
 const w=a.frameWidth*ratio,h=a.frameHeight*ratio;
 const x=clock.interpolate({inputRange:TIMELINE.inputRange,outputRange:TIMELINE.frames.map(f=>-poseAtlasCell(f).column*w)});
 const y=clock.interpolate({inputRange:TIMELINE.inputRange,outputRange:TIMELINE.frames.map(f=>-poseAtlasCell(f).row*h)});
 return <View pointerEvents="none" accessible={false} style={{width,height,alignItems:'center',justifyContent:'center'}}>
  <View style={{width:w,height:h,overflow:'hidden'}}>
   <Animated.Image source={source} resizeMode="stretch" fadeDuration={0} style={[s.atlas,{width:w*a.columns,height:h*a.rows,transform:[{translateX:x},{translateY:y}]}]}/>
  </View>
 </View>;
}
const s=StyleSheet.create({atlas:{position:'absolute',left:0,top:0}});

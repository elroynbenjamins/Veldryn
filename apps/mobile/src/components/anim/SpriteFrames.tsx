import {useEffect,useMemo,useRef} from 'react';
import {Animated,Easing,View,type ImageSourcePropType,type StyleProp,type ViewStyle} from 'react-native';
import {heldSteps,sheetOffsetTrack} from '../../core/sprite-animation';
import {COMBAT_FX,PIXEL_UNIT,type PixelSpriteSheet} from '../../theme/pixel-scene-assets';
import {track as stepped,type Progress} from './motion';


/**
 * Plays a horizontal sprite sheet by stepping its offset from a normalized progress value.
 * The stepping is an interpolation on the native driver, so playback costs no React
 * renders and no JS timers. Without `progress` it shows one resting frame.
 */
export function SpriteFrames({sheet,progress,unit=PIXEL_UNIT,frame=0,tintColor,style}:{
  sheet:Pick<PixelSpriteSheet,'frameWidth'|'frameHeight'|'frames'|'durationsMs'>&{source:ImageSourcePropType};
  progress?:Progress;unit?:number;frame?:number;tintColor?:string;style?:StyleProp<ViewStyle>;
}){
  const width=sheet.frameWidth*unit,height=sheet.frameHeight*unit;
  const track=useMemo(()=>sheetOffsetTrack(sheet.durationsMs,width),[sheet.durationsMs,width]);
  const translateX=progress?stepped(progress,track):-Math.min(sheet.frames-1,Math.max(0,frame))*width;
  return <View pointerEvents="none" style={[{width,height,overflow:'hidden'},style]}>
    <Animated.Image source={sheet.source} fadeDuration={0} resizeMode="stretch"
      style={[{width:width*sheet.frames,height,transform:[{translateX}]},tintColor?{tintColor}:null]}/>
  </View>;
}

export type PixelFxName=keyof typeof COMBAT_FX;
const VISIBLE=heldSteps([0,.002,.998,1],[0,1,0]);

/**
 * A one-shot pixel effect (slash, burst, ward, ...). It replays whenever `eventKey`
 * changes and draws nothing before the first event or after the last frame. The tinted
 * layer takes the caller's theme colour; the core layer stays white.
 */
export function PixelFx({name,color,eventKey,durationMs=340,delayMs=0,unit=PIXEL_UNIT,enabled=true,style}:{
  name:PixelFxName;color:string;eventKey:string|number|undefined;durationMs?:number;delayMs?:number;unit?:number;enabled?:boolean;style?:StyleProp<ViewStyle>;
}){
  const fx=COMBAT_FX[name],progress=useRef(new Animated.Value(0)).current;
  const sheet=useMemo(()=>({frameWidth:fx.frameSize,frameHeight:fx.frameSize,frames:fx.frames,durationsMs:Array.from({length:fx.frames},()=>1)}),[fx]);
  useEffect(()=>{
    progress.stopAnimation();progress.setValue(0);
    if(!enabled||eventKey===undefined)return;
    const play=Animated.timing(progress,{toValue:1,duration:durationMs,easing:Easing.linear,useNativeDriver:true});
    const animation=delayMs>0?Animated.sequence([Animated.delay(delayMs),play]):play;
    animation.start();
    return()=>animation.stop();
  },[eventKey,enabled,durationMs,delayMs,progress]);
  if(!enabled||eventKey===undefined)return null;
  const size=fx.frameSize*unit;
  return <Animated.View pointerEvents="none" accessible={false} style={[{width:size,height:size,opacity:progress.interpolate(VISIBLE)},style]}>
    <SpriteFrames sheet={{...sheet,source:fx.tint}} progress={progress} unit={unit} tintColor={color} style={{position:'absolute',left:0,top:0}}/>
    <SpriteFrames sheet={{...sheet,source:fx.core}} progress={progress} unit={unit} style={{position:'absolute',left:0,top:0}}/>
  </Animated.View>;
}

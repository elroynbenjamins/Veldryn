import {View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {COMBAT_FX} from '../theme/pixel-scene-assets';
import {PixelFx,type PixelFxName} from './anim/SpriteFrames';
import {useMotionEnabled} from './anim/motion';

export type CombatImpactKind='damage'|'critical'|'heal'|'shield'|'interrupt'|'phase'|'cast'|'down';

const IMPACT_FX:Record<CombatImpactKind,PixelFxName>={damage:'burst',critical:'crit',heal:'heal',shield:'ward',interrupt:'smash',phase:'smash',cast:'crit',down:'smash'};

/**
 * A lightweight, entirely client-side burst tied to a real combat event.
 * The effect never predicts HP, damage or the outcome of server-side fights.
 * It plays one pixel sprite sheet on the native driver and owns no frame timer.
 */
export function CombatImpactBurst({eventId,kind,reduceMotion=false,size=66}:{
 eventId:string;kind:CombatImpactKind;reduceMotion?:boolean;size?:number;
}){
 const C=useGameTheme(),animate=useMotionEnabled(reduceMotion);
 const color=kind==='critical'?C.warning:kind==='damage'||kind==='down'?C.bad:kind==='heal'?C.good:kind==='shield'?C.info:kind==='interrupt'?C.accent:kind==='cast'?C.warning:C.special;
 if(!animate)return null;
 const name=IMPACT_FX[kind],frameSize=COMBAT_FX[name].frameSize;
 // Whole-number scale keeps the sprite's pixels square at any requested size.
 const unit=Math.max(1,Math.round(size/frameSize)),box=frameSize*unit;
 return <View pointerEvents="none" accessible={false} style={{position:'absolute',zIndex:6,left:'50%',top:'50%',width:box,height:box,marginLeft:-box/2,marginTop:-box/2}}>
  <PixelFx name={name} color={color} eventKey={eventId} unit={unit} durationMs={kind==='phase'||kind==='cast'?620:kind==='critical'?480:400}/>
 </View>;
}

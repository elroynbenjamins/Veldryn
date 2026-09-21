import {Image,StyleSheet,Text,View} from 'react-native';
import {EVENT_DECORATIONS} from '../theme/event-decoration-assets';
import {isLiveEventVisualKey} from '../content/live-event-visual-keys';
import {liveEventVisuals} from '../ui/live-event-visuals';

const GLYPHS:Record<string,string>={
  turning_of_the_age:'◷',
  heartbond:'♥',
  bloomwake:'✿',
  suncrest:'☀',
  starfall:'✦',
  harvestwake:'◆',
  veilbreak:'◈',
  merchant_guild:'¤',
  frostfall:'❄',
};

export function EventIdentityBadge({event,visualKey,accent='#f2c14e',size=72}:{event:string;visualKey?:string;accent?:string;size?:number}){
  const decoration=EVENT_DECORATIONS.find(entry=>entry.event===event);
  const badge=isLiveEventVisualKey(visualKey)?liveEventVisuals(visualKey).badgeIcon:undefined;
  const glyph=GLYPHS[visualKey??'']??'✦';
  return <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[s.frame,{width:size,height:size,borderRadius:size/2,borderColor:accent,shadowColor:accent}]}>
    {badge||decoration?<Image source={badge??decoration!.badge} resizeMode="contain" style={{width:size-10,height:size-10}}/>:<Text style={[s.glyph,{fontSize:Math.round(size*.48),lineHeight:Math.round(size*.58),color:accent}]}>{glyph}</Text>}
  </View>;
}
const s=StyleSheet.create({
  frame:{alignItems:'center',justifyContent:'center',borderWidth:1,backgroundColor:'rgba(7,17,28,.82)',shadowOpacity:.3,shadowRadius:8,shadowOffset:{width:0,height:0},elevation:2},
  glyph:{fontWeight:'900',textAlign:'center'},
});

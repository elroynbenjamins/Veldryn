import {Image,StyleSheet,View} from 'react-native';
import {EVENT_DECORATIONS} from '../theme/event-decoration-assets';
import {C} from '../theme/theme';

export function EventIdentityBadge({event,size=72}:{event:string;size?:number}){
  const decoration=EVENT_DECORATIONS.find(entry=>entry.event===event);
  if(!decoration)return null;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[s.frame,{width:size,height:size,borderRadius:size/2}]}>
    <Image source={decoration.badge} resizeMode="contain" style={{width:size-12,height:size-12}}/>
  </View>;
}
const s=StyleSheet.create({frame:{alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(242,193,78,.7)',backgroundColor:'rgba(7,17,28,.78)',shadowColor:C.accent,shadowOpacity:.25,shadowRadius:8,shadowOffset:{width:0,height:0},elevation:2}});

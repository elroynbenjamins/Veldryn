import {useEffect,useRef} from 'react';
import {Animated,StyleSheet,Text,View} from 'react-native';
import {C} from '../theme/theme';
import {statBarValue} from './stat-bar-value';
export function StatBar({label,current,max,reduceMotion=true}:{label:string;current:number;max:number;reduceMotion?:boolean}){
 const {value,total,progress}=statBarValue(current,max);
 const fill=useRef(new Animated.Value(progress)).current;
 useEffect(()=>{fill.stopAnimation();if(reduceMotion){fill.setValue(progress);return;}const animation=Animated.timing(fill,{toValue:progress,duration:220,useNativeDriver:false});animation.start();return()=>animation.stop();},[fill,progress,reduceMotion]);
 const description=`${Math.floor(value)} / ${Math.floor(total)}`;
 return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{min:0,max:100,now:Math.round(progress*100),text:description}}>
  <View style={s.row}><Text style={s.label}>{label}</Text><Text style={s.value}>{description}</Text></View>
  <View style={s.track}><Animated.View style={[s.fill,{width:fill.interpolate({inputRange:[0,1],outputRange:['0%','100%'],extrapolate:'clamp'})}]}/></View>
 </View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:4},label:{color:C.muted,fontSize:12,lineHeight:17,flexShrink:1},value:{color:C.text,fontSize:12,lineHeight:17},track:{height:9,backgroundColor:'#080c12',borderRadius:8,overflow:'hidden',marginTop:5},fill:{height:'100%',backgroundColor:C.accent}});

import {useEffect,useMemo,useRef} from 'react';
import {Animated,StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,typography} from '../theme/theme';

const HEADINGS=[
 'TRAINING COMPLETE',
 'ASCENSION COMPLETE',
 'PRESTIGE MASTERY COMPLETE',
 'BOND REWARD CLAIMED',
 'TECHNIQUE UPDATED',
 'NEW COMPANION',
] as const;

export function isCompanionProgressMoment(message:string){
 return HEADINGS.some(heading=>message.startsWith(heading));
}

function presentation(message:string){
 const heading=HEADINGS.find(value=>message.startsWith(value))??'COMPANION MILESTONE';
 const detail=message.startsWith(heading)?message.slice(heading.length).replace(/^\s*·\s*/,''):message;
 const icon=heading==='ASCENSION COMPLETE'?'✦':heading==='PRESTIGE MASTERY COMPLETE'?'◆':heading==='BOND REWARD CLAIMED'?'♥':heading==='NEW COMPANION'?'★':'◇';
 return {heading,detail,icon};
}

export function CompanionProgressMoment({message,reduceMotion=false}:{message:string;reduceMotion?:boolean}){
 const value=useRef(new Animated.Value(1)).current,copy=useMemo(()=>presentation(message),[message]);
 useEffect(()=>{
  value.stopAnimation();
  if(reduceMotion){value.setValue(1);return;}
  value.setValue(.72);
  Animated.spring(value,{toValue:1,friction:6,tension:90,useNativeDriver:true}).start();
  return ()=>value.stopAnimation();
 },[message,reduceMotion,value]);
 return <Animated.View accessibilityLiveRegion="polite" style={[s.card,{opacity:value,transform:[{scale:value}]}]}>
  <View style={s.iconShell}><Text style={s.icon}>{copy.icon}</Text></View>
  <View style={s.flex}><Text style={s.heading}>{copy.heading}</Text><Text style={s.detail}>{copy.detail||'Progress saved.'}</Text></View>
 </Animated.View>;
}

const s=StyleSheet.create({
 card:{minHeight:72,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:C.accent,borderRadius:radii.md,backgroundColor:'#2b2417'},
 iconShell:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.accent,backgroundColor:'#17130d'},
 icon:{fontSize:22,color:C.accent,fontWeight:'900'},
 flex:{flex:1,minWidth:0},
 heading:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
 detail:{...typography.bodyStrong,color:C.text,marginTop:2},
});

import {useMemo,useRef,useState} from 'react';
import {Animated,PanResponder,Pressable,StyleSheet,Text,View,type StyleProp,type ViewStyle} from 'react-native';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export interface PagerOption{key:string;label:string;meta?:string}

/** One option at a time, with a step control at each end and a drag across the middle.
 * Replaces chip rows that either wrapped into three lines or ran off the right edge:
 * every option stays reachable, and the dots give direct access without a second row
 * of full-width buttons. Dots give way to a counter once there are too many to aim at. */
const MAX_DOTS=9;
const SWIPE_DISTANCE=38;

export function OptionPager({options,value,onChange,accessibilityLabel,previousLabel,nextLabel,reduceMotion,style}:{
 options:readonly PagerOption[];
 value:string;
 onChange:(key:string)=>void;
 accessibilityLabel:string;
 previousLabel:string;
 nextLabel:string;
 reduceMotion?:boolean;
 style?:StyleProp<ViewStyle>;
}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const index=Math.max(0,options.findIndex(row=>row.key===value));
 const current=options[index];
 // The responder reads these at gesture time, so they must not be captured by a stale closure.
 const live=useRef({index,options,onChange});
 live.current={index,options,onChange};
 const drag=useRef(new Animated.Value(0)).current;
 const [railWidth,setRailWidth]=useState(0);
 const step=(delta:number)=>{
  const {index:at,options:rows,onChange:commit}=live.current;
  if(rows.length<2)return;
  const next=rows[(at+delta+rows.length)%rows.length];
  if(next&&next.key!==rows[at]?.key)commit(next.key);
 };
 const settle=()=>{if(reduceMotion){drag.setValue(0);return;}Animated.spring(drag,{toValue:0,useNativeDriver:true,speed:24,bounciness:0}).start();};
 const pan=useMemo(()=>PanResponder.create({
  // Claim only clearly horizontal drags, so a vertical flick still scrolls the page behind.
  onMoveShouldSetPanResponder:(_event,gesture)=>live.current.options.length>1&&Math.abs(gesture.dx)>10&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.6,
  onPanResponderMove:(_event,gesture)=>{if(!reduceMotion)drag.setValue(Math.max(-26,Math.min(26,gesture.dx*.35)))},
  onPanResponderRelease:(_event,gesture)=>{
   if(gesture.dx<=-SWIPE_DISTANCE)step(1);
   else if(gesture.dx>=SWIPE_DISTANCE)step(-1);
   settle();
  },
  onPanResponderTerminate:settle,
 }),[reduceMotion]);

 // Nine 30px dot targets cannot fit on narrow panels. Fall back to a readable counter.
 const showDots=options.length>1&&options.length<=MAX_DOTS&&railWidth>=options.length*30;
 if(!options.length)return null;
 const arrow=(mark:string,delta:number,label:string)=><Pressable
  accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:options.length<2}} disabled={options.length<2}
  hitSlop={6} onPress={()=>step(delta)}
  style={({pressed})=>[s.arrow,options.length<2&&s.arrowIdle,pressed&&s.pressed]}>
  <Text style={s.arrowMark}>{mark}</Text>
 </Pressable>;

 return <View style={[s.root,style]} onLayout={({nativeEvent:{layout}})=>{const next=Math.floor(layout.width);setRailWidth(previous=>previous===next?previous:next)}}>
  <View accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel}
   accessibilityValue={{text:current?current.label+(current.meta?' '+current.meta:''):''}}
   accessibilityActions={[{name:'increment'},{name:'decrement'}]}
   onAccessibilityAction={event=>step(event.nativeEvent.actionName==='decrement'?-1:1)}
   style={s.rail}>
   {arrow('‹',-1,previousLabel)}
   <Animated.View {...pan.panHandlers} style={[s.face,{transform:[{translateX:drag}]}]}>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={s.label}>{current?.label??''}</Text>
    {current?.meta?<Text numberOfLines={1} style={s.meta}>{current.meta}</Text>:null}
   </Animated.View>
   {arrow('›',1,nextLabel)}
  </View>
  {options.length<2?null:showDots
   ?<View style={s.dots}>{options.map((row,at)=><Pressable key={row.key} accessibilityRole="button"
      accessibilityLabel={row.label} accessibilityState={{selected:at===index}}
      onPress={()=>onChange(row.key)} hitSlop={6} style={s.dotTarget}>
      <View style={[s.dot,at===index&&s.dotOn]}/>
     </Pressable>)}</View>
   :<Text style={s.counter}>{index+1} / {options.length}</Text>}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:4},
 rail:{flexDirection:'row',alignItems:'stretch',gap:6},
 arrow:{width:38,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 arrowIdle:{opacity:.35},
 arrowMark:{fontSize:19,lineHeight:23,color:C.text,fontWeight:'800'},
 face:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',gap:1,paddingHorizontal:8,borderRadius:radii.md,borderWidth:1,borderColor:C.selectionLine,backgroundColor:C.selection},
 label:{...typography.bodyStrong,color:C.text},
 meta:{fontSize:9.5,lineHeight:13,color:C.info,fontWeight:'900',letterSpacing:.4},
 dots:{flexDirection:'row',alignSelf:'center',alignItems:'center'},
 dotTarget:{width:30,height:30,alignItems:'center',justifyContent:'center'},
 dot:{width:6,height:6,borderRadius:99,backgroundColor:C.line},
 dotOn:{width:16,backgroundColor:C.info},
 counter:{alignSelf:'center',fontSize:9.5,color:C.muted,fontWeight:'900',letterSpacing:.4},
 pressed:{opacity:.72},
});}

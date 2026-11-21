import {useEffect,useMemo,useState} from 'react';
import {Text,TextInput,Pressable,StyleSheet,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameplayText} from '../i18n/gameplay';
import type {ThemeColors} from '../theme/theme';

type Props={value:number;max:number;onChange:(value:number)=>void;disabled?:boolean;unit?:string;limitLabel?:string};

export function CraftQuantitySelector({value,max,onChange,disabled=false,unit,limitLabel}:Props){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{gt}=useGameplayText();
 const [trackWidth,setTrackWidth]=useState(1),[draft,setDraft]=useState(String(value));
 const upper=Math.max(0,Math.floor(max)),current=upper>0?Math.max(1,Math.min(upper,value)):0,locked=disabled||upper===0;
 useEffect(()=>setDraft(String(current)),[current]);
 const select=(next:number)=>{
  if(locked||!Number.isFinite(next))return;
  onChange(Math.max(1,Math.min(upper,Math.round(next))));
 };
 const drag=(x:number)=>{
  if(locked)return;
  const ratio=Math.max(0,Math.min(1,(x-11)/Math.max(1,trackWidth-22)));
  select(upper===1?1:1+Math.round(ratio*(upper-1)));
 };
 const percent=upper<=1?(upper===1?100:0):100*(current-1)/(upper-1);
 const unitLabel=unit??gt('batches');
 return <View style={s.root}>
  <View style={s.head}><Text style={s.label}>{gt('Quantity')}</Text><Text style={s.limit} accessibilityLiveRegion="polite">{limitLabel??(gt('Max')+': '+upper)}</Text></View>
  <View style={s.row}>
   <Pressable accessibilityRole="button" accessibilityLabel={gt('Decrease quantity')} disabled={locked||current<=1} onPress={()=>select(current-1)} style={[s.step,(locked||current<=1)&&s.disabled]}><Text style={s.stepText}>−</Text></Pressable>
   <TextInput accessibilityLabel={gt('Craft quantity')} keyboardType="number-pad" selectTextOnFocus maxLength={7} editable={!locked} value={draft} onChangeText={text=>{
    const clean=text.replace(/[^0-9]/g,'');setDraft(clean);
    const parsed=Number(clean);if(clean&&Number.isSafeInteger(parsed)&&parsed>=1)select(parsed);
   }} onEndEditing={()=>{if(!draft.trim())select(1);setDraft(String(current));}} style={[s.input,locked&&s.disabled]}/>
   <Pressable accessibilityRole="button" accessibilityLabel={gt('Increase quantity')} disabled={locked||current>=upper} onPress={()=>select(current+1)} style={[s.step,(locked||current>=upper)&&s.disabled]}><Text style={s.stepText}>+</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel={gt('Maximum craftable quantity')+' '+upper} disabled={locked} onPress={()=>select(upper)} style={[s.max,locked&&s.disabled]}><Text style={s.maxText}>{gt('MAX')}</Text></Pressable>
  </View>
  <View accessible accessibilityRole="adjustable" accessibilityLabel={gt('Craft quantity')} accessibilityState={{disabled:locked}} accessibilityValue={{min:upper?1:0,max:Math.max(1,upper),now:current,text:current+' / '+upper+' '+unitLabel}}
   accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={event=>select(current+(event.nativeEvent.actionName==='increment'?1:-1))}
   onLayout={event=>setTrackWidth(event.nativeEvent.layout.width)}
   onStartShouldSetResponder={()=>!locked} onMoveShouldSetResponder={()=>!locked}
   onResponderGrant={event=>drag(event.nativeEvent.locationX)} onResponderMove={event=>drag(event.nativeEvent.locationX)}
   style={[s.touchTrack,locked&&s.disabled]}>
    <View pointerEvents="none" style={s.track}><View style={[s.fill,{width:(percent+'%') as `${number}%`}]}/></View>
    <View pointerEvents="none" style={[s.thumb,{left:Math.max(0,trackWidth-22)*percent/100}]}/>
  </View>
  <View style={s.scale}><Text style={s.scaleText}>{upper?1:0} {unitLabel}</Text><Text style={s.scaleText}>{upper} · {gt('Max')}</Text></View>
 </View>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:8,padding:11,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:9},
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 label:{fontSize:11,fontWeight:'900',letterSpacing:.6,color:C.text},
 limit:{fontSize:10,fontWeight:'700',color:C.muted,flexShrink:1,textAlign:'right'},
 row:{flexDirection:'row',alignItems:'stretch',gap:7},
 step:{minWidth:44,minHeight:46,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},
 stepText:{fontSize:23,fontWeight:'700',color:C.text},
 input:{minWidth:50,flex:1,height:46,paddingHorizontal:3,paddingVertical:2,borderRadius:8,borderWidth:1,borderColor:C.accent,textAlign:'center',fontSize:19,fontWeight:'900',color:C.text,backgroundColor:C.bg},
 max:{minWidth:54,minHeight:46,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:C.accent,backgroundColor:C.selection},
 maxText:{fontSize:11,fontWeight:'900',color:C.text},
 touchTrack:{height:44,justifyContent:'center',paddingHorizontal:11},
 track:{height:8,borderRadius:5,backgroundColor:C.line,overflow:'hidden'},
 fill:{height:8,backgroundColor:C.accent,borderRadius:5},
 thumb:{position:'absolute',width:22,height:22,borderRadius:11,borderWidth:3,borderColor:C.selectionLine,backgroundColor:C.accent},
 scale:{flexDirection:'row',justifyContent:'space-between',gap:8},
 scaleText:{fontSize:10,color:C.muted,fontWeight:'700'},
 disabled:{opacity:.4}
});}

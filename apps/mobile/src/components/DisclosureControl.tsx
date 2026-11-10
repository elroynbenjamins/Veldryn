import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

/** Shared disclosure affordance: recognizable, accessible and touch-friendly.
 * Use DisclosureMark inside an already pressable card; DisclosureControl for
 * a standalone action, to avoid nesting button controls. */
export function DisclosureMark({expanded}:{expanded:boolean}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 return <View pointerEvents="none" style={[s.mark,expanded&&s.markOpen]}>
  <Text style={[s.symbol,expanded&&s.symbolOpen]}>{expanded?'−':'+'}</Text>
 </View>;
}
export function DisclosureControl({label,expanded,onPress,compact=false}:{
 label:string;expanded:boolean;onPress:()=>void;compact?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 return <Pressable accessibilityRole="button" accessibilityLabel={label}
  accessibilityState={{expanded}} accessibilityHint={expanded?'Collapse this section':'Expand this section'}
  onPress={onPress} style={({pressed})=>[s.control,expanded&&s.controlOpen,
   compact&&s.compact,pressed&&s.pressed]}>
  <Text numberOfLines={1} style={[s.label,expanded&&s.labelOpen]}>{label}</Text>
  <DisclosureMark expanded={expanded}/>
 </Pressable>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 control:{minHeight:44,minWidth:103,borderWidth:1,borderColor:C.lineStrong,
  borderRadius:11,backgroundColor:C.panel2,paddingLeft:11,paddingRight:6,
  flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7},
 controlOpen:{borderColor:C.selectionLine,backgroundColor:C.selection},
 compact:{minWidth:0},
 label:{fontSize:12,lineHeight:17,color:C.text,fontWeight:'800',flexShrink:1},
 labelOpen:{color:C.accent},
 mark:{width:28,height:28,borderRadius:9,backgroundColor:C.selection,
  borderWidth:1,borderColor:C.lineStrong,alignItems:'center',justifyContent:'center',flexShrink:0},
 markOpen:{backgroundColor:C.accentSurface,borderColor:C.accent},
 symbol:{color:C.accent,fontSize:19,fontWeight:'800',lineHeight:24,textAlign:'center'},
 symbolOpen:{color:C.text},
 pressed:{opacity:.75},
});}

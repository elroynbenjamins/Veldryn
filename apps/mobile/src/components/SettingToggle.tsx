import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {C,radii,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';

/** One accessible switch target; the decorative track never captures a second tap. */
export function SettingToggle({label,description,value,onValueChange,disabled=false}:{label:string;description?:string;value:boolean;onValueChange:(value:boolean)=>void;disabled?:boolean}){
  const {colors:C}=useTheme();const s=useMemo(()=>createStyles(C),[C]);
  const [focused,setFocused]=useState(false);
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={description} accessibilityState={{checked:value,disabled}}
    disabled={disabled} onPress={()=>onValueChange(!value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
    style={({pressed})=>[s.row,focused&&s.focused,pressed&&!disabled&&s.pressed,disabled&&s.disabled]}>
    <View style={s.copy}><Text style={s.label}>{label}</Text>{description&&<Text style={s.description}>{description}</Text>}</View>
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={s.control}>
      <View style={[s.track,value&&s.trackOn]}><View style={[s.thumb,value&&s.thumbOn]}/></View>
      <Text style={[s.state,value&&s.stateOn]}>{value?'On':'Off'}</Text>
    </View>
  </Pressable>;
}
const createStyles=(C:any)=>StyleSheet.create({
  row:{minHeight:64,flexDirection:'row',alignItems:'center',gap:16,padding:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  copy:{flex:1,minWidth:0,gap:4},label:{...typography.bodyStrong,color:C.text},description:{...typography.caption,color:C.muted},
  control:{alignItems:'center',gap:4},track:{width:48,height:28,padding:3,borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,justifyContent:'center'},
  trackOn:{borderColor:C.selectionLine,backgroundColor:C.selection},thumb:{width:20,height:20,borderRadius:10,backgroundColor:C.muted},thumbOn:{alignSelf:'flex-end',backgroundColor:C.selectionLine},
  state:{...typography.caption,color:C.muted},stateOn:{color:C.info},focused:{borderColor:C.selectionLine},pressed:{opacity:.76},disabled:{opacity:.45},
});

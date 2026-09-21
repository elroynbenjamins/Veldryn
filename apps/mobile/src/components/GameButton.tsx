import {useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text} from 'react-native';
import {radii,spacing,touchTargetMin,touchTargetPreferred,typography} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Tone='primary'|'secondary'|'danger';
type Props={title:string;onPress:()=>void;disabled?:boolean;loading?:boolean;selected?:boolean;tone?:Tone;compact?:boolean};
export function GameButton({title,onPress,disabled=false,loading=false,selected,tone='primary',compact=false}:Props){
  const C=useGameTheme();
  const [focused,setFocused]=useState(false),inactive=disabled||loading;
  const toneStyle=tone==='primary'?{borderColor:C.primaryButtonBorder,backgroundColor:C.primaryButton}:tone==='danger'?{borderColor:C.dangerButtonBorder,backgroundColor:C.dangerButton}:{borderColor:C.secondaryButtonBorder,backgroundColor:C.secondaryButton};
  const labelColor=tone==='primary'?C.primaryButtonText:tone==='danger'?C.dangerButtonText:C.secondaryButtonText;
  const selectedStyle=selected?{borderColor:C.selectionLine,backgroundColor:tone==='secondary'?C.selection:toneStyle.backgroundColor}:undefined;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:inactive,busy:loading,selected}}
    disabled={inactive} onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
    style={({pressed})=>[s.button,compact&&s.compact,toneStyle,selectedStyle,focused&&s.focused,pressed&&!inactive&&s.pressed,inactive&&s.disabled]}>
    {loading&&<ActivityIndicator color={labelColor} size="small"/>}
    <Text textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label,{color:labelColor}]}>{title}</Text>
  </Pressable>;
}
const s=StyleSheet.create({
  button:{minHeight:touchTargetPreferred,minWidth:0,maxWidth:'100%',paddingHorizontal:spacing.md,paddingVertical:10,justifyContent:'center',alignItems:'center',flexDirection:'row',gap:8,borderWidth:1,borderRadius:10},compact:{minHeight:touchTargetMin,paddingHorizontal:spacing.sm,paddingVertical:7,borderRadius:8},
  focused:{borderWidth:2},pressed:{opacity:.76,transform:[{translateY:1}]},disabled:{opacity:.45},label:{...typography.bodyStrong,textAlign:'center',flexShrink:1,includeFontPadding:false,textAlignVertical:'center'},
});

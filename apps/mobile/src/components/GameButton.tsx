import {useMemo,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text} from 'react-native';
import {radii,spacing,touchTargetPreferred,typography} from '../theme/theme';
import {useGameTheme,type ThemePalette} from '../theme/app-theme';

type Tone='primary'|'secondary'|'danger';
type Props={title:string;onPress:()=>void;disabled?:boolean;loading?:boolean;selected?:boolean;tone?:Tone;compact?:boolean};
export function GameButton({title,onPress,disabled=false,loading=false,selected,tone='primary',compact=false}:Props){
  const [focused,setFocused]=useState(false),inactive=disabled||loading;
  const theme=useGameTheme(),s=useMemo(()=>styles(theme),[theme]);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:inactive,busy:loading,selected}}
    disabled={inactive} onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
    style={({pressed})=>[s.button,compact&&s.compact,s[tone],focused&&s.focused,pressed&&!inactive&&s.pressed,inactive&&s.disabled]}>
    {loading&&<ActivityIndicator color={tone==='primary'?theme.actionText:theme.text} size="small"/>}
    <Text textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label,tone==='primary'&&s.primaryText,tone==='danger'&&s.dangerText]}>{title}</Text>
  </Pressable>;
}
const styles=(t:ThemePalette)=>StyleSheet.create({
  button:{minHeight:touchTargetPreferred,minWidth:0,maxWidth:'100%',paddingHorizontal:spacing.md,paddingVertical:9,justifyContent:'center',alignItems:'center',flexDirection:'row',gap:8,borderWidth:1,borderRadius:radii.sm},
  compact:{minHeight:40,paddingHorizontal:spacing.sm,paddingVertical:6,borderRadius:radii.sm},
  primary:{borderColor:t.action,backgroundColor:t.actionSurface},
  secondary:{borderColor:t.line,backgroundColor:t.panel2},
  danger:{borderColor:t.bad,backgroundColor:t.dark?'#321B22':'#FDECEE'},
  focused:{borderColor:t.accentSoft,borderWidth:2},
  pressed:{opacity:.76,transform:[{translateY:1}]},
  disabled:{opacity:.42},
  label:{...typography.bodyStrong,color:t.text,textAlign:'center',flexShrink:1,includeFontPadding:false,textAlignVertical:'center'},
  primaryText:{color:t.actionText},
  dangerText:{color:t.dark?'#FFD6D9':t.bad},
});

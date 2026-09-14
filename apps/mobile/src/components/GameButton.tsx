import {useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text} from 'react-native';
import {C,radii,spacing,touchTargetPreferred,typography} from '../theme/theme';

type Tone='primary'|'secondary'|'danger';
type Props={title:string;onPress:()=>void;disabled?:boolean;loading?:boolean;selected?:boolean;tone?:Tone;compact?:boolean};
export function GameButton({title,onPress,disabled=false,loading=false,selected,tone='primary',compact=false}:Props){
  const [focused,setFocused]=useState(false),inactive=disabled||loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:inactive,busy:loading,selected}}
    disabled={inactive} onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
    style={({pressed})=>[s.button,compact&&s.compact,s[tone],focused&&s.focused,pressed&&!inactive&&s.pressed,inactive&&s.disabled]}>
    {loading&&<ActivityIndicator color={C.text} size="small"/>}
    <Text textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label,tone==='danger'&&s.dangerText]}>{title}</Text>
  </Pressable>;
}
const s=StyleSheet.create({
  button:{minHeight:touchTargetPreferred,minWidth:0,maxWidth:'100%',paddingHorizontal:spacing.md,paddingVertical:10,justifyContent:'center',alignItems:'center',flexDirection:'row',gap:8,borderWidth:1,borderRadius:10},compact:{minHeight:40,paddingHorizontal:spacing.sm,paddingVertical:7,borderRadius:8},
  primary:{borderColor:'#58788C',backgroundColor:'#203C50'},secondary:{borderColor:'#304150',backgroundColor:'#152331'},danger:{borderColor:'#8E5158',backgroundColor:'#302027'},
  focused:{borderColor:'#A2E5ED'},pressed:{opacity:.76},disabled:{opacity:.45},label:{...typography.bodyStrong,color:C.text,textAlign:'center',flexShrink:1,includeFontPadding:false,textAlignVertical:'center'},dangerText:{color:'#F1B3B5'},
});

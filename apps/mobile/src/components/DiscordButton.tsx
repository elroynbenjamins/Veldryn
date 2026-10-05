import {useState} from 'react';
import {Image,Pressable,StyleSheet,Text} from 'react-native';
import {typography} from '../theme/theme';

export function DiscordButton({label,onPress}:{label:string;onPress:()=>void}){
  const [focused,setFocused]=useState(false);
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress}
    onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
    style={({pressed})=>[s.button,pressed&&s.pressed,focused&&s.focused]}>
    <Image source={require('../../assets/brands/discord-symbol-white.webp')} accessible={false} resizeMode="contain" style={s.logo}/>
    <Text style={s.label}>{label}</Text>
  </Pressable>;
}

const s=StyleSheet.create({
  button:{minHeight:48,minWidth:0,maxWidth:'100%',paddingHorizontal:16,paddingVertical:11,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,borderRadius:6,borderWidth:2,borderColor:'#5865F2',backgroundColor:'#5865F2'},
  pressed:{backgroundColor:'#4752C4',borderColor:'#4752C4'},
  focused:{borderColor:'#FFFFFF'},
  logo:{width:24,height:20,flexShrink:0},
  label:{...typography.bodyStrong,color:'#FFFFFF',flexShrink:1,textAlign:'center'},
});

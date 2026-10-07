import {ActivityIndicator,Pressable,Text} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

/** Shared, readable actions for party and guild surfaces. */
export function SocialActionButton({label,primary=false,onPress,disabled=false,busy=false}:{label:string;primary?:boolean;onPress?:()=>void;disabled?:boolean;busy?:boolean}){
 const C=useGameTheme(),inactive=disabled||busy||!onPress,color=primary?C.bg:C.text;
 return <Pressable accessibilityRole="button" accessibilityState={{disabled:inactive,busy}} disabled={inactive} onPress={onPress} style={({pressed})=>({minHeight:48,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:primary?C.good:C.line,backgroundColor:primary?C.good:C.panel,opacity:inactive?.45:pressed?.75:1})}>{busy&&<ActivityIndicator color={color}/>}<Text style={{fontSize:14,lineHeight:20,fontWeight:'600',color,textAlign:'center',flexShrink:1}}>{label}</Text></Pressable>;
}

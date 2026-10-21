import {ActivityIndicator,Pressable,Text} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {useRef,useState} from 'react';

/** Shared, readable actions for party and guild surfaces. */
export function SocialActionButton({label,primary=false,onPress,disabled=false,busy=false}:{label:string;primary?:boolean;onPress?:()=>unknown;disabled?:boolean;busy?:boolean}){
 const [pending,setPending]=useState(false),pendingRef=useRef(false);
 const C=useGameTheme(),working=busy||pending,inactive=disabled||working||!onPress,color=primary?C.bg:C.text;
 const execute=()=>{
  if(inactive||pendingRef.current||!onPress)return;
  pendingRef.current=true;
  try{
   const result=onPress();
   if(result&&typeof (result as PromiseLike<unknown>).then==='function'){
    setPending(true);
    void Promise.resolve(result).catch(error=>console.warn('[SocialActionButton] Action failed',error)).finally(()=>{pendingRef.current=false;setPending(false)});
   }else pendingRef.current=false;
  }catch(error){pendingRef.current=false;throw error;}
 };
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:inactive,busy:working}} disabled={inactive} onPress={execute} style={({pressed})=>({minHeight:48,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:primary?C.good:C.line,backgroundColor:primary?C.good:C.panel,opacity:inactive&&!working?.45:pressed&&!inactive?.75:1})}>{working&&<ActivityIndicator color={color}/>}<Text style={{fontSize:14,lineHeight:20,fontWeight:'600',color,textAlign:'center',flexShrink:1}}>{label}</Text></Pressable>;
}

import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {openAppReview} from '../app-review';
import {accountText} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,type ThemeColors} from '../theme/theme';
import {UiIcon} from './UiIcon';

export function RateAppCard({language}:{language:Language}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),[error,setError]=useState(false);
 const a=(text:string)=>accountText(language,text);
 return <View style={s.root}>
  <Pressable accessibilityRole="link" accessibilityLabel={a('Rate VELDRYN')} accessibilityHint={a('Leave a review on Google Play')} onPress={()=>{setError(false);void openAppReview().catch(()=>setError(true));}} style={({pressed})=>[s.card,pressed&&s.pressed]}>
   <Text style={s.title}>{a('Rate VELDRYN')}</Text><Text accessible={false} style={s.stars}>☆ ☆ ☆ ☆ ☆</Text><UiIcon name="next" size={18}/>
  </Pressable>
  {error?<Text accessibilityRole="alert" style={s.error}>{a('Could not open Google Play. Please try again.')}</Text>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:5},
 card:{minHeight:50,paddingHorizontal:12,paddingVertical:9,gap:10,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 title:{flex:1,minWidth:0,fontSize:13,lineHeight:19,fontWeight:'700',color:C.text},
 stars:{fontSize:13,color:C.warning},
 error:{fontSize:11,lineHeight:16,color:C.bad},
 pressed:{opacity:.72},
});}

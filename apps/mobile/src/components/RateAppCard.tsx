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
   <View style={s.copy}><Text accessible={false} style={s.stars}>☆ ☆ ☆ ☆ ☆</Text><Text style={s.title}>{a('Rate VELDRYN')}</Text><Text style={s.detail}>{a('Leave a review on Google Play')}</Text></View><UiIcon name="next" size={20}/>
  </Pressable>
  {error?<Text accessibilityRole="alert" style={s.error}>{a('Could not open Google Play. Please try again.')}</Text>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:5},card:{minHeight:88,padding:12,gap:10,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},copy:{flex:1,minWidth:0,gap:3},stars:{fontSize:22,lineHeight:28,color:C.warning},title:{fontSize:14,lineHeight:20,fontWeight:'700',color:C.text},detail:{fontSize:11,lineHeight:16,color:C.muted},error:{fontSize:11,lineHeight:16,color:C.bad},pressed:{opacity:.72},
});}

import {ActivityIndicator,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {appText} from '../i18n/app-shell';
import type {Language} from '../i18n';

export function OfflineProgressLoading({language,settlingRewards=false}:{language:Language;settlingRewards?:boolean}){
 const C=useGameTheme();
 return <View accessibilityLiveRegion="polite" accessibilityState={{busy:true}} style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:C.bg}}>
  <View style={{width:'100%',maxWidth:420,padding:24,gap:14,borderRadius:16,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.line}}>
   <ActivityIndicator color={C.info}/>
   <Text style={{fontSize:20,lineHeight:27,fontWeight:'600',color:C.text,textAlign:'center'}}>{appText(language,settlingRewards?'Calculating offline rewards…':'Loading…')}</Text>
   {settlingRewards&&<Text style={{fontSize:14,lineHeight:21,color:C.muted,textAlign:'center'}}>{appText(language,'Loading your progress from while you were away.')}</Text>}
  </View>
 </View>;
}

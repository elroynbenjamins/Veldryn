import {creationT,creationText} from '../i18n/creation';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {MainScreenTourStep} from '../core/main-screen-tour';
import {useGameTheme} from '../theme/ThemeContext';
import {OnboardingModalShell} from './OnboardingModalShell';

export function MainScreenTourPopup({step,index,total,onBack,onNext,onSkip}:{step?:MainScreenTourStep;index:number;total:number;onBack:()=>void;onNext:()=>void;onSkip:()=>void}){
 const language=useGameLanguage(),C=useGameTheme();
 if(!step)return null;
 const last=index>=total-1;
 return <OnboardingModalShell onClose={onSkip} footer={<View style={s.actions}>
  <Pressable accessibilityRole="button" onPress={onSkip} style={({pressed})=>[s.secondary,{borderColor:C.line},pressed&&s.pressed]}><Text style={[s.secondaryText,{color:C.muted}]}>{creationText(language,'Skip tour')}</Text></Pressable>
  {index>0?<Pressable accessibilityRole="button" onPress={onBack} style={({pressed})=>[s.secondary,{borderColor:C.line},pressed&&s.pressed]}><Text style={[s.secondaryText,{color:C.text}]}>{creationT(language,'Back')}</Text></Pressable>:null}
  <Pressable accessibilityRole="button" onPress={onNext} style={({pressed})=>[s.primary,{backgroundColor:C.accent},pressed&&s.pressed]}><Text style={[s.primaryText,{color:C.bg}]}>{creationText(language,last?'Finish tour':'Next screen')}</Text></Pressable>
 </View>}>
  <Text style={[s.eyebrow,{color:C.accent}]}>{creationText(language,'MAIN SCREEN TOUR')} · {index+1}/{total}</Text>
  <Text accessibilityRole="header" style={[s.title,{color:C.text}]}>{creationText(language,step.title)}</Text>
  <Text style={[s.body,{color:C.text}]}>{creationText(language,step.body)}</Text>
  <View style={s.points}>{step.points.map((point,pointIndex)=><View key={point} style={[s.point,{backgroundColor:C.selection,borderColor:C.line}]}><Text style={[s.number,{color:C.accent}]}>{pointIndex+1}</Text><Text style={[s.pointText,{color:C.muted}]}>{creationText(language,point)}</Text></View>)}</View>
 </OnboardingModalShell>;
}
const s=StyleSheet.create({eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.05},title:{fontSize:22,lineHeight:27,fontWeight:'900'},body:{fontSize:15,lineHeight:21},points:{gap:8},point:{flexDirection:'row',alignItems:'flex-start',gap:9,borderWidth:1,borderRadius:12,padding:11},number:{fontSize:12,fontWeight:'900',minWidth:16},pointText:{flex:1,fontSize:14,lineHeight:20},actions:{flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',gap:8},secondary:{minHeight:44,justifyContent:'center',paddingHorizontal:14,paddingVertical:10,borderWidth:1,borderRadius:12},secondaryText:{fontSize:14,fontWeight:'700'},primary:{minHeight:44,flexShrink:1,justifyContent:'center',paddingHorizontal:18,paddingVertical:10,borderRadius:12},primaryText:{fontSize:14,fontWeight:'900',textAlign:'center'},pressed:{opacity:.72}});

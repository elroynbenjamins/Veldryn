import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {FirstSessionTutorialStep} from '../core/first-session-tutorial';
import {useGameTheme} from '../theme/ThemeContext';
import {OnboardingModalShell} from './OnboardingModalShell';

export function FirstSessionTutorialPopup({step,onLater,onOpen}:{step?:FirstSessionTutorialStep;onLater:()=>void;onOpen:()=>void}){
 const C=useGameTheme();
 if(!step)return null;
 return <OnboardingModalShell onClose={onLater} footer={<View style={s.actions}>
  <Pressable accessibilityRole="button" onPress={onLater} style={({pressed})=>[s.secondary,{borderColor:C.line},pressed&&s.pressed]}><Text style={[s.secondaryText,{color:C.muted}]}>Later</Text></Pressable>
  <Pressable accessibilityRole="button" onPress={onOpen} style={({pressed})=>[s.primary,{backgroundColor:C.accent},pressed&&s.pressed]}><Text style={[s.primaryText,{color:C.bg}]}>{step.actionLabel}</Text></Pressable>
 </View>}>
  <Text style={[s.eyebrow,{color:C.accent}]}>{step.eyebrow}</Text>
  <Text accessibilityRole="header" style={[s.title,{color:C.text}]}>{step.title}</Text>
  <Text style={[s.body,{color:C.text}]}>{step.body}</Text>
  <View style={[s.hint,{backgroundColor:C.selection,borderColor:C.line}]}><Text style={[s.hintText,{color:C.muted}]}>{step.hint}</Text></View>
 </OnboardingModalShell>;
}
const s=StyleSheet.create({eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.1},title:{fontSize:22,lineHeight:27,fontWeight:'900'},body:{fontSize:15,lineHeight:21},hint:{borderWidth:1,borderRadius:12,padding:12},hintText:{fontSize:14,lineHeight:20},actions:{flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',gap:10},secondary:{minHeight:44,justifyContent:'center',paddingHorizontal:16,paddingVertical:10,borderWidth:1,borderRadius:12},secondaryText:{fontSize:14,fontWeight:'700'},primary:{minHeight:44,flexShrink:1,justifyContent:'center',paddingHorizontal:18,paddingVertical:10,borderRadius:12},primaryText:{fontSize:14,fontWeight:'900',textAlign:'center'},pressed:{opacity:.72}});

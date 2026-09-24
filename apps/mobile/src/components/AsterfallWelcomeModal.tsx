import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {ClassId} from '../core/types';
import {CLASSES} from '../content/classes';
import {QUESTS} from '../content/quests';
import {useGameTheme} from '../theme/ThemeContext';
import {OnboardingModalShell} from './OnboardingModalShell';

export function AsterfallWelcomeModal({visible,name,classId,onContinue}:{visible:boolean;name:string;classId:ClassId;onContinue:()=>void}){
 const C=useGameTheme(),className=CLASSES.find(row=>row.id===classId)?.name??'Adventurer';
 if(!visible)return null;
 const firstObjective=QUESTS.find(row=>row.id==='QST_001');
 return <OnboardingModalShell onClose={onContinue} footer={<Pressable accessibilityRole="button" onPress={onContinue} style={({pressed})=>[s.button,{backgroundColor:C.accent},pressed&&s.pressed]}><Text style={[s.buttonText,{color:C.bg}]}>Begin Journey</Text></Pressable>}>
  <Text style={[s.kicker,{color:C.accent}]}>WELCOME TO ASTERFALL</Text>
  <Text accessibilityRole="header" style={[s.title,{color:C.text}]}>{name}</Text>
  <Text style={[s.className,{color:C.accentSoft}]}>{className}</Text>
  <Text style={[s.body,{color:C.muted}]}>One small task to begin. There is no need to learn every screen yet.</Text>
  <View style={[s.next,{backgroundColor:C.selection,borderColor:C.line}]}><Text style={[s.nextLabel,{color:C.accent}]}>FIRST OBJECTIVE</Text><Text style={[s.nextText,{color:C.text}]}>{firstObjective?.description??'Your first task awaits.'}</Text></View>
 </OnboardingModalShell>;
}
const s=StyleSheet.create({kicker:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:1.8,textAlign:'center'},title:{fontSize:28,lineHeight:34,fontWeight:'900',textAlign:'center'},className:{fontSize:14,lineHeight:20,fontWeight:'800',textAlign:'center'},body:{fontSize:14,lineHeight:21,textAlign:'center'},next:{borderWidth:1,borderRadius:14,padding:14,gap:5,marginTop:4},nextLabel:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:1.1},nextText:{fontSize:14,lineHeight:20,fontWeight:'700'},button:{minHeight:48,borderRadius:14,paddingHorizontal:14,paddingVertical:12,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:15,fontWeight:'900',textAlign:'center'},pressed:{opacity:.72}});

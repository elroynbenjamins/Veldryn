import {StyleSheet,Text,View} from 'react-native';
import type {ClassId} from '../core/types';
import {classSkillAffinity,classSkillAffinityLabel} from '../core/class-skill-affinities';
import {useGameTheme} from '../theme/ThemeContext';

export function ClassSkillAffinityNote({classId,skillId,compact=false}:{classId?:ClassId;skillId?:string;compact?:boolean}){
 const C=useGameTheme(),affinity=classSkillAffinity(classId);
 if(!affinity||(skillId!==undefined&&skillId!==affinity))return null;
 const label=classSkillAffinityLabel(classId);
 if(compact)return <Text style={[s.compact,{color:C.accent}]} accessibilityLabel={'Natural affinity: '+label}>Natural affinity: {label}</Text>;
 return <View style={[s.card,{backgroundColor:C.panel2,borderColor:C.line}]}>
  <Text style={[s.heading,{color:C.accent}]}>CLASS AFFINITY</Text>
  <Text style={[s.value,{color:C.text}]}>{label}</Text>
  <Text style={[s.detail,{color:C.muted}]}>Applies to this character’s new actions. Materials and Gold per action stay the same; XP earns the stated bonus. All other skills remain available at normal rates.</Text>
 </View>;
}
const s=StyleSheet.create({compact:{fontSize:14,lineHeight:21,textAlign:'center',fontWeight:'900'},card:{borderWidth:1,borderRadius:12,padding:12,gap:4},heading:{fontSize:10,lineHeight:14,letterSpacing:1,fontWeight:'900'},value:{fontSize:14,lineHeight:20,fontWeight:'700'},detail:{fontSize:12,lineHeight:18}});

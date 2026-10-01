import {creationT,creationText} from '../i18n/creation';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import type {Language} from '../i18n/languages';
import {StyleSheet,Text,View} from 'react-native';
import type {ClassId} from '../core/types';
import {classSkillAffinity} from '../core/class-skill-affinities';
import {useGameTheme} from '../theme/ThemeContext';

export function ClassSkillAffinityNote({classId,skillId,compact=false,language:languageProp}:{language?:Language;classId?:ClassId;skillId?:string;compact?:boolean}){
 const gameLanguage=useGameLanguage(),language=languageProp??gameLanguage;
 const C=useGameTheme(),affinity=classSkillAffinity(classId);
 if(!affinity||(skillId!==undefined&&skillId!==affinity))return null;
 const label=creationT(language,'{skill} · +5% XP · +3% speed',{skill:creationText(language,affinity)});
 if(compact)return <Text style={[s.compact,{color:C.accent}]} accessibilityLabel={creationT(language,'Natural affinity: {label}',{label})}>{creationT(language,'Natural affinity: {label}',{label})}</Text>;
 return <View style={[s.card,{backgroundColor:C.panel2,borderColor:C.line}]}>
  <Text style={[s.heading,{color:C.accent}]}>{creationT(language,"CLASS AFFINITY")}</Text>
  <Text style={[s.value,{color:C.text}]}>{label}</Text>
  <Text style={[s.detail,{color:C.muted}]}>{creationT(language,"Applies to this character’s new actions. Materials and Gold per action stay the same; XP earns the stated bonus. All other skills remain available at normal rates.")}</Text>
 </View>;
}
const s=StyleSheet.create({compact:{fontSize:12,lineHeight:18,textAlign:'center',fontWeight:'700'},card:{borderWidth:1,borderRadius:12,padding:12,gap:4},heading:{fontSize:10,lineHeight:14,letterSpacing:1,fontWeight:'900'},value:{fontSize:14,lineHeight:20,fontWeight:'700'},detail:{fontSize:12,lineHeight:18}});

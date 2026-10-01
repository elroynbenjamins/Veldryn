import {creationT as ct,creationText} from '../../i18n/creation';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import type {Language} from '../../i18n/languages';
import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {classSelectionDetails} from '../../core/class-selection';
import type {ClassId} from '../../core/types';
import {classSkillIcon} from '../../theme/class-skill-assets';
import {useGameTheme} from '../../theme/ThemeContext';
import type {ThemeColors} from '../../theme/theme';

export function ClassCombatOverview({classId,language:languageProp}:{classId:ClassId;language?:Language}){
 const gameLanguage=useGameLanguage(),language=languageProp??gameLanguage;
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const details=classSelectionDetails(classId);
 return <View style={s.root}>
  <View style={s.headingRow}><Text style={s.heading}>{ct(language,"Encounter abilities")}</Text><Text style={s.meta}>{ct(language,"Automatic")}</Text></View>
  {details.abilities.map(ability=><View key={ability.id} style={s.ability}>
   <Image accessible={false} source={classSkillIcon(ability.icon)} style={s.icon} resizeMode="contain"/>
   <View style={s.copy}><Text style={s.name}>{ability.name}</Text><><Text style={s.body}>{creationText(language,ability.summary)}</Text><Text style={s.meta}>{ct(language,'{seconds}s base cooldown',{seconds:ability.cooldownSeconds})}{ability.castSeconds>0?' / '+ct(language,'{seconds}s cast',{seconds:ability.castSeconds}):''}</Text></></View>
  </View>)}
  <View style={s.idle}>
   <Text style={s.heading}>{ct(language,"Idle hunting")}</Text><Text style={s.name}>{details.style.name}</Text>
   <View style={s.statRow}><Text style={s.body}>{ct(language,"Hunt speed")}</Text><Text style={[s.value,{color:details.speedPercent>0?C.good:C.text}]}>{details.speedPercent>0?'+':''}{details.speedPercent}%</Text></View>
   <View style={s.statRow}><Text style={s.body}>{ct(language,"Damage taken")}</Text><Text style={[s.value,{color:details.damageTakenPercent>0?C.warning:details.damageTakenPercent<0?C.good:C.text}]}>{details.damageTakenPercent>0?'+':''}{details.damageTakenPercent}%</Text></View>
   <Text style={s.meta}>{ct(language,"Encounter abilities do not activate during idle hunting.")}</Text>
  </View>
  <View style={s.progression}><Text style={s.heading}>{ct(language,"Skill progression")}</Text><Text style={s.body}>{creationText(language,details.progression+' bonuses from combat XP.')}</Text><View style={s.skills}>{details.skills.map(skill=><View key={skill.id} style={s.skill}><Image accessible={false} source={classSkillIcon(skill.id)} style={s.skillIcon} resizeMode="contain"/><Text style={s.skillName}>{skill.name}</Text></View>)}</View></View>
 </View>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 root:{borderTopWidth:1,borderColor:C.line,paddingTop:14,gap:8},headingRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:6},heading:{fontSize:15,lineHeight:21,fontWeight:'800',color:C.text},meta:{fontSize:12,lineHeight:18,color:C.muted},ability:{flexDirection:'row',alignItems:'center',gap:10,minHeight:44},icon:{width:36,height:36},copy:{flex:1,minWidth:0,gap:4},name:{fontSize:14,lineHeight:20,fontWeight:'700',color:C.text},body:{fontSize:13,lineHeight:20,color:C.muted,flexShrink:1},idle:{borderTopWidth:1,borderColor:C.line,paddingTop:14,gap:6},statRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},value:{fontSize:14,lineHeight:20,fontWeight:'800'},progression:{borderTopWidth:1,borderColor:C.line,paddingTop:14,gap:6},skills:{flexDirection:'row',flexWrap:'wrap',gap:12},skill:{flexDirection:'row',alignItems:'center',gap:6,flexShrink:1},skillIcon:{width:28,height:28},skillName:{fontSize:13,lineHeight:19,color:C.text,flexShrink:1},
});}

import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useSocialText} from '../i18n/social';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import type {RecruitmentActivityLevel,RecruitmentMainInterest} from '../core/party-social';

const interests:readonly RecruitmentMainInterest[]=['combat','skilling','crafting','mixed'];
const activityLevels:readonly RecruitmentActivityLevel[]=['casual','regular','active','hardcore'];
const activityHint:Record<RecruitmentActivityLevel,string>={
 casual:'Occasional play, no pressure.',
 regular:'Plays several times a week.',
 active:'Plays most days.',
 hardcore:'Very dedicated, frequent play.',
};

/** Fixed-width four-choice rows: do not wrap into the old multi-row recruitment form. */
export function RecruitmentQuickPostChoices({interest,activityLevel,onInterestChange,onActivityChange}:{
 interest:RecruitmentMainInterest;
 activityLevel:RecruitmentActivityLevel;
 onInterestChange:(value:RecruitmentMainInterest)=>void;
 onActivityChange:(value:RecruitmentActivityLevel)=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),st=useSocialText();
 return <View style={s.root}>
  <View style={s.section}>
   <Text style={s.label}>{st('Main interest')}</Text>
   <View accessibilityRole="radiogroup" style={s.choices}>
    {interests.map(option=><Choice key={option} label={st(option.charAt(0).toUpperCase()+option.slice(1))} selected={interest===option} onPress={()=>onInterestChange(option)}/>)}
   </View>
  </View>
  <View style={s.section}>
   <Text style={s.label}>{st('Expected activity')}</Text>
   <View accessibilityRole="radiogroup" style={s.choices}>
    {activityLevels.map(option=><Choice key={option} label={st(option.charAt(0).toUpperCase()+option.slice(1))} selected={activityLevel===option} onPress={()=>onActivityChange(option)}/>)}
   </View>
   <Text style={s.hint}>{st(activityHint[activityLevel])}</Text>
  </View>
 </View>;
}

function Choice({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected}} onPress={onPress} style={({pressed})=>[s.choice,selected&&s.selected,pressed&&s.pressed]}>
  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[s.choiceText,selected&&s.selectedText]}>{label}</Text>
 </Pressable>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:12},section:{gap:7},label:{fontSize:12,fontWeight:'800',color:C.text},
 choices:{flexDirection:'row',flexWrap:'nowrap',gap:4},
 choice:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:2,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},
 selected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 choiceText:{fontSize:11,fontWeight:'800',color:C.muted,textAlign:'center'},
 selectedText:{color:C.text},pressed:{opacity:0.72},
 hint:{fontSize:11,lineHeight:15,color:C.muted},
});}

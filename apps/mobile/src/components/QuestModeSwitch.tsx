import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export type QuestMode='story'|'contracts'|'challenges';

const LABELS:Record<QuestMode,string>={story:'Journal',contracts:'Contracts',challenges:'Challenges'};

export function QuestModeSwitch({mode,onChange,storyMeta,contractMeta,challengeMeta,storyAttention=0,contractAttention=0,challengeAttention=0}:{mode:QuestMode;onChange:(mode:QuestMode)=>void;storyMeta:string;contractMeta:string;challengeMeta:string;storyAttention?:number;contractAttention?:number;challengeAttention?:number}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const rows:[QuestMode,string,number][]=[['story',storyMeta,storyAttention],['contracts',contractMeta,contractAttention],['challenges',challengeMeta,challengeAttention]];
 return <View accessibilityRole="tablist" style={s.tabs}>
  {rows.map(([id,meta,attention])=>{const selected=mode===id;return <Pressable key={id} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={LABELS[id]+', '+meta} onPress={()=>onChange(id)} style={({pressed})=>[s.tab,selected&&s.tabSelected,pressed&&s.pressed]}>
   <View style={s.labelRow}><Text style={[s.label,selected&&s.labelSelected]}>{p(LABELS[id])}</Text>{attention>0?<View style={s.badge}><Text style={s.badgeText}>{attention>9?'9+':attention}</Text></View>:null}</View>
   <Text style={[s.meta,selected&&s.metaSelected]}>{meta}</Text>
  </Pressable>})}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 tabs:{flexDirection:'row',gap:6},
 tab:{flex:1,minWidth:0,minHeight:66,justifyContent:'center',gap:5,paddingHorizontal:4,paddingVertical:10,borderBottomWidth:2,borderColor:C.line},
 tabSelected:{borderColor:C.accent,backgroundColor:C.selection},
 labelRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:5},label:{fontSize:12,lineHeight:17,color:C.muted,fontWeight:'600',textAlign:'center'},labelSelected:{color:C.text},meta:{fontSize:11,lineHeight:15,color:C.muted,textAlign:'center',fontWeight:'500'},metaSelected:{color:C.text},
 badge:{minWidth:18,height:18,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:99,backgroundColor:C.good},badgeText:{fontSize:8,lineHeight:10,color:C.dark?C.bg:C.primaryButtonText,fontWeight:'900'},pressed:{opacity:.72,transform:[{translateY:1}]},
 });}

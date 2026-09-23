import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {equipmentTheme,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export type QuestMode='story'|'contracts'|'challenges';

const LABELS:Record<QuestMode,string>={story:'Journal',contracts:'Contracts',challenges:'Challenges'};

export function QuestModeSwitch({mode,onChange,storyMeta,contractMeta,challengeMeta,storyAttention=0,contractAttention=0,challengeAttention=0}:{mode:QuestMode;onChange:(mode:QuestMode)=>void;storyMeta:string;contractMeta:string;challengeMeta:string;storyAttention?:number;contractAttention?:number;challengeAttention?:number}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const rows:[QuestMode,string,number][]=[['story',storyMeta,storyAttention],['contracts',contractMeta,contractAttention],['challenges',challengeMeta,challengeAttention]];
 return <View accessibilityRole="tablist" style={s.tabs}>
  {rows.map(([id,meta,attention])=>{const selected=mode===id;return <Pressable key={id} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={LABELS[id]+', '+meta} onPress={()=>onChange(id)} style={({pressed})=>[s.tab,selected&&s.tabSelected,pressed&&s.pressed]}>
   <View style={s.labelRow}><Text numberOfLines={1} style={[s.label,selected&&s.labelSelected]}>{LABELS[id]}</Text>{attention>0?<View style={s.badge}><Text style={s.badgeText}>{attention>9?'9+':attention}</Text></View>:null}</View>
   <Text numberOfLines={1} style={[s.meta,selected&&s.metaSelected]}>{meta}</Text>
  </Pressable>})}
 </View>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 tabs:{flexDirection:'row',gap:6},
 tab:{flex:1,minWidth:0,minHeight:58,justifyContent:'center',gap:3,paddingHorizontal:8,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 tabSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},
 labelRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},label:{...typography.caption,color:C.muted,fontWeight:'900'},labelSelected:{color:C.text},meta:{fontSize:9,lineHeight:12,color:C.muted,textAlign:'center',fontWeight:'700'},metaSelected:{color:C.info},
 badge:{minWidth:18,height:18,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:99,backgroundColor:C.good},badgeText:{fontSize:8,lineHeight:10,color:C.dark?C.bg:C.primaryButtonText,fontWeight:'900'},pressed:{opacity:.72,transform:[{translateY:1}]},
 });}

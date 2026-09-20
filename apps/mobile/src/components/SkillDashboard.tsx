import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState,SkillId} from '../core/types';
import {characterProgressWithinLevel,progressWithinLevel} from '../core/progression';
import {C,radii,spacing,typography} from '../theme/theme';
import {useGameTheme,type ThemePalette} from '../theme/app-theme';
import type {ActivityIconId} from '../theme/skill-assets';
import {ActivityArtwork} from './ActivityArtwork';
import {StatBar} from './StatBar';
const skillMeta:Partial<Record<SkillId,{label:string;category:string}>>={
 woodcutting:{label:'Woodcutting',category:'Gathering'},mining:{label:'Mining',category:'Gathering'},
 fishing:{label:'Fishing',category:'Gathering'},smithing:{label:'Smithing',category:'Crafting'},cooking:{label:'Cooking',category:'Crafting'},
};
export function SkillDashboard({state,onCombat,onSkill}:{state:GameState;onCombat:()=>void;onSkill:(skillId:SkillId)=>void}){
 const T=useGameTheme(),s=useMemo(()=>makeStyles(T),[T]);
 const character=state.character!,combat=characterProgressWithinLevel(character.xp,character.level),{width,fontScale}=useWindowDimensions();
 const cardWidth=width<360&&fontScale>1.25?'100%':width>=430&&fontScale<=1.15?'31%':'48%';
 const totalLevel=character.level+state.skills.reduce((sum,skill)=>sum+skill.level,0);
 const card=(id:ActivityIconId,label:string,category:string,level:number,current:number,need:number,onPress:()=>void)=><Pressable key={id} accessibilityRole="button" accessibilityLabel={`${label}, level ${level}`} accessibilityHint={`Open ${label}`} onPress={onPress} style={({pressed})=>[s.card,{width:cardWidth},pressed&&s.pressed]}>
  <View style={s.cardTop}><ActivityArtwork id={id}/><Text style={s.level}>{level}</Text></View>
  <Text style={s.label}>{label}</Text><Text style={s.category}>{category}</Text>
  <StatBar label="XP" current={current} max={need} reduceMotion={state.settings.reduceMotion}/>
 </Pressable>;
 return <View style={s.root}><View style={s.heading}><Text accessibilityRole="header" style={s.title}>Skills & activities</Text><Text style={s.total}>Total level {totalLevel}</Text></View><View style={s.grid}>
  {card('combat','Combat','Fighting',character.level,combat.current,combat.need,onCombat)}
  {state.skills.map(skill=>{const meta=skillMeta[skill.skillId]??{label:skill.skillId,category:'Progression'},p=progressWithinLevel(skill.xp,skill.level);return card(skill.skillId,meta.label,meta.category,skill.level,p.current,p.need,()=>onSkill(skill.skillId))})}
 </View></View>;
}
const makeStyles=(T:ThemePalette)=>StyleSheet.create({root:{gap:spacing.md},heading:{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',justifyContent:'space-between',gap:8},title:{...typography.title,color:T.text},total:{...typography.caption,color:T.muted},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:spacing.sm},card:{minHeight:150,padding:12,gap:5,backgroundColor:T.panel,borderWidth:1,borderColor:T.line,borderRadius:radii.md},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},pressed:{opacity:.76},label:{...typography.bodyStrong,color:T.text},category:{...typography.caption,color:T.muted},level:{...typography.title,color:T.accent}});

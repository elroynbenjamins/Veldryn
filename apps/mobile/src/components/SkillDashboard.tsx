import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState,SkillId} from '../core/types';
import {characterProgressWithinLevel,progressWithinLevel} from '../core/progression';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

const skillMeta:Record<SkillId,{label:string;symbol:string;category:string;color:string}>={
  woodcutting:{label:'Woodcutting',symbol:'♣',category:'Gathering',color:C.good},
  mining:{label:'Mining',symbol:'◆',category:'Gathering',color:C.good},
  fishing:{label:'Fishing',symbol:'≈',category:'Gathering',color:C.good},
  smithing:{label:'Smithing',symbol:'⚒',category:'Crafting',color:C.info},
  cooking:{label:'Cooking',symbol:'♨',category:'Crafting',color:C.info},
};

export function SkillDashboard({state,onCombat,onSkill}:{state:GameState;onCombat:()=>void;onSkill:(skillId:SkillId)=>void}){
  const character=state.character!,combatProgress=characterProgressWithinLevel(character.xp,character.level);
  const totalLevel=character.level+state.skills.reduce((sum,skill)=>sum+skill.level,0);
  return <View style={s.root}>
    <View style={s.summary}><Text style={s.summaryLabel}>COMBAT LEVEL</Text><Text style={s.combatLevel}>{character.level}</Text><Text style={s.total}>Total level: {totalLevel}</Text></View>
    <Text style={s.section}>ACTIVITIES · TAP TO OPEN</Text>
    <View style={s.grid}>
      <SkillCard symbol="⚔" label="Combat" category="Fighting" level={character.level} current={combatProgress.current} need={combatProgress.need} color="#d78383" onPress={onCombat}/>
      {state.skills.map(skill=>{const meta=skillMeta[skill.skillId],progress=progressWithinLevel(skill.xp,skill.level);return <SkillCard key={skill.skillId} {...meta} level={skill.level} current={progress.current} need={progress.need} onPress={()=>onSkill(skill.skillId)}/>})}
    </View>
  </View>;
}

function SkillCard({symbol,label,category,level,current,need,color,onPress}:{symbol:string;label:string;category:string;level:number;current:number;need:number;color:string;onPress:()=>void}){
  const pct=`${Math.max(2,Math.min(100,current/Math.max(1,need)*100))}%` as `${number}%`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}, level ${level}`} accessibilityHint={`Open ${label}`} onPress={onPress} style={({pressed})=>[s.card,pressed&&s.pressed]}>
    <Text style={[s.symbol,{color}]}>{symbol}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={s.label}>{label}</Text><Text style={[s.category,{color}]}>{category}</Text><Text style={s.level}>{level}</Text><View style={s.track}><View style={[s.fill,{width:pct}]}/></View><Text numberOfLines={1} style={s.xp}>{Math.max(0,need-current).toLocaleString()} XP to next</Text>
  </Pressable>;
}

const s=StyleSheet.create({root:{gap:spacing.md},summary:{minHeight:112,justifyContent:'center',padding:spacing.lg,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},summaryLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1.2},combatLevel:{fontSize:32,lineHeight:38,color:'#bd91ff',fontWeight:'900'},total:{...typography.body,color:C.muted},section:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1.1},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:spacing.sm},card:{width:'31%',minHeight:166,alignItems:'center',justifyContent:'center',paddingHorizontal:spacing.xs,paddingVertical:spacing.sm,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},pressed:{opacity:.7,transform:[{translateY:1}]},symbol:{fontSize:29,lineHeight:35,fontWeight:'900'},label:{width:'100%',...typography.bodyStrong,color:C.text,textAlign:'center'},category:{fontSize:10,fontWeight:'900'},level:{fontSize:23,lineHeight:28,color:C.text,fontWeight:'900',marginTop:spacing.xs},track:{width:'100%',height:7,overflow:'hidden',marginTop:spacing.xs,backgroundColor:'#070c13',borderRadius:4},fill:{height:'100%',backgroundColor:'#5ba7ef',borderRadius:4},xp:{width:'100%',marginTop:3,fontSize:9,color:C.muted,textAlign:'center'}});

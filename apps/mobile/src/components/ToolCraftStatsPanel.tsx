import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GatheringToolDef} from '../content/gathering-tools';
import {
 CRAFTED_COMMON_CHANCE,CRAFTED_UNCOMMON_CHANCE,CRAFTED_RARE_CHANCE,
 CRAFTED_EPIC_CHANCE,CRAFTED_LEGENDARY_CHANCE,CRAFTED_MYTHIC_CHANCE,
} from '../core/crafted-gear-rarity';
import {
 GATHERING_TOOL_SPEED_RANGE_BPS,GATHERING_TOOL_RARITY_RANGE_BPS,
 gatheringToolBonusRange,gatheringToolQualityMultiplier,
} from '../core/gathering-tool-rolls';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

const odds=[
 {id:'common',label:'Common',chance:CRAFTED_COMMON_CHANCE},
 {id:'uncommon',label:'Uncommon',chance:CRAFTED_UNCOMMON_CHANCE},
 {id:'rare',label:'Rare',chance:CRAFTED_RARE_CHANCE},
 {id:'epic',label:'Epic',chance:CRAFTED_EPIC_CHANCE},
 {id:'legendary',label:'Legendary',chance:CRAFTED_LEGENDARY_CHANCE},
 {id:'mythic',label:'Mythic',chance:CRAFTED_MYTHIC_CHANCE},
] as const;
const percentage=(chance:number)=>(chance*100).toFixed(2)+'%';
const range=(values:readonly [number,number])=>'+'+(values[0]/100).toFixed(0)+'–'+(values[1]/100).toFixed(0)+'%';

/** Only for minted gathering tools; reads the same affix/rarity constants as the 2.0 mint. */
export function ToolCraftStatsPanel({tool,actionTimeMultiplier}:{tool:GatheringToolDef;actionTimeMultiplier:number}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{gt,gl}=useGameplayText();
 const [showOdds,setShowOdds]=useState(false),[showRules,setShowRules]=useState(false);
 const xp=gatheringToolBonusRange(tool.id,'xp');
 const bonuses=[
  {key:'speed',label:gt('Gathering speed'),value:range(GATHERING_TOOL_SPEED_RANGE_BPS),color:C.info},
  {key:'rarity',label:gt('Rare finds'),value:range(GATHERING_TOOL_RARITY_RANGE_BPS),color:C.special},
  ...(xp?[{key:'xp',label:gt('Skill XP gain'),value:range(xp),color:C.good}]:[]),
 ];
 const rarePlus=CRAFTED_RARE_CHANCE+CRAFTED_EPIC_CHANCE+CRAFTED_LEGENDARY_CHANCE+CRAFTED_MYTHIC_CHANCE;
 const epicPlus=CRAFTED_EPIC_CHANCE+CRAFTED_LEGENDARY_CHANCE+CRAFTED_MYTHIC_CHANCE;
 const base=Math.round((1-actionTimeMultiplier)*100);
 const qualityEffect=(q:number)=>Math.round((gatheringToolQualityMultiplier(q)-1)*100);
 return <View style={s.root}>
  <View style={s.base}>
   <View style={s.copy}>
    <Text style={s.eyebrow}>{gt('BASE TOOL EFFECT')}</Text>
    <Text style={s.baseLabel}>{gl(tool.skillId)} · {gt('Shorter action time')}</Text>
   </View>
   <Text style={s.baseValue}>−{base}%</Text>
  </View>
  <View style={s.section}>
   <Text style={s.sectionTitle}>{gt('Possible bonus roll')}</Text>
   <View style={s.bonusGrid}>{bonuses.map(bonus=><View key={bonus.key} style={s.bonusCard}>
    <Text style={[s.bonusLabel,{color:bonus.color}]} numberOfLines={2}>{bonus.label}</Text>
    <Text style={s.bonusValue}>{bonus.value}</Text>
   </View>)}</View>
   <Text style={s.hint}>{gt('One random bonus per crafted tool.')}{xp?' '+gt('Skill XP applies only to this tool’s skill.') : ''}</Text>
  </View>
  <View style={s.section}>
   <Text style={s.sectionTitle}>{gt('Crafting rarity chances')}</Text>
   <View style={s.oddsGrid}>
    <View style={s.oddsHighlight}><Text style={s.oddsLabel}>{gt('Rare')}+</Text><Text style={s.oddsValue}>{percentage(rarePlus)}</Text></View>
    <View style={s.oddsHighlight}><Text style={s.oddsLabel}>{gt('Epic')}+</Text><Text style={s.oddsValue}>{percentage(epicPlus)}</Text></View>
    <View style={s.oddsHighlight}><Text style={s.oddsLabel}>{gt('Mythic')}</Text><Text style={s.oddsValue}>{percentage(CRAFTED_MYTHIC_CHANCE)}</Text></View>
   </View>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showOdds}}
    accessibilityLabel={gt('View all rarity chances')}
    onPress={()=>setShowOdds(value=>!value)} style={s.disclosure}>
    <Text style={s.link}>{showOdds?gt('Hide rarity chances'):gt('View all rarity chances')}</Text>
    <Text style={s.link}>{showOdds?'⌃':'⌄'}</Text>
   </Pressable>
   {showOdds?<View style={s.fullOdds}>{odds.map(outcome=><View key={outcome.id} style={s.oddsRow}>
    <Text style={s.oddsText}>{gt(outcome.label)}</Text>
    <Text style={s.oddsNumber}>{percentage(outcome.chance)}</Text>
   </View>)}</View>:null}
  </View>
  <View style={s.quality}>
   <Text style={s.sectionTitle}>{gt('Quality effect on base bonus')}</Text>
   <View style={s.qualityRow}>
    {[0,50,100].map(q=><View key={q} style={s.qualityCell}>
     <Text style={s.qualityLabel}>Q{q}</Text>
     <Text style={[s.qualityNumber,{color:q===0?C.warning:q===100?C.good:C.text}]}>
      {qualityEffect(q)>0?'+':''}{qualityEffect(q)}%
     </Text>
    </View>)}
   </View>
   <Text style={s.hint}>{gt('Rarity and quality adjust the base effect, not the bonus roll.')}</Text>
  </View>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showRules}} onPress={()=>setShowRules(value=>!value)} style={s.disclosure}>
   <Text style={s.link}>{gt('How tool stats work')}</Text><Text style={s.link}>{showRules?'−':'+'}</Text>
  </Pressable>
  {showRules?<Text style={s.hint}>{gt('Each crafted copy rolls one bonus. Speed and rare-find ranges stay unchanged across tiers. Skill XP ranges depend on tier and XP bonuses from eligible equipped tiers stack for this skill, subject to the total cap.')}</Text>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:12},
 section:{gap:7},sectionTitle:{fontSize:12,fontWeight:'800',color:C.text},
 base:{flexDirection:'row',alignItems:'center',gap:12,padding:11,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 copy:{flex:1,minWidth:0,gap:4},eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:.6,color:C.muted},
 baseLabel:{fontSize:12,lineHeight:17,color:C.text,fontWeight:'700'},baseValue:{fontSize:23,color:C.good,fontWeight:'900'},
 bonusGrid:{flexDirection:'row',flexWrap:'wrap',gap:7},
 bonusCard:{flexGrow:1,flexBasis:'46%',minWidth:110,padding:10,gap:5,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 bonusLabel:{fontSize:11,fontWeight:'800',minHeight:27},bonusValue:{fontSize:17,fontWeight:'900',color:C.text},
 hint:{fontSize:10,lineHeight:15,color:C.muted},oddsGrid:{flexDirection:'row',gap:6},
 oddsHighlight:{flex:1,minWidth:0,padding:8,gap:4,borderRadius:8,backgroundColor:C.panel2},
 oddsLabel:{fontSize:10,color:C.muted,fontWeight:'700'},oddsValue:{fontSize:15,color:C.text,fontWeight:'900'},
 disclosure:{minHeight:44,paddingHorizontal:4,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 link:{fontSize:11,fontWeight:'800',color:C.info},
 fullOdds:{borderTopWidth:1,borderTopColor:C.line},
 oddsRow:{minHeight:34,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:C.line},
 oddsText:{fontSize:11,color:C.muted},oddsNumber:{fontSize:11,fontWeight:'800',color:C.text},
 quality:{gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 qualityRow:{flexDirection:'row',gap:6},qualityCell:{flex:1,alignItems:'center',gap:3},
 qualityLabel:{fontSize:10,color:C.muted,fontWeight:'800'},qualityNumber:{fontSize:13,color:C.text,fontWeight:'900'},
 });}

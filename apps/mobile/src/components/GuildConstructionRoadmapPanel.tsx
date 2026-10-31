import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GUILD_CONSTRUCTION_BLUEPRINTS} from '../content/guild-construction-blueprints';
import {itemDef} from '../content/items';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {Panel} from './Panel';

const FACILITY_CHOICES=[
 {prefix:'construction_hall_',label:'Guild Hall'},
 {prefix:'construction_forge_',label:'Forge'},
 {prefix:'construction_library_',label:'Library'},
 {prefix:'construction_treasury_',label:'Treasury'},
 {prefix:'construction_war_room_',label:'War Room'},
 {prefix:'construction_expedition_',label:'Expedition Lodge'},
] as const;

/** Preview only. Existing Hall v44 progression remains automatic.
 * Material-funded rewards require independent server integrations and release.
 */
export function GuildConstructionRoadmapPanel(){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [opened,setOpened]=useState(false),[selected,setSelected]=useState<string>(FACILITY_CHOICES[0].prefix);
 const plans=GUILD_CONSTRUCTION_BLUEPRINTS.filter(row=>row.id.startsWith(selected));
 return <Panel>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:opened}} onPress={()=>setOpened(value=>!value)} style={s.head}>
   <View style={s.flex}><Text style={s.title}>Guild Construction</Text><Text style={s.copy}>Craft and donate toward permanent guild upgrades · 10× material requirements</Text></View>
   <Text style={s.link}>{opened?'Hide':'View plans'}</Text>
  </Pressable>
  {opened?<View style={s.stack}>
   <Text style={s.note}>These are future material-funded upgrades. Hall progress and existing facility tiers continue to level through Guild Projects. No construction donations are enabled by this preview.</Text>
   <View style={s.choices}>{FACILITY_CHOICES.map(choice=><Pressable key={choice.prefix} accessibilityRole="button" accessibilityState={{selected:selected===choice.prefix}} onPress={()=>setSelected(choice.prefix)} style={[s.choice,selected===choice.prefix&&s.choiceSelected]}><Text style={[s.choiceText,selected===choice.prefix&&s.choiceActive]}>{choice.label}</Text></Pressable>)}</View>
   {plans.map(row=><View key={row.id} style={s.plan}>
    <View style={s.head}><Text style={s.planTitle}>{row.name}</Text><Text style={s.level}>Guild Lv {row.requiredGuildLevel}</Text></View>
    <Text style={s.reward}>{row.benefit}</Text>
    <Text style={s.copy}>{row.description}</Text>
    <Text style={s.requirements}>{row.materials.map(material=>`${material.amount.toLocaleString()} ${itemDef(material.itemId).name}`).join(' · ')}</Text>
   </View>)}
  </View>:null}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,minHeight:44},
 flex:{flex:1,minWidth:0},title:{fontSize:16,fontWeight:'800',color:C.text},
 link:{fontSize:12,fontWeight:'800',color:C.accent},
 copy:{fontSize:12,lineHeight:18,color:C.muted},
 note:{fontSize:12,lineHeight:18,color:C.warning},
 stack:{gap:10,marginTop:10},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:6},
 choice:{borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,borderRadius:8,paddingHorizontal:11,minHeight:40,justifyContent:'center'},
 choiceSelected:{borderColor:C.accent,backgroundColor:C.selection},
 choiceText:{fontSize:12,fontWeight:'700',color:C.muted},
 choiceActive:{color:C.text},
 plan:{borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2,padding:10,gap:5},
 planTitle:{fontSize:14,fontWeight:'800',color:C.text},
 level:{fontSize:11,fontWeight:'800',color:C.info},
 reward:{fontSize:13,fontWeight:'800',color:C.good},
 requirements:{fontSize:12,lineHeight:18,color:C.info,fontWeight:'600'},
});}

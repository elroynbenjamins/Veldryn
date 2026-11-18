import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {equipmentV2ResultPresentation,type V2AuthoritativeResultViewInput,
 type V2EquippedComparison} from '../core/equipment-crafting-v2-result';

/** Unmounted, read-only Equipment 2.0 forge reveal.
 * No roll RNG, crafting, equipping, selling or market actions are exposed.
 * A release version must receive a receipt verified by its server route.
 */
export function EquipmentCraftingV2ResultPreview({receipt,equipped}:{
 receipt:V2AuthoritativeResultViewInput;equipped?:V2EquippedComparison;
}){
 const colors=useGameTheme(),styles=useMemo(()=>makeStyles(colors),[colors]);
 const view=equipmentV2ResultPresentation(receipt,equipped);
 const format=(n:number)=>Number(n.toFixed(2)).toLocaleString('en-US',{maximumFractionDigits:2});
 const signed=(n:number)=>n>0?'+'+format(n):format(n);
 const names:{[key:string]:string}={
  armor:'Armor',maxHp:'Max HP',ward:'Ward',tenacity:'Tenacity',critRate:'Critical Rate',
  critDamage:'Critical Damage',haste:'Haste',penetration:'Penetration',accuracy:'Accuracy',
  potency:'Potency',abilityDamage:'Ability Damage',healingPower:'Healing Power',
 };
 return <ScrollView accessibilityLabel="Internal Equipment 2.0 forge result"
  contentContainerStyle={styles.root}>
  <Text style={styles.eyebrow}>FORGE RESULT · INTERNAL PREVIEW</Text>
  <View style={styles.header}>
   <View style={styles.itemGlyph} accessible accessibilityLabel="Item artwork placeholder">
    <Text style={styles.itemGlyphText}>T{view.tier}</Text>
   </View>
   <View style={styles.itemIdentity}>
    <Text style={styles.name}>{view.itemName}</Text>
    <Text style={styles.subtle}>{view.slot.toUpperCase()} · {view.role.toUpperCase()}</Text>
    <Text style={styles.rarity}>{view.rarity.toUpperCase()} · QUALITY {view.quality}</Text>
    {view.classRestriction?<Text style={styles.subtle}>Equippable: {view.classRestriction.replace(/_/g,' ')}</Text>:null}
   </View>
  </View>
  <View style={styles.section}>
   <View style={styles.row}>
    <Text style={styles.sectionTitle}>Quality {view.quality}/100</Text>
    <Text style={[styles.body,{color:view.qualityVsQ50Percent>=0?colors.good:colors.warning}]}>
     {signed(view.qualityVsQ50Percent)}% base stats vs Q50
    </Text>
   </View>
   <View style={styles.track}><View style={[styles.fill,{width:`${view.quality}%` as `${number}%`,backgroundColor:colors.good}]}/></View>
   <Text style={styles.note}>Quality affects base stats. Rarity and random affix rolls are separate.</Text>
  </View>
  <View style={styles.section}>
   <Text style={styles.sectionTitle}>Base stats {view.hasComparison?'· versus equipped':''}</Text>
   {([
    ['Attack','attack'],['Defense','defense'],['Maximum HP','hp'],
   ] as const).filter(([,k])=>view.baseStats[k]>0||!!view.statDifference?.[k])
    .map(([name,key])=><View key={key} style={styles.statRow}>
     <Text style={styles.body}>{name}</Text>
     <View style={styles.right}>
      <Text style={styles.emphasis}>{format(view.baseStats[key])}</Text>
      {view.statDifference?<Text style={[styles.delta,{color:view.statDifference[key]>=0?colors.good:colors.warning}]}>
       {signed(view.statDifference[key])}
      </Text>:null}
     </View>
    </View>)}
  </View>
  <View style={styles.section}>
   <Text style={styles.sectionTitle}>Random attributes</Text>
   {view.affixes.map(affix=><View key={affix.stat} style={styles.affix}>
    <View style={styles.row}>
     <Text style={styles.emphasis}>+{format(affix.percent)}% {names[affix.stat]??affix.stat}</Text>
     <Text style={styles.subtle}>Roll {affix.grade}/100</Text>
    </View>
    <View style={styles.track}><View style={[styles.fill,{width:`${affix.grade}%` as `${number}%`,backgroundColor:colors.good}]}/></View>
    <Text style={styles.note}>Full tier range {format(affix.fullMinimum)}–{format(affix.fullMaximum)}%;
     {' '}this rarity {format(affix.minimum)}–{format(affix.maximum)}%</Text>
   </View>)}
   {!!view.setName&&<Text style={styles.note}>Set: {view.setName}. Equipping may change set bonuses.</Text>}
   <Text style={styles.note}>Roll grade compares this attribute against its full tier range, not the item's Quality score.</Text>
  </View>
  {view.hasComparison?<View style={styles.section}>
   <Text style={styles.sectionTitle}>Comparison notes</Text>
   <Text style={styles.note}>Positive and negative base-stat differences are shown individually.
    Set bonuses, skill synergy, resistances and combat results are not yet included.</Text>
   <Text style={styles.note}>Do not treat a larger single statistic or Quality score as a guaranteed equipment upgrade.</Text>
  </View>:null}
  <Text style={styles.note}>Display only. The final release must verify the server receipt and save the exact copy before enabling equip, trade or salvage actions.</Text>
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:12,paddingBottom:28,gap:12,backgroundColor:C.panel},
 eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1,color:C.muted},
 header:{flexDirection:'row',alignItems:'center',gap:12},
 itemGlyph:{width:76,height:76,alignItems:'center',justifyContent:'center',
  backgroundColor:C.panel2,borderRadius:10,borderWidth:1,borderColor:C.line},
 itemGlyphText:{fontSize:20,fontWeight:'900',color:C.text},
 itemIdentity:{flex:1,minWidth:0,gap:4},name:{fontSize:17,fontWeight:'900',color:C.text},
 rarity:{fontSize:13,fontWeight:'900',color:C.good},subtle:{fontSize:11,color:C.muted},
 section:{padding:12,borderWidth:1,borderColor:C.line,borderRadius:11,backgroundColor:C.panel2,gap:10},
 sectionTitle:{fontSize:13,fontWeight:'900',color:C.text},body:{fontSize:12,color:C.text},
 emphasis:{fontSize:12,fontWeight:'900',color:C.text},note:{fontSize:11,lineHeight:16,color:C.muted},
 row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 statRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
  paddingTop:8,borderTopColor:C.line,borderTopWidth:1},
 right:{flexDirection:'row',alignItems:'center',gap:10},
 delta:{fontSize:12,fontWeight:'800'},track:{height:8,borderRadius:5,overflow:'hidden',backgroundColor:C.panel},
 fill:{height:'100%',borderRadius:5},affix:{gap:6,paddingTop:6,borderTopColor:C.line,borderTopWidth:1},
 });}

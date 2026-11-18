/**
 * Hidden Equipment 2.0 read-only contribution breakdown.
 *
 * Display ONLY the server's emitted, validated base/set/affix sources.
 * Never calculate random rolls or hypothetical combat stats on the device.
 * The component is not mounted in the live character/inventory screen.
 */
import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography} from '../theme/theme';
export interface GearBaseRowV2 {
 readonly instanceId:string;readonly itemId:string;readonly tier:string;
 readonly rarity:string;readonly quality:number;
 readonly scaledStats:Readonly<Record<string,number|undefined>>;
}
export interface GearAffixRowV2{
 readonly instanceId:string;readonly id:string;readonly value:number;
 readonly unit:'relative_percent'|'percentage_points';
}
export interface GearSetRowV2{
 readonly thresholdId:string;
 readonly effects:readonly {stat:string;mode:'relative'|'points';value:number}[];
}
export interface GearEvidenceUiV2 {
 readonly baseSources:readonly GearBaseRowV2[];
 readonly setEffects:readonly GearSetRowV2[];
 readonly affixSources:readonly GearAffixRowV2[];
}
const STAT_LABELS:Readonly<Record<string,string>>={
 attackPower:'Attack',healingPower:'Healing',maxHp:'Maximum HP',
 defense:'Defense',accuracy:'Accuracy',evasion:'Evasion',
 haste:'Haste',critChance:'Critical Rate',critMultiplier:'Critical Damage',
 attack_pct:'Attack',defense_pct:'Defense',max_hp_pct:'Maximum HP',
 haste_pp:'Haste',crit_rate_pp:'Critical Rate',crit_damage_pct:'Critical Damage',
 class_healing_pct:'Healing',
};
const pretty=(key:string)=>STAT_LABELS[key]??key.replace(/_/g,' ');
const num=(n:number)=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{
 maximumFractionDigits:2,
}).format(n):'—';
const scale=(v:number,unit:'relative_percent'|'percentage_points')=>
 num(v*100)+(unit==='percentage_points'?' pp':'%');
function setName(id:string){
 const [set,amount]=id.split(':');
 const match=/^eq2_(t[1-5])_(.+)$/.exec(set);
 if(!match||!amount)return id;
 return match[1].toUpperCase()+' · '+
  match[2].split('_').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ')+
  ' · '+amount+' pieces';
}
export function EquipmentPowerBreakdownV2({
 evidence,
}:{
 evidence:GearEvidenceUiV2|null;
}){
 const C=useGameTheme();
 if(!evidence){
  return <Panel><Text style={[typography.body,{color:C.muted}]}>
   Equipment 2.0 breakdown unavailable until the server verifies the item and its rolls.
  </Text></Panel>;
 }
 const affixes=evidence.affixSources;
 return <View style={styles.root}>
  <Panel style={styles.panel}>
   <Text style={[typography.title,{color:C.text}]}>Equipment contribution</Text>
   <Text style={[typography.caption,{color:C.muted}]}>
    Verified base stats, rarity, quality and random rolls. Nothing is rerolled here.
   </Text>
   {evidence.baseSources.length===0?
     <Text style={[typography.caption,{color:C.muted}]}>No Equipment 2.0 gear selected.</Text>:
     evidence.baseSources.map(item=><View key={item.instanceId}
       style={[styles.item,{borderColor:C.line}]}>
      <View style={styles.heading}>
       <Text style={[typography.bodyStrong,{color:C.text}]}>{item.itemId}</Text>
       <Text style={[typography.caption,{color:C.muted}]}>
        {item.tier} · {item.rarity} · Q{item.quality}
       </Text>
      </View>
      <Text style={[typography.caption,{color:C.muted}]}>
       Base: {Object.entries(item.scaledStats).filter(([_,v])=>v!==undefined)
        .map(([key,value])=>pretty(key)+' +'+num(value!)).join(' · ')}
      </Text>
      {affixes.filter(affix=>affix.instanceId===item.instanceId).map((affix,index)=>
       <Text key={affix.id+index} style={[typography.caption,{color:C.accent}]}>
        Roll: {pretty(affix.id)} +{scale(affix.value,affix.unit)}
       </Text>)}
     </View>)}
  </Panel>
  <Panel style={styles.panel}>
   <Text style={[typography.bodyStrong,{color:C.text}]}>Set thresholds</Text>
   {evidence.setEffects.length===0?
    <Text style={[typography.caption,{color:C.muted}]}>No active Equipment 2.0 set bonuses.</Text>:
    evidence.setEffects.map(set=><View key={set.thresholdId} style={styles.effect}>
     <Text style={[typography.bodyStrong,{color:C.text}]}>{setName(set.thresholdId)}</Text>
     {set.effects.map((fx,i)=><Text key={i} style={[typography.caption,{color:C.accent}]}>
       {pretty(fx.stat)} +{scale(fx.value,fx.mode==='points'?'percentage_points':'relative_percent')}
      </Text>)}
    </View>)}
  </Panel>
 </View>;
}
const styles=StyleSheet.create({
 root:{gap:spacing.md},panel:{gap:spacing.sm},
 heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},
 item:{gap:4,paddingVertical:8,borderTopWidth:1},
 effect:{gap:4,paddingVertical:5},
});

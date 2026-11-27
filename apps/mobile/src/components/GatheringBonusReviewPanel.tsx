/** Reusable hidden inspector panel. Input must already be skill-filtered;
 * this component has no player state or gameplay commands. */
import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {buildGatheringBonusDisplayReview,type GatheringBonusDisplayInput} from '../core/gathering-bonus-display-review';
export function GatheringBonusReviewPanel({input,title='Gathering equipment bonuses'}:{input:GatheringBonusDisplayInput;title?:string}){
 const C=useGameTheme(),[details,setDetails]=useState(false);
 const b=buildGatheringBonusDisplayReview(input);
 const fmt=(n:number)=>'+'+n.toFixed(2).replace(/\.?0+$/,'')+'%';
 const row=(label:string,value:string,muted=false)=><View style={s.row}><Text style={[s.label,{color:C.muted}]}>{label}</Text><Text style={[s.value,{color:muted?C.muted:C.good}]}>{value}</Text></View>;
 return <View style={[s.panel,{backgroundColor:C.panel2,borderColor:C.line}]}>
  <View style={s.row}><Text accessibilityRole="header" style={[s.header,{color:C.text}]}>{title}</Text><Text style={{color:C.muted,fontSize:11}}>{b.pieces}/10</Text></View>
  {row('Effective gathering speed',fmt(b.effectiveSpeedPercent))}
  {row('Skill XP',fmt(b.xpPercent))}
  {row('Resource yield',fmt(b.yieldPercent))}
  {row('Rare material chance',fmt(b.rareRelativePercent)+' relative',!b.rareConsumerAvailable)}
  {!b.rareConsumerAvailable&&b.rareRelativePercent>0?<Text style={{color:C.warning,fontSize:11}}>Ordinary rare-material drops for this skill are not implemented yet.</Text>:null}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:details}} onPress={()=>setDetails(v=>!v)} style={s.toggle}><Text style={{color:C.accent,fontSize:12,fontWeight:'700'}}>{details?'Hide calculation':'Show calculation'}</Text></Pressable>
  {details?<View style={{gap:4}}>
   {row('Gear speed rating',fmt(b.gearRawPercent),true)}
   {row('Set speed rating',fmt(b.setSpeedPercent),true)}
   {row('Total raw speed',fmt(b.rawSpeedPercent),true)}
   {row('Action duration reduction',b.actionTimeReductionPercent.toFixed(2)+'%')}
   <Text style={{color:C.muted,fontSize:11}}>Equipment only. Tools, pet, Faith and other buffs are separate. Speed increases action rate; it is not subtracted from duration.</Text>
   <View style={s.thresholds}>{[2,4,6,8,10].map(n=><View key={n} style={[s.threshold,{borderColor:b.unlockedThresholds.includes(n)?C.good:C.line}]}><Text style={{color:b.unlockedThresholds.includes(n)?C.good:C.muted,fontSize:11,fontWeight:'700'}}>{n} pc</Text></View>)}</View>
   <Text style={{color:C.muted,fontSize:11}}>{b.nextThreshold===null?'Full set bonus unlocked':'Next set bonus: '+b.nextThreshold+' pieces'}</Text>
  </View>:null}
 </View>;
}
const s=StyleSheet.create({panel:{padding:8,borderRadius:8,borderWidth:1,gap:5},row:{flexDirection:'row',alignItems:'center',gap:6},header:{flex:1,fontSize:12,fontWeight:'800'},label:{flex:1,minWidth:0,fontSize:12},value:{fontSize:12,fontWeight:'800',textAlign:'right'},toggle:{minHeight:44,justifyContent:'center'},thresholds:{flexDirection:'row',flexWrap:'wrap',gap:5},threshold:{borderWidth:1,borderRadius:5,paddingHorizontal:7,paddingVertical:4}});

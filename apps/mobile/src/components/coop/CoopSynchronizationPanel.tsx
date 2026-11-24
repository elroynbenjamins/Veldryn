import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {assertCoopSynchronizationPresentation,coopSynchronizationEffectiveTotals,formatCoopSynchronizationValue,type CoopSynchronizationView} from '../../core/coop-synchronization';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopSpacing} from '../../theme/coop-ui-theme';
import {FantasyPanel} from './CoopVisualKit';

export interface CoopSynchronizationLabels{
 title:string;
 partyWide:string;
 noProgression:string;
 active:(count:number)=>string;
 fullStrength:string;
 scaledStrength:(scalePercent:number)=>string;
 empty:string;
 note:string;
 combinedCap:string;
 capLine:(label:string,rawValue:string,effectiveValue:string)=>string;
 combinedBonuses:string;
 showDetails:string;
 hideDetails:string;
 moreBonuses:(count:number)=>string;
}
export function CoopSynchronizationPanel({view,labels}:{
 view:CoopSynchronizationView;
 labels:CoopSynchronizationLabels;
}){
 const {styles:s}=useCoopStyles(makeStyles);
 const [expanded,setExpanded]=useState(false);
 assertCoopSynchronizationPresentation(view);
 const totals=coopSynchronizationEffectiveTotals(view);
 const visible=expanded?totals:totals.slice(0,3);
 const scale=view.scalePercent===100?labels.fullStrength:labels.scaledStrength(view.scalePercent);
 return <FantasyPanel>
  <View style={s.header}>
   <Text accessibilityRole="header" style={s.title}>{labels.title}</Text>
   <Text style={s.count}>{labels.active(view.activeCount)}</Text>
  </View>
  {view.activeCount?<>
   <Text style={s.meta}>{labels.partyWide} · {scale}</Text>
   <Text style={s.linkSummary}>{view.links.map(link=>link.name).join(' · ')}</Text>
   <Text style={s.section}>{labels.combinedBonuses}</Text>
   {visible.map(bonus=><View key={bonus.statKey} style={s.statRow}>
    <Text style={s.statName}>{bonus.label}</Text>
    <Text style={s.statValue}>{formatCoopSynchronizationValue(bonus.bps,bonus.valueKind)}</Text>
   </View>)}
   {!expanded&&totals.length>visible.length?<Text style={s.meta}>{labels.moreBonuses(totals.length-visible.length)}</Text>:null}
   {view.cappedStats.length?<View style={s.capBox}>
    <Text style={s.capTitle}>{labels.combinedCap}</Text>
    {view.cappedStats.map(row=><Text key={row.statKey} style={s.meta}>
     {labels.capLine(row.label,formatCoopSynchronizationValue(row.rawBps,row.valueKind),formatCoopSynchronizationValue(row.effectiveBps,row.valueKind))}
    </Text>)}
   </View>:null}
   <Pressable accessibilityRole="button" accessibilityState={{expanded}}
    onPress={()=>setExpanded(value=>!value)}
    style={({pressed})=>[s.toggle,pressed&&s.pressed]}>
    <Text style={s.toggleText}>{expanded?labels.hideDetails:labels.showDetails}</Text>
    <Text style={s.toggleText}>{expanded?'−':'+'}</Text>
   </Pressable>
   {expanded?<View style={s.links}>
    {view.links.map(link=><View key={link.id} style={s.link}>
     <Text style={s.linkName}>{link.name}</Text>
     <Text style={s.classes}>{link.classNames.join(' + ')}</Text>
     {link.bonuses.map(bonus=><View key={bonus.statKey} style={s.statRow}>
      <Text style={s.statName}>{bonus.label}</Text>
      <Text style={s.statValue}>{formatCoopSynchronizationValue(bonus.bps,bonus.valueKind)}</Text>
     </View>)}
    </View>)}
    <Text style={s.meta}>{labels.noProgression}</Text>
   </View>:null}
  </>:<Text style={s.meta}>{labels.empty}</Text>}
  <Text style={s.note}>{labels.note}</Text>
 </FantasyPanel>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},
 title:{fontSize:16,lineHeight:22,fontWeight:'800',color:C.text,flexShrink:1},
 count:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.cyan},
 meta:{fontSize:12,lineHeight:17,color:C.textMuted},
 linkSummary:{fontSize:12,lineHeight:18,color:C.gold},
 section:{fontSize:12,lineHeight:18,fontWeight:'700',color:C.textSecondary},
 statRow:{flexDirection:'row',alignItems:'flex-start',gap:8,justifyContent:'space-between'},
 statName:{fontSize:13,lineHeight:18,color:C.textSecondary,flex:1,minWidth:0},
 statValue:{fontSize:13,lineHeight:18,color:C.cyan,fontWeight:'700',fontVariant:['tabular-nums']},
 capBox:{gap:3,padding:coopSpacing.sm,borderWidth:StyleSheet.hairlineWidth,borderColor:C.warning,borderRadius:10},
 capTitle:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.warning},
 toggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 toggleText:{fontSize:13,lineHeight:18,fontWeight:'700',color:C.cyan},
 pressed:{opacity:.65},
 links:{gap:coopSpacing.sm},
 link:{paddingTop:coopSpacing.sm,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,gap:3},
 linkName:{fontSize:14,lineHeight:20,fontWeight:'800',color:C.text},
 classes:{fontSize:12,lineHeight:17,color:C.gold},
 note:{fontSize:11,lineHeight:16,color:C.textMuted},
});

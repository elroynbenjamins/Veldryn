import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {prepareCoopSynchronizationPresentation,type CoopSynchronizationValueKind,type CoopSynchronizationView} from '../../core/coop-synchronization';
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
 unavailable:string;
 note:string;
 combinedCap:string;
 capLine:(label:string,rawValue:string,effectiveValue:string)=>string;
 combinedBonuses:string;
 showDetails:string;
 hideDetails:string;
 moreBonuses:(count:number)=>string;
 formatValue:(bps:number,kind:CoopSynchronizationValueKind)=>string;
}
export function CoopSynchronizationPanel({view,labels}:{
 view:CoopSynchronizationView;
 labels:CoopSynchronizationLabels;
}){
 const {styles:s}=useCoopStyles(makeStyles);
 const [expanded,setExpanded]=useState(false);
 const prepared=useMemo(()=>{
  try{return prepareCoopSynchronizationPresentation(view);}
  catch{return undefined;}
 },[view]);
 // This optional informational panel must never interrupt a ready check.
 if(!prepared)return <FantasyPanel>
  <Text accessibilityRole="header" style={s.title}>{labels.title}</Text>
  <Text style={s.meta}>{labels.unavailable}</Text>
 </FantasyPanel>;
 const totals=prepared.totals;
 const visible=expanded?totals:totals.slice(0,3);
 const scale=view.scalePercent===100?labels.fullStrength:labels.scaledStrength(view.scalePercent);
 return <FantasyPanel>
  <View style={s.header}>
   <Text accessibilityRole="header" style={s.title}>{labels.title}</Text>
   <Text style={s.count}>{labels.active(view.activeCount)}</Text>
  </View>
  {view.activeCount?<>
   <Text style={s.meta}>{labels.partyWide} · {scale}</Text>
   <Text style={s.section}>{labels.combinedBonuses}</Text>
   {visible.map(bonus=><View key={bonus.statKey} style={s.statRow}>
    <Text style={s.statName}>{bonus.label}</Text>
    <Text style={s.statValue}>{labels.formatValue(bonus.bps,bonus.valueKind)}</Text>
   </View>)}
   {view.cappedStats.length?<View style={s.capBox}>
    <Text style={s.capTitle}>{labels.combinedCap}</Text>
    {view.cappedStats.map(row=><Text key={row.statKey} style={s.meta}>
     {labels.capLine(row.label,labels.formatValue(row.rawBps,row.valueKind),labels.formatValue(row.effectiveBps,row.valueKind))}
    </Text>)}
   </View>:null}
   <Pressable accessibilityRole="button" accessibilityLabel={expanded?labels.hideDetails:labels.showDetails} accessibilityState={{expanded}}
    onPress={()=>setExpanded(value=>!value)}
    style={({pressed})=>[s.toggle,pressed&&s.pressed]}>
    <Text style={s.toggleText}>{expanded?labels.hideDetails:labels.showDetails}</Text>
    {!expanded&&totals.length>visible.length?<Text style={s.more}>{labels.moreBonuses(totals.length-visible.length)}</Text>:null}
    <Text accessibilityElementsHidden importantForAccessibility="no" style={s.toggleIcon}>{expanded?'−':'+'}</Text>
   </Pressable>
   {expanded?<View style={s.links}>
    {view.links.map(link=><View key={link.id} style={s.link}>
     <Text style={s.linkName}>{link.name}</Text>
     <Text style={s.classes}>{link.classNames.join(' + ')}</Text>
     {link.bonuses.map(bonus=><View key={bonus.statKey} style={s.statRow}>
      <Text style={s.statName}>{bonus.label}</Text>
      <Text style={s.statValue}>{labels.formatValue(bonus.bps,bonus.valueKind)}</Text>
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
 section:{fontSize:12,lineHeight:18,fontWeight:'700',color:C.textSecondary},
 statRow:{flexDirection:'row',alignItems:'flex-start',gap:8,justifyContent:'space-between'},
 statName:{fontSize:13,lineHeight:18,color:C.textSecondary,flex:1,minWidth:0},
 statValue:{fontSize:13,lineHeight:18,color:C.cyan,fontWeight:'700',fontVariant:['tabular-nums']},
 capBox:{gap:3,padding:coopSpacing.sm,borderWidth:StyleSheet.hairlineWidth,borderColor:C.warning,borderRadius:10},
 capTitle:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.warning},
 toggle:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 toggleText:{fontSize:13,lineHeight:18,fontWeight:'700',color:C.cyan,flex:1,minWidth:0},
 more:{fontSize:12,lineHeight:17,color:C.textMuted,flexShrink:1},
 toggleIcon:{fontSize:18,lineHeight:22,color:C.cyan},
 pressed:{opacity:.65},
 links:{gap:coopSpacing.sm},
 link:{paddingTop:coopSpacing.sm,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,gap:3},
 linkName:{fontSize:14,lineHeight:20,fontWeight:'800',color:C.text},
 classes:{fontSize:12,lineHeight:17,color:C.gold},
 note:{fontSize:11,lineHeight:16,color:C.textMuted},
});

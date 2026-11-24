import {StyleSheet,Text,View} from 'react-native';
import type {CoopSynchronizationView} from '../../core/coop-synchronization';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel,StateChip} from './CoopVisualKit';

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
}
export function CoopSynchronizationPanel({view,labels}:{
 view:CoopSynchronizationView;
 labels:CoopSynchronizationLabels;
}){
 const {styles:s}=useCoopStyles(makeStyles);
 const scale=view.activeCount<=2?labels.fullStrength:labels.scaledStrength(view.scalePercent);
 return <FantasyPanel>
  <View style={s.header}>
   <View style={s.heading}>
    <Text style={s.title}>{labels.title}</Text>
    <Text style={s.meta}>{labels.noProgression}</Text>
   </View>
   <View style={s.chips}>
    <StateChip label={labels.active(view.activeCount)} tone={view.activeCount?'selected':'neutral'}/>
    <StateChip label={labels.partyWide} tone="success"/>
   </View>
  </View>
  {view.activeCount?<Text style={s.scale}>{scale}</Text>:<Text style={s.empty}>{labels.empty}</Text>}
  {view.cappedStats.length?<View style={s.capBox}>
   <StateChip label={labels.combinedCap} tone="warning"/>
   {view.cappedStats.map(row=><Text key={row.statKey} style={s.capText}>
    {labels.capLine(row.label,row.rawValue,row.effectiveValue)}
   </Text>)}
  </View>:null}
    <View style={s.links}>
   {view.links.map(link=><View key={link.id} style={s.link}>
    <View style={s.linkHeader}>
     <Text style={s.linkName}>{link.name}</Text>
     <Text style={s.classes}>{link.classNames.join(' + ')}</Text>
    </View>
    <View style={s.bonuses}>{link.bonuses.map((bonus,index)=>
     <Text key={bonus.statKey+index} style={s.bonus}>• {bonus.value} {bonus.label}</Text>)}
    </View>
   </View>)}
  </View>
  <Text style={s.note}>{labels.note}</Text>
 </FantasyPanel>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 header:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:coopSpacing.sm},
 heading:{flex:1,minWidth:0,gap:2},
 title:{...coopTypography.section,color:C.text},
 meta:{fontSize:12,lineHeight:17,color:C.textMuted},
 chips:{alignItems:'flex-end',gap:4},
 scale:{fontSize:12,lineHeight:17,fontWeight:'700',color:C.cyan},
 empty:{...coopTypography.meta,color:C.textMuted},
 capBox:{gap:3,padding:coopSpacing.sm,borderWidth:StyleSheet.hairlineWidth,borderColor:C.warning,borderRadius:10},
 capText:{fontSize:11,lineHeight:16,color:C.textSecondary},
 links:{gap:coopSpacing.sm},
 link:{paddingTop:coopSpacing.sm,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,gap:4},
 linkHeader:{gap:1},
 linkName:{fontSize:15,lineHeight:20,fontWeight:'800',color:C.text},
 classes:{fontSize:12,lineHeight:17,color:C.gold},
 bonuses:{gap:2},
 bonus:{fontSize:13,lineHeight:18,color:C.textSecondary},
 note:{fontSize:11,lineHeight:16,color:C.textMuted},
});

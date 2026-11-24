import {StyleSheet,Text,View} from 'react-native';
import type {CoopSynchronizationView} from '../../core/coop-synchronization';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel,StateChip} from './CoopVisualKit';

export function CoopSynchronizationPanel({
 view,title='Class Synchronization',partyWideLabel='Party-wide',
 noProgressionLabel='Instant · No levels or affinity grind',
}:{
 view:CoopSynchronizationView;
 title?:string;
 partyWideLabel?:string;
 noProgressionLabel?:string;
}){
 const {colors:C,styles:s}=useCoopStyles(makeStyles);
 const scale=view.activeCount<=2?'Full strength':`${view.scalePercent}% strength per link`;
 return <FantasyPanel>
  <View style={s.header}>
   <View style={s.heading}>
    <Text style={s.title}>{title}</Text>
    <Text style={s.meta}>{noProgressionLabel}</Text>
   </View>
   <View style={s.chips}>
    <StateChip label={`${view.activeCount} active`} tone={view.activeCount?'selected':'neutral'}/>
    <StateChip label={partyWideLabel} tone="success"/>
   </View>
  </View>
  {view.activeCount?<Text style={s.scale}>{scale}</Text>:<Text style={s.empty}>No active class links in this party.</Text>}
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
  <Text style={s.note}>Does not change Combat Power, queue eligibility or matchmaking priority.</Text>
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
 links:{gap:coopSpacing.sm},
 link:{paddingTop:coopSpacing.sm,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,gap:4},
 linkHeader:{gap:1},
 linkName:{fontSize:15,lineHeight:20,fontWeight:'800',color:C.text},
 classes:{fontSize:12,lineHeight:17,color:C.gold},
 bonuses:{gap:2},
 bonus:{fontSize:13,lineHeight:18,color:C.textSecondary},
 note:{fontSize:11,lineHeight:16,color:C.textMuted},
});

import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {annualEventCalendar} from '../content/annual-event-calendar';
import {Panel} from './Panel';
import {C,radii,spacing,typography} from '../theme/theme';

export function AnnualEventCalendarPanel({state,highlightEventId,highlightLabel}:{state:GameState;highlightEventId?:string;highlightLabel?:string}){
  const rows=annualEventCalendar(state);
  return <Panel>
    <View style={s.header}><View style={s.flex}><Text style={s.kicker}>YEAR AT A GLANCE</Text><Text style={s.title}>Annual Event Calendar</Text></View><Text style={s.count}>{rows.length} events</Text></View>
    <Text style={s.body}>Event dates are controlled by Live-Ops. These windows show the normal yearly season for each production event; exact start and end times appear when scheduled.</Text>
    <View style={s.grid}>{rows.map(row=>{
      const highlighted=row.eventId===highlightEventId;
      return <View key={row.eventId} style={[s.card,{borderLeftColor:row.definition.accent},highlighted&&s.highlight]}>
        <View style={s.row}><Text numberOfLines={1} style={s.name}>{row.name}</Text>{highlighted?<Text style={s.badge}>{highlightLabel??'CURRENT'}</Text>:null}</View>
        <Text style={s.window}>{row.windowLabel}</Text>
        <Text style={s.meta}>Collection {row.collectionOwned}/{row.collectionTotal} · {row.collectionPercent}%</Text>
        <View style={s.track}><View style={[s.fill,{width:`${Math.max(row.collectionPercent?3:0,row.collectionPercent)}%`,backgroundColor:row.definition.accent}]}/></View>
        <Text style={s.history}>{row.hasHistory?`${row.lifetimeReputation.toLocaleString()} lifetime reputation`:'Not yet participated'}</Text>
      </View>;
    })}</View>
    <Text style={s.note}>May remains open for smaller regional activities rather than a permanent annual festival.</Text>
  </Panel>;
}

const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  flex:{flex:1,minWidth:0},
  kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  title:{...typography.title,color:C.text},
  count:{...typography.caption,color:C.muted,fontWeight:'800'},
  body:{...typography.body,color:C.muted,lineHeight:19,marginTop:spacing.xs},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:spacing.md},
  card:{width:'48%',minWidth:142,gap:4,padding:10,borderWidth:1,borderLeftWidth:4,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  highlight:{borderColor:C.accent,backgroundColor:'#272417'},
  row:{flexDirection:'row',alignItems:'center',gap:5},
  name:{...typography.bodyStrong,color:C.text,flex:1,fontSize:12},
  badge:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.6},
  window:{fontSize:10,color:C.accent,fontWeight:'800'},
  meta:{fontSize:9,color:C.muted},
  track:{height:5,borderRadius:3,overflow:'hidden',backgroundColor:C.bg},
  fill:{height:'100%'},
  history:{fontSize:9,color:C.info},
  note:{...typography.caption,color:C.muted,marginTop:spacing.sm},
});

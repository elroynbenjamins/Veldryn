import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {annualEventCalendar,type AnnualEventCalendarEntry} from '../content/annual-event-calendar';
import {annualEventSeriesId} from '../content/live-events';
import {Panel} from './Panel';
import {EventIdentityBadge} from './EventIdentityBadge';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;
const monthLabel=(month:number)=>MONTHS[Math.max(0,Math.min(11,month-1))]??'—';

export function AnnualEventCalendarPanel({state,highlightEventId,highlightLabel}:{state:GameState;highlightEventId?:string;highlightLabel?:string}){
  const rows=annualEventCalendar(state);
  const highlightSeries=highlightEventId?annualEventSeriesId(highlightEventId):undefined;
  const isHighlighted=(row:AnnualEventCalendarEntry)=>{
    const rowSeries=annualEventSeriesId(row.eventId);
    return row.eventId===highlightEventId||!!rowSeries&&!!highlightSeries&&rowSeries===highlightSeries;
  };
  const highlighted=rows.find(isHighlighted);
  const currentMonth=new Date().getUTCMonth()+1;
  const [selectedMonth,setSelectedMonth]=useState(highlighted?.months[0]??currentMonth);
  useEffect(()=>{if(highlighted?.months[0])setSelectedMonth(highlighted.months[0])},[highlightEventId]);
  const selectedRows=useMemo(()=>rows.filter(row=>row.months.includes(selectedMonth)),[rows,selectedMonth]);

  return <Panel>
    <View style={s.header}><View style={s.flex}><Text style={s.kicker}>YEAR AT A GLANCE</Text><Text style={s.title}>Asterfall Event Calendar</Text></View><Text style={s.count}>{rows.length} festivals</Text></View>
    <Text style={s.body}>Pick a month to preview its festival, then use the yearly trail for the full live-event rhythm.</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.monthStrip}>
      {MONTHS.map((label,index)=>{
        const month=index+1,eventRows=rows.filter(row=>row.months.includes(month)),selected=month===selectedMonth,active=eventRows.some(isHighlighted),visited=eventRows.some(row=>row.hasHistory);
        return <Pressable key={label} accessibilityRole="button" accessibilityState={{selected}} onPress={()=>setSelectedMonth(month)} style={[s.monthChip,selected&&s.monthChipSelected,active&&s.monthChipActive]}>
          <Text style={[s.monthText,selected&&s.monthTextSelected]}>{label}</Text>
          <View style={s.monthSignals}>{eventRows.length?<View style={[s.monthDot,active&&s.monthDotActive]}/>:<View style={s.monthDotEmpty}/>} {visited?<Text style={s.monthVisited}>✓</Text>:null}</View>
        </Pressable>;
      })}
    </ScrollView>

    <View style={s.featureWrap}>
      <View style={s.featureHeading}><Text style={s.featureMonth}>{monthLabel(selectedMonth)}</Text><Text style={s.featureHint}>{selectedRows.length?String(selectedRows.length)+' scheduled '+(selectedRows.length===1?'festival':'festivals'):'regional window'}</Text></View>
      {selectedRows.length?selectedRows.map(row=>{
        const active=isHighlighted(row);
        return <Pressable key={row.eventId} accessibilityRole="button" onPress={()=>setSelectedMonth(row.months[0]??selectedMonth)} style={[s.featureCard,{borderColor:row.definition.accent},active&&s.featureActive]}>
          <View style={s.identityRow}><EventIdentityBadge event={row.name} visualKey={row.definition.visualKey} accent={row.definition.accent} size={46}/><View style={s.flex}><View style={s.row}><Text numberOfLines={1} style={s.featureName}>{row.name}</Text>{active?<Text style={s.badge}>{highlightLabel??'CURRENT'}</Text>:null}</View><Text style={[s.signature,{color:row.definition.accent}]}>{row.definition.signature.title}</Text><Text style={s.window}>{row.windowLabel}</Text></View></View>
          <View style={s.featureMeta}><Text style={s.meta}>{row.hasHistory?'✓ Previously attended':'◇ Not yet attended'}</Text><Text style={s.meta}>{row.collectionOwned}/{row.collectionTotal} collection</Text></View>
        </Pressable>;
      }):<View style={s.regionalCard}><Text style={s.regionalTitle}>Regional activities</Text><Text style={s.meta}>No permanent annual festival owns this month. Smaller regional activities can still be scheduled through Live-Ops.</Text></View>}
    </View>

    <View style={s.timelineHeader}><Text style={s.kicker}>YEARLY FESTIVAL TRAIL</Text><Text style={s.timelineHint}>Tap a festival to jump to its month</Text></View>
    <View style={s.timeline}>{rows.map((row,index)=>{
      const active=isHighlighted(row);
      return <Pressable key={row.eventId} accessibilityRole="button" onPress={()=>setSelectedMonth(row.months[0]??row.order)} style={[s.timelineRow,active&&s.timelineRowActive]}>
        <View style={s.rail}><View style={[s.railDot,{borderColor:row.definition.accent},active&&{backgroundColor:row.definition.accent}]}/>{index<rows.length-1?<View style={s.railLine}/>:null}</View>
        <View style={s.timelineMonth}><Text style={s.timelineMonthText}>{row.months.map(monthLabel).join(' / ')}</Text></View>
        <EventIdentityBadge event={row.name} visualKey={row.definition.visualKey} accent={row.definition.accent} size={32}/>
        <View style={s.flex}><View style={s.row}><Text numberOfLines={1} style={s.name}>{row.name}</Text>{active?<Text style={s.badge}>{highlightLabel??'CURRENT'}</Text>:null}</View><Text numberOfLines={1} style={s.timelineWindow}>{row.windowLabel} · {row.hasHistory?'attended':'upcoming tradition'}</Text></View>
      </Pressable>;
    })}</View>
  </Panel>;
}

const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},flex:{flex:1,minWidth:0},row:{flexDirection:'row',alignItems:'center',gap:5},
  kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},count:{...typography.caption,color:C.muted,fontWeight:'800'},
  body:{...typography.body,color:C.muted,lineHeight:19,marginTop:spacing.xs},
  monthStrip:{gap:7,paddingVertical:spacing.md,paddingRight:spacing.sm},monthChip:{width:52,minHeight:56,alignItems:'center',justifyContent:'center',gap:6,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  monthChipSelected:{borderColor:C.accent,backgroundColor:equipmentColors.selected},monthChipActive:{borderColor:C.good},monthText:{fontSize:10,fontWeight:'900',color:C.muted,letterSpacing:.8},monthTextSelected:{color:C.text},
  monthSignals:{height:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},monthDot:{width:6,height:6,borderRadius:3,backgroundColor:C.accent},monthDotActive:{backgroundColor:C.good},monthDotEmpty:{width:6,height:6,borderRadius:3,borderWidth:1,borderColor:C.line},monthVisited:{fontSize:8,color:C.good,fontWeight:'900'},
  featureWrap:{gap:8},featureHeading:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:8},featureMonth:{fontSize:12,color:C.accent,fontWeight:'900',letterSpacing:1.2},featureHint:{fontSize:10,color:C.muted,fontWeight:'700'},
  featureCard:{gap:9,padding:12,borderWidth:1,borderLeftWidth:4,borderRadius:radii.md,backgroundColor:C.panel2},featureActive:{backgroundColor:'#272417'},identityRow:{flexDirection:'row',alignItems:'center',gap:10},
  featureName:{...typography.bodyStrong,color:C.text,flex:1,fontSize:15},signature:{fontSize:10,fontWeight:'900',marginTop:1},window:{fontSize:11,color:C.text,fontWeight:'800',marginTop:2},
  badge:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.6},featureMeta:{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'},meta:{fontSize:10,color:C.muted,lineHeight:15},
  regionalCard:{padding:12,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,gap:4},regionalTitle:{...typography.bodyStrong,color:C.text},
  timelineHeader:{marginTop:spacing.lg,flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',gap:8},timelineHint:{fontSize:9,color:C.muted},
  timeline:{marginTop:8},timelineRow:{minHeight:58,flexDirection:'row',alignItems:'center',gap:8,paddingRight:6,borderRadius:radii.sm},timelineRowActive:{backgroundColor:equipmentColors.selected},
  rail:{alignSelf:'stretch',width:14,alignItems:'center'},railDot:{width:10,height:10,borderRadius:5,borderWidth:2,backgroundColor:C.bg,marginTop:22,zIndex:2},railLine:{width:2,flex:1,backgroundColor:C.line,marginTop:-1},
  timelineMonth:{width:46},timelineMonthText:{fontSize:9,color:C.accent,fontWeight:'900',textAlign:'center'},name:{...typography.bodyStrong,color:C.text,flex:1,fontSize:12},timelineWindow:{fontSize:9,color:C.muted,marginTop:2},
});

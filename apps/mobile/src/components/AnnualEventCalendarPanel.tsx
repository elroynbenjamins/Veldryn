import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {annualEventCalendar} from '../content/annual-event-calendar';
import {annualEventSeriesId} from '../content/live-events';
import {Panel} from './Panel';
import {EventIdentityBadge} from './EventIdentityBadge';
import {C,radii,spacing,typography} from '../theme/theme';

const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;
const monthForOrder=(order:number)=>Math.max(1,Math.min(12,order));

export function AnnualEventCalendarPanel({state,highlightEventId,highlightLabel}:{state:GameState;highlightEventId?:string;highlightLabel?:string}){
  const rows=annualEventCalendar(state);
  const highlightSeries=highlightEventId?annualEventSeriesId(highlightEventId):undefined;
  const currentIndex=Math.max(0,rows.findIndex(row=>row.eventId===highlightEventId||!!highlightSeries&&annualEventSeriesId(row.eventId)===highlightSeries));
  const [selectedMonth,setSelectedMonth]=useState(()=>monthForOrder(rows[currentIndex]?.order??new Date().getUTCMonth()+1));
  const selected=useMemo(()=>rows.find(row=>monthForOrder(row.order)===selectedMonth)??rows.reduce((best,row)=>Math.abs(row.order-selectedMonth)<Math.abs(best.order-selectedMonth)?row:best,rows[0]),[rows,selectedMonth]);
  return <Panel>
    <View style={s.header}><View style={s.flex}><Text style={s.kicker}>YEAR OF ASTERFALL</Text><Text style={s.title}>Festival calendar</Text></View><Text style={s.count}>{rows.length} festivals</Text></View>
    <Text style={s.body}>See what is happening now, what comes next, and the normal season for every annual festival. Exact dates remain controlled by Live-Ops.</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.months}>
      {MONTHS.map((label,index)=>{
        const month=index+1,event=rows.find(row=>monthForOrder(row.order)===month),selectedNow=selectedMonth===month;
        const highlighted=event&&(event.eventId===highlightEventId||!!highlightSeries&&annualEventSeriesId(event.eventId)===highlightSeries);
        return <Pressable key={label} accessibilityRole="button" accessibilityState={{selected:selectedNow}} onPress={()=>setSelectedMonth(month)} style={[s.month,selectedNow&&s.monthSelected]}>
          <Text style={[s.monthText,selectedNow&&s.monthTextSelected]}>{label}</Text>
          <View style={[s.monthDot,event?{backgroundColor:event.definition.accent}:s.monthDotEmpty,highlighted&&s.monthDotCurrent]}/>
        </Pressable>;
      })}
    </ScrollView>

    {selected?<View style={[s.feature,{borderColor:selected.definition.accent}]}>
      <View style={s.featureTop}><EventIdentityBadge event={selected.name} visualKey={selected.definition.visualKey} accent={selected.definition.accent} size={46}/><View style={s.flex}><View style={s.row}><Text style={s.featureName}>{selected.name}</Text>{selected.eventId===highlightEventId||!!highlightSeries&&annualEventSeriesId(selected.eventId)===highlightSeries?<Text style={s.badge}>{highlightLabel??'CURRENT'}</Text>:null}</View><Text style={[s.signature,{color:selected.definition.accent}]}>{selected.definition.signature.title}</Text></View></View>
      <Text style={[s.window,{color:selected.definition.accent}]}>{selected.windowLabel}</Text>
      <Text style={s.meta}>{selected.hasHistory?'Previously attended · '+selected.collectionPercent+'% collection complete':'Annual festival · Not attended yet'}</Text>
    </View>:null}

    <Text style={s.timelineLabel}>YEAR AT A GLANCE</Text>
    <View style={s.timeline}>{rows.map((row,index)=>{
      const highlighted=row.eventId===highlightEventId||!!highlightSeries&&annualEventSeriesId(row.eventId)===highlightSeries;
      return <Pressable key={row.eventId} onPress={()=>setSelectedMonth(monthForOrder(row.order))} style={s.timelineRow}>
        <View style={s.rail}><View style={[s.node,{borderColor:row.definition.accent},highlighted&&{backgroundColor:row.definition.accent}]}/>{index<rows.length-1?<View style={s.line}/>:null}</View>
        <View style={[s.timelineCard,highlighted&&s.timelineCurrent]}>
          <View style={s.between}><Text numberOfLines={1} style={s.timelineName}>{row.name}</Text><Text style={s.timelineWindow}>{row.windowLabel}</Text></View>
          <Text numberOfLines={1} style={[s.timelineSignature,{color:row.definition.accent}]}>{row.definition.signature.title}</Text>
          {row.hasHistory?<Text style={s.history}>✓ Previously attended</Text>:null}
        </View>
      </Pressable>;
    })}</View>
    <View style={s.regional}><Text style={s.regionalMonth}>MAY</Text><View style={s.flex}><Text style={s.regionalTitle}>Regional activities</Text><Text style={s.note}>May stays open for smaller regional events instead of a permanent annual festival.</Text></View></View>
  </Panel>;
}

const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  flex:{flex:1,minWidth:0},
  kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  title:{...typography.title,color:C.text},
  count:{...typography.caption,color:C.muted,fontWeight:'800'},
  body:{...typography.body,color:C.muted,lineHeight:19,marginTop:spacing.xs},
  months:{gap:6,paddingVertical:spacing.md,paddingRight:8},
  month:{width:46,minHeight:54,alignItems:'center',justifyContent:'center',gap:7,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.panel2},
  monthSelected:{borderColor:C.accent,backgroundColor:C.selection},
  monthText:{fontSize:10,color:C.muted,fontWeight:'900',letterSpacing:.7},
  monthTextSelected:{color:C.text},
  monthDot:{width:7,height:7,borderRadius:4},
  monthDotEmpty:{backgroundColor:C.line},
  monthDotCurrent:{width:10,height:10,borderRadius:5},
  feature:{gap:7,padding:12,borderWidth:1,borderRadius:radii.md,backgroundColor:C.panel2},
  featureTop:{flexDirection:'row',alignItems:'center',gap:10},
  row:{flexDirection:'row',alignItems:'center',gap:6},
  featureName:{...typography.bodyStrong,color:C.text,flexShrink:1},
  signature:{fontSize:10,fontWeight:'800',marginTop:2},
  badge:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.7},
  window:{fontSize:12,fontWeight:'900'},
  meta:{fontSize:10,color:C.muted},
  timelineLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1,marginTop:spacing.md,marginBottom:6},
  timeline:{gap:0},
  timelineRow:{flexDirection:'row',minHeight:62},
  rail:{width:24,alignItems:'center'},
  node:{width:11,height:11,borderRadius:6,borderWidth:2,backgroundColor:C.bg,marginTop:16,zIndex:2},
  line:{position:'absolute',top:26,bottom:-16,width:1,backgroundColor:C.line},
  timelineCard:{flex:1,minWidth:0,paddingVertical:9,paddingHorizontal:10,marginBottom:5,borderRadius:10},
  timelineCurrent:{backgroundColor:C.selection},
  between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  timelineName:{...typography.bodyStrong,color:C.text,flex:1,fontSize:12},
  timelineWindow:{fontSize:9,color:C.muted,fontWeight:'800'},
  timelineSignature:{fontSize:9,fontWeight:'800',marginTop:2},
  history:{fontSize:9,color:C.good,marginTop:2},
  regional:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:10,marginTop:6,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:10},
  regionalMonth:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:.8},
  regionalTitle:{fontSize:11,color:C.text,fontWeight:'800'},
  note:{...typography.caption,color:C.muted,marginTop:2},
});

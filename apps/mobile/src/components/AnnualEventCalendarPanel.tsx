import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {annualEventCalendar} from '../content/annual-event-calendar';
import {annualEventSeriesId} from '../content/live-events';
import {Panel} from './Panel';
import {EventIdentityBadge} from './EventIdentityBadge';
import {C,radii,spacing,typography} from '../theme/theme';

const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;

function monthOrder(windowLabel:string,order:number){
  if(windowLabel.includes('Dec 29'))return 1;
  return Math.max(1,Math.min(12,order));
}

export function AnnualEventCalendarPanel({state,highlightEventId,highlightLabel}:{state:GameState;highlightEventId?:string;highlightLabel?:string}){
  const rows=annualEventCalendar(state);
  const todayOrder=new Date().getMonth()+1;
  const defaultIndex=Math.max(0,rows.findIndex(row=>{
    if(highlightEventId){
      const a=annualEventSeriesId(row.eventId),b=annualEventSeriesId(highlightEventId);
      if(row.eventId===highlightEventId||a&&b&&a===b)return true;
    }
    return monthOrder(row.windowLabel,row.order)>=todayOrder;
  }));
  const [selectedId,setSelectedId]=useState(rows[defaultIndex]?.eventId??rows[0]?.eventId);
  const selected=useMemo(()=>rows.find(row=>row.eventId===selectedId)??rows[defaultIndex]??rows[0],[rows,selectedId,defaultIndex]);
  if(!selected)return null;
  const selectedSeries=annualEventSeriesId(selected.eventId);
  const highlighted=highlightEventId?selected.eventId===highlightEventId||!!selectedSeries&&selectedSeries===annualEventSeriesId(highlightEventId):false;
  const monthSelected=monthOrder(selected.windowLabel,selected.order);

  return <Panel>
    <View style={s.header}>
      <View style={s.flex}><Text style={s.kicker}>YEAR OF ASTERFALL</Text><Text style={s.title}>Festival calendar</Text></View>
      <Text style={s.count}>{rows.length} festivals</Text>
    </View>
    <Text style={s.body}>See what is active, what comes next, and when each major festival normally returns. Exact dates remain controlled by Live-Ops.</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.monthRibbon}>
      {MONTHS.map((month,index)=>{
        const order=index+1,event=rows.find(row=>monthOrder(row.windowLabel,row.order)===order),active=order===monthSelected,hasHistory=!!event?.hasHistory;
        return <Pressable key={month} accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>event&&setSelectedId(event.eventId)} style={[s.monthChip,active&&s.monthChipActive,!event&&s.monthChipEmpty]}>
          <Text style={[s.monthText,active&&s.monthTextActive]}>{month}</Text>
          <View style={[s.monthDot,event&&{backgroundColor:event.definition.accent},hasHistory&&s.monthDotOwned]}/>
        </Pressable>;
      })}
    </ScrollView>

    <View style={[s.featured,{borderColor:selected.definition.accent}]}>
      <View style={s.featuredTop}>
        <EventIdentityBadge event={selected.name} visualKey={selected.definition.visualKey} accent={selected.definition.accent} size={46}/>
        <View style={s.flex}>
          <View style={s.row}><Text numberOfLines={1} style={s.featuredName}>{selected.name}</Text>{highlighted?<Text style={s.liveBadge}>{highlightLabel??'CURRENT'}</Text>:null}</View>
          <Text style={[s.signature,{color:selected.definition.accent}]}>{selected.definition.signature.title}</Text>
        </View>
      </View>
      <View style={s.featuredMeta}>
        <View style={s.metaBlock}><Text style={s.metaLabel}>USUAL WINDOW</Text><Text style={s.metaValue}>{selected.windowLabel}</Text></View>
        <View style={s.metaBlock}><Text style={s.metaLabel}>COLLECTION</Text><Text style={s.metaValue}>{selected.collectionOwned}/{selected.collectionTotal} · {selected.collectionPercent}%</Text></View>
      </View>
      <Text style={s.summary}>{selected.definition.summary}</Text>
      <Text style={s.history}>{selected.hasHistory?('Previously attended · '+selected.lifetimeReputation.toLocaleString()+' lifetime reputation'):'Not attended yet'}</Text>
    </View>

    <View style={s.timelineHeader}><Text style={s.kicker}>YEAR AT A GLANCE</Text><Text style={s.timelineHint}>Tap a festival to preview it</Text></View>
    <View style={s.timeline}>
      {rows.map((row,index)=>{
        const rowSeries=annualEventSeriesId(row.eventId),highlightSeries=highlightEventId?annualEventSeriesId(highlightEventId):undefined;
        const isCurrent=row.eventId===highlightEventId||!!rowSeries&&!!highlightSeries&&rowSeries===highlightSeries;
        const isSelected=row.eventId===selected.eventId;
        return <Pressable key={row.eventId} accessibilityRole="button" accessibilityState={{selected:isSelected}} onPress={()=>setSelectedId(row.eventId)} style={s.timelineRow}>
          <View style={s.rail}>
            <View style={[s.railDot,{borderColor:row.definition.accent,backgroundColor:isCurrent?row.definition.accent:C.panel2}]}/>
            {index<rows.length-1?<View style={s.railLine}/>:null}
          </View>
          <View style={[s.timelineCard,isSelected&&{borderColor:row.definition.accent,backgroundColor:C.panel2}]}>
            <View style={s.between}><Text numberOfLines={1} style={s.timelineName}>{row.name}</Text>{isCurrent?<Text style={s.liveBadge}>{highlightLabel??'CURRENT'}</Text>:row.hasHistory?<Text style={s.done}>✓ VISITED</Text>:null}</View>
            <Text style={[s.timelineWindow,{color:row.definition.accent}]}>{row.windowLabel}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    <Text style={s.note}>May stays intentionally open for smaller regional activities rather than one permanent annual festival.</Text>
  </Panel>;
}

const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  flex:{flex:1,minWidth:0},
  kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  title:{...typography.title,color:C.text},
  count:{...typography.caption,color:C.muted,fontWeight:'800'},
  body:{...typography.body,color:C.muted,lineHeight:19,marginTop:spacing.xs},
  monthRibbon:{gap:6,paddingVertical:spacing.md,paddingRight:spacing.sm},
  monthChip:{minWidth:48,minHeight:48,paddingHorizontal:10,alignItems:'center',justifyContent:'center',gap:5,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},
  monthChipActive:{borderColor:C.accent,backgroundColor:C.panel2},
  monthChipEmpty:{opacity:.48},
  monthText:{fontSize:10,color:C.muted,fontWeight:'900',letterSpacing:.8},
  monthTextActive:{color:C.text},
  monthDot:{width:5,height:5,borderRadius:3,backgroundColor:C.line},
  monthDotOwned:{width:7,height:7,borderRadius:4},
  featured:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderLeftWidth:4,borderRadius:radii.md,backgroundColor:C.bg},
  featuredTop:{flexDirection:'row',alignItems:'center',gap:10},
  row:{flexDirection:'row',alignItems:'center',gap:6},
  featuredName:{...typography.title,color:C.text,flex:1,fontSize:18},
  signature:{fontSize:10,fontWeight:'900',marginTop:2},
  liveBadge:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.7},
  featuredMeta:{flexDirection:'row',gap:8},
  metaBlock:{flex:1,padding:8,borderRadius:radii.sm,backgroundColor:C.panel2},
  metaLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},
  metaValue:{fontSize:11,color:C.text,fontWeight:'800',marginTop:2},
  summary:{...typography.body,color:C.muted,lineHeight:19},
  history:{fontSize:10,color:C.info,fontWeight:'700'},
  timelineHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.sm,marginTop:spacing.lg,marginBottom:spacing.xs},
  timelineHint:{fontSize:9,color:C.muted},
  timeline:{gap:0},
  timelineRow:{flexDirection:'row',minHeight:58},
  rail:{width:24,alignItems:'center'},
  railDot:{width:12,height:12,borderRadius:6,borderWidth:2,marginTop:14,zIndex:1},
  railLine:{position:'absolute',top:26,bottom:-14,width:1,backgroundColor:C.line},
  timelineCard:{flex:1,minHeight:48,marginBottom:8,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},
  between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  timelineName:{...typography.bodyStrong,color:C.text,flex:1,fontSize:12},
  timelineWindow:{fontSize:10,fontWeight:'800',marginTop:3},
  done:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.5},
  note:{...typography.caption,color:C.muted,marginTop:spacing.sm},
});

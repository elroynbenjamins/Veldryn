import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {annualEventCalendar} from '../content/annual-event-calendar';
import {annualEventSeriesId} from '../content/live-events';
import {Panel} from './Panel';
import {EventIdentityBadge} from './EventIdentityBadge';
import {C,radii,spacing,typography} from '../theme/theme';

const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;

export function AnnualEventCalendarPanel({state,highlightEventId,highlightLabel}:{state:GameState;highlightEventId?:string;highlightLabel?:string}){
  const rows=annualEventCalendar(state);
  const highlightSeries=highlightEventId?annualEventSeriesId(highlightEventId):undefined;
  const highlighted=rows.find(row=>row.eventId===highlightEventId||(highlightSeries&&annualEventSeriesId(row.eventId)===highlightSeries));
  const currentMonth=new Date().getUTCMonth()+1;
  const initial=highlighted??rows.find(row=>row.order>=currentMonth)??rows[0];
  const [selectedId,setSelectedId]=useState(initial?.eventId);
  useEffect(()=>{if(highlighted)setSelectedId(highlighted.eventId)},[highlighted?.eventId]);
  const selected=rows.find(row=>row.eventId===selectedId)??initial;
  const byMonth=useMemo(()=>new Map(rows.map(row=>[row.order,row])),[rows]);

  return <Panel>
    <View style={s.header}><View style={s.flex}><Text style={s.kicker}>YEAR OF ASTERFALL</Text><Text style={s.title}>Event Calendar</Text></View><Text style={s.count}>{rows.length} festivals</Text></View>
    <Text style={s.body}>See what is happening now, what comes next, and where each major festival sits in the year.</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.monthRail}>
      {MONTHS.map((month,index)=>{
        const monthNumber=index+1,row=byMonth.get(monthNumber),active=row?.eventId===selected?.eventId,isCurrent=monthNumber===currentMonth;
        return <Pressable key={month} accessibilityRole="button" accessibilityState={{selected:active}} onPress={()=>row&&setSelectedId(row.eventId)} disabled={!row} style={[s.month,active&&s.monthActive,!row&&s.monthEmpty]}>
          <Text style={[s.monthLabel,active&&s.monthLabelActive]}>{month}</Text>
          <View style={[s.monthDot,row&&{backgroundColor:row.definition.accent},isCurrent&&s.monthDotCurrent]}/>
        </Pressable>;
      })}
    </ScrollView>

    {selected?<View style={[s.featured,{borderColor:selected.definition.accent}]}>
      <View style={s.featuredRow}>
        <EventIdentityBadge event={selected.name} visualKey={selected.definition.visualKey} accent={selected.definition.accent} size={48}/>
        <View style={s.flex}>
          <View style={s.nameRow}><Text numberOfLines={1} style={s.featuredName}>{selected.name}</Text>{selected.eventId===highlighted?.eventId?<Text style={s.liveBadge}>{highlightLabel??'CURRENT'}</Text>:null}</View>
          <Text style={[s.signature,{color:selected.definition.accent}]}>{selected.definition.signature.title}</Text>
          <Text style={s.window}>{selected.windowLabel}</Text>
        </View>
      </View>
      <View style={s.stats}>
        <View style={s.stat}><Text style={s.statValue}>{selected.collectionPercent}%</Text><Text style={s.statLabel}>COLLECTION</Text></View>
        <View style={s.divider}/>
        <View style={s.stat}><Text style={s.statValue}>{selected.collectionOwned}/{selected.collectionTotal}</Text><Text style={s.statLabel}>OWNED</Text></View>
        <View style={s.divider}/>
        <View style={s.stat}><Text style={s.statValue}>{selected.hasHistory?'YES':'—'}</Text><Text style={s.statLabel}>ATTENDED</Text></View>
      </View>
      <Text style={s.featuredNote}>{selected.hasHistory?'Your previous festival progress is preserved account-wide.':'You have not taken part in this festival yet.'}</Text>
    </View>:null}

    <Text style={s.timelineTitle}>YEAR AT A GLANCE</Text>
    <View style={s.timeline}>
      {rows.map((row,index)=>{
        const rowSeries=annualEventSeriesId(row.eventId),active=row.eventId===highlightEventId||!!rowSeries&&!!highlightSeries&&rowSeries===highlightSeries,selectedRow=row.eventId===selected?.eventId;
        return <Pressable key={row.eventId} accessibilityRole="button" accessibilityState={{selected:selectedRow}} onPress={()=>setSelectedId(row.eventId)} style={s.timelineRow}>
          <View style={s.timelineTrack}>
            <View style={[s.timelineDot,{borderColor:row.definition.accent,backgroundColor:active?row.definition.accent:C.panel2}]}/>
            {index<rows.length-1?<View style={s.timelineLine}/>:null}
          </View>
          <View style={[s.timelineCard,selectedRow&&{borderColor:row.definition.accent,backgroundColor:C.panel2}]}>
            <View style={s.timelineTop}><Text style={s.timelineMonth}>{row.windowLabel}</Text>{active?<Text style={s.liveBadge}>{highlightLabel??'CURRENT'}</Text>:row.hasHistory?<Text style={s.historyBadge}>ATTENDED</Text>:null}</View>
            <Text style={s.timelineName}>{row.name}</Text>
            <Text numberOfLines={1} style={[s.timelineSignature,{color:row.definition.accent}]}>{row.definition.signature.title}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    <Text style={s.note}>May stays open for smaller regional activities instead of a permanent annual festival. Exact live start and end times remain controlled by Live-Ops.</Text>
  </Panel>;
}

const s=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},flex:{flex:1,minWidth:0},
  kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},
  count:{...typography.caption,color:C.muted,fontWeight:'800'},body:{...typography.body,color:C.muted,lineHeight:19,marginTop:spacing.xs},
  monthRail:{gap:7,paddingVertical:spacing.md,paddingHorizontal:1},month:{width:48,minHeight:52,alignItems:'center',justifyContent:'center',gap:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},
  monthActive:{borderColor:C.accent,backgroundColor:C.panel2},monthEmpty:{opacity:.34},monthLabel:{fontSize:10,color:C.muted,fontWeight:'900'},monthLabelActive:{color:C.text},
  monthDot:{width:7,height:7,borderRadius:4,backgroundColor:C.line},monthDotCurrent:{borderWidth:2,borderColor:C.text,width:10,height:10,borderRadius:5},
  featured:{gap:12,padding:14,borderWidth:1,borderRadius:radii.md,backgroundColor:C.bg},featuredRow:{flexDirection:'row',alignItems:'center',gap:12},
  nameRow:{flexDirection:'row',alignItems:'center',gap:7},featuredName:{...typography.title,color:C.text,flexShrink:1,fontSize:18},signature:{fontSize:11,fontWeight:'900',marginTop:2},
  window:{fontSize:12,color:C.muted,fontWeight:'700',marginTop:4},liveBadge:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.7,paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.good,borderRadius:99},
  stats:{flexDirection:'row',alignItems:'stretch',borderTopWidth:1,borderColor:C.line,paddingTop:10},stat:{flex:1,alignItems:'center',gap:2},statValue:{fontSize:15,color:C.text,fontWeight:'900'},statLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.7},divider:{width:1,backgroundColor:C.line},
  featuredNote:{fontSize:11,lineHeight:16,color:C.muted,textAlign:'center'},timelineTitle:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1,marginTop:spacing.md,marginBottom:spacing.xs},
  timeline:{gap:0},timelineRow:{flexDirection:'row',alignItems:'stretch',minHeight:72},timelineTrack:{width:26,alignItems:'center'},timelineDot:{width:13,height:13,borderRadius:7,borderWidth:3,marginTop:14,zIndex:2},timelineLine:{width:2,flex:1,backgroundColor:C.line,marginTop:-1},
  timelineCard:{flex:1,marginBottom:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.bg},timelineTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  timelineMonth:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.5},timelineName:{fontSize:13,color:C.text,fontWeight:'900',marginTop:3},timelineSignature:{fontSize:9,fontWeight:'800',marginTop:2},
  historyBadge:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.5},note:{...typography.caption,color:C.muted,marginTop:spacing.sm,lineHeight:16},
});

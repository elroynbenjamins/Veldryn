import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {useEffect,useMemo,useState} from 'react';
import {ImageBackground,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {annualEventCalendar,annualCalendarMonths} from '../content/annual-event-calendar';
import {annualEventSeriesId} from '../content/live-events';
import {Panel} from './Panel';
import {EventIdentityBadge} from './EventIdentityBadge';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {fetchPublicEventCalendar,type PublicEventSchedule} from '../online/live-events';

const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'] as const;
const monthForOrder=(order:number)=>Math.max(1,Math.min(12,order));

const validDate=(value:number|undefined):value is number=>value!==undefined&&Number.isFinite(value);
const hasExactSchedule=(schedule:PublicEventSchedule|undefined):schedule is PublicEventSchedule&{startsAtMs:number;endsAtMs:number}=>validDate(schedule?.startsAtMs)&&validDate(schedule?.endsAtMs);
const displayEnd=(startsAtMs:number,endsAtMs:number)=>{const end=new Date(endsAtMs);return endsAtMs>startsAtMs&&end.getUTCHours()===0&&end.getUTCMinutes()===0&&end.getUTCSeconds()===0?endsAtMs-1:endsAtMs;};


export function AnnualEventCalendarPanel({state,highlightEventId,highlightLabel}:{state:GameState;highlightEventId?:string;highlightLabel?:string}){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

  const dateLabel=new Intl.DateTimeFormat(language,{month:'short',day:'numeric',timeZone:'UTC'});
  const monthLabel=(index:number)=>new Intl.DateTimeFormat(language,{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2000,index,1))).toLocaleUpperCase(language);
  const scheduleLabel=(schedule:PublicEventSchedule|undefined,fallback:string)=>hasExactSchedule(schedule)?`${dateLabel.format(new Date(schedule.startsAtMs))} – ${dateLabel.format(new Date(displayEnd(schedule.startsAtMs,schedule.endsAtMs)))}`:p(fallback);
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const [calendarOpen,setCalendarOpen]=useState(false),[previewFestival,setPreviewFestival]=useState(false);
  const rows=annualEventCalendar(state);
  const currentYear=new Date().getUTCFullYear(),currentMonth=new Date().getUTCMonth()+1;
  const calendarMonths=annualCalendarMonths(),calendarYears=[...new Set(calendarMonths.map(date=>date.year))];
  const isVisibleMonth=(year:number,month:number)=>calendarMonths.some(date=>date.year===year&&date.month===month);
  const initialDate=isVisibleMonth(currentYear,currentMonth)?{year:currentYear,month:currentMonth}:calendarMonths[0];
  const rowForMonth=(month:number)=>rows.find(row=>monthForOrder(row.order)===month);
  const [schedule,setSchedule]=useState<PublicEventSchedule[]>([]);
  useEffect(()=>{let live=true;void fetchPublicEventCalendar().then(value=>{if(live)setSchedule(value);}).catch(()=>{});return()=>{live=false;};},[]);
  const scheduleFor=(eventId:string,year=currentYear)=>schedule.find(item=>(annualEventSeriesId(item.eventId)??item.eventId)===(annualEventSeriesId(eventId)??eventId)&&Number(/_(\d{4})$/.exec(item.eventId)?.[1]??(validDate(item.startsAtMs)?new Date(item.startsAtMs).getUTCFullYear():currentYear))===year);
  const highlightSeries=highlightEventId?annualEventSeriesId(highlightEventId):undefined;
  const [selectedDate,setSelectedDate]=useState(()=>initialDate);
  const selected=useMemo(()=>rowForMonth(selectedDate.month)??rows.reduce((best,row)=>Math.abs(row.order-selectedDate.month)<Math.abs(best.order-selectedDate.month)?row:best,rows[0]),[rows,selectedDate.month]);
  const upcoming=rows.filter(row=>annualEventSeriesId(row.eventId)!==highlightSeries).map(row=>{const current=scheduleFor(row.eventId),futureExact=hasExactSchedule(current)&&current.startsAtMs>Date.now(),year=futureExact||row.order>currentMonth?currentYear:currentYear+1;return {row,year,starts:futureExact?current.startsAtMs:Date.UTC(year,row.order-1,1)};}).sort((a,b)=>a.starts-b.starts);
  const timelineRows=rows.filter(row=>isVisibleMonth(selectedDate.year,monthForOrder(row.order)));
  const featured=previewFestival?{row:selected,year:selectedDate.year}:!highlightEventId?upcoming[0]:undefined;
  return <View style={s.hub}>
    {featured?.row&&<ImageBackground source={FESTIVAL_ART[featured.row.definition.visualKey]} resizeMode="cover" style={s.featureHero} imageStyle={s.featureImage}><View style={s.featureShade}/><View style={s.featureContent}><Text style={s.kicker}>{p(previewFestival?'FESTIVAL PREVIEW':'NEXT FESTIVAL')}</Text><EventIdentityBadge event={featured.row.name} visualKey={featured.row.definition.visualKey} accent={featured.row.definition.accent} size={76}/><Text style={s.heroName}>{featured.row.name}</Text><Text style={[s.featureDate,{color:featured.row.definition.accent}]}>{scheduleLabel(scheduleFor(featured.row.eventId,featured.year),featured.row.windowLabel)} · {featured.year}</Text><Text style={s.heroSummary}>{p(featured.row.definition.summary)}</Text><Text style={s.note}>{p(hasExactSchedule(scheduleFor(featured.row.eventId,featured.year))?'Dates set':'Planned window · dates subject to change')}</Text></View></ImageBackground>}
    <Panel>
    <Text style={s.kicker}>{p('COMING EVENTS')}</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.upcomingList} showsVerticalScrollIndicator={false}>{upcoming.map(({row,year})=><Pressable key={row.eventId} accessibilityRole="button" accessibilityLabel={row.name+', '+scheduleLabel(scheduleFor(row.eventId,year),row.windowLabel)+', '+year} onPress={()=>{setSelectedDate({year,month:monthForOrder(row.order)});setPreviewFestival(true)}} style={[s.upcomingCard,{borderColor:row.definition.accent}]}><EventIdentityBadge event={row.name} visualKey={row.definition.visualKey} accent={row.definition.accent} size={38}/><Text style={s.featureName}>{row.name}</Text><Text style={s.note}>{scheduleLabel(scheduleFor(row.eventId,year),row.windowLabel)} · {year}</Text><Text style={s.meta}>{p(hasExactSchedule(scheduleFor(row.eventId,year))?'Dates set':'Planned window')}</Text></Pressable>)}</ScrollView>

    </Panel>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:calendarOpen}} onPress={()=>setCalendarOpen(value=>!value)} style={s.calendarToggle}><View style={s.flex}><Text style={s.title}>{t('Festival calendar')}</Text><Text style={s.note}>{p('Browse festival months and dates')}</Text></View><Text style={s.title}>{calendarOpen?'−':'+'}</Text></Pressable>
    {calendarOpen&&<Panel>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.years} showsVerticalScrollIndicator={false}>
      {calendarYears.map(year=><View key={year} style={s.yearGroup}><Text style={[s.yearLabel,year===currentYear&&s.yearLabelCurrent]}>{year}{year===currentYear?` · ${t("CURRENT")}`:''}</Text><View style={s.months}>{MONTHS.map((label,index)=>{
        if(!isVisibleMonth(year,index+1))return null;
        const localizedMonth=monthLabel(index),month=index+1,event=rowForMonth(month),selectedNow=selectedDate.year===year&&selectedDate.month===month;
        const highlighted=year===currentYear&&event&&(event.eventId===highlightEventId||!!highlightSeries&&annualEventSeriesId(event.eventId)===highlightSeries);
        return <Pressable key={`${year}-${label}`} accessibilityRole="button" accessibilityLabel={event?`${localizedMonth} ${year}, ${event.name}, ${scheduleLabel(scheduleFor(event.eventId,year),event.windowLabel)}`:t("{month}, no annual festival",{month:`${localizedMonth} ${year}`})} accessibilityState={{selected:selectedNow}} onPress={()=>setSelectedDate({year,month})} style={[s.month,selectedNow&&s.monthSelected,selectedNow&&event&&{borderColor:event.definition.accent}]}>
          <Text style={[s.monthText,selectedNow&&s.monthTextSelected]}>{localizedMonth}</Text>
          {event?<View style={[s.monthArt,highlighted&&{borderColor:event.definition.accent}]}><EventIdentityBadge event={event.name} visualKey={event.definition.visualKey} accent={event.definition.accent} size={30}/></View>:<View style={s.monthDotEmpty}/>}
        </Pressable>;
      })}</View></View>)}
    </ScrollView>

    {selected?<View style={[s.feature,{borderColor:selected.definition.accent}]}>
      <View style={s.featureTop}><EventIdentityBadge event={selected.name} visualKey={selected.definition.visualKey} accent={selected.definition.accent} size={46}/><View style={s.flex}><View style={s.row}><Text style={s.featureName}>{selected.name}</Text>{selected.eventId===highlightEventId||!!highlightSeries&&annualEventSeriesId(selected.eventId)===highlightSeries?<Text style={s.badge}>{highlightLabel??t("CURRENT")}</Text>:null}</View><Text style={[s.signature,{color:selected.definition.accent}]}>{selected.definition.signature.title}</Text></View></View>
      <View style={s.scheduleRow}><Text style={[s.window,{color:selected.definition.accent}]}>{scheduleLabel(scheduleFor(selected.eventId,selectedDate.year),selected.windowLabel)}</Text>{hasExactSchedule(scheduleFor(selected.eventId,selectedDate.year))?<Text style={s.scheduled}>{t("DATES SET")}</Text>:null}</View>
      <Text style={s.meta}>{selected.hasHistory?t("Previously attended · {percent}% collection complete",{percent:selected.collectionPercent}):t("Annual festival · Not attended yet")}</Text>
    </View>:null}

  </Panel>}
  </View>;
}

const FESTIVAL_ART:Record<string,number>={veilbreak:require('../../assets/profile-backgrounds/bg_veilbreak.webp'),frostfall:require('../../assets/profile-backgrounds/bg_frostfall.webp'),heartbond:require('../../assets/profile-backgrounds/bg_heartbond.webp'),bloomwake:require('../../assets/profile-backgrounds/bg_bloomwake.webp'),starfall:require('../../assets/profile-backgrounds/bg_starfall.webp'),merchant_guild:require('../../assets/profile-backgrounds/bg_merchant_guild.webp'),harvestwake:require('../../assets/profile-backgrounds/bg_harvestwake.webp')};
function makeStyles(C:ThemeColors){return StyleSheet.create({hub:{gap:12},featureHero:{overflow:'hidden',borderRadius:14,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},featureImage:{opacity:.35},featureShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.35)'},featureContent:{padding:20,gap:10},heroName:{...typography.hero,color:'#f3f5f7'},heroSummary:{...typography.body,color:'#d3d8df',lineHeight:20},featureDate:{...typography.bodyStrong,fontWeight:'800'},calendarToggle:{flexDirection:'row',alignItems:'center',padding:14,gap:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},upcomingList:{gap:10,paddingVertical:10},upcomingCard:{width:170,minHeight:130,gap:7,padding:12,borderWidth:1,borderRadius:12,backgroundColor:C.panel2},
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  flex:{flex:1,minWidth:0},
  kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  title:{...typography.title,color:C.text},
  count:{...typography.caption,color:C.muted,fontWeight:'800'},
  body:{...typography.body,color:C.muted,lineHeight:19,marginTop:spacing.xs},
  years:{gap:spacing.md,paddingVertical:spacing.md,paddingRight:spacing.lg},
  yearGroup:{gap:5},
  yearLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},
  yearLabelCurrent:{color:C.accent},
  months:{flexDirection:'row',gap:6},
  month:{width:54,minHeight:68,alignItems:'center',justifyContent:'center',gap:5,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.panel2},
  monthSelected:{borderColor:C.accent,backgroundColor:C.panel},
  monthText:{fontSize:10,color:C.muted,fontWeight:'900',letterSpacing:.7},
  monthTextSelected:{color:C.text},
  monthArt:{width:38,height:38,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'transparent',borderRadius:19,backgroundColor:C.bg},
  monthDotEmpty:{width:7,height:7,borderRadius:4,backgroundColor:C.line},
  feature:{gap:7,padding:12,borderWidth:1,borderRadius:radii.md,backgroundColor:C.panel2},
  featureTop:{flexDirection:'row',alignItems:'center',gap:10},
  row:{flexDirection:'row',alignItems:'center',gap:6},
  featureName:{...typography.bodyStrong,color:C.text,flexShrink:1},
  signature:{fontSize:10,fontWeight:'800',marginTop:2},
  badge:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.7},
  scheduleRow:{flexDirection:'row',alignItems:'center',gap:8},
  window:{fontSize:12,fontWeight:'900'},
  scheduled:{fontSize:8,color:C.text,fontWeight:'900',letterSpacing:.8,paddingHorizontal:7,paddingVertical:3,borderRadius:10,backgroundColor:C.panel},
  meta:{fontSize:10,color:C.muted},
  timelineLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1,marginTop:spacing.md,marginBottom:6},
  timeline:{gap:0},
  timelineRow:{flexDirection:'row',minHeight:62},
  rail:{width:24,alignItems:'center'},
  node:{width:11,height:11,borderRadius:6,borderWidth:2,backgroundColor:C.bg,marginTop:16,zIndex:2},
  line:{position:'absolute',top:26,bottom:-16,width:1,backgroundColor:C.line},
  timelineCard:{flex:1,minWidth:0,paddingVertical:9,paddingHorizontal:10,marginBottom:5,borderRadius:10},
  timelineCurrent:{backgroundColor:C.panel},
  between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  timelineName:{...typography.bodyStrong,color:C.text,flex:1,fontSize:12},
  timelineWindow:{fontSize:9,color:C.muted,fontWeight:'800'},
  timelineSignature:{fontSize:9,fontWeight:'800',marginTop:2},
  history:{fontSize:9,color:C.good,marginTop:2},
  regional:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:10,marginTop:6,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:10},
  regionalMonth:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:.8},
  regionalTitle:{fontSize:11,color:C.text,fontWeight:'800'},
  note:{...typography.caption,color:C.muted,marginTop:2},
});}

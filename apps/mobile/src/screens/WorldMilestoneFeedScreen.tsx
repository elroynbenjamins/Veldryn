import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,progressionError,type ProgressionKey} from '../i18n/progression';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {UiIcon} from '../components/UiIcon';
import {onlineConfigured} from '../online/supabase';
import {worldMilestoneFeedV43,type WorldMilestoneFeedRow} from '../online/world-milestones-v43';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function kindLabel(kind:string){return kind.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function relativeTime(iso:string,t:(key:ProgressionKey,params?:Record<string,string|number>)=>string){const ms=Date.now()-Date.parse(iso),m=Math.max(0,Math.floor(ms/60000));return m<1?t("Just now"):m<60?t("{count}m ago",{count:m}):m<1440?t("{count}h ago",{count:Math.floor(m/60)}):t("{count}d ago",{count:Math.floor(m/1440)})}

export function WorldMilestoneFeedScreen(){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const [rows,setRows]=useState<WorldMilestoneFeedRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[filterOpen,setFilterOpen]=useState(false),[expanded,setExpanded]=useState<string|null>(null);
 const request=useRef(0);
 const load=async()=>{const version=++request.current;if(!onlineConfigured){setLoading(false);return;}setLoading(true);setError('');try{const next=await worldMilestoneFeedV43();if(request.current===version)setRows(next)}catch(reason){if(request.current===version)setError(progressionError(language,reason,"Unable to load world milestones."))}finally{if(request.current===version)setLoading(false)}};
 useEffect(()=>{void load();return()=>{request.current++}},[]);
 const kinds=[...new Set(rows.map(row=>row.kind))].sort(),visibleRows=filter==='all'?rows:rows.filter(row=>row.kind===filter);

 return <>
 <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={s.kicker}>{t("SOCIAL")}</Text>
  <Text accessibilityRole="header" style={s.heading}>{t("World Milestones")}</Text>
  <Text style={s.sub}>{t("Recent accomplishments published by players who allow world-feed visibility.")}</Text>
  {!onlineConfigured?<Panel><Text style={s.title}>{t("Online services unavailable")}</Text><Text style={s.sub}>{t("The world feed becomes available when this build is connected to Supabase.")}</Text></Panel>:
    <>
      <View style={s.toolbar}>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:filterOpen}} onPress={()=>setFilterOpen(true)} style={s.filterButton}><UiIcon name="filter" size={21}/><Text numberOfLines={1} style={s.filterText}>{filter==='all'?t("All milestones"):p(kindLabel(filter))} ▾</Text></Pressable>
        <View style={s.flex}><Text style={s.count}>{visibleRows.length} / {rows.length}</Text></View>
        <GameButton compact title={loading?t("Refreshing…"):t("Refresh")} tone="secondary" loading={loading} disabled={loading} onPress={()=>load()}/>
      </View>
      {loading&&!rows.length?<View style={s.feedback}><ActivityIndicator color={C.accent}/><Text style={s.sub}>{t("Loading recent milestones…")}</Text></View>:null}
      {error?<View style={s.feedback}><Text accessibilityRole="alert" style={s.error}>{error}</Text>{!rows.length?<GameButton compact title={t("Retry")} tone="secondary" onPress={()=>load()}/>:null}</View>:null}
      {!loading&&!rows.length&&!error?<View style={s.empty}><UiIcon name="world" size={42}/><Text style={s.title}>{t("The world is quiet")}</Text><Text style={s.sub}>{t("No public milestones have been published recently. VELDRYN never fabricates NPC or fake-player activity to fill this feed.")}</Text></View>:null}
      {visibleRows.length?<View style={s.list}>{visibleRows.map(row=><Pressable key={row.feed_id} accessibilityRole="button" accessibilityState={{expanded:expanded===row.feed_id}} onPress={()=>setExpanded(old=>old===row.feed_id?null:row.feed_id)} style={({pressed})=>[s.card,pressed&&s.pressed]}>
         <View style={s.marker}><UiIcon name="rewards" size={24}/></View>
         <View style={s.flex}><View style={s.between}><Text style={s.name} numberOfLines={1}>{row.display_name}</Text><Text style={s.time}>{relativeTime(row.occurred_at,t)}</Text></View>
         <Text style={s.subject} numberOfLines={expanded===row.feed_id?undefined:2}>{row.subject_name}</Text>
         <Text style={s.kind}>{p(kindLabel(row.kind))}</Text>
         {row.detail&&expanded===row.feed_id?<Text style={s.detail}>{row.detail}</Text>:null}
         </View><Text style={s.chevron}>{expanded===row.feed_id?'⌃':'⌄'}</Text>
      </Pressable>)}</View>:null}
      {!loading&&rows.length>0&&!visibleRows.length?<View style={s.empty}><Text style={s.title}>{t("No matching milestones")}</Text><GameButton compact title={t("All milestones")} tone="secondary" onPress={()=>setFilter('all')}/></View>:null}
    </>
  }
 </ScrollView>
 <GameModalSurface visible={filterOpen} onClose={()=>setFilterOpen(false)} reduceMotion={true}>
   <GameModalHeader title={t("Milestone type")} onClose={()=>setFilterOpen(false)}/>
   <ScrollView style={s.options} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     {['all',...kinds].map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{selected:filter===value}} onPress={()=>{setFilter(value);setFilterOpen(false);setExpanded(null)}} style={[s.option,filter===value&&s.optionSelected]}><Text style={s.optionText}>{filter===value?'✓  ':''}{value==='all'?t("All milestones"):p(kindLabel(value))}</Text><Text style={s.optionCount}>{value==='all'?rows.length:rows.filter(row=>row.kind===value).length}</Text></Pressable>)}
   </ScrollView>
 </GameModalSurface>
 </>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.caption,color:C.muted,lineHeight:18},error:{...typography.body,color:C.bad},flex:{flex:1,minWidth:0},
 toolbar:{flexDirection:'row',alignItems:'center',gap:9},filterButton:{flex:1,minWidth:110,minHeight:44,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},filterText:{...typography.caption,color:C.text,flex:1,fontWeight:'800'},count:{fontSize:10,color:C.muted,textAlign:'center'},
 feedback:{padding:12,gap:10,alignItems:'center'},list:{gap:7},card:{flexDirection:'row',alignItems:'center',gap:9,padding:11,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},marker:{width:42,height:42,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 between:{flexDirection:'row',justifyContent:'space-between',gap:7},name:{...typography.bodyStrong,color:C.text,flex:1},time:{color:C.muted,fontSize:10},subject:{color:C.text,fontSize:13,fontWeight:'900',marginTop:3},kind:{color:C.info,fontSize:10,fontWeight:'900',letterSpacing:.35,marginTop:3},detail:{color:C.muted,fontSize:11,lineHeight:17,marginTop:6},chevron:{fontSize:16,color:C.accent,alignSelf:'center'},pressed:{opacity:.77},
 empty:{alignItems:'center',gap:9,padding:22,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},options:{maxHeight:440,flexShrink:1},option:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:C.line},optionSelected:{backgroundColor:C.accentSurface},optionText:{...typography.bodyStrong,flex:1,color:C.text},optionCount:{fontSize:11,color:C.muted}
});}
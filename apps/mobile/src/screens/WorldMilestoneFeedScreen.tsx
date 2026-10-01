import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,progressionError,type ProgressionKey} from '../i18n/progression';
import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
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

 const [rows,setRows]=useState<WorldMilestoneFeedRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{if(!onlineConfigured){setLoading(false);return;}setLoading(true);setError('');try{setRows(await worldMilestoneFeedV43())}catch(reason){setError(progressionError(language,reason,"Unable to load world milestones."))}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><Text style={s.kicker}>{t("SOCIAL")}</Text><Text accessibilityRole="header" style={s.heading}>{t("World Milestones")}</Text><Text style={s.sub}>{t("Recent accomplishments published by players who allow world-feed visibility.")}</Text>
  {!onlineConfigured?<Panel><Text style={s.title}>{t("Online services unavailable")}</Text><Text style={s.sub}>{t("The world feed becomes available when this build is connected to Supabase.")}</Text></Panel>:loading&&!rows.length?<Panel><ActivityIndicator color={C.accent}/><Text style={s.sub}>{t("Loading recent milestones…")}</Text></Panel>:error&&!rows.length?<Panel><Text style={s.error}>{error}</Text><GameButton title={t("Retry")} tone="secondary" onPress={()=>void load()}/></Panel>:!rows.length?<Panel><Text style={s.title}>{t("The world is quiet")}</Text><Text style={s.sub}>{t("No public milestones have been published recently. VELDRYN never fabricates NPC or fake-player activity to fill this feed.")}</Text><GameButton title={t("Refresh")} tone="secondary" onPress={()=>void load()}/></Panel>:<>
   <View style={s.summary}><Text style={s.summaryValue}>{rows.length}</Text><Text style={s.summaryLabel}>{t("RECENT PUBLIC MILESTONES")}</Text></View>
   {rows.map(row=><View key={row.feed_id} style={s.card}><View style={s.marker}><Text style={s.markerText}>✦</Text></View><View style={s.flex}><View style={s.between}><Text style={s.name}>{row.display_name}</Text><Text style={s.time}>{relativeTime(row.occurred_at,t)}</Text></View><Text style={s.subject}>{row.subject_name}</Text><Text style={s.kind}>{p(kindLabel(row.kind))}</Text>{row.detail?<Text style={s.detail}>{row.detail}</Text>:null}</View></View>)}
   <GameButton title={loading?t("Refreshing…"):t("Refresh")} tone="secondary" disabled={loading} onPress={()=>void load()}/>{error?<Text style={s.error}>{error}</Text>:null}
  </>}
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},error:{...typography.body,color:C.bad},summary:{flexDirection:'row',alignItems:'baseline',gap:8,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},summaryValue:{fontSize:24,fontWeight:'900',color:C.accent},summaryLabel:{color:C.muted,fontSize:10,fontWeight:'900'},card:{flexDirection:'row',gap:10,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},marker:{width:42,height:42,borderRadius:21,borderWidth:1,borderColor:C.accent,backgroundColor:C.accentSurface,alignItems:'center',justifyContent:'center'},markerText:{color:C.accent,fontSize:18,fontWeight:'900'},flex:{flex:1,minWidth:0},between:{flexDirection:'row',justifyContent:'space-between',gap:8},name:{color:C.text,fontWeight:'900'},time:{color:C.muted,fontSize:10},subject:{color:C.accent,fontSize:14,fontWeight:'900',marginTop:2},kind:{color:C.info,fontSize:9,fontWeight:'900',letterSpacing:.6,marginTop:2},detail:{color:C.muted,fontSize:11,lineHeight:16,marginTop:3}});}

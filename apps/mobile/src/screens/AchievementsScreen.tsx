import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,progressionError,type ProgressionKey} from '../i18n/progression';
import {useEffect,useRef,useState,useMemo} from 'react';
import {Animated,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from '../components/GameButton';
import {GameModalSurface,GameModalHeader} from '../components/GameModalSurface';
import {Panel} from '../components/Panel';
import {ActionFeedback} from '../components/ActionFeedback';
import {EmptyState} from '../components/EmptyState';
import {LoadingState} from '../components/LoadingState';
import {achievementsClient,achievementsOnlineConfigured} from '../online/achievements-client';
import type {AchievementClaimResult,AchievementSnapshotProjection} from '../core/achievement-types';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
let requestSequence=0;const requestId=(kind:string)=>`${kind}-${Date.now()}-${++requestSequence}`;

interface AchievementClaimMoment{
 id:string;
 name:string;
 points:number;
 scoreBefore:number;
 scoreAfter:number;
 payout:AchievementClaimResult['payout'];
 idempotentReplay:boolean;
}
function AchievementClaimMomentCard({moment,reduceMotion,onProfile}:{moment:AchievementClaimMoment;reduceMotion:boolean;onProfile?:()=>void}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),scale=useRef(new Animated.Value(1)).current;
 useEffect(()=>{scale.stopAnimation();scale.setValue(1);if(reduceMotion||moment.idempotentReplay)return;Animated.sequence([Animated.spring(scale,{toValue:1.03,damping:8,stiffness:230,mass:.6,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:16,stiffness:210,mass:.75,useNativeDriver:true})]).start();return()=>scale.stopAnimation()},[moment.id,moment.idempotentReplay,reduceMotion,scale]);
 return <Animated.View accessibilityLiveRegion="polite" style={[s.claimMoment,{transform:[{scale}]}]}>
   <Text style={s.claimEyebrow}>{moment.idempotentReplay?t("ACHIEVEMENT SYNCED"):t("✦ ACHIEVEMENT CLAIMED")}</Text>
   <Text style={s.claimTitle}>{moment.name}</Text>
   <View style={s.claimStats}><View style={s.claimStat}><Text style={s.claimValue}>+{moment.points}</Text><Text style={s.claimLabel}>{t("SCORE")}</Text></View><View style={s.claimStat}><Text style={s.claimValue}>+{moment.payout.gold}</Text><Text style={s.claimLabel}>{t("GOLD")}</Text></View><View style={s.claimStat}><Text style={s.claimValue}>{moment.scoreAfter}</Text><Text style={s.claimLabel}>{t("TOTAL SCORE")}</Text></View></View>
   {moment.payout.titleName?<View style={s.titleUnlock}><Text style={s.titleUnlockEyebrow}>{t("NEW PROFILE TITLE")}</Text><Text style={s.titleUnlockName}>{moment.payout.titleName}</Text><Text style={s.claimCopy}>{t("The title is now unlocked for profile customization.")}</Text>{onProfile?<View style={s.claimAction}><GameButton compact title={t("Customize profile")} tone="secondary" onPress={onProfile}/></View>:null}</View>:null}
   {moment.idempotentReplay?<Text style={s.claimCopy}>{t("This reward had already been credited; your achievement state was refreshed without paying it twice.")}</Text>:<Text style={s.claimCopy}>{t("Reward secured · score {before} → {after}.",{before:moment.scoreBefore,after:moment.scoreAfter})}</Text>}
 </Animated.View>;
}

export function AchievementsScreen({reduceMotion=false,onProfile}:{reduceMotion?:boolean;onProfile?:()=>void}={}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackRows=width<360||fontScale>=1.25;
  const [snapshot,setSnapshot]=useState<AchievementSnapshotProjection|null>(null);
  const [showcase,setShowcase]=useState<string[]>([]);
  const [filter,setFilter]=useState<'all'|'ready'|'claimed'>('all');
  const [category,setCategory]=useState('all'),[categoryOpen,setCategoryOpen]=useState(false),[expandedId,setExpandedId]=useState<string|null>(null);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[claimMoment,setClaimMoment]=useState<AchievementClaimMoment|null>(null);
  const loading=busy!==null;
  async function load(){if(!achievementsOnlineConfigured){setError(t("Achievements require the authenticated online server."));return}setBusy('load');setError('');setNotice('');try{const next=await achievementsClient.snapshot();setSnapshot(next);setShowcase(next.showcaseIds)}catch(e){setError(progressionError(language,e,"Could not load Achievements."))}finally{setBusy(null)}}
  useEffect(()=>{void load()},[]);
  function toggle(id:string){setShowcase(current=>current.includes(id)?current.filter(value=>value!==id):current.length<3?[...current,id]:current)}
  async function saveShowcase(){setBusy('showcase');setError('');setNotice('');try{const result=await achievementsClient.showcase(showcase,requestId('showcase'));setSnapshot(result.snapshot);setShowcase(result.showcaseIds);setNotice(t("Achievement showcase updated."))}catch(e){setError(progressionError(language,e,"Could not save showcase."))}finally{setBusy(null)}}
  async function claim(id:string){const before=snapshot,entry=before?.entries.find(row=>row.id===id);setBusy(`claim:${id}`);setError('');setNotice('');setClaimMoment(null);try{const result=await achievementsClient.claim(id,requestId(`claim-${id}`));setSnapshot(result.snapshot);setShowcase(result.snapshot.showcaseIds);setClaimMoment({id:result.achievementId,name:entry?.name??result.snapshot.entries.find(row=>row.id===id)?.name??t("Achievement"),points:entry?.points??0,scoreBefore:before?.score??Math.max(0,result.snapshot.score-(entry?.points??0)),scoreAfter:result.snapshot.score,payout:result.payout,idempotentReplay:result.idempotentReplay})}catch(e){setError(progressionError(language,e,"Could not claim achievement."))}finally{setBusy(null)}}

  const entries=snapshot?.entries??[];
  const readyEntries=entries.filter(entry=>entry.completed&&!entry.claimed);
  const categories=['all',...new Set(entries.map(entry=>entry.category))];
  const visibleEntries=entries.filter(entry=>(category==='all'||entry.category===category)&&(filter==='all'||(filter==='ready'?entry.completed&&!entry.claimed:entry.claimed)))
    .sort((a,b)=>Number(b.completed&&!b.claimed)-Number(a.completed&&!a.claimed));
  const firstReady=readyEntries[0];
  const claimedCount=entries.filter(entry=>entry.claimed).length;
  return <>
  <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.heading}>{t("Achievements")}</Text>
    <View style={s.summary}>
      <View style={s.summaryMain}><Text style={s.summaryLabel}>{p("ACHIEVEMENT SCORE")}</Text><Text style={s.score}>{snapshot?.score??'—'}</Text></View>
      <View style={s.summaryMetrics}><Text style={s.metricValue}>{claimedCount}<Text style={s.metricTotal}>/{entries.length}</Text></Text><Text style={s.metricLabel}>{t("Claimed")}</Text></View>
      <View style={s.summaryMetrics}><Text style={s.metricValue}>{showcase.length}<Text style={s.metricTotal}>/3</Text></Text><Text style={s.metricLabel}>{p("Showcase")}</Text></View>
    </View>
    {firstReady?<View style={s.readyCard}>
      <View style={s.readyHeader}><Text style={s.readyEyebrow}>{t("Ready")} · {readyEntries.length}</Text><Text style={s.readyPoints}>+{firstReady.points} {p("points")}</Text></View>
      <Text style={s.title}>{firstReady.name}</Text>
      <Text numberOfLines={2} style={s.copy}>{firstReady.description}</Text>
      <GameButton compact title={t("Claim")} loading={busy===`claim:${firstReady.id}`} disabled={busy!==null} onPress={()=>claim(firstReady.id)}/>
    </View>:null}
    <View accessibilityRole="tablist" style={s.filters}>{([['all',t("All"),entries.length],['ready',t("Ready"),readyEntries.length],['claimed',t("Claimed"),claimedCount]] as const).map(([value,label,count])=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:filter===value}} onPress={()=>setFilter(value)} style={({pressed})=>[s.filter,filter===value&&s.filterSelected,pressed&&s.pressed]}><Text style={[s.filterText,filter===value&&s.filterTextSelected]}>{label} · {count}</Text></Pressable>)}</View>
    <View style={s.tools}><Pressable accessibilityRole="button" accessibilityLabel={p("Filter achievement category")} onPress={()=>setCategoryOpen(true)} style={s.categoryButton}><Text numberOfLines={1} style={s.categoryText}>{category==='all'?p("All categories"):category} ▾</Text></Pressable><Text style={s.count}>{visibleEntries.length} {p("shown")}</Text></View>
    {busy==='load'&&!snapshot&&<LoadingState label={t("Loading achievements")} detail={t("Syncing server-calculated progress and showcase status.")}/>}
    {claimMoment&&<AchievementClaimMomentCard moment={claimMoment} reduceMotion={reduceMotion} onProfile={onProfile}/>}
    {!!notice&&<ActionFeedback message={notice} tone="success" reduceMotion={reduceMotion}/>}
    {error&&<View style={s.feedbackBlock}><ActionFeedback message={error} tone="error" reduceMotion={reduceMotion}/><GameButton compact title={t("Retry")} tone="secondary" disabled={busy!==null} onPress={()=>load()}/></View>}
    <View style={s.list}>
      {visibleEntries.map(entry=>{
        const ready=entry.completed&&!entry.claimed,expanded=expandedId===entry.id;
        const pct=Math.min(100,Math.max(0,entry.progress/Math.max(1,entry.required)*100));
        return <View key={entry.id} style={[s.achievement,ready&&s.achievementReady]}>
          <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={entry.name} onPress={()=>setExpandedId(current=>current===entry.id?null:entry.id)} style={({pressed})=>[s.entryHeader,pressed&&s.pressed]}>
            <View style={[s.emblem,ready&&s.emblemReady,entry.claimed&&s.emblemClaimed]}><Text style={s.emblemText}>{entry.claimed?'✓':ready?'✦':'◆'}</Text></View>
            <View style={s.flex}><Text numberOfLines={2} style={s.entryName}>{entry.name}</Text><Text numberOfLines={1} style={s.entryMeta}>{entry.category} · +{entry.points} {p("points")}</Text></View>
            <View style={s.entryRight}><Text style={[s.entryState,ready&&s.good,entry.claimed&&s.claimed]}>{entry.claimed?t("Claimed"):ready?t("Ready"):p("In progress")}</Text><Text style={s.chevron}>{expanded?'⌃':'⌄'}</Text></View>
          </Pressable>
          <View style={s.progressHeading}><Text style={s.progressLabel}>{entry.progress}/{entry.required}</Text><Text style={s.progressLabel}>{Math.round(pct)}%</Text></View>
          <View accessibilityRole="progressbar" accessibilityLabel={entry.name} accessibilityValue={{min:0,max:Math.max(1,entry.required),now:Math.min(entry.progress,Math.max(1,entry.required))}} style={s.progressTrack}><View style={[s.progressFill,entry.completed&&s.progressComplete,{width:`${pct}%`}]}/></View>
          {expanded?<Text style={s.detail}>{entry.description}</Text>:null}
          {(ready||entry.claimed)?<View style={s.entryActions}>
            {ready?<GameButton compact title={t("Claim")} loading={busy===`claim:${entry.id}`} disabled={busy!==null} onPress={()=>claim(entry.id)}/>:null}
            {entry.claimed?<GameButton compact title={showcase.includes(entry.id)?t("Shown"):t("Show")} selected={showcase.includes(entry.id)} tone="secondary" disabled={busy!==null||(!showcase.includes(entry.id)&&showcase.length>=3)} onPress={()=>toggle(entry.id)}/>:null}
          </View>:null}
        </View>;
      })}
    </View>
    {snapshot&&!loading&&!visibleEntries.length&&<EmptyState compact title={t("No achievements here")} message={t("Try another filter, or keep progressing to unlock more achievement entries.")} icon="quests"/>}
    {snapshot?<View style={s.showcaseFooter}><View style={s.flex}><Text style={s.title}>{p("Profile showcase")}</Text><Text style={s.copy}>{t("Claimed: {count} · Showcase slots: {slots}/3",{count:snapshot.claimedCount,slots:showcase.length})}</Text></View><GameButton compact title={t("Save showcase")} tone="secondary" loading={busy==='showcase'} disabled={busy!==null} onPress={()=>saveShowcase()}/></View>:null}
    <Text style={s.footerNote}>{t("Progress, score, Gold, and titles are calculated by the authenticated server. Achievements do not grant combat power or multipliers.")}</Text>
  </ScrollView>
  <GameModalSurface visible={categoryOpen} onClose={()=>setCategoryOpen(false)} reduceMotion={reduceMotion}>
    <GameModalHeader title={p("Achievement categories")} onClose={()=>setCategoryOpen(false)}/>
    <ScrollView style={s.categoryList} showsVerticalScrollIndicator={false}>
      {categories.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{selected:category===value}} onPress={()=>{setCategory(value);setCategoryOpen(false);setExpandedId(null)}} style={[s.categoryOption,category===value&&s.categorySelected]}><Text style={s.categoryOptionText}>{category===value?'✓  ':''}{value==='all'?p("All categories"):value}</Text></Pressable>)}
    </ScrollView>
  </GameModalSurface>
  </>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 root:{padding:spacing.md,gap:spacing.md,paddingBottom:110},heading:{...typography.hero,color:C.text},
 title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted,lineHeight:18},flex:{flex:1,minWidth:0},
 summary:{flexDirection:'row',alignItems:'center',gap:14,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,borderRadius:12,padding:14},
 summaryMain:{flex:1},summaryLabel:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:.8},score:{fontSize:27,fontWeight:'900',color:C.text},
 summaryMetrics:{alignItems:'center',minWidth:53},metricValue:{fontSize:18,fontWeight:'800',color:C.text},metricTotal:{fontSize:12,color:C.muted},metricLabel:{fontSize:10,color:C.muted},
 readyCard:{gap:8,padding:14,borderWidth:1,borderLeftWidth:4,borderColor:C.good,borderRadius:12,backgroundColor:C.goodSurface},readyHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},readyEyebrow:{fontSize:11,color:C.good,fontWeight:'900',letterSpacing:.6},readyPoints:{fontSize:11,color:C.good,fontWeight:'800'},
 filters:{flexDirection:'row',gap:6},filter:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:6,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},filterSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},filterText:{fontSize:12,color:C.muted,fontWeight:'700'},filterTextSelected:{color:C.text},pressed:{opacity:.76},
 tools:{flexDirection:'row',alignItems:'center',gap:8},categoryButton:{flex:1,minHeight:42,paddingHorizontal:12,justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},categoryText:{...typography.bodyStrong,color:C.text},count:{fontSize:11,color:C.muted},
 list:{gap:8},achievement:{padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel,gap:6},achievementReady:{borderColor:C.good},
 entryHeader:{flexDirection:'row',alignItems:'center',gap:10,minHeight:50},emblem:{width:42,height:42,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},emblemReady:{borderColor:C.good,backgroundColor:C.goodSurface},emblemClaimed:{borderColor:C.accent,backgroundColor:C.accentSurface},emblemText:{fontSize:19,color:C.accent,fontWeight:'900'},entryName:{...typography.bodyStrong,color:C.text},entryMeta:{fontSize:11,color:C.muted,marginTop:3},entryRight:{alignItems:'flex-end',gap:3,maxWidth:88},entryState:{fontSize:10,fontWeight:'900',color:C.muted},good:{color:C.good},claimed:{color:C.accent},chevron:{fontSize:15,color:C.muted},progressHeading:{flexDirection:'row',justifyContent:'space-between'},progressLabel:{fontSize:10,color:C.muted},progressTrack:{height:5,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2},progressFill:{height:'100%',backgroundColor:C.info},progressComplete:{backgroundColor:C.good},detail:{...typography.caption,color:C.muted,lineHeight:18,marginTop:3},entryActions:{alignSelf:'flex-end',paddingTop:3},
 showcaseFooter:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
 footerNote:{fontSize:11,lineHeight:17,color:C.muted},categoryList:{maxHeight:370},categoryOption:{minHeight:48,paddingHorizontal:14,justifyContent:'center',borderBottomWidth:1,borderBottomColor:C.line},categorySelected:{backgroundColor:C.accentSurface},categoryOptionText:{...typography.bodyStrong,color:C.text},
 feedbackBlock:{gap:spacing.sm},claimMoment:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderLeftWidth:4,borderColor:C.accent,borderRadius:12,backgroundColor:C.accentSurface},claimEyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},claimTitle:{...typography.hero,color:C.text},claimStats:{flexDirection:'row',gap:6},claimStat:{flex:1,alignItems:'center',padding:8,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},claimValue:{...typography.title,color:C.good,fontWeight:'900'},claimLabel:{fontSize:8,lineHeight:10,color:C.muted,fontWeight:'900',letterSpacing:.55},claimCopy:{...typography.caption,color:C.muted},titleUnlock:{gap:3,padding:spacing.sm,borderWidth:1,borderColor:C.special,borderRadius:8,backgroundColor:C.specialSurface},titleUnlockEyebrow:{fontSize:8,lineHeight:10,color:C.special,fontWeight:'900',letterSpacing:.8},titleUnlockName:{...typography.title,color:C.special,fontWeight:'900'},claimAction:{alignSelf:'flex-start'}
});}
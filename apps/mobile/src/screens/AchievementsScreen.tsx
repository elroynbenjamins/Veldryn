import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,progressionError,type ProgressionKey} from '../i18n/progression';
import {useEffect,useRef,useState,useMemo} from 'react';
import {Animated,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from '../components/GameButton';
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
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[claimMoment,setClaimMoment]=useState<AchievementClaimMoment|null>(null);
  const loading=busy!==null;
  async function load(){if(!achievementsOnlineConfigured){setError(t("Achievements require the authenticated online server."));return}setBusy('load');setError('');setNotice('');try{const next=await achievementsClient.snapshot();setSnapshot(next);setShowcase(next.showcaseIds)}catch(e){setError(progressionError(language,e,"Could not load Achievements."))}finally{setBusy(null)}}
  useEffect(()=>{void load()},[]);
  function toggle(id:string){setShowcase(current=>current.includes(id)?current.filter(value=>value!==id):current.length<3?[...current,id]:current)}
  async function saveShowcase(){setBusy('showcase');setError('');setNotice('');try{const result=await achievementsClient.showcase(showcase,requestId('showcase'));setSnapshot(result.snapshot);setShowcase(result.showcaseIds);setNotice(t("Achievement showcase updated."))}catch(e){setError(progressionError(language,e,"Could not save showcase."))}finally{setBusy(null)}}
  async function claim(id:string){const before=snapshot,entry=before?.entries.find(row=>row.id===id);setBusy(`claim:${id}`);setError('');setNotice('');setClaimMoment(null);try{const result=await achievementsClient.claim(id,requestId(`claim-${id}`));setSnapshot(result.snapshot);setShowcase(result.snapshot.showcaseIds);setClaimMoment({id:result.achievementId,name:entry?.name??result.snapshot.entries.find(row=>row.id===id)?.name??t("Achievement"),points:entry?.points??0,scoreBefore:before?.score??Math.max(0,result.snapshot.score-(entry?.points??0)),scoreAfter:result.snapshot.score,payout:result.payout,idempotentReplay:result.idempotentReplay})}catch(e){setError(progressionError(language,e,"Could not claim achievement."))}finally{setBusy(null)}}
  const entries=snapshot?.entries??[],readyEntries=entries.filter(entry=>entry.completed&&!entry.claimed),visibleEntries=entries.filter(entry=>filter==='all'||(filter==='ready'?entry.completed&&!entry.claimed:entry.claimed)).sort((a,b)=>filter==='all'?Number(b.completed&&!b.claimed)-Number(a.completed&&!a.claimed):0),firstReady=readyEntries[0];
  return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.heading}>{t("Achievements")}</Text>
    {firstReady?<Panel accentColor={C.good} accentSurface={C.goodSurface}><Text style={s.readyEyebrow}>{t("Ready")} · {readyEntries.length}</Text><Text style={s.title}>{firstReady.name}</Text><Text style={s.copy}>{firstReady.description}</Text><GameButton title={t("Claim")} loading={busy===`claim:${firstReady.id}`} disabled={busy!==null} onPress={()=>void claim(firstReady.id)}/></Panel>:null}
    <Panel><Text style={s.title}>{t("Prestige, not power")}</Text><Text style={s.copy}>{t("Progress, score, Gold, and titles are calculated by the authenticated server. Achievements do not grant combat power or multipliers.")}</Text><Text style={s.score}>{t("Score: {score}",{score:snapshot?.score??'—'})}</Text><Text style={s.copy}>{t("Claimed: {count} · Showcase slots: {slots}/3",{count:snapshot?.claimedCount??'—',slots:showcase.length})}</Text><View style={s.button}><GameButton compact title={t("Save showcase")} tone="secondary" loading={busy==='showcase'} disabled={busy!==null||!snapshot} onPress={()=>void saveShowcase()}/></View></Panel>
    <View accessibilityRole="tablist" style={s.filters}>{([['all',t("All"),entries.length],['ready',t("Ready"),readyEntries.length],['claimed',t("Claimed"),entries.filter(entry=>entry.claimed).length]] as const).map(([value,label,count])=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:filter===value}} onPress={()=>setFilter(value)} style={({pressed})=>[s.filter,filter===value&&s.filterSelected,pressed&&s.pressed]}><Text style={[s.filterText,filter===value&&s.filterTextSelected]}>{label} · {count}</Text></Pressable>)}</View>
    {busy==='load'&&!snapshot&&<LoadingState label={t("Loading achievements")} detail={t("Syncing server-calculated progress and showcase status.")}/>}
    {claimMoment&&<AchievementClaimMomentCard moment={claimMoment} reduceMotion={reduceMotion} onProfile={onProfile}/>}
    {!!notice&&<ActionFeedback message={notice} tone="success" reduceMotion={reduceMotion}/>}
    {error&&<View style={s.feedbackBlock}><ActionFeedback message={error} tone="error" reduceMotion={reduceMotion}/><GameButton compact title={t("Retry")} tone="secondary" disabled={busy!==null} onPress={()=>void load()}/></View>}
    {visibleEntries.map(entry=><Panel key={entry.id}><View style={[s.row,stackRows&&s.rowStack]}><View style={s.flex}><Text style={s.title}>{entry.name}</Text><Text style={s.copy}>{entry.category} · {entry.description}</Text><Text style={s.copy}>{t("Progress {current}/{total} · {points} points",{current:entry.progress,total:entry.required,points:entry.points})}</Text><View accessibilityRole="progressbar" accessibilityLabel={entry.name} accessibilityValue={{min:0,max:Math.max(1,entry.required),now:Math.min(entry.progress,Math.max(1,entry.required))}} style={s.progressTrack}><View style={[s.progressFill,entry.completed&&s.progressComplete,{width:`${Math.min(100,Math.max(0,entry.progress/Math.max(1,entry.required)*100))}%`}]}/></View></View><View style={[s.actions,stackRows&&s.actionsStack]}><GameButton compact title={entry.claimed?t("Claimed"):entry.completed?t("Claim"):t("Locked")} loading={busy===`claim:${entry.id}`} disabled={!entry.completed||entry.claimed||busy!==null} onPress={()=>void claim(entry.id)}/>{entry.claimed&&<GameButton compact title={showcase.includes(entry.id)?t("Shown"):t("Show")} selected={showcase.includes(entry.id)} tone="secondary" disabled={busy!==null||(!showcase.includes(entry.id)&&showcase.length>=3)} onPress={()=>toggle(entry.id)}/>}</View></View></Panel>)}
    {snapshot&&!loading&&!visibleEntries.length&&<EmptyState compact title={t("No achievements here")} message={t("Try another filter, or keep progressing to unlock more achievement entries.")} icon="quests"/>}
  </ScrollView>
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},copy:{...typography.body,color:C.muted,lineHeight:21},accent:{color:C.accent,fontWeight:'800'},good:{color:C.good,fontWeight:'800'},score:{...typography.hero,color:C.accent,marginTop:spacing.md},warning:{...typography.bodyStrong,color:C.warning},readyEyebrow:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.8},progressTrack:{height:7,marginTop:8,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2},progressFill:{height:'100%',backgroundColor:C.info},progressComplete:{backgroundColor:C.good},feedbackBlock:{gap:spacing.sm},claimMoment:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderLeftWidth:4,borderColor:C.accent,borderRadius:12,backgroundColor:C.accentSurface},claimEyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},claimTitle:{...typography.hero,color:C.text},claimStats:{flexDirection:'row',gap:6},claimStat:{flex:1,alignItems:'center',padding:8,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},claimValue:{...typography.title,color:C.good,fontWeight:'900'},claimLabel:{fontSize:8,lineHeight:10,color:C.muted,fontWeight:'900',letterSpacing:.55},claimCopy:{...typography.caption,color:C.muted},titleUnlock:{gap:3,padding:spacing.sm,borderWidth:1,borderColor:C.special,borderRadius:8,backgroundColor:C.specialSurface},titleUnlockEyebrow:{fontSize:8,lineHeight:10,color:C.special,fontWeight:'900',letterSpacing:.8},titleUnlockName:{...typography.title,color:C.special,fontWeight:'900'},claimAction:{alignSelf:'flex-start'},filters:{flexDirection:'row',flexWrap:'wrap',gap:6},filter:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},filterSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},filterText:{fontSize:12,color:C.muted,fontWeight:'700'},filterTextSelected:{color:C.text},pressed:{opacity:.76},row:{flexDirection:'row',gap:spacing.md,alignItems:'center'},rowStack:{flexDirection:'column',alignItems:'stretch'},flex:{flex:1,minWidth:0},actions:{gap:spacing.xs},actionsStack:{flexDirection:'row',flexWrap:'wrap'},button:{marginTop:spacing.md}});}

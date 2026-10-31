import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState,SkillId} from '../core/types';
import type {WorkingTowardDestination} from '../core/working-toward';
import {JOURNAL_ACHIEVEMENTS_V42,JOURNAL_TITLES_V42} from '../core/adventurers-journal-v42';
import {professionMasteryHallSummary,professionMasteryMasteredRecords,skillIdentity} from '../core/profession-mastery-presentation';
import {formatGameNumber} from '../core/number-format';
import {profileMasteryPrestige} from '../core/profile-prestige';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {MasteryDiscoveryPanel} from '../components/MasteryDiscoveryPanel';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const tierLabel=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1);
export function MasteryHallScreen({state,onOpenSkill,onNavigate,onProfile}:{state:GameState;onOpenSkill?:(skillId:SkillId)=>void;onNavigate?:(destination:WorkingTowardDestination)=>void;onProfile?:()=>void}){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),compactStats=width<350||fontScale>=1.25,summary=professionMasteryHallSummary(state),records=professionMasteryMasteredRecords(state);
 const [showDiscovery,setShowDiscovery]=useState(false),[showAllSkills,setShowAllSkills]=useState(false),[showAllRecords,setShowAllRecords]=useState(false),[showHelp,setShowHelp]=useState(false);
 const ladder=JOURNAL_ACHIEVEMENTS_V42.filter(row=>row.id.startsWith('mastery_hall_')),journal=state.account.journalState,masterwork=JOURNAL_TITLES_V42.find(row=>row.id==='masterwork_savant'),titleUnlocked=!!journal?.unlockedTitles?.masterwork_savant,prestige=profileMasteryPrestige();
 const next=ladder.find(row=>summary.mastered<row.target),skills=summary.skills;
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <View style={s.headingRow}><View style={s.flex}><Text style={s.kicker}>{t("ACCOUNT PRESTIGE")}</Text><Text accessibilityRole="header" style={s.heading}>{t("Mastery Hall")}</Text></View><View style={[s.seal,summary.mastered>0&&s.sealEarned]}><Text style={[s.sealValue,summary.mastered>0&&{color:E.goldSoft}]}>{summary.mastered}</Text><Text style={s.sealLabel}>R50</Text></View></View>
  <View style={[s.stats,compactStats&&s.statsStack]}><Stat label={t("TRAINED")} value={String(summary.trained)}/><Stat label="R10+" value={String(summary.rank10)}/><Stat label="R30+" value={String(summary.rank30)}/><Stat label={t("MASTERY POINTS")} value={formatGameNumber(summary.totalPoints,state.settings.numberMode,state.settings.language)}/></View>

  <Pressable accessibilityRole="button" accessibilityState={{expanded:showDiscovery}} onPress={()=>setShowDiscovery(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}><View style={s.flex}><Text style={s.title}>{p("Find next mastery target")}</Text><Text style={s.meta}>{t("Open a profession to continue its strongest action or choose another R50 target.")}</Text></View><Text style={s.disclosureMark}>{showDiscovery?'−':'+'}</Text></Pressable>
  {showDiscovery?<MasteryDiscoveryPanel state={state} onNavigate={onNavigate}/>:null}

  <Panel accentColor={titleUnlocked?E.goldSoft:C.info}>
   <View style={s.panelHead}><View style={s.flex}><Text style={s.section}>{t("MASTERY HALL LADDER")}</Text><Text style={s.title}>{next?t("Next recognition: {title}",{title:next.title}):t("Mastery Hall Grandmaster")}</Text></View><Text style={[s.status,titleUnlocked&&s.statusDone]}>{titleUnlocked?t("TITLE EARNED"):summary.mastered+' R50'}</Text></View>
   {next?<View style={s.nextProgress}><View style={s.progressHeader}><Text style={s.meta}>{summary.mastered}/{next.target} R50</Text><Text style={s.meta}>{Math.round(Math.max(0,Math.min(100,summary.mastered/Math.max(1,next.target)*100)))}%</Text></View><View style={s.progressTrack}><View style={[s.progressFill,{width:`${Math.max(0,Math.min(100,summary.mastered/Math.max(1,next.target)*100))}%`}]}/></View></View>:null}
   <View style={s.ladder}>{ladder.map(row=>{const complete=summary.mastered>=row.target,unlocked=journal?.unlockedAchievements?.[row.id]!==undefined;return <View key={row.id} style={[s.tier,complete&&s.tierDone]}><Text style={[s.tierRank,complete&&s.tierRankDone]}>{p(tierLabel(row.tier))}</Text><Text style={s.tierTarget}>{row.target} R50</Text><Text style={complete?s.done:s.meta}>{unlocked?t("EARNED"):complete?t("READY"):t("LOCKED")}</Text></View>})}</View>
   {masterwork?<View style={[s.titleReward,titleUnlocked&&s.titleRewardDone]}><View style={s.flex}><Text style={s.rewardLabel}>{t("GRANDMASTER TITLE")}</Text><Text style={s.rewardName}>{masterwork.name}</Text><Text style={s.meta}>{masterwork.description}</Text></View><Text style={[s.prestigeBadge,titleUnlocked&&{color:E.goldSoft,borderColor:E.goldSoft}]}>{titleUnlocked?t("UNLOCKED"):'20 R50'}</Text></View>:null}
   {onProfile?<GameButton compact title={t("Open Profile & Titles")} tone="secondary" onPress={onProfile}/>:null}
  </Panel>

  <Panel>
   <View style={s.panelHead}><View style={s.flex}><Text style={s.section}>{t("PROFESSION BREAKDOWN")}</Text><Text style={s.copy}>{t("Open a profession to continue its strongest action or choose another R50 target.")}</Text></View><Text style={s.sectionMeta}>{t("{count} trained",{count:skills.length})}</Text></View>
   {skills.length?<View style={s.professions}>{(showAllSkills?skills:skills.slice(0,6)).map(row=><Pressable key={row.skillId} accessibilityRole="button" onPress={()=>onOpenSkill?.(row.skillId)} style={({pressed})=>[s.profession,row.mastered>0&&s.professionMastered,pressed&&s.pressed]}><View style={s.flex}><Text style={s.professionName}>{p(skillIdentity(row.skillId).label)}</Text><Text style={s.meta}>{t("Best R{rank} · trained actions: {count}",{rank:row.bestRank,count:row.trained})}</Text></View><View style={s.professionRight}><Text style={row.mastered?s.professionCountDone:s.professionCount}>{row.mastered}</Text><Text style={s.professionCountLabel}>R50</Text></View></Pressable>)}</View>:<Text style={s.empty}>{t("No profession mastery has been recorded yet. Train gathering or crafting actions to begin filling the Hall.")}</Text>}
   {skills.length>6?<GameButton compact title={showAllSkills?p("Show fewer"):p("Show all professions")} tone="secondary" onPress={()=>setShowAllSkills(value=>!value)}/>:null}
  </Panel>

  <Panel accentColor={records.length?E.goldSoft:undefined}>
   <View style={s.panelHead}><View style={s.flex}><Text style={s.section}>{t("MASTERED RECORDS")}</Text><Text style={s.copy}>{t("Permanent R50 records available for profile showcase.")}</Text></View><Text style={[s.status,records.length>0&&s.statusDone]}>{records.length}</Text></View>
   {records.length?(showAllRecords?records:records.slice(0,5)).map(row=><View key={row.actionId} style={s.record}><View style={[s.recordMark,{borderColor:E.goldSoft}]}><Text style={[s.recordMarkText,{color:E.goldSoft}]}>R50</Text></View><View style={s.flex}><Text style={s.recordName}>{row.name}</Text><Text style={s.meta}>{p(skillIdentity(row.skillId).label)} · {prestige.badge}</Text></View></View>):<Text style={s.empty}>{t("Reach Rank 50 on any profession activity or recipe to create your first permanent Mastered Record.")}</Text>}
   {records.length>5?<GameButton compact title={showAllRecords?p("Show fewer"):p("Show all records")} tone="secondary" onPress={()=>setShowAllRecords(value=>!value)}/>:null}
   {records.length&&onProfile?<GameButton compact title={t("Choose Profile Mastery Showcase")} onPress={onProfile}/>:null}
  </Panel>

  <Pressable accessibilityRole="button" accessibilityState={{expanded:showHelp}} onPress={()=>setShowHelp(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}><Text style={[s.section,s.flex]}>{t("PRESTIGE, NOT POWER")}</Text><Text style={s.disclosureMark}>{showHelp?'−':'+'}</Text></Pressable>
  {showHelp?<Panel><Text style={s.copy}>{t("Mastery Hall achievements, the Masterwork Savant title and Profile showcase slots recognize completed mastery. They do not add another damage, yield, speed or account-wide multiplier.")}</Text><Text style={s.copy}>{t("Every profession activity and recipe has its own R50 record. The Hall combines those records across the account for achievements, titles and profile recognition only.")}</Text></Panel>:null}
 </ScrollView>;
}
function Stat({label,value}:{label:string;value:string}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text numberOfLines={1} style={s.statValue}>{value}</Text></View>}
function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 root:{padding:spacing.md,gap:spacing.md,paddingBottom:110},headingRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:E.goldSoft,fontWeight:'900',letterSpacing:1},heading:{...typography.hero,color:C.text},copy:{...typography.body,color:C.muted,lineHeight:20},title:{...typography.title,color:C.text},seal:{width:64,height:64,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:32,backgroundColor:C.panel2},sealEarned:{borderColor:E.goldSoft,backgroundColor:C.warningSurface},sealValue:{fontSize:22,lineHeight:24,color:C.muted,fontWeight:'900'},sealLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.7},stats:{flexDirection:'row',flexWrap:'wrap',gap:6},statsStack:{flexDirection:'row',flexWrap:'wrap'},stat:{flexGrow:1,flexBasis:'22%',minWidth:68,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel},statLabel:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.55},statValue:{...typography.bodyStrong,color:C.text},
 panelHead:{flexDirection:'row',alignItems:'center',gap:8},section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.85},sectionMeta:{fontSize:9,color:C.info,fontWeight:'900'},status:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.55},statusDone:{color:C.good},ladder:{flexDirection:'row',flexWrap:'wrap',gap:5},tier:{flexGrow:1,flexBasis:'29%',minWidth:82,padding:8,borderWidth:1,borderColor:C.line,borderRadius:7,backgroundColor:C.panel2},tierDone:{borderColor:C.good,backgroundColor:C.goodSurface},tierRank:{fontSize:10,color:C.muted,fontWeight:'900'},tierRankDone:{color:C.good},tierTarget:{fontSize:11,color:C.text,fontWeight:'900'},meta:{fontSize:10,lineHeight:15,color:C.muted,fontWeight:'700'},done:{fontSize:8,color:C.good,fontWeight:'900'},titleReward:{flexDirection:'row',alignItems:'center',gap:8,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},titleRewardDone:{borderColor:E.goldSoft,backgroundColor:C.warningSurface},rewardLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.65},rewardName:{...typography.bodyStrong,color:C.text},prestigeBadge:{fontSize:8,color:C.muted,fontWeight:'900',paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.line,borderRadius:99},
 professions:{gap:5},profession:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},professionMastered:{borderColor:C.good,backgroundColor:C.goodSurface},professionName:{...typography.bodyStrong,color:C.text},professionRight:{minWidth:38,alignItems:'center'},professionCount:{fontSize:14,color:C.info,fontWeight:'900'},professionCountDone:{fontSize:14,color:C.good,fontWeight:'900'},professionCountLabel:{fontSize:7.5,color:C.muted,fontWeight:'900'},record:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderTopWidth:1,borderTopColor:C.line},recordMark:{width:40,height:32,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:16,backgroundColor:C.warningSurface},recordMarkText:{fontSize:9,fontWeight:'900'},recordName:{...typography.bodyStrong,color:C.text},empty:{...typography.body,color:C.muted,paddingVertical:8},disclosure:{minHeight:56,flexDirection:'row',alignItems:'center',padding:12,gap:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},disclosureMark:{fontSize:21,color:C.accent,fontWeight:'900'},nextProgress:{gap:5,paddingVertical:5},progressHeader:{flexDirection:'row',justifyContent:'space-between'},progressTrack:{height:6,backgroundColor:C.panel2,borderRadius:6,overflow:'hidden'},progressFill:{height:'100%',backgroundColor:E.goldSoft},pressed:{opacity:.72}
});}

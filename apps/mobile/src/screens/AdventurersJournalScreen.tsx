import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo,useState} from 'react';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {JOURNAL_ACHIEVEMENTS_V42,JOURNAL_TITLES_V42} from '../core/adventurers-journal-v42';
import {PERSONAL_RECORDS_V43} from '../core/personal-records-v43';
import {bestiaryProjection} from '../core/bestiary-v40';
import {UiIcon} from '../components/UiIcon';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {PersonalRecordsPanel} from '../components/PersonalRecordsPanel';
import {professionMasteryHallSummary} from '../core/profession-mastery-presentation';
import {MasteryHallPanel} from '../components/MasteryHallPanel';

export type JournalDestination='Collections'|'Profile'|'Bestiary';
export function AdventurersJournalScreen({state,onNavigate}:{state:GameState;onNavigate:(destination:JournalDestination)=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackTiles=width<355||fontScale>=1.3;
  const [showMastery,setShowMastery]=useState(false),[showRecords,setShowRecords]=useState(false),[showAchievementInfo,setShowAchievementInfo]=useState(false);
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);


 const bestiary=useMemo(()=>bestiaryProjection(state),[state]);
 const mastery=professionMasteryHallSummary(state);
 const journal=state.account.journalState;
 const earnedAchievements=JOURNAL_ACHIEVEMENTS_V42.filter(entry=>journal?.unlockedAchievements?.[entry.id]!==undefined).length;
 const earnedTitles=JOURNAL_TITLES_V42.filter(entry=>journal?.unlockedTitles?.[entry.id]!==undefined).length;
 const earnedRecords=PERSONAL_RECORDS_V43.filter(entry=>journal?.records?.[entry.id]!==undefined).length;
 const currentLevels=state.skills.reduce((sum,skill)=>sum+skill.level,0);
 const reserveLevels=(state.otherCharacters??[]).reduce((sum,row)=>sum+row.skills.reduce((inner,skill)=>inner+skill.level,0),0);
 const categories=[...new Set(JOURNAL_ACHIEVEMENTS_V42.map(row=>row.category))];
 const discoveryPercent=Math.max(0,Math.min(100,bestiary.completionPercent));
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={s.kicker}>{t("COLLECTIONS & PROGRESS")}</Text>
  <Text accessibilityRole="header" style={s.heading}>{t("Adventurer's Journal")}</Text>
  <Text style={s.sub}>{t("Long-term achievements, titles, records and collection progress in one place.")}</Text>
  <View style={s.stats}>
    <View style={s.stat}><Text style={s.statValue}>{earnedAchievements}<Text style={s.statTotal}>/{JOURNAL_ACHIEVEMENTS_V42.length}</Text></Text><Text style={s.statLabel}>{t("ACHIEVEMENTS")}</Text></View>
    <View style={s.stat}><Text style={s.statValue}>{earnedTitles}<Text style={s.statTotal}>/{JOURNAL_TITLES_V42.length}</Text></Text><Text style={s.statLabel}>{t("TITLES")}</Text></View>
    <View style={s.stat}><Text style={s.statValue}>{earnedRecords}<Text style={s.statTotal}>/{PERSONAL_RECORDS_V43.length}</Text></Text><Text style={s.statLabel}>{t("RECORDS")}</Text></View>
  </View>
  <View style={s.accountTotal}><View style={s.flex}><Text style={s.overline}>{t("Account Progress")}</Text><Text style={s.accountLevels}>{(currentLevels+reserveLevels).toLocaleString(language)}</Text></View><Text style={s.totalDescription}>{t("Combined account skill levels across your character roster.")}</Text></View>
  <View style={s.section}>
    <View style={s.sectionTitle}><Text style={s.title}>{t("Bestiary")}</Text><Text style={s.sectionValue}>{bestiary.discovered}/{bestiary.total}</Text></View>
    <View style={s.track}><View style={[s.trackFill,{width:`${discoveryPercent}%`}]}/></View>
    <Text style={s.sub}>{t("{found}/{total} creatures discovered · {percent}% current discovery completion.",{found:bestiary.discovered,total:bestiary.total,percent:bestiary.completionPercent})}</Text>
    <View style={[s.destinations,stackTiles&&s.destinationsStack]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Open Bestiary")} onPress={()=>onNavigate('Bestiary')} style={({pressed})=>[s.destination,pressed&&s.pressed]}><UiIcon name="world" size={25}/><Text style={s.destinationLabel}>{t("Open Bestiary")}</Text><UiIcon name="next" size={16}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Open Collections")} onPress={()=>onNavigate('Collections')} style={({pressed})=>[s.destination,pressed&&s.pressed]}><UiIcon name="inventory" size={25}/><Text style={s.destinationLabel}>{t("Open Collections")}</Text><UiIcon name="next" size={16}/></Pressable>
    </View>
  </View>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showAchievementInfo}} onPress={()=>setShowAchievementInfo(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
    <View style={s.flex}><Text style={s.title}>{t("Long-term Achievements")}</Text><Text style={s.sub}>{earnedAchievements}/{JOURNAL_ACHIEVEMENTS_V42.length} · {categories.length} {t("categories")}</Text></View><Text style={s.chevron}>{showAchievementInfo?'−':'+'}</Text>
  </Pressable>
  {showAchievementInfo?<View style={s.expanded}><Text style={s.sub}>{t("{count} categories · Novice → Adventurer → Veteran → Master → Grandmaster. Rewards are cosmetic titles rather than power.",{count:categories.length})}</Text></View>:null}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showMastery}} onPress={()=>setShowMastery(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
    <View style={s.flex}><Text style={s.title}>{t("Mastery Hall")}</Text><Text style={s.sub}>{mastery.mastered} R50 · {mastery.trained} {t("TRAINED")}</Text></View><Text style={s.chevron}>{showMastery?'−':'+'}</Text>
  </Pressable>
  {showMastery?<MasteryHallPanel state={state}/>:null}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showRecords}} onPress={()=>setShowRecords(value=>!value)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
    <View style={s.flex}><Text style={s.title}>{t("Personal Records")}</Text><Text style={s.sub}>{earnedRecords}/{PERSONAL_RECORDS_V43.length} {t("RECORDS")}</Text></View><Text style={s.chevron}>{showRecords?'−':'+'}</Text>
  </Pressable>
  {showRecords?<PersonalRecordsPanel state={state}/>:null}
  <Pressable accessibilityRole="button" onPress={()=>onNavigate('Profile')} style={({pressed})=>[s.profileAction,pressed&&s.pressed]}>
    <UiIcon name="character" size={27}/><View style={s.flex}><Text style={s.title}>{t("Titles")}</Text><Text style={s.sub}>{earnedTitles}/{JOURNAL_TITLES_V42.length} {t("TITLES")}</Text></View><Text style={s.actionText}>{t("Open Profile & Titles")} ›</Text>
  </Pressable>
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1.1},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.caption,color:C.muted,lineHeight:18},overline:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.7},flex:{flex:1,minWidth:0},
 stats:{flexDirection:'row',gap:7},stat:{flex:1,minWidth:0,minHeight:72,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,borderRadius:12,alignItems:'center',justifyContent:'center',padding:6},statValue:{color:C.text,fontSize:22,fontWeight:'900'},statTotal:{fontSize:12,color:C.muted},statLabel:{color:C.muted,fontSize:9,fontWeight:'900',letterSpacing:.7},
 accountTotal:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderRadius:12,backgroundColor:C.panel,borderWidth:1,borderColor:C.line},accountLevels:{fontSize:25,fontWeight:'900',color:C.text},totalDescription:{...typography.caption,color:C.muted,maxWidth:165,lineHeight:17},
 section:{padding:12,gap:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},sectionTitle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},sectionValue:{...typography.bodyStrong,color:C.accent},track:{height:6,overflow:'hidden',borderRadius:6,backgroundColor:C.panel2},trackFill:{height:'100%',borderRadius:6,backgroundColor:C.good},
 destinations:{flexDirection:'row',gap:8},destinationsStack:{flexDirection:'column'},destination:{flex:1,minWidth:0,minHeight:52,paddingHorizontal:10,gap:7,flexDirection:'row',alignItems:'center',borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},destinationLabel:{fontSize:12,color:C.text,fontWeight:'800',flex:1},
 disclosure:{minHeight:62,padding:12,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},chevron:{fontSize:22,fontWeight:'800',color:C.accent},expanded:{paddingHorizontal:12,paddingBottom:8},
 profileAction:{minHeight:60,flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},actionText:{fontSize:11,color:C.accent,fontWeight:'800',maxWidth:110},pressed:{opacity:.76}
});}
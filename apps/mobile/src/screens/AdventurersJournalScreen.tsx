import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {JOURNAL_ACHIEVEMENTS_V42,JOURNAL_TITLES_V42} from '../core/adventurers-journal-v42';
import {PERSONAL_RECORDS_V43} from '../core/personal-records-v43';
import {bestiaryProjection} from '../core/bestiary-v40';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {PersonalRecordsPanel} from '../components/PersonalRecordsPanel';
import {MasteryHallPanel} from '../components/MasteryHallPanel';

export type JournalDestination='Achievements'|'Collections'|'Profile'|'Bestiary';
export function AdventurersJournalScreen({state,onNavigate}:{state:GameState;onNavigate:(destination:JournalDestination)=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const bestiary=bestiaryProjection(state);
 const currentLevels=state.skills.reduce((sum,skill)=>sum+skill.level,0);
 const reserveLevels=(state.otherCharacters??[]).reduce((sum,row)=>sum+row.skills.reduce((inner,skill)=>inner+skill.level,0),0);
 const categories=[...new Set(JOURNAL_ACHIEVEMENTS_V42.map(row=>row.category))];
 const recordCategories=[...new Set(PERSONAL_RECORDS_V43.map(row=>row.category))];
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={s.kicker}>{t("COLLECTIONS & PROGRESS")}</Text><Text accessibilityRole="header" style={s.heading}>{t("Adventurer's Journal")}</Text><Text style={s.sub}>{t("Long-term achievements, titles, records and collection progress in one place.")}</Text>
  <View style={s.stats}><View style={s.stat}><Text style={s.statValue}>{JOURNAL_ACHIEVEMENTS_V42.length}</Text><Text style={s.statLabel}>{t("ACHIEVEMENTS")}</Text></View><View style={s.stat}><Text style={s.statValue}>{JOURNAL_TITLES_V42.length}</Text><Text style={s.statLabel}>{t("TITLES")}</Text></View><View style={s.stat}><Text style={s.statValue}>{PERSONAL_RECORDS_V43.length}</Text><Text style={s.statLabel}>{t("RECORDS")}</Text></View></View>
  <Panel><Text style={s.title}>{t("Long-term Achievements")}</Text><Text style={s.sub}>{t("{count} categories · Novice → Adventurer → Veteran → Master → Grandmaster. Rewards are cosmetic titles rather than power.",{count:categories.length})}</Text><GameButton title={t("Open Achievements")} onPress={()=>onNavigate('Achievements')}/></Panel>
  <Panel><Text style={s.title}>{t("Titles")}</Text><Text style={s.sub}>{JOURNAL_TITLES_V42.map(row=>row.name).join(' · ')}</Text><GameButton title={t("Open Profile & Titles")} tone="secondary" onPress={()=>onNavigate('Profile')}/></Panel>
  <MasteryHallPanel state={state}/>
  <PersonalRecordsPanel state={state}/>
  <Panel><Text style={s.title}>{t("Bestiary")}</Text><Text style={s.sub}>{t("{found}/{total} creatures discovered · {percent}% current discovery completion.",{found:bestiary.discovered,total:bestiary.total,percent:bestiary.completionPercent})}</Text><GameButton title={t("Open Bestiary")} tone="secondary" onPress={()=>onNavigate('Bestiary')}/></Panel>
  <Panel><Text style={s.title}>{t("Collections")}</Text><Text style={s.sub}>{t("Items, pets, companions, profile icons and collection sets reflect your earned collection.")}</Text><GameButton title={t("Open Collections")} tone="secondary" onPress={()=>onNavigate('Collections')}/></Panel>
  <Panel><Text style={s.title}>{t("Account Progress")}</Text><Text style={s.big}>{(currentLevels+reserveLevels).toLocaleString()}</Text><Text style={s.sub}>{t("Combined account skill levels across your character roster.")}</Text></Panel>
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1.1},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},note:{...typography.caption,color:C.info},big:{fontSize:28,fontWeight:'900',color:C.accent},stats:{flexDirection:'row',gap:8},stat:{flex:1,minHeight:72,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,borderRadius:12,alignItems:'center',justifyContent:'center'},statValue:{color:C.text,fontSize:22,fontWeight:'900'},statLabel:{color:C.muted,fontSize:9,fontWeight:'900',letterSpacing:.7}});}

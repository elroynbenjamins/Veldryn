import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {JOURNAL_ACHIEVEMENTS_V42,JOURNAL_TITLES_V42} from '../core/adventurers-journal-v42';
import {PERSONAL_RECORDS_V43} from '../core/personal-records-v43';
import {bestiaryProjection} from '../core/bestiary-v40';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {C,spacing,typography} from '../theme/theme';
import {PersonalRecordsPanel} from '../components/PersonalRecordsPanel';
import {MasteryHallPanel} from '../components/MasteryHallPanel';

export type JournalDestination='Achievements'|'Collections'|'Profile'|'Bestiary';
export function AdventurersJournalScreen({state,onNavigate}:{state:GameState;onNavigate:(destination:JournalDestination)=>void}){
 const bestiary=bestiaryProjection(state);
 const currentLevels=state.skills.reduce((sum,skill)=>sum+skill.level,0);
 const reserveLevels=(state.otherCharacters??[]).reduce((sum,row)=>sum+row.skills.reduce((inner,skill)=>inner+skill.level,0),0);
 const categories=[...new Set(JOURNAL_ACHIEVEMENTS_V42.map(row=>row.category))];
 const recordCategories=[...new Set(PERSONAL_RECORDS_V43.map(row=>row.category))];
 return <ScrollView contentContainerStyle={s.root}>
  <Text style={s.kicker}>COLLECTIONS & PROGRESS</Text><Text accessibilityRole="header" style={s.heading}>Adventurer's Journal</Text><Text style={s.sub}>Long-term achievements, titles, records and collection progress in one place.</Text>
  <View style={s.stats}><View style={s.stat}><Text style={s.statValue}>{JOURNAL_ACHIEVEMENTS_V42.length}</Text><Text style={s.statLabel}>ACHIEVEMENTS</Text></View><View style={s.stat}><Text style={s.statValue}>{JOURNAL_TITLES_V42.length}</Text><Text style={s.statLabel}>TITLES</Text></View><View style={s.stat}><Text style={s.statValue}>{PERSONAL_RECORDS_V43.length}</Text><Text style={s.statLabel}>RECORDS</Text></View></View>
  <Panel><Text style={s.title}>Long-term Achievements</Text><Text style={s.sub}>{categories.length} categories · Novice → Adventurer → Veteran → Master → Grandmaster. Rewards are cosmetic titles rather than power.</Text><GameButton title="Open Achievements" onPress={()=>onNavigate('Achievements')}/></Panel>
  <Panel><Text style={s.title}>Titles</Text><Text style={s.sub}>{JOURNAL_TITLES_V42.map(row=>row.name).join(' · ')}</Text><GameButton title="Open Profile & Titles" tone="secondary" onPress={()=>onNavigate('Profile')}/></Panel>
  <MasteryHallPanel state={state}/>
  <PersonalRecordsPanel state={state}/>
  <Panel><Text style={s.title}>Bestiary</Text><Text style={s.sub}>{bestiary.discovered}/{bestiary.total} creatures discovered · {bestiary.completionPercent}% current discovery completion.</Text><GameButton title="Open Bestiary" tone="secondary" onPress={()=>onNavigate('Bestiary')}/></Panel>
  <Panel><Text style={s.title}>Collections</Text><Text style={s.sub}>Items, pets, companions, skins, profile cosmetics and V45 Collection Sets all link back to canonical ownership.</Text><GameButton title="Open Collections" tone="secondary" onPress={()=>onNavigate('Collections')}/></Panel>
  <Panel><Text style={s.title}>Account Progress</Text><Text style={s.big}>{(currentLevels+reserveLevels).toLocaleString()}</Text><Text style={s.sub}>Combined account skill levels across your character roster.</Text></Panel>
 </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1.1},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},note:{...typography.caption,color:C.info},big:{fontSize:28,fontWeight:'900',color:C.accent},stats:{flexDirection:'row',gap:8},stat:{flex:1,minHeight:72,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,borderRadius:12,alignItems:'center',justifyContent:'center'},statValue:{color:C.text,fontSize:22,fontWeight:'900'},statLabel:{color:C.muted,fontSize:9,fontWeight:'900',letterSpacing:.7}});

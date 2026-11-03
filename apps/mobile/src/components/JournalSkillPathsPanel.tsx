import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {QuestDestination} from '../core/quest-journal';
import {journalSkillLessonProgress,journalSkillLessonSummary,type JournalSkillLessonProgress} from '../core/journal-skill-lessons';
import {progressionText} from '../i18n/progression';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {ActivityArtwork} from './ActivityArtwork';
import {GameButton} from './GameButton';

const groupLabel={gather:'GATHER & EXPLORE',create:'MAKE & PREPARE',specialize:'DEEPER SKILLS'};

export function JournalSkillPathsPanel({state,onNavigate}:{state:GameState;onNavigate:(destination:QuestDestination)=>void}){
 const C=useGameTheme(),styles=useMemo(()=>makeStyles(C),[C]);
 const [showAll,setShowAll]=useState(false),[expanded,setExpanded]=useState<string|null>(null);
 const language=state.settings.language;
 const p=(value:string)=>progressionText(language,value);
 const paths=journalSkillLessonProgress(state),summary=journalSkillLessonSummary(state);
 const introductionRank=(row:JournalSkillLessonProgress)=>row.lesson.afterQuest==='QST_005'?5:row.lesson.afterQuest==='QST_004'?4:row.lesson.afterQuest==='QST_002'?3:row.lesson.characterLevel?3:row.lesson.afterQuest==='QST_001'?2:1;
 const recommended=paths.filter(row=>row.introduced&&!row.practiceComplete).sort((a,b)=>introductionRank(b)-introductionRank(a)||Number(a.starterComplete)-Number(b.starterComplete));
 const selected=showAll?paths:(recommended.length?recommended:paths.filter(row=>row.introduced)).slice(0,3);
 const rows=selected.length?selected:paths.slice(0,3);
 const openSkill=(row:JournalSkillLessonProgress)=>{
  const name=row.lesson.skillId.charAt(0).toUpperCase()+row.lesson.skillId.slice(1);
  onNavigate({tab:'Skills',skillId:row.lesson.skillId,label:'Open '+name,hint:row.lesson.introduction});
 };
 return <View style={styles.card}>
  <View style={styles.heading}>
   <View style={styles.fill}>
    <Text style={styles.eyebrow}>{p('YOUR TRAINING JOURNAL')}</Text>
    <Text style={styles.title}>{p('Learn the skills of Asterfall')}</Text>
    <Text style={styles.description}>{p('Optional practice alongside the story. Progress follows your collected skill XP; no extra quest claims or rewards.')}</Text>
   </View>
   <View style={styles.counter}><Text style={styles.counterValue}>{summary.practiced}/{summary.total}</Text><Text style={styles.counterLabel}>{p('PRACTICED')}</Text></View>
  </View>
  <View style={styles.overview}>
   <Text style={styles.overviewText}>{summary.started} {p('started')} · {summary.introduced} {p('introduced')}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel={showAll?p('Show recommended paths'):p('Browse all skill paths')} accessibilityState={{expanded:showAll}} onPress={()=>setShowAll(value=>!value)} style={({pressed})=>[styles.toggle,pressed&&styles.pressed]}>
    <Text style={styles.toggleText}>{showAll?p('Show recommended'):p('Browse all 11 skills')} {showAll?'−':'+'}</Text>
   </Pressable>
  </View>
  {rows.map(row=>{
   const lesson=row.lesson,open=expanded===lesson.skillId;
   const stateLabel=row.status==='complete'?p('PRACTICED'):row.status==='practice'?p('KEEP TRAINING'):row.status==='begin'?p('READY TO TRY'):p('COMING LATER');
   return <View key={lesson.skillId} style={[styles.lesson,row.status==='preview'&&styles.preview]}>
    <Pressable accessibilityRole="button" accessibilityLabel={p(lesson.title)+', '+stateLabel+', '+p('level')+' '+row.level} accessibilityState={{expanded:open}} onPress={()=>setExpanded(current=>current===lesson.skillId?null:lesson.skillId)} style={({pressed})=>[styles.lessonButton,pressed&&styles.pressed]}>
     <View style={styles.art}><ActivityArtwork id={lesson.skillId} size={32}/></View>
     <View style={styles.fill}>
      <Text style={styles.group}>{p(groupLabel[lesson.group])}</Text>
      <Text style={styles.lessonTitle} numberOfLines={2}>{p(lesson.title)}</Text>
      <Text style={styles.lessonMeta}>{p('Level')} {row.level} · {stateLabel}</Text>
      <View style={styles.progress}><View style={[styles.progressFill,{width:(Math.min(100,Math.max(0,(row.level-1)/4*100))+'%') as any,backgroundColor:row.practiceComplete?C.good:C.accent}]}/></View>
     </View>
     <Text style={styles.chevron}>{open?'−':'+'}</Text>
    </Pressable>
    {open?<View style={styles.details}>
     {row.status==='preview'?<Text style={styles.lockHint}>{p(lesson.unlockHint??'Continue the story to introduce this skill.')}{' '}{p('You can revisit this lesson later.')}</Text>:null}
     <View style={styles.step}>
      <Text style={[styles.stepTitle,{color:row.starterComplete?C.good:C.text}]}>{row.starterComplete?'✓ ':''}{p('1 · First steps — level 2')}</Text>
      <Text style={styles.stepCopy}>{p(lesson.introduction)}</Text>
     </View>
     <View style={styles.step}>
      <Text style={[styles.stepTitle,{color:row.practiceComplete?C.good:C.text}]}>{row.practiceComplete?'✓ ':''}{p('2 · Practice — level 5')}</Text>
      <Text style={styles.stepCopy}>{p(lesson.practice)}</Text>
     </View>
     <Text style={styles.connection}>{p('HOW IT CONNECTS')} · {p(lesson.connection)}</Text>
     {row.introduced?<GameButton compact title={p('Open')+' '+p(lesson.skillId.charAt(0).toUpperCase()+lesson.skillId.slice(1))} tone="secondary" onPress={()=>openSkill(row)}/>:null}
    </View>:null}
   </View>;
  })}
  <Text style={styles.footer}>{p('Your main story chapters and their rewards stay unchanged. Finished skill lessons remain available for reference.')}</Text>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 card:{padding:12,gap:10,backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:14},
 heading:{flexDirection:'row',alignItems:'flex-start',gap:10},
 fill:{flex:1,minWidth:0},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:.75,color:C.accent},
 title:{fontSize:15,fontWeight:'900',color:C.text,marginTop:3},
 description:{fontSize:11,lineHeight:16,color:C.muted,marginTop:5},
 counter:{borderRadius:10,paddingHorizontal:9,paddingVertical:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,alignItems:'center',minWidth:68},
 counterValue:{fontSize:17,fontWeight:'900',color:C.text},counterLabel:{fontSize:8,fontWeight:'800',letterSpacing:.5,color:C.muted},
 overview:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 overviewText:{fontSize:10,color:C.muted,flex:1},
 toggle:{minHeight:44,justifyContent:'center',paddingHorizontal:8},
 toggleText:{fontSize:11,fontWeight:'800',color:C.accent},
 lesson:{borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2,overflow:'hidden'},
 preview:{opacity:.78},
 lessonButton:{minHeight:66,padding:9,flexDirection:'row',alignItems:'center',gap:9},
 art:{width:40,height:40,alignItems:'center',justifyContent:'center'},
 group:{fontSize:9,fontWeight:'900',letterSpacing:.5,color:C.accent},
 lessonTitle:{fontSize:13,fontWeight:'800',color:C.text,marginTop:2},
 lessonMeta:{fontSize:10,color:C.muted,marginTop:3},
 progress:{height:4,borderRadius:4,overflow:'hidden',backgroundColor:C.line,marginTop:6},
 progressFill:{height:'100%',borderRadius:4},
 chevron:{fontSize:22,fontWeight:'800',color:C.accent,minWidth:20,textAlign:'center'},
 details:{padding:10,paddingTop:2,gap:10,borderTopWidth:1,borderTopColor:C.line},
 lockHint:{fontSize:11,lineHeight:17,color:C.muted},
 step:{gap:4},
 stepTitle:{fontSize:11,fontWeight:'900',color:C.text},
 stepCopy:{fontSize:11,lineHeight:17,color:C.muted},
 connection:{fontSize:10,lineHeight:16,fontWeight:'800',color:C.accent},
 footer:{fontSize:10,lineHeight:15,color:C.muted},
 pressed:{opacity:.75}
});}

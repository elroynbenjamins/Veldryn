import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState,SkillId,SkillState} from '../core/types';
import {MONTHLY_QUEST_MILESTONES,monthlyQuestMilestoneStatus,type MonthlyQuestMilestoneThreshold} from '../core/monthly-quest-milestones';
import {totalXpAtLevel} from '../core/progression';
import {useGameTheme} from '../theme/ThemeContext';
import {type ThemeColors} from '../theme/theme';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

type Selection={month:string;threshold:MonthlyQuestMilestoneThreshold};
type Props={
 state:GameState;nowMs:number;
 onClaim:(month:string,threshold:number,characterId:string,skillId:SkillId)=>Promise<boolean>;
};
const MAX_SKILL_XP=totalXpAtLevel(100);
const skillName=(id:SkillId)=>id.slice(0,1).toUpperCase()+id.slice(1);

export function MonthlyQuestMilestonesPanel({state,nowMs,onClaim}:Props){
 const C=useGameTheme(),styles=useMemo(()=>makeStyles(C),[C]);
 const months=monthlyQuestMilestoneStatus(state,nowMs);
 const [selection,setSelection]=useState<Selection|null>(null);
 const [characterId,setCharacterId]=useState(state.character?.id??'');
 const [skillId,setSkillId]=useState<SkillId|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const characters=[
  ...(state.character?[{id:state.character.id,name:state.character.name,skills:state.skills}]:[]),
  ...(state.otherCharacters??[]).map(row=>({id:row.character.id,name:row.character.name,skills:row.skills})),
 ];
 const selectedCharacter=characters.find(row=>row.id===characterId);
 const availableSkills=(selectedCharacter?.skills??[]).filter(skill=>skill.xp<MAX_SKILL_XP);
 const selectedMonth=selection?months.find(row=>row.key===selection.month):undefined;
 const selectedReward=selection?MONTHLY_QUEST_MILESTONES.find(row=>row.points===selection.threshold):undefined;
 const selectedSkill=availableSkills.find(skill=>skill.skillId===skillId);
 const actualXp=selectedReward&&selectedSkill?Math.min(selectedReward.xp,Math.max(0,MAX_SKILL_XP-selectedSkill.xp)):0;
 const open=(month:string,threshold:MonthlyQuestMilestoneThreshold)=>{
  setSelection({month,threshold});setCharacterId(state.character?.id??characters[0]?.id??'');setSkillId(null);setError('');
 };
 const close=()=>{if(!busy){setSelection(null);setError('');}};
 const claim=async()=>{
  if(!selection||!selectedMonth||!selectedReward||!skillId||!characterId||busy)return;
  setBusy(true);setError('');
  try{
   const saved=await onClaim(selection.month,selection.threshold,characterId,skillId);
   if(!saved)throw new Error('The reward could not be confirmed. Please try again.');
   setSelection(null);setSkillId(null);
  }catch(err){setError(err instanceof Error?err.message:'Could not claim reward.');}
  finally{setBusy(false);}
 };
 return <View style={styles.panel}>
  <View style={styles.heading}>
   <View style={styles.fill}>
    <Text style={styles.eyebrow}>MONTHLY QUEST MILESTONES</Text>
    <Text style={styles.title}>Choose your Skill XP rewards</Text>
   </View>
   <Text style={styles.pointsBadge}>+1 / +3 / +5</Text>
  </View>
  <Text style={styles.muted}>Daily +1 point · Weekly +3 points · Monthly +5 points. Account-wide progress.</Text>
  {months.map(month=><View key={month.key} style={styles.month}>
   <View style={styles.heading}>
    <Text style={styles.monthTitle}>{month.isPrevious?'Previous month':'This month'} · {month.key}</Text>
    <Text style={styles.monthPoints}>{month.points} / 100 pts</Text>
   </View>
   <View style={styles.progressTrack}><View style={[styles.progressFill,{width:(Math.min(100,month.points)+'%') as `${number}%`}]}/></View>
   {month.isPrevious?<Text style={styles.muted}>Earned rewards remain claimable during the first 7 days of the new month (UTC).</Text>:null}
   <View style={styles.milestoneList}>
    {MONTHLY_QUEST_MILESTONES.map((milestone,index)=>{
     const claimed=month.claimed.includes(milestone.points),ready=month.points>=milestone.points;
     return <Pressable key={milestone.points} accessibilityRole="button" accessibilityLabel={'Milestone '+(index+1)+', '+milestone.points+' points, '+milestone.xp+' skill XP, '+(claimed?'claimed':ready?'ready to claim':'locked')} accessibilityState={{disabled:claimed||!ready}}
      disabled={claimed||!ready} onPress={()=>open(month.key,milestone.points)}
      style={({pressed})=>[styles.milestone,{borderColor:ready?claimed?C.line:C.good:C.line,backgroundColor:ready&&!claimed?C.goodSurface:C.panel2},pressed&&{opacity:.8}]}>
      <View style={styles.fill}>
       <Text style={styles.milestoneTitle}>{index+1}. {milestone.points} Quest Points</Text>
       <Text style={styles.muted}>{milestone.xp.toLocaleString()} Skill XP</Text>
      </View>
      <Text style={[styles.milestoneState,{color:claimed?C.muted:ready?C.good:C.muted}]}>{claimed?'✓ Claimed':ready?'Choose skill':'Locked'}</Text>
     </Pressable>;
    })}
   </View>
  </View>)}
  <GameModalSurface visible={selection!==null} onClose={close} reduceMotion={state.settings.reduceMotion} dismissOnBackdrop={!busy}>
   <GameModalHeader eyebrow="MONTHLY MILESTONE" title={(selectedReward?.xp??0).toLocaleString()+' Skill XP'} onClose={close} closeDisabled={busy}/>
   <ScrollView style={{maxHeight:480}} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
    <Text style={styles.muted}>Choose one owned character and an eligible skill. The reward is granted immediately and cannot be reassigned.</Text>
    <Text style={styles.sectionTitle}>Character</Text>
    <View style={styles.choices}>
     {characters.map(row=><Pressable key={row.id} accessibilityRole="button" accessibilityState={{selected:characterId===row.id}} onPress={()=>{setCharacterId(row.id);setSkillId(null);setError('');}} style={[styles.choice,{backgroundColor:characterId===row.id?C.accentSurface:C.panel2,borderColor:characterId===row.id?C.accent:C.line}]}>
      <Text style={styles.choiceText}>{row.name}</Text>
     </Pressable>)}
    </View>
    <Text style={styles.sectionTitle}>Skill</Text>
    <View style={styles.choices}>
     {availableSkills.map((skill:SkillState)=><Pressable key={skill.skillId} accessibilityRole="button" accessibilityState={{selected:skillId===skill.skillId}} onPress={()=>{setSkillId(skill.skillId);setError('');}} style={[styles.choice,{backgroundColor:skillId===skill.skillId?C.accentSurface:C.panel2,borderColor:skillId===skill.skillId?C.accent:C.line}]}>
      <Text style={styles.choiceText}>{skillName(skill.skillId)} · Lv {skill.level}</Text>
     </Pressable>)}
     {!availableSkills.length?<Text style={styles.muted}>All skills for this character have reached the XP cap. Select another character.</Text>:null}
    </View>
    {selectedReward&&selectedSkill&&actualXp<selectedReward.xp?<Text style={[styles.muted,{color:C.warning}]}>{`Near the level-100 cap: only ${actualXp.toLocaleString()} of ${selectedReward.xp.toLocaleString()} XP would be applied to this skill. Select another skill to receive the full reward.`}</Text>:null}
    {error?<Text accessibilityLiveRegion="polite" style={[styles.muted,{color:C.bad}]}>{error}</Text>:null}
    <GameButton title="Claim Skill XP" disabled={!selection||!selectedMonth||!skillId||busy} loading={busy} onPress={claim}/>
   </ScrollView>
  </GameModalSurface>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{padding:12,gap:9,borderRadius:14,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panelRaised},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 fill:{flex:1,minWidth:0},
 eyebrow:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:1},
 title:{fontSize:14,color:C.text,fontWeight:'800',marginTop:3},
 muted:{fontSize:11,color:C.muted,lineHeight:16},
 pointsBadge:{fontSize:10,fontWeight:'800',color:C.accent},
 month:{gap:7,marginTop:4},
 monthTitle:{fontSize:12,color:C.text,fontWeight:'800'},
 monthPoints:{fontSize:12,color:C.accent,fontWeight:'800'},
 progressTrack:{height:7,borderRadius:8,backgroundColor:C.line,overflow:'hidden'},
 progressFill:{height:'100%',backgroundColor:C.accent,borderRadius:8},
 milestoneList:{gap:6},
 milestone:{flexDirection:'row',alignItems:'center',paddingVertical:9,paddingHorizontal:10,borderRadius:9,borderWidth:1,gap:8},
 milestoneTitle:{fontSize:12,fontWeight:'800',color:C.text},
 milestoneState:{fontSize:11,fontWeight:'800'},
 sheetContent:{gap:12,paddingBottom:18},
 sectionTitle:{fontSize:13,fontWeight:'800',color:C.text,marginTop:8},
 choices:{flexDirection:'row',flexWrap:'wrap',gap:8},
 choice:{minHeight:42,paddingVertical:10,paddingHorizontal:12,borderWidth:1,borderRadius:9,justifyContent:'center'},
 choiceText:{fontSize:12,color:C.text,fontWeight:'700'},
});}

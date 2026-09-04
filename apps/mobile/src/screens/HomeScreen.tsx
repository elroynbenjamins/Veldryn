import React from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState,RewardBundle} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {ActivityCard} from '../components/ActivityCard';
import {StatBar} from '../components/StatBar';
import {progressWithinLevel} from '../core/progression';
import {C,spacing,typography} from '../theme/theme';
import {CharacterVisual} from '../components/CharacterVisual';
import {CharacterAvatar} from '../components/CustomizationControls';
import {DEFAULT_CUSTOMIZATION} from '../core/customization';

export function HomeScreen({state,preview,onClaim,onStop,onNavigate}:{state:GameState;preview:RewardBundle;onClaim:()=>void;onStop:()=>void;onNavigate:(tab:'World'|'Skills'|'Inventory'|'Quests')=>void}){
  const c=state.character!,p=progressWithinLevel(c.xp,c.level);
  const activityName=MONSTERS.find(x=>x.id===state.activity?.targetId)?.name||GATHERING.find(x=>x.id===state.activity?.targetId)?.name;
  const activityCycle=MONSTERS.find(x=>x.id===state.activity?.targetId)?.secondsPerKill||GATHERING.find(x=>x.id===state.activity?.targetId)?.seconds||1;
  const completed=state.quests.filter(q=>q.status==='complete').length;
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>ASTERFALL · LOCAL SAVE</Text><View style={s.hero}><CharacterAvatar body={c.bodyPresentation??'male'} view="front" value={c.customization??DEFAULT_CUSTOMIZATION} compact/><View style={s.flex}><Text style={s.name}>{c.name}</Text><Text style={s.small}>{c.classId.replace('_',' ')} · Level {c.level}</Text><Text style={s.gold}>◈ {c.gold}</Text></View></View><StatBar label="Experience" current={p.current} max={p.need}/>
    <CharacterVisual state={state} compact/>
    {state.activity&&activityName?<ActivityCard title={activityName} kind={state.activity.kind==='combat'?'combat':'gathering'} cycleSeconds={activityCycle} preview={preview} onClaim={onClaim} onStop={onStop}/>:<Panel><Text style={s.title}>Choose your next activity</Text><Text style={s.small}>Explore an unlocked region or gather materials for your next upgrade.</Text></Panel>}
    <View style={s.top}><View style={s.flex}><GameButton title="Explore world" onPress={()=>onNavigate('World')}/></View><View style={s.flex}><GameButton title="Gather & craft" onPress={()=>onNavigate('Skills')}/></View></View>
    <GameButton title={preview.stoppedReason?'Recover & equip food':'Manage equipment & food'} tone="secondary" onPress={()=>onNavigate('Inventory')}/>
    {completed>0&&<GameButton title={`Claim ${completed} completed quest${completed===1?'':'s'}`} onPress={()=>onNavigate('Quests')}/>}
    <Panel><Text style={s.title}>Milestone: The Fallen Knight</Text><Text style={s.small}>{state.defeatedBossIds.includes('FALLEN_KNIGHT')?'The Fallen Knight is defeated. Asterfall milestone complete.':'Reach level 25, prepare your gear, then challenge the Fallen Knight.'}</Text><Text style={s.progress}>Current level: {c.level} / 25</Text></Panel>
  </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},kicker:{...typography.caption,color:C.accent,fontWeight:'800',letterSpacing:1},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.md},hero:{flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:12,padding:spacing.sm},flex:{flex:1},name:{fontSize:25,lineHeight:32,color:C.text,fontWeight:'900'},small:{...typography.body,color:C.muted},gold:{color:C.accent,fontSize:18,fontWeight:'900'},title:{...typography.title,color:C.text},progress:{...typography.bodyStrong,color:C.accent}});

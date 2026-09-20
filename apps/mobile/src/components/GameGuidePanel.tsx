import {useMemo} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {GAME_GUIDE,guideDefinition,normalizeOnboardingGuideState,unlockedGameGuide} from '../core/onboarding';
import type {GameGuideId} from '../core/onboarding';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GameGuidePanel({state,onOpen}:{state:GameState;onOpen:(id:GameGuideId)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const saved=normalizeOnboardingGuideState(state.account.guideState),unlocked=new Set(unlockedGameGuide(state).map(entry=>entry.id));
  return <><Panel><Text accessibilityRole="header" style={s.title}>Help & Game Guide</Text><Text style={s.body}>Replay short explanations whenever you want. Acknowledgements only change this UI; they never grant rewards or gate progression.</Text><Text style={s.progress}>{unlocked.size}/{GAME_GUIDE.length} topics discovered</Text></Panel>{GAME_GUIDE.map(entry=>{const ready=unlocked.has(entry.id),seen=saved.seenGuideIds.includes(entry.id);return <Panel key={entry.id}><View style={s.row}><View style={s.copy}><Text style={s.topic}>{ready&&seen?'✓ ':''}{entry.title}</Text><Text style={s.body}>{ready?entry.summary:entry.unlockHint}</Text></View><View style={[s.statusPill,ready?s.readySurface:s.lockedSurface]}><Text style={ready?s.ready:s.locked}>{ready?'READY':'LOCKED'}</Text></View></View><GameButton title={ready?(seen?'Replay topic':'Read topic'):'Not unlocked yet'} tone="secondary" disabled={!ready} onPress={()=>onOpen(entry.id)}/></Panel>})}</>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({title:{...typography.title,color:C.text},topic:{...typography.bodyStrong,color:C.text,fontWeight:'900'},body:{...typography.body,color:C.muted,lineHeight:20},progress:{...typography.bodyStrong,color:C.accent},row:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start'},copy:{flex:1},statusPill:{paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderWidth:1,borderRadius:99},readySurface:{borderColor:C.good,backgroundColor:'#172b24'},lockedSurface:{borderColor:C.line,backgroundColor:C.bg},ready:{...typography.caption,color:C.good,fontWeight:'900'},locked:{...typography.caption,color:C.muted,fontWeight:'900'}});}

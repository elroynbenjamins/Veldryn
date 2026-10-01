import {accountText} from '../i18n/account';
import {useMemo} from 'react';
import {useGameTheme} from '../theme/ThemeContext';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {GAME_GUIDE,guideDefinition,normalizeOnboardingGuideState,unlockedGameGuide} from '../core/onboarding';
import type {GameGuideId} from '../core/onboarding';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';

export function GameGuidePanel({state,onOpen}:{state:GameState;onOpen:(id:GameGuideId)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const saved=normalizeOnboardingGuideState(state.account.guideState),unlocked=new Set(unlockedGameGuide(state).map(entry=>entry.id));
  return <><Panel><Text accessibilityRole="header" style={s.title}>{a("Help & Game Guide")}</Text><Text style={s.body}>{a("Revisit a topic whenever you need help, then jump straight into the next step.")}</Text><Text style={s.progress}>{a('{count}/{total} topics discovered',{count:unlocked.size,total:GAME_GUIDE.length})}</Text></Panel>{GAME_GUIDE.map(entry=>{const ready=unlocked.has(entry.id),seen=saved.seenGuideIds.includes(entry.id);return <Panel key={entry.id}><View style={s.row}><View style={s.copy}><Text style={s.topic}>{ready&&seen?'✓ ':''}{a(entry.title)}</Text><Text style={s.body}>{a(ready?entry.summary:entry.unlockHint)}</Text></View><View style={[s.statusPill,ready?s.readySurface:s.lockedSurface]}><Text style={ready?s.ready:s.locked}>{ready?a("READY"):a("LOCKED")}</Text></View></View><GameButton title={ready?(seen?a("Replay topic"):a("Read topic")):a("Not unlocked yet")} tone="secondary" disabled={!ready} onPress={()=>onOpen(entry.id)}/></Panel>})}</>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({title:{...typography.title,color:C.text},topic:{...typography.bodyStrong,color:C.text,fontWeight:'900'},body:{...typography.body,color:C.muted,lineHeight:20},progress:{...typography.bodyStrong,color:C.accent},row:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start'},copy:{flex:1},statusPill:{paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderWidth:1,borderRadius:99},readySurface:{borderColor:C.good,backgroundColor:C.panel2},lockedSurface:{borderColor:C.line,backgroundColor:C.bg},ready:{...typography.caption,color:C.good,fontWeight:'900'},locked:{...typography.caption,color:C.muted,fontWeight:'900'}});}

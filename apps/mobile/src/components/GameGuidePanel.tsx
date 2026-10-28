import {accountText} from '../i18n/account';
import {useMemo,useState} from 'react';
import {useGameTheme} from '../theme/ThemeContext';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {GAME_GUIDE,normalizeOnboardingGuideState,unlockedGameGuide} from '../core/onboarding';
import type {GameGuideId} from '../core/onboarding';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';

export function GameGuidePanel({state,onOpen,onStartTour}:{state:GameState;onOpen:(id:GameGuideId)=>void;onStartTour?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [showLocked,setShowLocked]=useState(false);
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

  const saved=normalizeOnboardingGuideState(state.account.guideState);
  const unlocked=new Set(unlockedGameGuide(state).map(entry=>entry.id));
  const ready=GAME_GUIDE.filter(entry=>unlocked.has(entry.id));
  const locked=GAME_GUIDE.filter(entry=>!unlocked.has(entry.id));
  return <View style={s.container}>
    <Panel>
      <Text accessibilityRole="header" style={s.title}>{a("Help & Game Guide")}</Text>
      <Text style={s.progress}>{a('{count}/{total} topics discovered',{count:ready.length,total:GAME_GUIDE.length})}</Text>
      {onStartTour?<GameButton compact title={a("Start main screen tour")} tone="secondary" onPress={onStartTour}/>:null}
    </Panel>
    {ready.map(entry=>{const seen=saved.seenGuideIds.includes(entry.id);return <Panel key={entry.id}>
      <View style={s.row}><View style={s.copy}><Text style={s.topic}>{seen?'✓ ':''}{a(entry.title)}</Text>
      <Text style={s.body}>{a(entry.summary)}</Text></View></View>
      <GameButton compact title={seen?a("Replay topic"):a("Read topic")} tone="secondary" onPress={()=>onOpen(entry.id)}/>
    </Panel>})}
    {locked.length>0?<><GameButton compact title={showLocked?a("Hide locked topics"):a("Show locked topics")} tone="secondary" onPress={()=>setShowLocked(v=>!v)}/>
      {showLocked?locked.map(entry=><Panel key={entry.id}>
        <View style={s.row}><View style={s.copy}><Text style={s.topic}>{a(entry.title)}</Text>
          <Text style={s.body}>{a(entry.unlockHint)}</Text></View>
          <View style={[s.statusPill,s.lockedSurface]}><Text style={s.locked}>{a("LOCKED")}</Text></View>
        </View>
      </Panel>):null}
    </>:null}
  </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({container:{gap:spacing.sm},title:{...typography.title,color:C.text},topic:{...typography.bodyStrong,color:C.text,fontWeight:'900'},body:{...typography.body,color:C.muted,lineHeight:19},progress:{...typography.caption,color:C.accent,fontWeight:'800'},row:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start'},copy:{flex:1},statusPill:{paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderWidth:1,borderRadius:99},lockedSurface:{borderColor:C.line,backgroundColor:C.bg},locked:{...typography.caption,color:C.muted,fontWeight:'900'}});}

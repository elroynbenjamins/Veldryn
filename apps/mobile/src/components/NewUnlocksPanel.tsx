import {useMemo} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {newlyUnlockedGameGuide} from '../core/onboarding';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {C,spacing,typography} from '../theme/theme';
import {useGameTheme,type ThemePalette} from '../theme/app-theme';

export function NewUnlocksPanel({state,onOpen}:{state:GameState;onOpen:()=>void}){
 const T=useGameTheme(),s=useMemo(()=>makeStyles(T),[T]);
  const entries=newlyUnlockedGameGuide(state),entry=entries[0];
  if(!entry)return null;
  return <Panel><Text style={s.kicker}>NEWLY UNLOCKED</Text><View style={s.header}><View style={s.copy}><Text accessibilityRole="header" style={s.title}>{entry.title}</Text><Text style={s.body}>{entry.summary}</Text></View>{entries.length>1?<Text style={s.count}>+{entries.length-1}</Text>:null}</View><GameButton title="Open Help & Game Guide" onPress={onOpen}/><Text style={s.note}>Topics stay replayable from Settings → Help & Guide.</Text></Panel>;
}
const makeStyles=(T:ThemePalette)=>StyleSheet.create({kicker:{...typography.caption,color:T.accent,fontWeight:'900',letterSpacing:1},header:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start'},copy:{flex:1},title:{...typography.title,color:T.text},body:{...typography.body,color:T.muted,lineHeight:20},count:{minWidth:34,textAlign:'center',color:T.accent,fontWeight:'900',fontSize:15},note:{...typography.caption,color:T.muted,opacity:.82,lineHeight:17}});

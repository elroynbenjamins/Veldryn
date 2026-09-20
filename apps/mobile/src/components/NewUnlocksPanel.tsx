import {useMemo} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {newlyUnlockedGameGuide} from '../core/onboarding';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function NewUnlocksPanel({state,onOpen}:{state:GameState;onOpen:()=>void}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const entries=newlyUnlockedGameGuide(state),entry=entries[0];
  if(!entry)return null;
  return <Panel><Text style={s.kicker}>NEWLY UNLOCKED</Text><View style={s.header}><View style={s.copy}><Text accessibilityRole="header" style={s.title}>{entry.title}</Text><Text style={s.body}>{entry.summary}</Text></View>{entries.length>1?<Text style={s.count}>+{entries.length-1}</Text>:null}</View><GameButton title="Open Help & Game Guide" onPress={onOpen}/><Text style={s.note}>Topics stay replayable from Settings → Help & Guide.</Text></Panel>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},header:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start'},copy:{flex:1},title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted,lineHeight:20},count:{minWidth:34,textAlign:'center',color:C.accent,fontWeight:'900',fontSize:15},note:{...typography.caption,color:C.muted,opacity:.82,lineHeight:17}});}

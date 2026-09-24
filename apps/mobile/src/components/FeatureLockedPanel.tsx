import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {earlyFeatureUnlockProgress,type EarlyFeatureId} from '../core/feature-unlocks';
import {Panel} from './Panel';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function FeatureLockedPanel({state,featureId,kicker='UNLOCKS WITH PROGRESSION'}:{state:GameState;featureId:EarlyFeatureId;kicker?:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),unlock=earlyFeatureUnlockProgress(state,featureId);
 return <Panel><View style={s.wrap}><Text style={s.glyph}>◆</Text><Text style={s.kicker}>{kicker}</Text><Text style={s.title}>{unlock.title} locked</Text><Text style={s.copy}>{unlock.description}</Text><View style={s.requirement}><Text style={s.requirementLabel}>UNLOCK</Text><Text style={s.requirementText}>{unlock.requirement}</Text></View></View></Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 wrap:{alignItems:'center',gap:6,paddingVertical:spacing.sm},glyph:{fontSize:28,color:C.muted,fontWeight:'900'},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9,textAlign:'center'},title:{...typography.title,color:C.text,textAlign:'center'},copy:{...typography.body,color:C.muted,lineHeight:19,textAlign:'center',maxWidth:430},requirement:{marginTop:4,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,alignItems:'center'},requirementLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.7},requirementText:{...typography.caption,color:C.accent,fontWeight:'900',textAlign:'center'}
});}

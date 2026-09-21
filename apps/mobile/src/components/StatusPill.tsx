import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export type StatusPillTone='good'|'info'|'warning'|'bad'|'special'|'muted';
export function StatusPill({label,tone='muted'}:{label:string;tone?:StatusPillTone}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const color=tone==='good'?C.good:tone==='info'?C.info:tone==='warning'?C.warning:tone==='bad'?C.bad:tone==='special'?C.special:C.muted;
 const surface=tone==='good'?C.goodSurface:tone==='info'?C.infoSurface:tone==='warning'?C.warningSurface:tone==='bad'?C.badSurface:tone==='special'?C.specialSurface:C.panel2;
 return <View style={[s.pill,{borderColor:color,backgroundColor:surface}]}><Text style={[s.text,{color}]}>{label}</Text></View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({pill:{alignSelf:'flex-start',minHeight:22,justifyContent:'center',paddingHorizontal:7,paddingVertical:3,borderWidth:1,borderRadius:99},text:{fontSize:8.5,lineHeight:11,fontWeight:'900',letterSpacing:.65}});}

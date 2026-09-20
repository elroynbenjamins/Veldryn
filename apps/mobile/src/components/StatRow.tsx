import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function StatRow({symbol,label,value,secondary=false}:{symbol:string;label:string;value:string|number;secondary?:boolean}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);return <View style={[s.row,secondary&&s.secondary]}><View style={s.icon}><Text style={s.iconText}>{symbol}</Text></View><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({row:{minHeight:44,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:1,borderBottomColor:'rgba(114,90,43,.55)',paddingVertical:spacing.xs},secondary:{minHeight:38},icon:{width:28,height:28,borderWidth:1,borderColor:equipmentColors.line,borderRadius:4,alignItems:'center',justifyContent:'center',backgroundColor:equipmentColors.stage},iconText:{fontSize:14,color:equipmentColors.gold},label:{...typography.body,color:C.muted,flex:1},value:{...typography.bodyStrong,color:C.text,fontVariant:['tabular-nums']}});}

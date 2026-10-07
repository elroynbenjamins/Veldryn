import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {StatIcon,type StatIconKind} from './StatIcon';

export function StatRow({symbol,icon,label,value,secondary=false}:{symbol?:string;icon?:StatIconKind;label:string;value:string|number;secondary?:boolean}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={[s.row,secondary&&s.secondary]}><View style={s.icon}>{icon?<StatIcon kind={icon} size={secondary?19:21}/>:<Text style={s.iconText}>{symbol??'•'}</Text>}</View><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text></View>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 row:{minHeight:44,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line,paddingVertical:spacing.xs},
 secondary:{minHeight:38},
 icon:{width:28,height:28,borderWidth:1,borderColor:equipmentColors.line,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:equipmentColors.stage},
 iconText:{fontSize:14,color:equipmentColors.gold},
 label:{...typography.body,color:C.muted,flex:1},
 value:{...typography.bodyStrong,color:C.text,fontVariant:['tabular-nums']},
});}

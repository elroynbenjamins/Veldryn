import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {StatIcon,type StatIconKind} from './StatIcon';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {statHelpText,type StatHelpId} from '../i18n/stat-help';

export function StatRow({symbol,icon,label,value,secondary=false,helpId}:{symbol?:string;icon?:StatIconKind;label:string;value:string|number;secondary?:boolean;helpId?:StatHelpId}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const language=useGameLanguage();
 const [expanded,setExpanded]=useState(false);
 const row=<><View style={s.icon}>{icon?<StatIcon kind={icon} size={secondary?19:21}/>:<Text style={s.iconText}>{symbol??'•'}</Text>}</View><Text style={s.label}>{label}</Text><Text style={s.value}>{value}</Text>{helpId?<Text accessible={false} style={s.info}>ⓘ</Text>:null}</>;
 if(!helpId)return <View style={[s.row,secondary&&s.secondary]}>{row}</View>;
 return <View><Pressable accessibilityRole="button" accessibilityLabel={label+': '+value} accessibilityHint={statHelpText(language,helpId)} accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={s.row}>{row}</Pressable>{expanded?<Text style={s.help}>{statHelpText(language,helpId)}</Text>:null}</View>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 row:{minHeight:44,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line,paddingVertical:spacing.xs},
 secondary:{minHeight:38},
 info:{color:C.accent,fontSize:18},
 help:{...typography.body,color:C.text,padding:spacing.sm,backgroundColor:C.panel2},
 icon:{width:28,height:28,borderWidth:1,borderColor:equipmentColors.line,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:equipmentColors.stage},
 iconText:{fontSize:14,color:equipmentColors.gold},
 label:{...typography.body,color:C.muted,flex:1},
 value:{...typography.bodyStrong,color:C.text,fontVariant:['tabular-nums']},
});}

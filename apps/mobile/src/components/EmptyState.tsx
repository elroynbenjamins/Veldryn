import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {type UiIconName} from '../theme/ui-icons';
import {UiIcon} from './UiIcon';
export function EmptyState({title,message,icon='search',compact=false}:{title:string;message:string;icon?:UiIconName;compact?:boolean}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);return <View style={[s.root,compact&&s.compact]}><View style={s.iconFrame}><UiIcon name={icon} size={24}/></View><View style={s.copy}><Text style={s.title}>{title}</Text><Text style={s.message}>{message}</Text></View></View>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{alignItems:'center',padding:spacing.lg,gap:spacing.sm},compact:{flexDirection:'row',alignItems:'center',padding:spacing.md},iconFrame:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:22,backgroundColor:C.panel2},copy:{alignItems:'center',gap:spacing.xs,maxWidth:380},title:{...typography.title,color:C.text,textAlign:'center'},message:{...typography.body,color:C.muted,textAlign:'center'},});}

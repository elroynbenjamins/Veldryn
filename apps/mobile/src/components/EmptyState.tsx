import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {type UiIconName} from '../theme/ui-icons';
import {UiIcon} from './UiIcon';
export function EmptyState({title,message,icon='search'}:{title:string;message:string;icon?:UiIconName}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.root}><UiIcon name={icon} size={28}/><Text style={s.title}>{title}</Text><Text style={s.message}>{message}</Text></View>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{alignItems:'center',padding:spacing.lg,gap:spacing.xs},title:{...typography.title,color:C.text,textAlign:'center'},message:{...typography.body,color:C.muted,textAlign:'center',maxWidth:360}});}

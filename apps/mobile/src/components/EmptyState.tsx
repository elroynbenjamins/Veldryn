import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {C,spacing,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
import {type UiIconName} from '../theme/ui-icons';
import {UiIcon} from './UiIcon';
export function EmptyState({title,message,icon='search'}:{title:string;message:string;icon?:UiIconName}){const {colors:C}=useTheme();const s=useMemo(()=>createStyles(C),[C]);return <View style={s.root}><UiIcon name={icon} size={32}/><Text style={s.title}>{title}</Text><Text style={s.message}>{message}</Text></View>}
const createStyles=(C:any)=>StyleSheet.create({root:{alignItems:'center',padding:spacing.xl,gap:spacing.sm},title:{...typography.title,color:C.text,textAlign:'center'},message:{...typography.body,color:C.muted,textAlign:'center',maxWidth:360}});

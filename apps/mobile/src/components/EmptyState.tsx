import {StyleSheet,Text,View} from 'react-native';
import {C,spacing,typography} from '../theme/theme';
import {type UiIconName} from '../theme/ui-icons';
import {UiIcon} from './UiIcon';
export function EmptyState({title,message,icon='search'}:{title:string;message:string;icon?:UiIconName}){return <View style={s.root}><UiIcon name={icon} size={32}/><Text style={s.title}>{title}</Text><Text style={s.message}>{message}</Text></View>}
const s=StyleSheet.create({root:{alignItems:'center',padding:spacing.xl,gap:spacing.sm},title:{...typography.title,color:C.text,textAlign:'center'},message:{...typography.body,color:C.muted,textAlign:'center',maxWidth:360}});

import {StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,typography} from '../theme/theme';

export function EmptyState({title,message}:{title:string;message:string}){return <View style={s.root}><Text style={s.icon}>◇</Text><Text style={s.title}>{title}</Text><Text style={s.message}>{message}</Text></View>}
const s=StyleSheet.create({root:{alignItems:'center',padding:spacing.xl,gap:spacing.sm,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.lg},icon:{fontSize:28,color:C.accent},title:{...typography.title,color:C.text,textAlign:'center'},message:{...typography.body,color:C.muted,textAlign:'center'}});

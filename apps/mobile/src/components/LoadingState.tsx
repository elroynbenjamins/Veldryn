import {useMemo} from 'react';
import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function LoadingState({label='Loading…',detail,compact=false}:{label?:string;detail?:string;compact?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={[s.root,compact&&s.compact]}>
   <ActivityIndicator color={C.accent} size="small"/>
   <View style={s.copy}><Text style={s.label}>{label}</Text>{detail?<Text style={s.detail}>{detail}</Text>:null}</View>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{minHeight:58,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 compact:{minHeight:44,paddingHorizontal:10,paddingVertical:7},
 copy:{flex:1,minWidth:0},label:{...typography.bodyStrong,color:C.text},detail:{...typography.caption,color:C.muted,marginTop:2},
});}

import {useMemo} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {typography,type ThemeColors} from '../theme/theme';

/** Shared, read-only identity text for inventory, comparison and public gear.
 * Ownership/actions are supplied by the caller, never inferred here. */
export function ItemInspectIdentity({name,metadata,detail,nameColor,metadataColor,centered=false}:{name:string;metadata:string;detail?:string;nameColor?:string;metadataColor?:string;centered?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 return <View style={[s.identity,centered&&s.centered]}>
  {!centered&&<Text style={[s.metadata,{color:metadataColor??C.muted}]}>{metadata}</Text>}
  <Text numberOfLines={2} style={[s.name,centered&&s.centerName,{color:nameColor??C.text}]}>{name}</Text>
  {centered&&<Text style={[s.metadata,s.centerText,{color:metadataColor??C.muted}]}>{metadata}</Text>}
  {detail?<Text numberOfLines={2} style={[s.detail,centered&&s.centerText]}>{detail}</Text>:null}
 </View>;
}
/** Stat values and bonus percentages use identical rows in both inspection contexts. */
export function ItemInspectStatRow({label,value,bonus=false}:{label:string;value:string;bonus?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 return <View style={s.row}><Text style={s.label}>{label}</Text><Text style={[s.value,bonus&&{color:C.good}]}>{value}</Text></View>;
}
const styles=(C:ThemeColors)=>StyleSheet.create({
 identity:{minWidth:0,gap:3},centered:{alignItems:'center',alignSelf:'stretch'},
 metadata:{...typography.caption,fontWeight:'900'},name:{...typography.title,fontWeight:'800'},
 centerName:{...typography.bodyStrong,textAlign:'center',minHeight:31},centerText:{textAlign:'center'},
 detail:{...typography.caption,color:C.muted},
 row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,minHeight:24},
 label:{...typography.bodyStrong,color:C.text,flex:1},value:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
});

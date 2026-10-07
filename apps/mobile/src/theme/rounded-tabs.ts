import {StyleSheet} from 'react-native';
import type {ThemeColors} from './theme';

/** Shared navigation surfaces; screens retain their own sizing and wrapping. */
export function roundedTabStyles(C:ThemeColors){
 return StyleSheet.create({
  rail:{flexDirection:'row',gap:4,padding:4,borderRadius:16,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
  tab:{flex:1,minWidth:0,minHeight:44,paddingHorizontal:4,paddingVertical:8,alignItems:'center',justifyContent:'center',borderRadius:11,borderWidth:1,borderColor:'transparent'},
  chip:{minHeight:44,paddingHorizontal:12,paddingVertical:8,justifyContent:'center',borderRadius:11,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
  selected:{borderColor:C.info,backgroundColor:C.infoSurface},
 });
}

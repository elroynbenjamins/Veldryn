import type {PropsWithChildren} from 'react';
import {StyleSheet,View,type StyleProp,type ViewStyle} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

/** A quiet pinned notice; all text and actions remain native UI. */
export function QuestPosting({children,style}:PropsWithChildren<{style?:StyleProp<ViewStyle>}>){
  const C=useGameTheme();
  return <View style={[s.posting,{backgroundColor:C.panelRaised,borderColor:C.lineStrong},style]}>
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[s.pin,{backgroundColor:C.accentSoft,borderColor:C.lineStrong}]}/>
    {children}
  </View>;
}

const s=StyleSheet.create({
  posting:{position:'relative',borderWidth:1,borderRadius:10,padding:14,paddingTop:20,gap:10,marginTop:5},
  pin:{position:'absolute',alignSelf:'center',top:-5,width:9,height:9,borderRadius:5,borderWidth:1},
});

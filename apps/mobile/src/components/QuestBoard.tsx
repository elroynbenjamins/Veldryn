import type {PropsWithChildren} from 'react';
import {StyleSheet,View,type StyleProp,type ViewStyle} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';

export function QuestBoard({children,style}:PropsWithChildren<{style?:StyleProp<ViewStyle>}>){
 const C=useGameTheme();
 return <View style={[s.board,{backgroundColor:C.stage,borderColor:C.line},style]}>{children}</View>;
}
const s=StyleSheet.create({board:{padding:10,paddingTop:14,gap:14,borderWidth:1,borderRadius:12}});

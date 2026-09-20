import {type PropsWithChildren} from 'react';
import {StyleSheet,View} from 'react-native';
import {radii} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

/** Quiet shared surface. Accent borders are reserved for meaningful emphasis. */
export function Panel({children,accentColor,accentSurface,borderWidth=1,glowOpacity=0}:PropsWithChildren<{accentColor?:string;accentSurface?:string;borderWidth?:number;glowOpacity?:number}>){
  const C=useGameTheme();
  return <View style={[s.panel,{backgroundColor:accentSurface??C.panel,borderColor:accentColor??C.line},accentColor&&{borderWidth,shadowColor:accentColor,shadowOpacity:glowOpacity,shadowRadius:8,shadowOffset:{width:0,height:0},elevation:glowOpacity>0?3:0}]}>{children}</View>;
}
const s=StyleSheet.create({panel:{borderWidth:StyleSheet.hairlineWidth,borderRadius:radii.md,padding:12,gap:8}});

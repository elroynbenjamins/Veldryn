import {type PropsWithChildren} from 'react';
import {StyleSheet,View} from 'react-native';
import {C,radii} from '../theme/theme';

/** Quiet shared surface. Accent borders are reserved for meaningful emphasis. */
export function Panel({children,accentColor,accentSurface,borderWidth=1,glowOpacity=0}:PropsWithChildren<{accentColor?:string;accentSurface?:string;borderWidth?:number;glowOpacity?:number}>){
  return <View style={[s.panel,accentSurface&&{backgroundColor:accentSurface},accentColor&&{borderColor:accentColor,borderWidth,shadowColor:accentColor,shadowOpacity:glowOpacity,shadowRadius:8,shadowOffset:{width:0,height:0},elevation:glowOpacity>0?3:0}]}>{children}</View>;
}
const s=StyleSheet.create({panel:{backgroundColor:C.panel,borderWidth:StyleSheet.hairlineWidth,borderColor:'#293746',borderRadius:radii.md,padding:14,gap:9}});

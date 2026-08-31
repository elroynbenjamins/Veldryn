import React, {PropsWithChildren} from 'react'; import {StyleSheet,View} from 'react-native'; import {C} from '../theme/theme';
export function Panel({children}:PropsWithChildren){return <View style={s.p}>{children}</View>} const s=StyleSheet.create({p:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:12,padding:14,gap:8}});

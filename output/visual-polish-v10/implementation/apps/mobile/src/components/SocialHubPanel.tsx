import {C,equipmentColors} from '../theme/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type SocialHubTab = 'party' | 'guild' | 'chat' | 'rankings';
export function SocialHubPanel({ active, onChange, children }: { active: SocialHubTab; onChange: (tab: SocialHubTab) => void; children: React.ReactNode }) {
  const tabs: SocialHubTab[]=['party','guild','chat','rankings'];
  return <View style={styles.root}><View style={styles.tabs}>{tabs.map(tab => <Pressable accessibilityRole="tab" accessibilityState={{selected:active===tab}} key={tab} onPress={() => onChange(tab)} style={[styles.tab,active===tab&&styles.active]}><Text style={[styles.text,active===tab&&styles.activeText]}>{tab.charAt(0).toUpperCase()+tab.slice(1)}</Text></Pressable>)}</View><View style={styles.body}>{children}</View></View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:C.bg},tabs:{flexDirection:'row',paddingHorizontal:8,gap:8,borderBottomWidth:1,borderBottomColor:C.line},tab:{minHeight:52,flex:1,paddingVertical:8,alignItems:'center',justifyContent:'center',borderBottomWidth:2,borderColor:'transparent'},active:{borderColor:equipmentColors.selectedLine},text:{color:C.muted,fontSize:12,fontWeight:'600'},activeText:{color:C.text},body:{flex:1}});

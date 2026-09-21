import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export type SocialHubTab='party'|'events'|'guild'|'chat'|'rankings';

const tabLabel:Record<SocialHubTab,string>={party:'Party',events:'Events',guild:'Guild',chat:'Chat',rankings:'Rankings'};

export function SocialHubPanel({active,onChange,children,badges}:{active:SocialHubTab;onChange:(tab:SocialHubTab)=>void;children:React.ReactNode;badges?:Partial<Record<SocialHubTab,number>>}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 const tabs:SocialHubTab[]=['party','events','guild','chat','rankings'];
 return <View style={s.root}>
  <View accessibilityRole="tablist" style={s.tabs}>{tabs.map(tab=><Pressable accessibilityRole="tab" accessibilityState={{selected:active===tab}} key={tab} onPress={()=>onChange(tab)} style={({pressed})=>[s.tab,active===tab&&s.active,pressed&&s.pressed]}><View style={s.tabLabel}><Text numberOfLines={1} style={[s.text,active===tab&&s.activeText]}>{tabLabel[tab]}</Text>{(badges?.[tab]??0)>0?<View style={s.badge}><Text style={s.badgeText}>{Math.min(99,badges?.[tab]??0)}</Text></View>:null}</View>{active===tab?<View style={s.indicator}/>:null}</Pressable>)}</View>
  <View style={s.body}>{children}</View>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},
 tabs:{flexDirection:'row',gap:4,paddingHorizontal:6,paddingTop:4,paddingBottom:3,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.panel},
 tab:{position:'relative',flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderRadius:radii.sm},
 active:{backgroundColor:C.selection},
 pressed:{opacity:.7},
 tabLabel:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,maxWidth:'100%'},
 text:{fontSize:10,color:C.muted,fontWeight:'800'},
 activeText:{color:C.text,fontWeight:'900'},
 badge:{minWidth:16,height:16,paddingHorizontal:4,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:C.notification},badgeText:{fontSize:8,color:C.notificationText,fontWeight:'900'},
 indicator:{position:'absolute',left:10,right:10,bottom:-4,height:3,borderTopLeftRadius:3,borderTopRightRadius:3,backgroundColor:C.selectionLine},
 body:{flex:1},
});}

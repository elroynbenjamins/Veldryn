import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {formatGuildRole,type GuildMemberRow} from '../core/guild-projects-v18';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildMemberRosterPanel({members,onOpenMember,onManageRole}:{members:GuildMemberRow[];onOpenMember?:Function;onManageRole?:Function}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 return <View style={s.panel}>{members.map(m=><View key={m.accountId} style={s.row}>
  <Pressable accessibilityRole="button" disabled={!onOpenMember} onPress={()=>onOpenMember?.(m.accountId)} style={({pressed})=>[s.identity,pressed&&s.pressed]}>
   <CompactPlayerIdentity name={m.displayName} status={formatGuildRole(m.role).toUpperCase()} statusTone={m.onlineState==='online'?'good':m.onlineState==='recent'?'info':'muted'} hint={onOpenMember?'VIEW PROFILE ›':undefined}/>
   <Text style={s.meta}>{m.contributionThisWeek.toLocaleString()} weekly contribution{m.onlineState?' · '+m.onlineState:''}</Text>
  </Pressable>
  {onManageRole?<Pressable accessibilityRole="button" style={({pressed})=>[s.manage,pressed&&s.pressed]} onPress={()=>onManageRole?.(m.accountId)}><Text style={s.manageText}>Manage</Text></Pressable>:null}
 </View>)}</View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{borderWidth:1,borderColor:C.line,borderRadius:radii.md,padding:9,backgroundColor:C.panel},
 row:{minHeight:60,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderBottomWidth:1,borderBottomColor:C.line},
 identity:{flex:1,minWidth:0},pressed:{opacity:.72},
 meta:{fontSize:8.5,lineHeight:11,color:C.muted,marginTop:2,marginLeft:50},
 manage:{minHeight:40,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,paddingHorizontal:8,backgroundColor:C.panel2},
 manageText:{color:C.text,fontWeight:'900',fontSize:9},
});}

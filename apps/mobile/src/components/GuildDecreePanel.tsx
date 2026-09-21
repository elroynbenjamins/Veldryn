import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import type {GuildDecreeView} from '../core/guild-projects-v18';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildDecreePanel({decrees,onVote}:{decrees:GuildDecreeView[];onVote?:Function}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 return <View style={s.panel}>
  <Text style={s.copy}>Completing the weekly Guild Project opens a decree choice. Only one Guild Decree is active at once and all bonuses remain under existing Guild/global caps.</Text>
  {decrees.map(decree=><View key={decree.id} style={[s.card,decree.active&&s.active]}><View style={s.row}><View style={s.flex}><Text style={s.title}>{decree.name}</Text><Text style={s.desc}>{decree.description}</Text></View><View style={s.votePill}><Text style={s.votes}>{decree.votes}</Text></View></View>{!decree.active?<GameButton compact title={decree.myVote?'Voted':'Vote'} tone="secondary" selected={decree.myVote} disabled={!onVote} onPress={()=>onVote?.(decree.id)}/>:<View style={s.liveBadge}><Text style={s.live}>ACTIVE{decree.endsAt?' · until '+new Date(decree.endsAt).toLocaleDateString():''}</Text></View>}</View>)}
  {!decrees.length?<View style={s.empty}><Text style={s.emptyTitle}>No decree choice active</Text><Text style={s.copy}>A completed eligible weekly Project can open the next decree window.</Text></View>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{gap:7,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},copy:{color:C.muted,fontSize:9.5,lineHeight:13},
 card:{padding:8,gap:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},active:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},
 row:{flexDirection:'row',gap:8},flex:{flex:1,minWidth:0},title:{color:C.text,fontWeight:'900',fontSize:10.5},desc:{color:C.muted,fontSize:9,lineHeight:12},
 votePill:{minWidth:28,height:24,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},votes:{color:C.accent,fontWeight:'900',fontSize:8.5},
 liveBadge:{alignSelf:'flex-start',paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.lineStrong,borderRadius:99,backgroundColor:C.warningSurface},live:{color:C.accent,fontSize:8,fontWeight:'900'},
 empty:{minHeight:62,alignItems:'center',justifyContent:'center',gap:2,padding:8,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},emptyTitle:{fontSize:10,color:C.text,fontWeight:'900'},
});}

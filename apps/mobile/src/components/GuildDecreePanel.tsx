import {useSocialText} from '../i18n/social';
import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import type {GuildDecreeView} from '../core/guild-projects-v18';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildDecreePanel({decrees,onVote}:{decrees:GuildDecreeView[];onVote?:Function}){
 const st=useSocialText();
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 return <View style={s.panel}>
  <Text style={s.copy}>Completing the weekly Guild Project opens a decree choice. Only one Guild Decree is active at once and all bonuses remain under existing Guild/global caps.</Text>
  {decrees.map(decree=><View key={decree.id} style={[s.card,decree.active&&s.active]}><View style={s.row}><View style={s.flex}><Text style={s.title}>{decree.name}</Text><Text style={s.desc}>{decree.description}</Text></View><View style={s.votePill}><Text style={s.votes}>{decree.votes}</Text></View></View>{!decree.active?<GameButton compact title={decree.myVote?st("Voted"):st("Vote")} tone="secondary" selected={decree.myVote} disabled={!onVote} onPress={()=>onVote?.(decree.id)}/>:<View style={s.liveBadge}><Text style={s.live}>{st("ACTIVE")}{decree.endsAt?' · until '+new Date(decree.endsAt).toLocaleDateString():''}</Text></View>}</View>)}
  {!decrees.length?<View style={s.empty}><Text style={s.emptyTitle}>{st("No decree choice active")}</Text><Text style={s.copy}>A completed eligible weekly Project can open the next decree window.</Text></View>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{gap:8,padding:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},copy:{color:C.muted,fontSize:12,lineHeight:17},
 card:{padding:8,gap:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},active:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},
 row:{flexDirection:'row',gap:8},flex:{flex:1,minWidth:0},title:{color:C.text,fontWeight:'900',fontSize:13,lineHeight:17},desc:{color:C.muted,fontSize:12,lineHeight:17},
 votePill:{minWidth:34,height:28,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},votes:{color:C.accent,fontWeight:'900',fontSize:12,lineHeight:16},
 liveBadge:{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:4,borderWidth:1,borderColor:C.lineStrong,borderRadius:99,backgroundColor:C.warningSurface},live:{color:C.accent,fontSize:11,lineHeight:14,fontWeight:'900'},
 empty:{minHeight:62,alignItems:'center',justifyContent:'center',gap:2,padding:8,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},emptyTitle:{fontSize:10,color:C.text,fontWeight:'900'},
});}

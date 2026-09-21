import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GuildActivityView} from '../core/guild-projects-v18';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function tone(kind:string){const value=kind.toLowerCase();if(value.includes('project')||value.includes('complete'))return'good';if(value.includes('boss')||value.includes('raid'))return'warning';if(value.includes('member')||value.includes('join'))return'info';return'muted';}
function kindLabel(kind:string){return kind.replace(/[_:-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}

export function GuildActivityFeedPanel({entries}:{entries:GuildActivityView[]}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 return <View style={s.panel}>{entries.length===0?<View style={s.emptyCard}><Text style={s.emptyTitle}>No recent Guild activity</Text><Text style={s.empty}>Project completions, member milestones and Guild events will appear here.</Text></View>:entries.map(e=>{const t=tone(e.kind);return <View key={e.id} style={s.row}><View style={s.rowHead}><View style={[s.kind,t==='good'?s.kindGood:t==='warning'?s.kindWarning:t==='info'?s.kindInfo:s.kindMuted]}><Text style={[s.kindText,t==='good'?s.kindTextGood:t==='warning'?s.kindTextWarning:t==='info'?s.kindTextInfo:s.kindTextMuted]}>{kindLabel(e.kind)}</Text></View><Text style={s.time}>{new Date(e.createdAt).toLocaleString()}</Text></View><Text style={s.title}>{e.title}</Text>{e.body?<Text style={s.body}>{e.body}</Text>:null}</View>})}</View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{gap:0},
 row:{paddingVertical:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 rowHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:3},
 kind:{maxWidth:150,paddingHorizontal:5,paddingVertical:2,borderWidth:1,borderRadius:99},
 kindGood:{borderColor:C.good,backgroundColor:C.goodSurface},kindWarning:{borderColor:C.warning,backgroundColor:C.warningSurface},kindInfo:{borderColor:C.info,backgroundColor:C.infoSurface},kindMuted:{borderColor:C.line,backgroundColor:C.panel2},
 kindText:{fontSize:6.5,fontWeight:'900',letterSpacing:.35},kindTextGood:{color:C.good},kindTextWarning:{color:C.warning},kindTextInfo:{color:C.info},kindTextMuted:{color:C.muted},
 title:{color:C.text,fontWeight:'900',fontSize:10.5},body:{color:C.muted,fontSize:9.5,lineHeight:13,marginTop:2},time:{color:C.muted,fontSize:8},
 emptyCard:{minHeight:68,alignItems:'center',justifyContent:'center',gap:2,padding:10,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 emptyTitle:{color:C.text,fontWeight:'900',fontSize:10},empty:{color:C.muted,fontSize:9,lineHeight:13,textAlign:'center'},
});}

import type {ReactNode} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {BoardTabs} from './BoardTabs';
import {OnlineGuildSkillsPanel} from './OnlineGuildSkillsPanel';
import {useGameTheme} from '../theme/ThemeContext';
import {useSocialText} from '../i18n/social';

/** Standalone Guild Progress screen. Shares the live, authoritative Skills
 * and Projects panels without embedding them in Activities or Guild Hall. */
export type GuildProgressTab='Projects'|'Skills';
export function GuildProgressPanel({tab,onChange,projects,onViewBank,headerHelp}:{
 tab:GuildProgressTab;
 onChange:(tab:GuildProgressTab)=>void;
 projects?:ReactNode;
 onViewBank?:()=>void;
 headerHelp?:ReactNode;
}){
 const C=useGameTheme(),st=useSocialText();
 return <View style={s.root}>
  {headerHelp?<View style={s.header}><Text style={[s.heading,{color:C.text}]}>Guild Progress</Text>{headerHelp}</View>:null}
  <BoardTabs compact label="Guild progression" items={[{id:'Skills',label:st('Skills')},{id:'Projects',label:st('Projects')}] as const} value={tab} onChange={onChange}/>
  {tab==='Projects'?projects??<Text style={[s.message,{color:C.muted}]}>Guild Projects are unavailable. Return to this board after reconnecting.</Text>:<OnlineGuildSkillsPanel onViewBank={onViewBank}/>}
 </View>;
}
const s=StyleSheet.create({
 root:{gap:12,minWidth:0},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},heading:{fontSize:17,fontWeight:'800'},
 message:{fontSize:13,lineHeight:19,padding:12},
});

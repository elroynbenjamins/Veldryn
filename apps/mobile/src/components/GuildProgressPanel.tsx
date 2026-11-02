import type {ReactNode} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {BoardTabs} from './BoardTabs';
import {OnlineGuildSkillsPanel} from './OnlineGuildSkillsPanel';
import {useGameTheme} from '../theme/ThemeContext';

/** One progression destination, without duplicating the authoritative
 * Skills or Projects state. The existing Activity/Projects route remains
 * compatible with previously persisted navigation histories. */
export type GuildProgressTab='Projects'|'Skills';
export function GuildProgressPanel({tab,onChange,projects,onViewBank}:{
 tab:GuildProgressTab;
 onChange:(tab:GuildProgressTab)=>void;
 projects?:ReactNode;
 onViewBank?:()=>void;
}){
 const C=useGameTheme();
 return <View style={s.root}>
  <BoardTabs compact label="Guild progression" items={[{id:'Projects',label:'Weekly Projects'},{id:'Skills',label:'Guild Skills'}] as const} value={tab} onChange={onChange}/>
  {tab==='Projects'?projects??<Text style={[s.message,{color:C.muted}]}>Guild Projects are unavailable. Return to this board after reconnecting.</Text>:<OnlineGuildSkillsPanel onViewBank={onViewBank}/>}
 </View>;
}
const s=StyleSheet.create({
 root:{gap:12,minWidth:0},
 message:{fontSize:13,lineHeight:19,padding:12},
});

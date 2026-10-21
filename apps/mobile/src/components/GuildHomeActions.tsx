import type {ReactNode} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {ThemedIcon} from './ThemedNavigationIcon';
import {GameButton} from './GameButton';
import {guildTokenIcon} from '../theme/guild-token-shop-art';

export function GuildHomeActions({activity,board,chatUnread=0,onMuster,onQuests,onShop,onPve,onRoster,onHall,onChat,onManage}:{activity:ReactNode;board?:ReactNode;chatUnread?:number;onMuster:()=>void;onQuests:()=>void;onShop:()=>void;onPve:()=>void;onRoster:()=>void;onHall:()=>void;onChat:()=>void;onManage:()=>void}){
 const C=useGameTheme();
 const rows=[{title:'Guild Quests',copy:'Shared objectives and your contribution',icon:'quests',action:onQuests},{title:'Guild Token Shop',copy:'Permanent account rewards',icon:'inventory',action:onShop},{title:'The Raid Gate',copy:'Weekly and event encounters',icon:'dungeon',action:onPve}] as const;
 return <View style={s.stack}>
  {board?<View style={s.stack}><Text style={[s.kicker,{color:C.muted}]}>MEMBER NOTICE BOARD</Text>{board}</View>:null}
  {activity}
  <View style={[s.priority,{borderColor:C.selectionLine,backgroundColor:C.panel}]}><View style={s.priorityHead}><ThemedIcon name="guild" size={36}/><View style={s.flex}><Text style={[s.kicker,{color:C.info}]}>DAILY GUILD PARTICIPATION</Text><Text style={[s.title,{color:C.text}]}>Guild Muster</Text><Text style={[s.copy,{color:C.muted}]}>Check in and contribute together today.</Text></View></View><GameButton compact title="Open Muster" onPress={onMuster}/></View>
  <View style={s.stack}>{rows.map(row=><Pressable key={row.title} accessibilityRole="button" onPress={row.action} style={({pressed})=>[s.row,{borderColor:C.line,backgroundColor:C.panel},pressed&&s.pressed]}><View style={[s.icon,{borderColor:C.line,backgroundColor:C.panel2}]}>{row.title==='Guild Token Shop'?<Image accessible={false} source={guildTokenIcon} style={{width:28,height:28}} resizeMode="contain"/>:<ThemedIcon name={row.icon} size={25}/>}</View><View style={s.flex}><Text style={[s.name,{color:C.text}]}>{row.title}</Text><Text style={[s.copy,{color:C.muted}]}>{row.copy}</Text></View><Text style={[s.arrow,{color:C.muted}]}>›</Text></Pressable>)}</View>
  <View style={s.links}>{[{title:'Roster',action:onRoster},{title:'Hall',action:onHall},{title:chatUnread?`Chat · ${chatUnread}`:'Chat',action:onChat},{title:'Manage Guild',action:onManage}].map(row=><Pressable key={row.title} accessibilityRole="button" onPress={row.action} style={[s.link,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={[s.linkText,{color:C.text}]}>{row.title}</Text></Pressable>)}</View>
 </View>;
}
const s=StyleSheet.create({stack:{gap:10},flex:{flex:1,minWidth:0,gap:3},priority:{padding:12,gap:12,borderWidth:1,borderRadius:10},priorityHead:{flexDirection:'row',gap:12,alignItems:'center'},kicker:{fontSize:10,lineHeight:15,fontWeight:'700',letterSpacing:.6},title:{fontSize:19,lineHeight:25,fontWeight:'700'},copy:{fontSize:13,lineHeight:19},name:{fontSize:15,lineHeight:21,fontWeight:'700'},row:{flexDirection:'row',gap:10,alignItems:'center',padding:12,minHeight:76,borderWidth:1,borderRadius:10},icon:{width:42,height:42,borderWidth:1,borderRadius:8,alignItems:'center',justifyContent:'center'},arrow:{fontSize:26},links:{flexDirection:'row',flexWrap:'wrap',gap:6},link:{minHeight:44,paddingHorizontal:12,borderWidth:1,borderRadius:8,justifyContent:'center'},linkText:{fontSize:12,lineHeight:17,fontWeight:'600'},pressed:{opacity:.76}});

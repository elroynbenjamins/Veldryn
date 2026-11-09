import type {ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {guildGuideLibraryText} from '../i18n/guild-guide-library';
import {ThemedIcon} from './ThemedNavigationIcon';

/** Guild Home is a dashboard, not a second copy of every Guild section.
 * Put communication and unclaimed rewards above supplementary information. */
export function GuildHomeActions({activity,board,summary,chatUnread=0,canManage=true,onQuests,onShop,onPve,onRoster,onHall,onChat,onManage,onGuide}:{
 activity:ReactNode;board?:ReactNode;summary?:ReactNode;chatUnread?:number;canManage?:boolean;
 onQuests:()=>void;onShop:()=>void;onPve:()=>void;onRoster:()=>void;onHall:()=>void;onChat:()=>void;onManage:()=>void;onGuide?:()=>void;
}){
 const C=useGameTheme(),language=useGameLanguage(),guideLabel=guildGuideLibraryText(language,'Guild Guide');
 const quickLinks=[
  {title:chatUnread>0?`Chat · ${chatUnread>99?'99+':chatUnread}`:'Chat',action:onChat},
  {title:'Members',action:onRoster},
  {title:'Shop',action:onShop},
  ...(canManage?[{title:'Manage',action:onManage}]:[]),
  ...(onGuide?[{title:guideLabel,action:onGuide}]:[]),
 ];
 const actions=[
  {title:'Guild Quests',detail:'Shared weekly objectives',icon:'quests' as const,action:onQuests},
  {title:'Raid Gate',detail:'Weekly & event bosses',icon:'dungeon' as const,action:onPve},
 ];
 return <View style={s.stack}>
  <View accessibilityRole="group" accessibilityLabel="Guild quick actions" style={s.quickLinks}>
   {quickLinks.map(item=><Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={item.action} style={({pressed})=>[s.quickLink,canManage&&onGuide&&s.quickLinkFive,{backgroundColor:C.panel,borderColor:C.lineStrong},pressed&&s.pressed]}>
    <Text numberOfLines={1} style={[s.quickLinkText,{color:item.title.startsWith('Chat ·')?C.notification:C.text}]}>{item.title}</Text>
   </Pressable>)}
  </View>
  {summary}
  {board?<View style={s.section}><Text style={[s.kicker,{color:C.muted}]}>GUILD NOTICE</Text>{board}</View>:null}
  <View style={s.section}>{activity}</View>
  <View style={s.actionGrid}>{actions.map(item=><Pressable key={item.title} accessibilityRole="button" onPress={item.action} style={({pressed})=>[s.action,{borderColor:C.line,backgroundColor:C.panel},pressed&&s.pressed]}>
   <ThemedIcon name={item.icon} size={23}/>
   <View style={s.flex}><Text style={[s.actionTitle,{color:C.text}]}>{item.title}</Text><Text style={[s.actionDetail,{color:C.muted}]}>{item.detail}</Text></View>
   <Text style={[s.arrow,{color:C.muted}]}>›</Text>
  </Pressable>)}</View>
 </View>;
}
const s=StyleSheet.create({
 stack:{gap:10},section:{gap:5},kicker:{fontSize:10,lineHeight:15,fontWeight:'800',letterSpacing:.6},
 quickLinks:{flexDirection:'row',flexWrap:'wrap',gap:6},quickLink:{minHeight:44,flexGrow:1,flexBasis:'21%',minWidth:66,paddingHorizontal:8,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:8},
 quickLinkFive:{flexBasis:'28%'},
 quickLinkText:{fontSize:12,lineHeight:17,fontWeight:'800',textAlign:'center'},
 actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
 action:{flexGrow:1,flexBasis:'46%',minWidth:135,minHeight:65,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:9,paddingVertical:8,borderWidth:1,borderRadius:10},
 flex:{flex:1,minWidth:0},actionTitle:{fontSize:13,lineHeight:18,fontWeight:'800'},actionDetail:{fontSize:11,lineHeight:15},
 arrow:{fontSize:20},pressed:{opacity:.76},
});

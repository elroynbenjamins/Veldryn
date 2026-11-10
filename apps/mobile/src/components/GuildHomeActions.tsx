import type {ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {guildGuideLibraryText} from '../i18n/guild-guide-library';
import {ThemedIcon} from './ThemedNavigationIcon';

/** Prioritize actionable rewards and weekly play over utility navigation. */
export function GuildHomeActions({activity,board,summary,voteReminder,chatUnread=0,canManage=false,onProjects,onQuests,onShop,onPve,onRoster,onChat,onManage,onRoadmap,onGuide}:{
 activity:ReactNode;board?:ReactNode;summary?:ReactNode;voteReminder?:ReactNode;chatUnread?:number;canManage?:boolean;
 onProjects:()=>void;onQuests:()=>void;onShop:()=>void;onPve:()=>void;onRoster:()=>void;onChat:()=>void;onManage:()=>void;onRoadmap:()=>void;onGuide?:()=>void;
}){
 const C=useGameTheme(),language=useGameLanguage(),guideLabel=guildGuideLibraryText(language,'Guild Guide');
 const week=[{title:'Guild Projects',detail:'Weekly shared progress',icon:'guild' as const,action:onProjects},{title:'Guild Boss',detail:'Weekly & event encounters',icon:'dungeon' as const,action:onPve}];
 const more=[{title:'Token Shop',action:onShop},...(onGuide?[{title:guideLabel,action:onGuide}]:[]),...(canManage?[{title:'Manage',action:onManage}]:[]),{title:'Roadmap',action:onRoadmap}];
 return <View style={s.stack}>
  <View accessibilityRole="group" accessibilityLabel="Your Guild actions" style={s.priority}>{summary}{voteReminder}</View>
  <View accessibilityRole="group" accessibilityLabel="This week's Guild activities" style={s.section}>
   <Text style={[s.kicker,{color:C.accentSoft}]}>THIS WEEK</Text>
   <View style={s.weekGrid}>{week.map(item=><Pressable key={item.title} accessibilityRole="button" accessibilityLabel={'Open '+item.title} onPress={item.action} style={({pressed})=>[s.weekCard,{borderColor:C.line,backgroundColor:C.panel},pressed&&s.pressed]}>
    <View style={[s.weekIcon,{backgroundColor:C.panel2,borderColor:C.lineStrong}]}><ThemedIcon name={item.icon} size={23}/></View>
    <Text style={[s.weekTitle,{color:C.text}]}>{item.title}</Text>
    <Text style={[s.weekDetail,{color:C.muted}]}>{item.detail}</Text>
    <Text style={[s.open,{color:C.info}]}>Open ›</Text>
   </Pressable>)}</View>
   <Pressable accessibilityRole="button" accessibilityLabel="Open Guild Quests" onPress={onQuests} style={({pressed})=>[s.questRow,{backgroundColor:C.panel,borderColor:C.line},pressed&&s.pressed]}>
    <ThemedIcon name="quests" size={21}/>
    <View style={s.flex}><Text style={[s.rowTitle,{color:C.text}]}>Guild Quests</Text><Text style={[s.rowDetail,{color:C.muted}]}>Weekly objectives & rewards</Text></View>
    <Text style={[s.chevron,{color:C.muted}]}>›</Text>
   </Pressable>
  </View>
  <View accessibilityRole="group" accessibilityLabel="Guild activity and bonuses" style={s.section}>
   <Text style={[s.kicker,{color:C.accentSoft}]}>GUILD ACTIVITY</Text>{activity}
  </View>
  <View accessibilityRole="group" accessibilityLabel="Guild community" style={s.section}>
   <Text style={[s.kicker,{color:C.accentSoft}]}>COMMUNITY</Text>
   {board?<View style={s.notice}>{board}</View>:null}
   <View style={s.communityRow}>
    <Pressable accessibilityRole="button" accessibilityLabel={chatUnread>0?'Guild Chat, '+chatUnread+' unread':'Guild Chat'} onPress={onChat} style={({pressed})=>[s.communityLink,{backgroundColor:C.panel,borderColor:C.line},pressed&&s.pressed]}>
     <ThemedIcon name="chat" size={18}/><Text numberOfLines={1} style={[s.communityTitle,{color:chatUnread>0?C.notification:C.text}]}>{chatUnread>0?'Chat · '+(chatUnread>99?'99+':chatUnread):'Chat'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Guild Members" onPress={onRoster} style={({pressed})=>[s.communityLink,{backgroundColor:C.panel,borderColor:C.line},pressed&&s.pressed]}>
     <ThemedIcon name="friends" size={18}/><Text numberOfLines={1} style={[s.communityTitle,{color:C.text}]}>Members</Text>
    </Pressable>
   </View>
  </View>
  <View accessibilityRole="group" accessibilityLabel="More Guild destinations" style={s.section}>
   <Text style={[s.kicker,{color:C.muted}]}>MORE</Text>
   <View style={s.moreRow}>{more.map(item=><Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={item.action} style={({pressed})=>[s.moreLink,{borderColor:C.lineStrong,backgroundColor:C.panel},pressed&&s.pressed]}>
    <Text numberOfLines={1} style={[s.moreText,{color:C.text}]}>{item.title}</Text>
   </Pressable>)}</View>
  </View>
 </View>;
}
const s=StyleSheet.create({
 stack:{gap:14},priority:{gap:8},section:{gap:8},notice:{gap:5},
 kicker:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:.75},
 weekGrid:{flexDirection:'row',gap:8},weekCard:{flex:1,minWidth:0,minHeight:138,gap:6,padding:11,borderWidth:1,borderRadius:12},
 weekIcon:{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:9,borderWidth:1},
 weekTitle:{fontSize:13,lineHeight:18,fontWeight:'900'},weekDetail:{fontSize:10.5,lineHeight:15,flexGrow:1},
 open:{fontSize:11,lineHeight:16,fontWeight:'800'},questRow:{minHeight:58,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderRadius:10},
 flex:{flex:1,minWidth:0},rowTitle:{fontSize:13,lineHeight:18,fontWeight:'800'},rowDetail:{fontSize:10.5,lineHeight:15},
 chevron:{fontSize:22,lineHeight:25},communityRow:{flexDirection:'row',gap:8},
 communityLink:{flex:1,minWidth:0,minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingHorizontal:8,borderWidth:1,borderRadius:9},
 communityTitle:{fontSize:12,lineHeight:17,fontWeight:'800'},moreRow:{flexDirection:'row',flexWrap:'wrap',gap:7},
 moreLink:{minHeight:44,minWidth:82,flexGrow:1,alignItems:'center',justifyContent:'center',paddingHorizontal:11,borderWidth:1,borderRadius:9},
 moreText:{fontSize:11,lineHeight:16,fontWeight:'800',textAlign:'center'},pressed:{opacity:.76},
});

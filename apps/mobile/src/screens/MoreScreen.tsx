import React from 'react';
import {Image,ImageSourcePropType,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,touchTargetPreferred,typography} from '../theme/theme';
import {MessageKey,t} from '../i18n';
import {GameState} from '../core/types';

export type MoreDestination='Quests'|'Skills'|'Events'|'Friends'|'Guild'|'Settings';

const destinations:{id:MoreDestination;labelKey:MessageKey;descriptionKey:MessageKey;icon:ImageSourcePropType}[]=[
  {id:'Quests',labelKey:'more.quests',descriptionKey:'more.questsDescription',icon:require('../../assets/navigation/quests_24.png')},
  {id:'Skills',labelKey:'more.skills',descriptionKey:'more.skillsDescription',icon:require('../../assets/navigation/skills_24.png')},
  {id:'Events',labelKey:'more.events',descriptionKey:'more.eventsDescription',icon:require('../../assets/navigation/quests_24.png')},
  {id:'Friends',labelKey:'more.friends',descriptionKey:'more.friendsDescription',icon:require('../features/chat-pilot/assets/icons/add_friend.png')},
  {id:'Guild',labelKey:'more.guild',descriptionKey:'more.guildDescription',icon:require('../features/chat-pilot/assets/icons/guild.png')},
  {id:'Settings',labelKey:'more.settings',descriptionKey:'more.settingsDescription',icon:require('../../assets/navigation/settings_24.png')},
];

export function MoreScreen({language,onNavigate,onOpenChatPilot}:{language:GameState['settings']['language'];onNavigate:(destination:MoreDestination)=>void;onOpenChatPilot?:()=>void}){
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.heading}>{t(language,'nav.more')}</Text>
    <Text style={s.sub}>{t(language,'more.intro')}</Text>
    <View style={s.list}>{destinations.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={t(language,item.labelKey)} onPress={()=>onNavigate(item.id)} style={({pressed})=>[s.card,pressed&&s.pressed]}>
      <View style={s.iconFrame}><Image source={item.icon} resizeMode="contain" style={s.icon}/></View>
      <View style={s.copy}><Text style={s.title}>{t(language,item.labelKey)}</Text><Text style={s.description}>{t(language,item.descriptionKey)}</Text></View>
      <Text aria-hidden style={s.chevron}>›</Text>
    </Pressable>)}{onOpenChatPilot?<Pressable accessibilityRole="button" accessibilityLabel="Open Chat Pilot development screen" onPress={onOpenChatPilot} style={({pressed})=>[s.card,s.devCard,pressed&&s.pressed]}><View style={s.iconFrame}><Image source={require('../features/chat-pilot/assets/icons/chat.png')} resizeMode="contain" style={s.icon}/></View><View style={s.copy}><Text style={s.title}>Chat Pilot</Text><Text style={s.description}>Development-only interactive chat review</Text></View><Text aria-hidden style={s.chevron}>›</Text></Pressable>:null}</View>
  </ScrollView>;
}

const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.sm},heading:{...typography.hero,color:C.text},sub:{...typography.body,color:C.muted,marginBottom:spacing.sm},list:{gap:spacing.sm},card:{minHeight:76,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},devCard:{borderStyle:'dashed'},pressed:{opacity:.76,transform:[{translateY:1}]},iconFrame:{width:48,height:48,borderRadius:radii.md,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},icon:{width:28,height:28},copy:{flex:1,gap:2},title:{...typography.title,color:C.text},description:{...typography.body,color:C.muted},chevron:{color:C.accent,fontSize:32,lineHeight:touchTargetPreferred}});

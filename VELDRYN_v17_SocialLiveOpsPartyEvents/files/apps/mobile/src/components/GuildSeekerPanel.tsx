import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playStyleLabel, type GuildRecruitmentCard, type GuildSeekerCard } from '../core/party-social';

type Mode = 'guilds' | 'players';

export interface GuildSeekerPanelProps {
  guilds: GuildRecruitmentCard[];
  seekers: GuildSeekerCard[];
  onApply?: (guildId: string) => void;
  onInviteToGuild?: (accountId: string) => void;
  onAdvertiseSelf?: () => void;
  onEditGuildRecruitment?: () => void;
}

export function GuildSeekerPanel(props: GuildSeekerPanelProps) {
  const [mode, setMode] = useState<Mode>('guilds');
  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>GUILD RECRUITMENT</Text>
      <Text style={styles.title}>Find the Right Community</Text>
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, mode === 'guilds' && styles.active]} onPress={() => setMode('guilds')}><Text style={styles.tabText}>Guilds Recruiting</Text></Pressable>
        <Pressable style={[styles.tab, mode === 'players' && styles.active]} onPress={() => setMode('players')}><Text style={styles.tabText}>Players Seeking</Text></Pressable>
      </View>
      <ScrollView style={styles.list} nestedScrollEnabled>
        {mode === 'guilds' ? props.guilds.map((guild) => {
          const req = guild.requirements;
          const requirements = [req?.minTotalLevel ? `Total ${req.minTotalLevel}+` : '', req?.minCombatLevel ? `Combat ${req.minCombatLevel}+` : ''].filter(Boolean);
          return <View key={guild.guildId} style={styles.card}>
            <View style={styles.row}><View style={styles.flex}><Text style={styles.cardTitle}>{guild.guildName}</Text><Text style={styles.meta}>{guild.memberCount}/{guild.memberCap} · {playStyleLabel[guild.playStyle]}</Text></View>{typeof guild.compatibilityScore === 'number' && <Text style={styles.match}>{guild.compatibilityScore}%</Text>}</View>
            <Text style={styles.description}>{guild.description}</Text>
            <View style={styles.tags}>{guild.focusTags.map((tag) => <Text key={tag} style={styles.tag}>{tag.replace(/_/g, ' ')}</Text>)}</View>
            {!!guild.activeEventTags?.length && <View style={styles.eventRow}><Text style={styles.eventLabel}>Current interests:</Text>{guild.activeEventTags.map(tag=><Text key={tag} style={styles.eventTag}>{tag.replace(/_/g,' ')}</Text>)}</View>}
            {requirements.length > 0 && <Text style={styles.requirement}>Requirements · {requirements.join(' · ')}</Text>}
            <Pressable style={styles.action} onPress={() => props.onApply?.(guild.guildId)}><Text style={styles.actionText}>{req?.applicationRequired === false ? 'Request / Join' : 'Apply'}</Text></Pressable>
          </View>;
        }) : props.seekers.map((seeker) => (
          <View key={seeker.accountId} style={styles.card}>
            <Text style={styles.cardTitle}>{seeker.displayName}</Text>
            <Text style={styles.meta}>{seeker.className ?? 'Adventurer'}{seeker.combatLevel ? ` · Combat ${seeker.combatLevel}` : ''}{seeker.totalLevel ? ` · Total ${seeker.totalLevel}` : ''} · {playStyleLabel[seeker.playStyle]}</Text>
            <Text style={styles.description}>{seeker.description}</Text>
            <View style={styles.tags}>{seeker.desiredFocusTags.map((tag) => <Text key={tag} style={styles.tag}>{tag.replace(/_/g, ' ')}</Text>)}</View>
            {!!seeker.activeEventTags?.length && <View style={styles.eventRow}><Text style={styles.eventLabel}>Current interests:</Text>{seeker.activeEventTags.map(tag=><Text key={tag} style={styles.eventTag}>{tag.replace(/_/g,' ')}</Text>)}</View>}
            <Pressable style={styles.action} onPress={() => props.onInviteToGuild?.(seeker.accountId)}><Text style={styles.actionText}>Invite to Guild</Text></Pressable>
          </View>
        ))}
      </ScrollView>
      <Pressable style={styles.footerAction} onPress={mode === 'guilds' ? props.onEditGuildRecruitment : props.onAdvertiseSelf}><Text style={styles.footerText}>{mode === 'guilds' ? 'Manage Guild Recruitment' : 'Advertise Myself'}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel:{backgroundColor:'#101923',borderWidth:1,borderColor:'#34475b',borderRadius:12,padding:14,gap:9},eyebrow:{color:'#86a7c3',fontSize:11,fontWeight:'900',letterSpacing:1},title:{color:'#f0dfab',fontSize:20,fontWeight:'900'},tabs:{flexDirection:'row',gap:6},tab:{flex:1,paddingVertical:9,alignItems:'center',borderRadius:8,borderWidth:1,borderColor:'#324658',backgroundColor:'#172430'},active:{borderColor:'#c19b4d',backgroundColor:'#28251c'},tabText:{color:'#c4d2dc',fontSize:11,fontWeight:'800'},list:{maxHeight:520},card:{backgroundColor:'#15222d',borderWidth:1,borderColor:'#304352',borderRadius:9,padding:11,gap:5,marginBottom:8},row:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1},cardTitle:{color:'#e8eef2',fontSize:15,fontWeight:'900'},meta:{color:'#8ea0af',fontSize:11},match:{color:'#9ed5ad',fontWeight:'900',fontSize:11},description:{color:'#c5d0d8',fontSize:13,lineHeight:18},tags:{flexDirection:'row',gap:5,flexWrap:'wrap'},tag:{color:'#d0bf86',borderWidth:1,borderColor:'#655a38',borderRadius:6,paddingHorizontal:6,paddingVertical:3,fontSize:10,textTransform:'capitalize'},eventRow:{flexDirection:'row',flexWrap:'wrap',gap:4,alignItems:'center'},eventLabel:{color:'#8295a2',fontSize:9},eventTag:{color:'#a9d5c1',borderWidth:1,borderColor:'#416457',borderRadius:5,paddingHorizontal:5,paddingVertical:2,fontSize:9,textTransform:'capitalize'},requirement:{color:'#d5b777',fontSize:10,fontWeight:'800'},action:{alignSelf:'flex-start',backgroundColor:'#1e3b4f',borderWidth:1,borderColor:'#527f9b',borderRadius:7,paddingHorizontal:10,paddingVertical:7,marginTop:3},actionText:{color:'#daf2ff',fontWeight:'900',fontSize:12},footerAction:{backgroundColor:'#8d6b2b',borderColor:'#d0ad57',borderWidth:1,borderRadius:8,paddingVertical:10,alignItems:'center'},footerText:{color:'#fff2c8',fontWeight:'900'},
});

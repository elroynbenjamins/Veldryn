import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GuildRecruitmentCard, GuildSeekerCard, PartyContractView, PartyEventView, PartyRecruitmentCard, PartySeekerCard, PartyView } from '../core/party-social';
import { GuildSeekerPanel } from './GuildSeekerPanel';
import { PartyEventHubPanel } from './PartyEventHubPanel';
import { PartyHubPanel } from './PartyHubPanel';
import { RecruitmentBoardPanel } from './RecruitmentBoardPanel';

type SocialSection = 'party' | 'events' | 'party_find' | 'guild_find';
export interface SocialHubPanelProps {
  party: PartyView | null;
  contracts: PartyContractView[];
  activePartyEvent: PartyEventView | null;
  partyListings: PartyRecruitmentCard[];
  partySeekers: PartySeekerCard[];
  guildListings: GuildRecruitmentCard[];
  guildSeekers: GuildSeekerCard[];
  canManageParty: boolean;
  callbacks?: Record<string, (...args: any[]) => void>;
}

/** Account > Social integration. v17 deliberately creates no new bottom-navigation tab. */
export function SocialHubPanel(props: SocialHubPanelProps) {
  const [section, setSection] = useState<SocialSection>('party');
  const cb = props.callbacks ?? {};
  return <View style={styles.wrap}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
      {([['party','Party'],['events','Events'],['party_find','LFG'],['guild_find','Guilds']] as [SocialSection,string][]).map(([value,label])=><Pressable key={value} style={[styles.switch,section===value&&styles.active]} onPress={()=>setSection(value)}><Text style={styles.text}>{label}</Text>{value==='events'&&props.activePartyEvent&&<View style={styles.liveDot}/>}</Pressable>)}
    </ScrollView>
    {section==='party'&&<PartyHubPanel party={props.party} contracts={props.contracts} canManageParty={props.canManageParty} onFindParty={()=>setSection('party_find')} onOpenRecruitmentBoard={()=>setSection('party_find')} onCreateParty={cb.onCreateParty as any} onOpenPartyChat={cb.onOpenPartyChat as any} onToggleRecruitment={cb.onToggleRecruitment as any} onAcceptContract={cb.onAcceptContract as any} onClaimContract={cb.onClaimContract as any} onLeaveParty={cb.onLeaveParty as any}/>} 
    {section==='events'&&<PartyEventHubPanel event={props.activePartyEvent} onClaimPersonalMilestone={cb.onClaimPersonalMilestone as any} onClaimPartyMilestone={cb.onClaimPartyMilestone as any} onClaimRankingReward={cb.onClaimRankingReward as any} onOpenLeaderboard={cb.onOpenEventLeaderboard as any} onOpenContributionBreakdown={cb.onOpenContributionBreakdown as any} onFindParty={()=>setSection('party_find')}/>} 
    {section==='party_find'&&<RecruitmentBoardPanel parties={props.partyListings} players={props.partySeekers} onRequestJoin={cb.onRequestJoin as any} onInvitePlayer={cb.onInvitePlayer as any} onCreatePlayerPost={cb.onCreatePlayerPost as any} onCreatePartyPost={cb.onCreatePartyPost as any}/>} 
    {section==='guild_find'&&<GuildSeekerPanel guilds={props.guildListings} seekers={props.guildSeekers} onApply={cb.onApplyGuild as any} onInviteToGuild={cb.onInviteToGuild as any} onAdvertiseSelf={cb.onAdvertiseSelfForGuild as any} onEditGuildRecruitment={cb.onEditGuildRecruitment as any}/>} 
  </View>;
}
const styles=StyleSheet.create({wrap:{gap:10},switcher:{flexDirection:'row',gap:6,paddingRight:4},switch:{minWidth:78,flexDirection:'row',gap:5,justifyContent:'center',alignItems:'center',paddingHorizontal:12,paddingVertical:8,borderRadius:8,backgroundColor:'#16232e',borderWidth:1,borderColor:'#304355'},active:{backgroundColor:'#29251c',borderColor:'#bc9649'},text:{color:'#d0dbe3',fontWeight:'900',fontSize:12},liveDot:{width:6,height:6,borderRadius:3,backgroundColor:'#d5a74c'}});

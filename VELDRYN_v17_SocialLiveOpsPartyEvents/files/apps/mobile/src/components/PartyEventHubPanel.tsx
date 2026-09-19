import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { milestoneProgressPercent, nextUnreachedMilestone, type PartyEventView } from '../core/party-social';

type Tab='overview'|'milestones'|'party';
export interface PartyEventHubPanelProps {
  event: PartyEventView | null;
  onClaimPersonalMilestone?: (points:number)=>void;
  onClaimPartyMilestone?: (points:number)=>void;
  onClaimRankingReward?: ()=>void;
  onOpenLeaderboard?: ()=>void;
  onOpenContributionBreakdown?: ()=>void;
  onFindParty?: ()=>void;
}

function ProgressBar({percent}:{percent:number}){return <View style={styles.track}><View style={[styles.fill,{width:`${percent}%`}]} /></View>;}

export function PartyEventHubPanel(props:PartyEventHubPanelProps){
  const [tab,setTab]=useState<Tab>('overview');
  const event=props.event;
  const nextPersonal=useMemo(()=>event?nextUnreachedMilestone(event.personalPoints,event.personalMilestones):undefined,[event]);
  const nextParty=useMemo(()=>event?nextUnreachedMilestone(event.partyScore,event.partyMilestones):undefined,[event]);
  if(!event)return <View style={styles.panel}><Text style={styles.eyebrow}>PARTY EVENT</Text><Text style={styles.title}>No active Party Event</Text><Text style={styles.copy}>Temporary Party Events appear here when a live-ops window is active. Weekly Party Contracts continue normally.</Text></View>;
  return <View style={styles.panel}>
    <View style={styles.header}><View style={styles.flex}><Text style={styles.eyebrow}>LIVE PARTY EVENT · {event.status.toUpperCase()}</Text><Text style={styles.title}>{event.name}</Text><Text style={styles.copy}>{event.shortDescription}</Text></View>{event.partyRank&&<View style={styles.rankBadge}><Text style={styles.rankSmall}>RANK</Text><Text style={styles.rankValue}>#{event.partyRank}</Text></View>}</View>
    <View style={styles.tags}>{event.eventTags.map(tag=><Text key={tag} style={styles.tag}>{tag.replace(/_/g,' ')}</Text>)}</View>
    <View style={styles.tabs}>{(['overview','milestones','party'] as Tab[]).map(item=><Pressable key={item} onPress={()=>setTab(item)} style={[styles.tab,tab===item&&styles.tabActive]}><Text style={styles.tabText}>{item}</Text></Pressable>)}</View>
    {tab==='overview'&&<View style={styles.section}>
      <View style={styles.statRow}><View><Text style={styles.statLabel}>YOUR POINTS</Text><Text style={styles.statValue}>{event.personalPoints.toLocaleString()}</Text></View><View><Text style={styles.statLabel}>PARTY SCORE</Text><Text style={styles.statValue}>{event.partyScore.toLocaleString()}</Text></View></View>
      {nextPersonal&&<><Text style={styles.label}>Next personal milestone · {nextPersonal.points.toLocaleString()}</Text><ProgressBar percent={milestoneProgressPercent(event.personalPoints,nextPersonal.points)} /></>}
      {nextParty&&<><Text style={styles.label}>Next Party milestone · {nextParty.points.toLocaleString()}</Text><ProgressBar percent={milestoneProgressPercent(event.partyScore,nextParty.points)} /></>}
      <Text style={styles.cap}>Today: {event.personalPointsToday.toLocaleString()} / {event.personalDailyCap.toLocaleString()} credited points</Text>
      {!event.partyId&&<Pressable style={styles.primary} onPress={props.onFindParty}><Text style={styles.primaryText}>Find / Create a Party</Text></Pressable>}
      <View style={styles.actions}><Pressable style={styles.secondary} onPress={props.onOpenContributionBreakdown}><Text style={styles.secondaryText}>Contribution</Text></Pressable><Pressable style={styles.secondary} onPress={props.onOpenLeaderboard}><Text style={styles.secondaryText}>Leaderboard</Text></Pressable></View>
      {!event.rankedEligible&&event.partyId&&<Text style={styles.warning}>Party ranking qualification: {event.rankedEligibilityMissing.map(x=>x.replace(/_/g,' ')).join(' · ')}</Text>}
    </View>}
    {tab==='milestones'&&<ScrollView style={styles.scroll} nestedScrollEnabled>
      <Text style={styles.sectionTitle}>Personal</Text>{event.personalMilestones.map(m=><View key={`p${m.points}`} style={styles.milestone}><View style={styles.flex}><Text style={styles.milestoneTitle}>{m.points.toLocaleString()} points</Text><Text style={styles.milestoneState}>{m.claimed?'Claimed':m.reached?'Ready':'Locked'}</Text></View>{m.reached&&!m.claimed&&<Pressable style={styles.claim} onPress={()=>props.onClaimPersonalMilestone?.(m.points)}><Text style={styles.claimText}>Claim</Text></Pressable>}</View>)}
      <Text style={styles.sectionTitle}>Party</Text>{event.partyMilestones.map(m=><View key={`g${m.points}`} style={styles.milestone}><View style={styles.flex}><Text style={styles.milestoneTitle}>{m.points.toLocaleString()} Party points</Text><Text style={styles.milestoneState}>{m.claimed?'Claimed':m.reached?'Ready':'Locked'}</Text></View>{m.reached&&!m.claimed&&<Pressable style={styles.claim} onPress={()=>props.onClaimPartyMilestone?.(m.points)}><Text style={styles.claimText}>Claim</Text></Pressable>}</View>)}
      {event.status==='finalized'&&<Pressable style={styles.primary} onPress={props.onClaimRankingReward}><Text style={styles.primaryText}>Claim Final Ranking Reward</Text></Pressable>}
    </ScrollView>}
    {tab==='party'&&<View style={styles.section}><Text style={styles.sectionTitle}>{event.partyName??'Current Party'}</Text>{event.members.map(member=><View key={member.accountId} style={styles.member}><View style={styles.flex}><Text style={styles.memberName}>{member.displayName}</Text><Text style={styles.memberMeta}>{member.rewardEligible?'Reward eligible':'Needs more contribution'}{member.meaningful?' · Meaningful contributor':''}</Text></View><Text style={styles.memberPoints}>{member.points.toLocaleString()}</Text></View>)}<Text style={styles.hint}>Once you reach the event binding threshold for a Party, switching Parties cannot move your ranking contribution to a second Party during the same event.</Text></View>}
  </View>;
}

const styles=StyleSheet.create({
  panel:{backgroundColor:'#0f1822',borderWidth:1,borderColor:'#394d5f',borderRadius:12,padding:13,gap:9},header:{flexDirection:'row',gap:10},flex:{flex:1},eyebrow:{color:'#88a8bd',fontSize:10,fontWeight:'900',letterSpacing:1},title:{color:'#f1dfa8',fontSize:21,fontWeight:'900'},copy:{color:'#b9c6cf',fontSize:12,lineHeight:17},rankBadge:{minWidth:58,alignItems:'center',justifyContent:'center',backgroundColor:'#27241b',borderColor:'#9d7e3f',borderWidth:1,borderRadius:8,padding:6},rankSmall:{color:'#9e8b5b',fontSize:9,fontWeight:'900'},rankValue:{color:'#f0d58d',fontSize:19,fontWeight:'900'},
  tags:{flexDirection:'row',flexWrap:'wrap',gap:5},tag:{color:'#d1c089',borderColor:'#675a37',borderWidth:1,borderRadius:5,paddingHorizontal:6,paddingVertical:2,fontSize:9,textTransform:'capitalize'},tabs:{flexDirection:'row',gap:5},tab:{flex:1,alignItems:'center',paddingVertical:8,backgroundColor:'#16242f',borderColor:'#304656',borderWidth:1,borderRadius:7},tabActive:{backgroundColor:'#2a261d',borderColor:'#bd9648'},tabText:{color:'#c7d2d9',fontSize:10,fontWeight:'900',textTransform:'capitalize'},section:{gap:8},statRow:{flexDirection:'row',justifyContent:'space-between',backgroundColor:'#15232e',padding:10,borderRadius:8},statLabel:{color:'#8398a7',fontSize:9,fontWeight:'900'},statValue:{color:'#edf2f4',fontSize:20,fontWeight:'900'},label:{color:'#b7c6d0',fontSize:11,fontWeight:'800'},track:{height:8,backgroundColor:'#22313d',borderRadius:4,overflow:'hidden',borderWidth:1,borderColor:'#344b5b'},fill:{height:'100%',backgroundColor:'#9b7b3c'},cap:{color:'#8799a6',fontSize:10},actions:{flexDirection:'row',gap:7},primary:{backgroundColor:'#8f6d2d',borderColor:'#cfab55',borderWidth:1,borderRadius:8,paddingVertical:9,paddingHorizontal:10,alignItems:'center'},primaryText:{color:'#fff1c3',fontWeight:'900',fontSize:12},secondary:{flex:1,backgroundColor:'#1b3446',borderColor:'#4f7993',borderWidth:1,borderRadius:8,paddingVertical:8,alignItems:'center'},secondaryText:{color:'#d8edf8',fontWeight:'900',fontSize:11},warning:{color:'#d8b77e',fontSize:10,lineHeight:14},scroll:{maxHeight:440},sectionTitle:{color:'#c9b574',fontSize:12,fontWeight:'900',marginTop:4},milestone:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#253743'},milestoneTitle:{color:'#e4eaee',fontWeight:'900'},milestoneState:{color:'#8396a3',fontSize:10},claim:{backgroundColor:'#294331',borderColor:'#57805f',borderWidth:1,borderRadius:6,paddingHorizontal:10,paddingVertical:6},claimText:{color:'#d8efdc',fontWeight:'900',fontSize:10},member:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#243440'},memberName:{color:'#e6edf0',fontWeight:'900'},memberMeta:{color:'#8498a6',fontSize:10},memberPoints:{color:'#ead79d',fontWeight:'900'},hint:{color:'#8194a2',fontSize:10,lineHeight:14},
});

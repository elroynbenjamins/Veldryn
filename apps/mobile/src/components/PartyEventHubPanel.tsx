import {useSocialText} from '../i18n/social';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { milestoneProgressPercent, nextUnreachedMilestone, type PartyEventView } from '../core/party-social';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

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

function ProgressBar({percent}:{percent:number}){const C=useGameTheme(),styles=useMemo(()=>makeStyles(C),[C]);return <View style={styles.track}><View style={[styles.fill,{width:`${percent}%`}]} /></View>;}

export function PartyEventHubPanel(props:PartyEventHubPanelProps){
 const st=useSocialText();
  const C=useGameTheme(),styles=useMemo(()=>makeStyles(C),[C]);
  const [tab,setTab]=useState<Tab>('overview');
  const event=props.event;
  const nextPersonal=useMemo(()=>event?nextUnreachedMilestone(event.personalPoints,event.personalMilestones):undefined,[event]);
  const nextParty=useMemo(()=>event?nextUnreachedMilestone(event.partyScore,event.partyMilestones):undefined,[event]);
  if(!event)return <View style={styles.panel}><Text style={styles.eyebrow}>{st("PARTY EVENT")}</Text><Text style={styles.title}>{st("No active Party Event")}</Text><Text style={styles.copy}>Temporary Party Events appear here when a live-ops window is active. Weekly Party Contracts continue normally.</Text></View>;
  return <View style={styles.panel}>
    <View style={styles.header}><View style={styles.flex}><Text style={styles.eyebrow}>LIVE PARTY EVENT · {event.status.toUpperCase()}</Text><Text style={styles.title}>{event.name}</Text><Text style={styles.copy}>{event.shortDescription}</Text></View>{event.partyRank&&<View style={styles.rankBadge}><Text style={styles.rankSmall}>{st("RANK")}</Text><Text style={styles.rankValue}>#{event.partyRank}</Text></View>}</View>
    <View style={styles.tags}>{event.eventTags.map(tag=><Text key={tag} style={styles.tag}>{tag.replace(/_/g,' ')}</Text>)}</View>
    <View style={styles.tabs}>{(['overview','milestones','party'] as Tab[]).map(item=><Pressable key={item} onPress={()=>setTab(item)} style={[styles.tab,tab===item&&styles.tabActive]}><Text style={styles.tabText}>{item}</Text></Pressable>)}</View>
    {tab==='overview'&&<View style={styles.section}>
      <View style={styles.statRow}><View><Text style={styles.statLabel}>{st("YOUR POINTS")}</Text><Text style={styles.statValue}>{event.personalPoints.toLocaleString()}</Text></View><View><Text style={styles.statLabel}>{st("PARTY SCORE")}</Text><Text style={styles.statValue}>{event.partyScore.toLocaleString()}</Text></View></View>
      {nextPersonal&&<><Text style={styles.label}>Next personal milestone · {nextPersonal.points.toLocaleString()}</Text><ProgressBar percent={milestoneProgressPercent(event.personalPoints,nextPersonal.points)} /></>}
      {nextParty&&<><Text style={styles.label}>Next Party milestone · {nextParty.points.toLocaleString()}</Text><ProgressBar percent={milestoneProgressPercent(event.partyScore,nextParty.points)} /></>}
      <Text style={styles.cap}>Today: {event.personalPointsToday.toLocaleString()} / {event.personalDailyCap.toLocaleString()} credited points</Text>
      {!event.partyId&&props.onFindParty&&<Pressable style={styles.primary} onPress={props.onFindParty}><Text style={styles.primaryText}>{st("Find / Create a Party")}</Text></Pressable>}
      {props.onOpenContributionBreakdown||props.onOpenLeaderboard?<View style={styles.actions}>{props.onOpenContributionBreakdown?<Pressable style={styles.secondary} onPress={props.onOpenContributionBreakdown}><Text style={styles.secondaryText}>{st("Contribution")}</Text></Pressable>:null}{props.onOpenLeaderboard?<Pressable style={styles.secondary} onPress={props.onOpenLeaderboard}><Text style={styles.secondaryText}>{st("Leaderboard")}</Text></Pressable>:null}</View>:null}
      {!event.rankedEligible&&event.partyId&&<View style={styles.warningCard}><Text style={styles.warningLabel}>{st("RANKING QUALIFICATION")}</Text><Text style={styles.warning}>Party ranking qualification: {event.rankedEligibilityMissing.map(x=>x.replace(/_/g,' ')).join(' · ')}</Text></View>}
    </View>}
    {tab==='milestones'&&<ScrollView style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{st("Personal")}</Text>{event.personalMilestones.map(m=><View key={`p${m.points}`} style={styles.milestone}><View style={styles.flex}><Text style={styles.milestoneTitle}>{m.points.toLocaleString()} points</Text><Text style={[styles.milestoneState,m.claimed?styles.claimedState:m.reached?styles.readyState:null]}>{m.claimed?st("Claimed"):m.reached?st("Ready"):st("Locked")}</Text></View>{m.reached&&!m.claimed&&props.onClaimPersonalMilestone&&<Pressable style={styles.claim} onPress={()=>props.onClaimPersonalMilestone?.(m.points)}><Text style={styles.claimText}>{st("Claim")}</Text></Pressable>}</View>)}
      <Text style={styles.sectionTitle}>{st("Party")}</Text>{event.partyMilestones.map(m=><View key={`g${m.points}`} style={styles.milestone}><View style={styles.flex}><Text style={styles.milestoneTitle}>{m.points.toLocaleString()} {st("Party points")}</Text><Text style={[styles.milestoneState,m.claimed?styles.claimedState:m.reached?styles.readyState:null]}>{m.claimed?st("Claimed"):m.reached?st("Ready"):st("Locked")}</Text></View>{m.reached&&!m.claimed&&props.onClaimPartyMilestone&&<Pressable style={styles.claim} onPress={()=>props.onClaimPartyMilestone?.(m.points)}><Text style={styles.claimText}>{st("Claim")}</Text></Pressable>}</View>)}
      {event.status==='finalized'&&props.onClaimRankingReward&&<Pressable style={styles.primary} onPress={props.onClaimRankingReward}><Text style={styles.primaryText}>{st("Claim Final Ranking Reward")}</Text></Pressable>}
    </ScrollView>}
    {tab==='party'&&<View style={styles.section}><Text style={styles.sectionTitle}>{event.partyName??'Current Party'}</Text>{event.members.map(member=><View key={member.accountId} style={styles.member}><View style={styles.flex}><Text style={styles.memberName}>{member.displayName}</Text><Text style={styles.memberMeta}>{member.rewardEligible?st("Reward eligible"):st("Needs more contribution")}{member.meaningful?' · Meaningful contributor':''}</Text></View><Text style={styles.memberPoints}>{member.points.toLocaleString()}</Text></View>)}<Text style={styles.hint}>Once you reach the event binding threshold for a Party, switching Parties cannot move your ranking contribution to a second Party during the same event.</Text></View>}
  </View>;
}

function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
  panel:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,padding:spacing.md,gap:10},
  header:{flexDirection:'row',gap:10},flex:{flex:1,minWidth:0},
  eyebrow:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:1},
  title:{...typography.hero,color:E.goldSoft},
  copy:{...typography.body,color:C.muted,lineHeight:19},
  rankBadge:{minWidth:62,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderColor:E.goldSoft,borderWidth:1,borderRadius:8,padding:7},
  rankSmall:{...typography.caption,color:C.muted,fontWeight:'900'},
  rankValue:{fontSize:20,lineHeight:24,color:E.goldSoft,fontWeight:'900'},
  tags:{flexDirection:'row',flexWrap:'wrap',gap:6},
  tag:{color:C.muted,borderColor:C.line,borderWidth:1,borderRadius:99,paddingHorizontal:10,paddingVertical:4,fontSize:11,textTransform:'capitalize',fontWeight:'700',backgroundColor:C.panel2},
  tabs:{flexDirection:'row',gap:6},
  tab:{flex:1,alignItems:'center',paddingVertical:10,backgroundColor:C.panel2,borderColor:C.line,borderWidth:1,borderRadius:99},
  tabActive:{backgroundColor:C.selection,borderColor:C.selectionLine},
  tabText:{...typography.caption,color:C.muted,fontWeight:'900',textTransform:'capitalize'},
  section:{gap:10},
  statRow:{flexDirection:'row',justifyContent:'space-between',backgroundColor:C.panel2,padding:12,borderRadius:8,gap:12},
  statLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},
  statValue:{fontSize:20,lineHeight:24,color:C.text,fontWeight:'900'},
  label:{fontSize:12,lineHeight:17,color:C.text,fontWeight:'800'},
  track:{height:8,backgroundColor:C.bg,borderRadius:4,overflow:'hidden',borderWidth:1,borderColor:C.line},
  fill:{height:'100%',backgroundColor:C.accent},
  cap:{fontSize:11,lineHeight:15,color:C.muted},
  actions:{flexDirection:'row',gap:8},
  primary:{backgroundColor:C.primaryButton,borderColor:C.primaryButton,borderWidth:1,borderRadius:8,paddingVertical:10,paddingHorizontal:12,alignItems:'center'},
  primaryText:{color:C.primaryButtonText,fontWeight:'900',fontSize:12},
  secondary:{flex:1,backgroundColor:C.panel2,borderColor:C.line,borderWidth:1,borderRadius:8,paddingVertical:10,alignItems:'center'},
  secondaryText:{color:C.text,fontWeight:'900',fontSize:12},
  warningCard:{gap:4,padding:10,borderWidth:1,borderColor:C.warning,borderRadius:8,backgroundColor:C.warningSurface},
  warningLabel:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:1},
  warning:{fontSize:12,lineHeight:17,color:C.text},
  scroll:{maxHeight:440},
  sectionTitle:{...typography.title,color:C.text,marginTop:4},
  milestone:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.line},
  milestoneTitle:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  milestoneState:{fontSize:11,color:C.muted,fontWeight:'800'},
  readyState:{color:C.good,fontWeight:'900'},
  claimedState:{color:C.accent,fontWeight:'900'},
  claim:{backgroundColor:C.goodSurface,borderColor:C.good,borderWidth:1,borderRadius:6,paddingHorizontal:12,paddingVertical:7},
  claimText:{color:C.good,fontWeight:'900',fontSize:11},
  member:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},
  memberName:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  memberMeta:{fontSize:11,color:C.muted},
  memberPoints:{color:E.goldSoft,fontWeight:'900',fontSize:14},
  hint:{fontSize:11,lineHeight:16,color:C.muted},
});}

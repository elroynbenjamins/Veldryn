import {useSocialText,socialLabel} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {SectionGuide} from './SectionGuide';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {RecruitmentListing} from './RecruitmentListing';
import {GameButton} from './GameButton';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import React from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {
  EMPTY_RECRUITMENT_FILTERS,
  contractProgressRatio,
  filterRecruitmentCards,
  partyOpenSpots,
  personalContributionEligible,
  normalizedPartyPreferences,
  partyActivityLabel,
  PARTY_LANGUAGES,
  type PartyContractView,
  type PersistentPartySummary,
  type RecruitmentCardView,
  type RecruitmentClientFilters,
  type RecruitmentPostType,
} from '../core/party-social';
import {RecruitmentFiltersPanel} from './RecruitmentFiltersPanel';
import {partyMemberManagement} from '../core/social-management';
import {PartyWeeklyLadder} from './PartyWeeklyLadder';
import {PartyContractContributions} from './PartyContractContributions';
import {partyContractClaimableRewardIds} from '../core/party-social';
import {usePartyProgressUiText} from '../i18n/party-progress-ui';
import {germanPartySurfaceText,partyMinimumLevelLabel} from '../i18n/party-surface-de';
import {PARTY_UNLOCK_LEVEL} from '../core/feature-unlocks';

export interface PartyHubPanelProps {
  accountId: string;
  party: PersistentPartySummary | null;
  contracts: PartyContractView[];
  recruitment: RecruitmentCardView[];
  nowMs: number;
  onCreateParty?: () => void;
  onEditPreferences?: () => void;
  onLeaveParty?: () => void;
  onDisbandParty?: () => void;
  onOpenMemberProfile?: (member:PersistentPartySummary['members'][number]) => void;
  onTransferLeadership?: (member:PersistentPartySummary['members'][number]) => void;
  onRemoveMember?: (member:PersistentPartySummary['members'][number]) => void;
  onOpenRecruitmentPost?: (postId: string) => void;
  onCreateRecruitmentPost?: (postType: RecruitmentPostType) => void;
  filters?: RecruitmentClientFilters;
  onFiltersChange?: (filters:RecruitmentClientFilters)=>void;
  onClaimReward?: (id:string)=>void;
  recruitmentMode?: 'looking_for_party'|'party_recruiting';
  recruitmentPreferences?: React.ReactNode;
  ownedAdverts?: React.ReactNode;
  recruitmentDetails?: React.ReactNode;
  partyExtras?: React.ReactNode;
  partyInvitations?: React.ReactNode;
  invitationCount?: number;
  dedicated?:boolean;
  activeView?:'Overview'|'Contracts';
  onOpenRecruitment?:()=>void;
  onInviteFriends?:()=>void;
  partyUnlocked?: boolean;
  partyUnlockLevel?: number;
}

/** A locked Party shows only the unlock message, never hidden recruitment actions. */
export function PartyLockedNotice({level=PARTY_UNLOCK_LEVEL}:{level?:number}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]),st=useSocialText();
 return <View style={s.locked}>
   <View style={s.lockMark}><Text style={s.lockIcon}>◇</Text></View>
   <Text style={s.lockTitle}>{st('Party locked')}</Text>
   <Text style={s.muted}>{st('Parties unlock at Level {level}',{level})}</Text>
   <Text style={s.muted}>{st('Reach Level {level} to create or join a Party.',{level})}</Text>
 </View>;
}

export function PartyHubPanel(props: PartyHubPanelProps){
 const st=useSocialText(),pt=usePartyProgressUiText(),language=useGameLanguage(),C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 const {height:windowHeight,width:windowWidth,fontScale}=useWindowDimensions();
 const narrow=windowWidth<360||fontScale>=1.3;
 const [localFilters,setLocalFilters]=React.useState<RecruitmentClientFilters>(EMPTY_RECRUITMENT_FILTERS);
 const [section,setSection]=React.useState<'party'|'find'>(props.party?'party':'find');
 const [showSettings,setShowSettings]=React.useState(false);
 const [selectedMember,setSelectedMember]=React.useState<PersistentPartySummary['members'][number]|null>(null);
 const [expandedContracts,setExpandedContracts]=React.useState<string[]>([]);
 const [browseMode,setBrowseMode]=React.useState<'parties'|'players'>(props.recruitmentMode==='looking_for_party'?'players':'parties');
 React.useEffect(()=>{setSection(props.party?'party':'find');setShowSettings(false);setSelectedMember(null);setExpandedContracts([]);},[props.party?.id,props.accountId]);
 React.useEffect(()=>{if(selectedMember&&!props.party?.members.some(member=>member.accountId===selectedMember.accountId))setSelectedMember(null);},[props.party?.members,selectedMember]);
 const filters=props.filters??localFilters;
 const setFilters=(next:React.SetStateAction<RecruitmentClientFilters>)=>{
  const updated=typeof next==='function'?next(filters):next;
  setLocalFilters(updated);props.onFiltersChange?.(updated);
 };
 const cards=React.useMemo(()=>filterRecruitmentCards(props.recruitment,{...filters,postTypes:[browseMode==='parties'?'party_recruiting':'looking_for_party']},props.nowMs),[props.recruitment,filters,props.nowMs,browseMode]);
 const inParty=!!props.party,canManageParty=!!props.party?.members.some(member=>member.accountId===props.accountId&&member.isLeader);
 const openSpots=props.party?partyOpenSpots(props.party):0;
 const readyContractRewards=props.party?partyContractClaimableRewardIds(props.contracts).length:0;
 const focusedMember=selectedMember&&props.party?.members.find(member=>member.accountId===selectedMember.accountId);
 const permissions=focusedMember?partyMemberManagement(canManageParty,props.accountId,focusedMember.accountId):null;
 const title=props.party?st('My Party'):st('Find or Create a Party');
 const preferences=normalizedPartyPreferences(props.party),languageLabel=PARTY_LANGUAGES.find(row=>row.id===preferences.language)?.label??st('Any language');
 if(!inParty&&props.partyUnlocked===false)return <View style={s.content}><PartyLockedNotice level={props.partyUnlockLevel}/></View>;
 return <View style={s.content}>
  <View style={s.heading}>
   <View style={s.flex}><Text style={s.eyebrow}>{st('PARTY HUB')}</Text><Text accessibilityRole="header" style={s.heroTitle}>{title}</Text>
    <Text style={s.muted}>{inParty?st('Your team, weekly progress and rewards.'):st('Play together. Earn rewards.')}</Text>
   </View>
   {inParty?<View style={s.memberCount}><Text style={s.memberCountValue}>{props.party!.members.length}/4</Text><Text style={s.memberCountLabel}>{st('Members')}</Text></View>:null}
  </View>

  <SectionGuide scope={props.accountId} area="social-party" section={inParty?section:'solo'} translate={value=>socialLabel(language,germanPartySurfaceText(language,value))} guide={inParty&&section==='party'?
     {title:'My Party',body:'Your members and weekly rewards are here. Claim ready rewards without opening extra menus.',detail:'Use Party options for invitations or to leave. Open Recruitment to find new members.'}:
     inParty?{title:'Recruitment',body:'Find players or publish an advert for your Party here.',detail:'Search and filters narrow the list. Your adverts and matching players appear below.'}:
     {title:'Find or create a Party',body:'Create or find a Party.',detail:'Create a Party or post in Recruitment.'}} header={inParty&&!props.dedicated?<View accessibilityRole="tablist" style={s.browseTabs}><BrowseChip label={st('My Party')} selected={section==='party'} onPress={()=>setSection('party')}/><BrowseChip label={st('Recruitment')} selected={section==='find'} onPress={()=>setSection('find')}/></View>:undefined} showReplay={false}/>
  {inParty&&section==='party'?<>
   {(!props.dedicated||props.activeView!=='Contracts')?<View style={s.summaryCard}>
    <View style={s.between}><View style={s.flex}><Text style={s.eyebrow}>{st('ACTIVE PARTY')}</Text><Text style={s.sectionTitle}>{socialLabel(language,partyActivityLabel(preferences.activityLevel))} {st('Party')}</Text></View>
      <Text style={[s.statusPill,openSpots===0?s.fullPill:s.openPill]}>{openSpots>0?st('{count} open spots',{count:openSpots}):st('Full')}</Text></View>
    <View style={[s.actions,narrow&&s.actionsStack]}>{canManageParty&&openSpots>0?<View style={[s.actionFlex,narrow&&s.actionFlexNarrow]}><GameButton compact title={st('Find members')} onPress={()=>props.dedicated?props.onOpenRecruitment?.():(setBrowseMode('players'),setSection('find'))}/></View>:null}
      <View style={[s.actionFlex,narrow&&s.actionFlexNarrow]}><GameButton compact tone="secondary" title={props.invitationCount?st('Party options · {count}',{count:props.invitationCount}):st('Party options')} onPress={()=>setShowSettings(true)}/></View></View>
   </View>:null}
   {(!props.dedicated||props.activeView!=='Contracts')?<View style={s.panel}>
    <View style={s.between}><Text style={s.sectionTitle}>{st('PARTY MEMBERS')}</Text><Text style={s.metaCount}>{props.party!.members.length}/4</Text></View>
    <View style={s.members}>{props.party!.members.map(member=>{
     const manage=partyMemberManagement(canManageParty,props.accountId,member.accountId);
     const canOpenManagement=manage.canTransfer&&!!props.onTransferLeadership||manage.canRemove&&!!props.onRemoveMember;
     return <View key={member.accountId} style={s.memberRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={st('Open {name} profile',{name:member.characterName})} disabled={!props.onOpenMemberProfile} onPress={()=>props.onOpenMemberProfile?.(member)} style={({pressed})=>[s.memberIdentity,pressed&&s.pressed]}>
       <CompactPlayerIdentity accountId={member.accountId} badges={member.playerBadges} name={member.characterName} className={member.className} status={member.isLeader?st('PARTY LEADER'):socialLabel(language,member.role).toLocaleUpperCase(language)} statusTone={member.isLeader?'accent':'info'} hint={props.onOpenMemberProfile?st('VIEW PROFILE ›'):undefined}/>
      </Pressable>
      {canOpenManagement?<Pressable accessibilityRole="button" accessibilityLabel={st('Manage {name}',{name:member.characterName})} onPress={()=>setSelectedMember(member)} style={({pressed})=>[s.iconAction,pressed&&s.pressed]}><Text style={s.iconActionText}>•••</Text></Pressable>:null}
     </View>;
    })}</View>
    {openSpots>0?<Pressable accessibilityRole="button" accessibilityLabel={st('Find members')} onPress={()=>{if(props.dedicated){props.onOpenRecruitment?.();}else{setBrowseMode('players');setSection('find');}}} style={({pressed})=>[s.emptySlots,pressed&&s.pressed]}>
     <Text style={s.emptyPlus}>+</Text><Text style={[s.muted,s.flex]}>{st('{count} available party slots',{count:openSpots})}</Text><Text style={s.link}>{st('Recruit')} ›</Text>
    </Pressable>:null}
    {canManageParty&&openSpots>0&&props.onInviteFriends?<GameButton compact tone="secondary" title={st("Invite friends privately")} onPress={()=>props.onInviteFriends?.()}/>:null}
   </View>:null}
   {(!props.dedicated||props.activeView==='Contracts')?<View style={s.panel}>
    <View style={s.between}><View style={s.flex}><Text style={s.sectionTitle}>{st('PARTY CONTRACTS')}</Text><Text style={s.muted}>{st('Progress and rewards')}</Text></View><Text style={readyContractRewards?s.good:s.metaCount}>{readyContractRewards?pt('{count} rewards ready',{count:readyContractRewards}):props.contracts.length}</Text></View>
    {props.contracts.map(contract=><View key={contract.id} style={s.contractOverview}>
      {contract.tiers?.length?<><PartyWeeklyLadder compact={!expandedContracts.includes(contract.id)} contract={contract} nowMs={props.nowMs} onClaimReward={props.onClaimReward}/>
       {contract.minimumPersonalPoints!==undefined?<View style={s.contributionRow}><Text style={s.muted}>{st('Your contribution')}</Text><Text style={personalContributionEligible(contract)?s.good:s.warning}>{(contract.personalPoints??0).toLocaleString(language)} / {contract.minimumPersonalPoints.toLocaleString(language)}{personalContributionEligible(contract)?' ✓':''}</Text></View>:null}
       <GameButton compact tone="secondary" title={expandedContracts.includes(contract.id)?st('Hide reward details'):st('View reward details')} onPress={()=>setExpandedContracts(items=>items.includes(contract.id)?items.filter(id=>id!==contract.id):[...items,contract.id])}/></>:
       <ContractCard contract={contract} nowMs={props.nowMs}/>}
      <PartyContractContributions contract={contract} party={props.party!} accountId={props.accountId}/>
      {!contract.tiers?.length?contract.rewards?.map(reward=><GameButton key={reward.id} compact title={reward.claimed?st('Reward claimed'):st('Claim {gold} Gold',{gold:reward.reward.gold})} disabled={reward.claimed||!props.onClaimReward} onPress={()=>props.onClaimReward?.(reward.id)}/>):null}
    </View>)}
    {!props.contracts.length&&<Text style={s.muted}>{germanPartySurfaceText(language,"No active weekly contract.")}</Text>}
   </View>:null}
   {(!props.dedicated||props.activeView!=='Contracts')?props.partyExtras:null}
  </>:null}
  {!inParty?<View style={s.panel}>
   <View style={s.between}><View style={s.flex}><Text style={s.eyebrow}>{st('START A TEAM')}</Text><Text style={s.sectionTitle}>{st('Create a Party')}</Text></View><Text style={s.statusPill}>{st('Up to 4')}</Text></View>
   <Text style={s.muted}>{st('Choose activity, language and minimum level.')}</Text>
   {!props.dedicated?props.recruitmentPreferences:null}
   <GameButton title={st('Create Party')} disabled={!props.onCreateParty} onPress={()=>props.onCreateParty?.()}/>
   {props.dedicated?<GameButton tone="secondary" title={germanPartySurfaceText(language,"Find a Party")} onPress={()=>props.onOpenRecruitment?.()}/>:null}
  </View>:null}
  {!props.dedicated&&(section==='find'||!inParty)&&<View style={s.recruitPanel}>
   <View style={s.between}><View style={s.flex}><Text style={s.sectionTitle}>{st('Recruitment')}</Text><Text style={s.muted}>{inParty?st('Discover available players and recruiting teams.'):st('Browse recruiting parties or advertise yourself.')}</Text></View><Text style={s.metaCount}>{cards.length}</Text></View>
   {inParty?props.recruitmentPreferences:null}
   {props.recruitmentDetails}
   <View accessibilityRole="tablist" style={s.browseTabs}><BrowseChip label={st('Parties recruiting')} selected={browseMode==='parties'} onPress={()=>setBrowseMode('parties')}/><BrowseChip label={st('Players seeking')} selected={browseMode==='players'} onPress={()=>setBrowseMode('players')}/></View>
   {browseMode==='players'&&!inParty?<GameButton compact tone="secondary" title={st('Post my LFG')} disabled={!props.onCreateRecruitmentPost} onPress={()=>props.onCreateRecruitmentPost?.('looking_for_party')}/>:null}
   {browseMode==='parties'&&canManageParty?<GameButton compact tone="secondary" title={st('Post Party LFM')} disabled={!props.onCreateRecruitmentPost} onPress={()=>props.onCreateRecruitmentPost?.('party_recruiting')}/>:null}
   <RecruitmentFiltersPanel value={filters} onChange={setFilters} hidePostType partyMode/>
   <View style={s.resultsHead}><Text style={s.eyebrow}>{st('AVAILABLE ADVERTS')}</Text><Text style={s.muted}>{st('{count} results',{count:cards.length})}</Text></View>
   {cards.map(card=><RecruitmentListing key={card.id} card={card} nowMs={props.nowMs} onPress={()=>props.onOpenRecruitmentPost?.(card.id)}/>)}
   {!cards.length?<View style={s.emptyState}><Text style={s.emptyTitle}>{st('No matching adverts.')}</Text><Text style={s.muted}>{st('Try different filters, or post your own advert.')}</Text></View>:null}
   {props.ownedAdverts}
  </View>}
  <GameModalSurface visible={showSettings&&inParty} presentation="sheet" onClose={()=>setShowSettings(false)} surfaceStyle={{maxHeight:windowHeight*.90}}>
   <GameModalHeader eyebrow={st('ACTIVE PARTY')} title={st('Party options')} onClose={()=>setShowSettings(false)}/>
   <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalBody}>
    <View style={s.optionSummary}><Text style={s.sectionTitle}>{socialLabel(language,props.party?.focus??'mixed')} {st('Party')}</Text><Text style={s.muted}>{props.party?.members.length??0}/4 {st('Members')} · {openSpots} {st('open spots')}</Text><Text style={s.muted}>{socialLabel(language,partyActivityLabel(preferences.activityLevel))} · {languageLabel}{preferences.minimumLevel?' · '+partyMinimumLevelLabel(language,preferences.minimumLevel):''}</Text></View>
    {(props.invitationCount??0)>0?props.partyInvitations:<Text style={s.muted}>{st('No pending invitations.')}</Text>}
    {canManageParty&&openSpots>0?<GameButton compact tone="secondary" title={st('Find members')} onPress={()=>{setShowSettings(false);if(props.dedicated)props.onOpenRecruitment?.();else{setBrowseMode('players');setSection('find');}}}/>:null}

    {canManageParty&&props.onEditPreferences?<GameButton compact tone="secondary" title={germanPartySurfaceText(language,"Edit Party preferences")} onPress={()=>{setShowSettings(false);props.onEditPreferences?.()}}/>:null}
    <View style={s.divider}/><Text style={s.eyebrow}>{st('PARTY MANAGEMENT')}</Text>
    <GameButton tone="secondary" title={st('Leave Party')} disabled={!props.onLeaveParty} onPress={()=>{setShowSettings(false);props.onLeaveParty?.();}}/>
    {canManageParty&&props.party!.members.length>1?<GameButton tone="danger" title={st('Disband Party')} disabled={!props.onDisbandParty} onPress={()=>{setShowSettings(false);props.onDisbandParty?.();}}/>:null}
    <Text style={s.muted}>{st('Leaving or disbanding requires confirmation.')}</Text>
   </ScrollView>
  </GameModalSurface>
  <GameModalSurface visible={!!focusedMember&&inParty} presentation="dialog" onClose={()=>setSelectedMember(null)}>
   <GameModalHeader eyebrow={st('PARTY MEMBERS')} title={st('Manage member')} onClose={()=>setSelectedMember(null)}/>
   {focusedMember?<View style={s.modalBody}>
     <CompactPlayerIdentity accountId={focusedMember.accountId} badges={focusedMember.playerBadges} name={focusedMember.characterName} className={focusedMember.className} status={socialLabel(language,focusedMember.role).toLocaleUpperCase(language)} statusTone="info"/>
     <View style={s.divider}/>
     {permissions?.canTransfer?<GameButton tone="secondary" title={st('Transfer leadership')} disabled={!props.onTransferLeadership} onPress={()=>{setSelectedMember(null);props.onTransferLeadership?.(focusedMember);}}/>:null}
     {permissions?.canRemove?<GameButton tone="danger" title={st('Remove member')} disabled={!props.onRemoveMember} onPress={()=>{setSelectedMember(null);props.onRemoveMember?.(focusedMember);}}/>:null}
     <GameButton compact tone="secondary" title={st('Cancel')} onPress={()=>setSelectedMember(null)}/>
    </View>:null}
  </GameModalSurface>
 </View>;
}

function BrowseChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.browseChip,selected&&s.browseChipSelected,pressed&&s.pressed]}><Text numberOfLines={2} style={[s.browseText,selected&&s.browseTextSelected]}>{label}</Text></Pressable>;
}
function ContractCard({contract,nowMs}:{contract:PartyContractView;nowMs:number}){
 const st=useSocialText(),language=useGameLanguage(),C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 const ratio=contractProgressRatio(contract),eligible=personalContributionEligible(contract);
 const deadline=contract.endsAtMs??(contract.expiresAt?Date.parse(contract.expiresAt):nowMs);
 const hours=Math.max(0,Math.ceil((deadline-nowMs)/3600000));
 return <View style={s.contractCard}>
  <View style={s.between}><Text style={[s.itemTitle,s.flex]}>{contract.name}</Text><Text style={s.eyebrow}>{socialLabel(language,contract.category??contract.focus??'mixed').toLocaleUpperCase(language)}</Text></View>
  <Text style={s.muted}>{contract.cadence==='weekly'?st('Weekly Contract'):st('Ranked Mini-Event')} · {st('{count}h left',{count:hours})}</Text>
  <View style={s.progressTrack}><View style={[s.progressFill,{width:Math.round(ratio*100)+'%'}]}/></View>
  <Text style={s.muted}>{contract.totalPoints.toLocaleString(language)} / {contract.targetPoints.toLocaleString(language)} {st('points')}</Text>
  <Text style={eligible?s.good:s.warning}>{st('Your contribution')}: {contract.personalPoints??0} / {contract.minimumPersonalPoints??0} {eligible?'✓':''}</Text>
  {(contract.objectives??[]).map(objective=><Text key={objective.id} style={s.muted}>• {objective.label}: {objective.progressUnits}/{objective.targetUnits}</Text>)}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 content:{padding:0,gap:12,paddingBottom:28},flex:{flex:1,minWidth:0},
 heading:{minHeight:64,flexDirection:'row',gap:10,alignItems:'center',justifyContent:'space-between'},
 heroTitle:{...typography.title,color:C.text,fontSize:23,lineHeight:29},eyebrow:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:.9,color:C.accent},muted:{color:C.muted,fontSize:12,lineHeight:17},sectionTitle:{...typography.bodyStrong,color:C.text,fontSize:15,lineHeight:21,fontWeight:'800'},itemTitle:{fontSize:13,lineHeight:18,color:C.text,fontWeight:'800'},
 memberCount:{width:70,minHeight:58,alignItems:'center',justifyContent:'center',borderRadius:radii.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line},memberCountValue:{fontSize:20,lineHeight:24,color:C.text,fontWeight:'900'},memberCountLabel:{fontSize:10,color:C.muted},
 browseTabs:{flexDirection:'row',gap:6},browseChip:{flex:1,minWidth:0,minHeight:46,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center',paddingHorizontal:8,paddingVertical:6},browseChipSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},browseText:{fontSize:12,lineHeight:17,color:C.muted,fontWeight:'800',textAlign:'center'},browseTextSelected:{color:C.text},
 summaryCard:{padding:12,borderRadius:radii.lg,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,gap:12},panel:{padding:12,borderRadius:radii.lg,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,gap:12},recruitPanel:{padding:12,borderRadius:radii.lg,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,gap:12},
 between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},actions:{flexDirection:'row',gap:8,flexWrap:'wrap'},actionsStack:{flexDirection:'column'},actionFlex:{flexGrow:1,flexBasis:'46%',minWidth:128},actionFlexNarrow:{flexBasis:'100%',minWidth:0},statusPill:{fontSize:11,fontWeight:'800',paddingHorizontal:8,paddingVertical:5,borderRadius:6,overflow:'hidden',color:C.accent,borderColor:C.line,borderWidth:1,backgroundColor:C.panel2},openPill:{color:C.good,backgroundColor:C.goodSurface,borderColor:C.good},fullPill:{color:C.warning,backgroundColor:C.warningSurface,borderColor:C.warning},metaCount:{color:C.muted,fontWeight:'800',fontSize:12},
 members:{gap:6},memberRow:{minHeight:70,paddingVertical:6,paddingHorizontal:9,flexDirection:'row',alignItems:'center',gap:8,borderRadius:radii.md,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},memberIdentity:{flex:1,minWidth:0},iconAction:{height:44,minWidth:44,alignItems:'center',justifyContent:'center',borderColor:C.line,borderWidth:1,borderRadius:radii.sm,backgroundColor:C.panel},iconActionText:{fontSize:14,color:C.text,fontWeight:'900'},pressed:{opacity:.76},
 emptySlots:{minHeight:48,alignItems:'center',flexDirection:'row',gap:8,paddingHorizontal:10,borderRadius:radii.md,borderWidth:1,borderStyle:'dashed',borderColor:C.lineStrong,backgroundColor:C.panel2},emptyPlus:{color:C.info,fontSize:22},link:{color:C.accent,fontSize:11,fontWeight:'800'},
 contributionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},contractOverview:{gap:10,padding:11,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},contractCard:{gap:7},progressTrack:{height:7,borderRadius:6,overflow:'hidden',backgroundColor:C.bg},progressFill:{height:'100%',backgroundColor:C.good},good:{fontSize:11,color:C.good,fontWeight:'800'},warning:{fontSize:11,color:C.warning,fontWeight:'800'},
 resultsHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},emptyState:{padding:14,gap:5,alignItems:'center',borderRadius:radii.md,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},emptyTitle:{fontSize:13,fontWeight:'800',color:C.text},
 modalBody:{gap:12,paddingHorizontal:14,paddingBottom:Math.max(spacing.lg,18),paddingTop:6},optionSummary:{borderWidth:1,borderColor:C.line,borderRadius:radii.md,padding:12,backgroundColor:C.panel2,gap:4},divider:{height:1,backgroundColor:C.line},
 locked:{padding:18,borderWidth:1,borderRadius:radii.lg,borderColor:C.line,backgroundColor:C.panel,alignItems:'center',gap:8},lockMark:{height:52,width:52,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},lockIcon:{fontSize:29,color:C.accent},lockTitle:{fontSize:18,fontWeight:'800',color:C.text}
});}

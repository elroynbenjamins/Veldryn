import {useSocialText} from '../i18n/social';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {RecruitmentListing} from './RecruitmentListing';
import {GameButton} from './GameButton';
import {equipmentTheme,radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  EMPTY_RECRUITMENT_FILTERS,
  contractProgressRatio,
  filterRecruitmentCards,
  partyOpenSpots,
  personalContributionEligible,
  recruitmentTimeLabel,
  type PartyContractView,
  type PersistentPartySummary,
  type RecruitmentCardView,
  type RecruitmentClientFilters,
  type RecruitmentPostType,
} from '../core/party-social';
import {RecruitmentFiltersPanel} from './RecruitmentFiltersPanel';
import {partyMemberManagement} from '../core/social-management';
import {PartyWeeklyLadder} from './PartyWeeklyLadder';

export interface PartyHubPanelProps {
  accountId: string;
  party: PersistentPartySummary | null;
  contracts: PartyContractView[];
  recruitment: RecruitmentCardView[];
  nowMs: number;
  onCreateParty?: () => void;
  onLeaveParty?: () => void;
  onDisbandParty?: () => void;
  onOpenPartyChat?: () => void;
  onOpenMemberProfile?: (member:PersistentPartySummary['members'][number]) => void;
  onTransferLeadership?: (member:PersistentPartySummary['members'][number]) => void;
  onRemoveMember?: (member:PersistentPartySummary['members'][number]) => void;
  onOpenRecruitmentPost?: (postId: string) => void;
  onCreateRecruitmentPost?: (postType: RecruitmentPostType) => void;
  filters?: RecruitmentClientFilters;
  onFiltersChange?: (filters:RecruitmentClientFilters)=>void;
  onClaimReward?: (id:string)=>void;
  recruitmentMode?: 'looking_for_party'|'party_recruiting';
}

export function PartyHubPanel(props: PartyHubPanelProps) {
 const st=useSocialText();
  const C=useGameTheme(),styles=React.useMemo(()=>makeStyles(C),[C]);
  const [localFilters, setLocalFilters] = React.useState<RecruitmentClientFilters>(EMPTY_RECRUITMENT_FILTERS);
  const [section,setSection]=React.useState<'party'|'find'>(props.party?'party':'find');
  React.useEffect(()=>{setSection(props.party?'party':'find');setShowSettings(false);},[props.party?.id]);
  const [showFilters,setShowFilters]=React.useState(false);
  const [showSettings,setShowSettings]=React.useState(false);
  const [browseMode,setBrowseMode]=React.useState<'parties'|'players'>(props.recruitmentMode==='looking_for_party'?'players':'parties');
  const filters=props.filters??localFilters;
  const setFilters=(next:React.SetStateAction<RecruitmentClientFilters>)=>{const result=typeof next==='function'?next(filters):next;setLocalFilters(result);props.onFiltersChange?.(result);};
  const cards = React.useMemo(() => filterRecruitmentCards(props.recruitment, {...filters,postTypes:[browseMode==='parties'?'party_recruiting':'looking_for_party']},props.nowMs), [props.recruitment, filters,props.nowMs,browseMode]);
  const canManageParty=!!props.party?.members.some(member=>member.accountId===props.accountId&&member.isLeader);

  return <View style={styles.content}>
    <View style={styles.browseTabs}><BrowseChip label="My party" selected={section==='party'} onPress={()=>setSection('party')}/><BrowseChip label="Find a party" selected={section==='find'} onPress={()=>setSection('find')}/></View>
    <View style={styles.heroPanel}>
      <Text style={styles.eyebrow}>{section==='find'?'FIND PEOPLE':'ADVENTURE TOGETHER'}</Text>
      <Text style={styles.title}>{section==='find'?'Find a party':props.party?'Your party':st("Adventure Together")}</Text>
      <Text style={styles.muted}>{section==='find'?'A group that fits your pace.':props.party?`${props.party.members.length} / 4 members · ${props.party.focus} focus`:'Create a persistent party and share weekly progress.'}</Text>
      <View style={styles.rowWrap}>
        {!props.party && <PixelButton label={st("Create Party")} onPress={props.onCreateParty} />}
        {props.party && section==='party' && <PixelButton label={st("Party Chat")} onPress={props.onOpenPartyChat} />}
        {props.party && showSettings && <PixelButton label={st("Leave")} secondary onPress={props.onLeaveParty} />}
        {props.party&&showSettings&&canManageParty&&props.party.members.length>1?<PixelButton label={st("Disband")} secondary onPress={props.onDisbandParty}/>:null}
        {props.party&&section==='party'?<PixelButton label="Party settings" secondary onPress={()=>setShowSettings(!showSettings)}/>:null}
      </View>
    </View>

    {props.party && section==='party' && <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{st("PARTY MEMBERS")}</Text>
      {props.party.members.map(member => <View key={member.accountId} style={styles.memberRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${member.characterName}'s profile`} disabled={!props.onOpenMemberProfile} onPress={()=>props.onOpenMemberProfile?.(member)} style={({pressed})=>[styles.memberIdentity,pressed&&styles.memberPressed]}>
          <CompactPlayerIdentity accountId={member.accountId} badges={member.playerBadges} name={member.characterName} className={member.className} status={member.isLeader?'PARTY LEADER':member.role.toUpperCase()} statusTone={member.isLeader?'accent':'info'} hint={props.onOpenMemberProfile?st("VIEW PROFILE ›"):undefined}/>
        </Pressable>
        {(()=>{const permissions=partyMemberManagement(canManageParty,props.accountId,member.accountId);return permissions.canTransfer||permissions.canRemove?<View style={styles.memberActions}><GameButton compact title="•••" tone="secondary" onPress={()=>Alert.alert(member.characterName,'Manage party member',[...(permissions.canTransfer?[{text:st('Lead'),onPress:()=>props.onTransferLeadership?.(member)}]:[]),...(permissions.canRemove?[{text:st('Kick'),onPress:()=>props.onRemoveMember?.(member)}]:[]),{text:'Cancel',style:'cancel'}])}/></View>:null})()}
      </View>)}
    </View>}

    {props.party && section==='party' && <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{st("PARTY CONTRACTS")}</Text>
      <Text style={styles.muted}>{st("Shared weekly progress. Personal minimums prevent zero-contribution rewards.")}</Text>
      {props.contracts.map(contract => <View key={contract.id}>{contract.tiers?.length?<PartyWeeklyLadder contract={contract} nowMs={props.nowMs} onClaimReward={props.onClaimReward}/>:<ContractCard contract={contract} nowMs={props.nowMs} />}{contract.tiers?.length?null:contract.rewards?.map(reward=><PixelButton key={reward.id} label={reward.claimed?st("Reward claimed"):`Claim ${reward.reward.gold} Gold`} onPress={!reward.claimed&&props.onClaimReward?()=>props.onClaimReward!(reward.id):undefined}/>)}</View>)}
      {!props.contracts.length && <Text style={styles.empty}>{st("No active Contract right now.")}</Text>}
    </View>}

    {section==='party'&&props.party?<GameButton title="Find members" tone="secondary" onPress={()=>setSection('find')}/>:null}
    {section==='find'&&<View style={styles.panel}>
      <Text style={styles.sectionTitle}>Recruitment</Text>
      <Text style={styles.muted}>Browse persistent Parties, player LFG posts, or use Live LFG from the expedition screen when you want a group right now.</Text>
      <View style={styles.browseTabs}><BrowseChip label="Parties with open spots" selected={browseMode==='parties'} onPress={()=>setBrowseMode('parties')}/><BrowseChip label="Players LFG" selected={browseMode==='players'} onPress={()=>setBrowseMode('players')}/></View>
      <GameButton compact title={showFilters?'Hide filters':'Filter by focus, role & play style'} tone="secondary" onPress={()=>setShowFilters(!showFilters)}/>
      {showFilters?<RecruitmentFiltersPanel value={filters} onChange={setFilters} hidePostType/>:null}
      <View style={styles.quickActions}>
        {browseMode==='players'?<PixelButton label={st("Post my LFG")} secondary onPress={() => props.onCreateRecruitmentPost?.('looking_for_party')} />:props.party?<PixelButton label={st("Post Party LFM")} secondary onPress={() => props.onCreateRecruitmentPost?.('party_recruiting')} />:null}
      </View>
      {cards.map(card => <RecruitmentListing key={card.id} card={card} nowMs={props.nowMs} onPress={() => props.onOpenRecruitmentPost?.(card.id)} />)}
      {!cards.length && <Text style={styles.empty}>{st("No fresh posts match these filters.")}</Text>}
    </View>}
    {section==='party'&&props.party?<GameButton title="Post recruitment advert" tone="secondary" onPress={()=>props.onCreateRecruitmentPost?.('party_recruiting')}/>:null}
  </View>;
}

function BrowseChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.browseChip,selected&&s.browseChipSelected,pressed&&s.pressed]}><Text style={[s.browseText,selected&&s.browseTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}

function ContractCard({ contract, nowMs }: { contract: PartyContractView; nowMs: number }) {
 const st=useSocialText();
  const C=useGameTheme(),styles=React.useMemo(()=>makeStyles(C),[C]);
  const ratio = contractProgressRatio(contract);
  const eligible = personalContributionEligible(contract);
  const endsAtMs=contract.endsAtMs??(contract.expiresAt?Date.parse(contract.expiresAt):nowMs);
  const hours = Math.max(0, Math.ceil((endsAtMs - nowMs) / 3_600_000));
  return <View style={styles.contractCard}>
    <View style={styles.between}><Text style={styles.bodyStrong}>{contract.name}</Text><Text style={styles.badge}>{(contract.category??contract.focus??'mixed').toUpperCase()}</Text></View>
    <Text style={styles.muted}>{contract.cadence === 'weekly' ? st("Weekly Contract") : st("Ranked Mini-Event")} • {hours}h left</Text>
    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} /></View>
    <Text style={styles.small}>{contract.totalPoints} / {contract.targetPoints} normalized pts</Text>
    <Text style={eligible ? styles.good : styles.warning}>Your contribution: {contract.personalPoints ?? 0} / {contract.minimumPersonalPoints ?? 0} minimum {eligible ? '✓' : ''}</Text>
    {(contract.objectives??[]).map(objective => <Text key={objective.id} style={styles.objective}>• {objective.label}: {objective.progressUnits}/{objective.targetUnits}</Text>)}
  </View>;
}

function PixelButton({ label, secondary, onPress }: { label: string; secondary?: boolean; onPress?: () => void }) {
  return <GameButton title={label} tone={secondary?'secondary':'primary'} disabled={!onPress} onPress={onPress??(()=>{})}/>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, content: { padding: 0, gap: 16, paddingBottom: 28 },
  heroPanel: { borderRadius:radii.lg,borderWidth: 0, borderColor: C.line, backgroundColor: C.bg, padding: 0, gap: 8 },
  panel: { borderRadius:radii.md,borderWidth: 0, borderColor: C.line, backgroundColor: C.bg, padding: 0, gap: 10 },
  eyebrow: { color: equipmentColors.selectedLine, fontSize: 11, fontWeight: '800', letterSpacing: 2 }, title: { ...typography.hero,color: equipmentColors.goldSoft },
  sectionTitle: { ...typography.title,color: C.text }, bodyStrong: { color: C.text, fontWeight: '800', fontSize: 14 },
  body: { color: C.text, fontSize: 13, lineHeight: 18 }, muted: { color: C.muted, fontSize: 12, lineHeight: 17 }, small: { color: C.muted, fontSize: 11 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, grow: { flex: 1,minWidth:0 },
  button: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 2, borderColor: equipmentColors.lineStrong, backgroundColor: equipmentColors.selected },
  buttonSecondary: { backgroundColor: C.panel2, borderColor: C.line }, buttonText: { color: C.text, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  pressed: { opacity: 0.76 }, disabled: { opacity: 0.4 },
  memberRow: { paddingVertical:8,minHeight:76,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:10,backgroundColor:C.panel },memberIdentity:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:9},memberActions:{gap:4,width:48},memberPressed:{opacity:.72},

  contractCard: { borderRadius:radii.md,borderWidth: 1, borderColor: C.line, backgroundColor: equipmentColors.panel, padding: 10, gap: 6 }, badge: { color: equipmentColors.selectedLine, fontWeight: '900', fontSize: 10 },
  progressTrack: { height: 8,borderRadius:4,overflow:'hidden', borderWidth: 1, borderColor: C.line, backgroundColor: C.bg }, progressFill: { height: '100%', backgroundColor: equipmentColors.selectedLine },
  good: { color: C.good, fontSize: 11, fontWeight: '700' }, warning: { color: C.warning, fontSize: 11, fontWeight: '700' }, objective: { color: C.text, fontSize: 11 },
  search: { minHeight: 46, color: C.text, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 },
  chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, paddingHorizontal: 11 }, chipSelected: { borderColor: equipmentColors.selectedLine, backgroundColor: equipmentColors.selected },
  chipText: { color: C.muted, fontWeight: '700', textTransform: 'capitalize' }, chipTextSelected: { color: C.text, fontWeight: '900', textTransform: 'capitalize' },
  quickActions: { flexDirection: 'row', gap: 8 }, browseTabs:{flexDirection:'row',flexWrap:'wrap',gap:6},browseChip:{minHeight:42,paddingHorizontal:10,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:6,backgroundColor:C.panel2},browseChipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},browseText:{fontSize:10.5,color:C.muted,fontWeight:'800'},browseTextSelected:{color:C.text}, recruitCard: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, padding: 10, gap: 6 },
  time: { color: C.muted, fontSize: 11, fontWeight: '700' }, timeSoon: { color: C.warning, fontSize: 11, fontWeight: '900' }, context: { color: C.info, fontSize: 11 },
  tag: { color: C.text, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, paddingHorizontal: 6, paddingVertical: 3, fontSize: 10 },
  empty: { color: C.muted, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});}

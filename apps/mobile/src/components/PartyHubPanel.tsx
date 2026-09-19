import {IdentityArtwork,RoleBadge} from './SocialIdentity';
import {RecruitmentListing} from './RecruitmentListing';
import {GameButton} from './GameButton';
import {C,equipmentColors,radii,typography} from '../theme/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

export interface PartyHubPanelProps {
  accountId: string;
  party: PersistentPartySummary | null;
  contracts: PartyContractView[];
  recruitment: RecruitmentCardView[];
  nowMs: number;
  onCreateParty?: () => void;
  onLeaveParty?: () => void;
  onOpenPartyChat?: () => void;
  onOpenRecruitmentPost?: (postId: string) => void;
  onCreateRecruitmentPost?: (postType: RecruitmentPostType) => void;
  filters?: RecruitmentClientFilters;
  onFiltersChange?: (filters:RecruitmentClientFilters)=>void;
  onClaimReward?: (id:string)=>void;
  recruitmentMode?: 'looking_for_party'|'party_recruiting';
}

export function PartyHubPanel(props: PartyHubPanelProps) {
  const [localFilters, setLocalFilters] = React.useState<RecruitmentClientFilters>(EMPTY_RECRUITMENT_FILTERS);
  const filters=props.filters??localFilters;
  const setFilters=(next:React.SetStateAction<RecruitmentClientFilters>)=>{const result=typeof next==='function'?next(filters):next;setLocalFilters(result);props.onFiltersChange?.(result);};
  const cards = React.useMemo(() => filterRecruitmentCards(props.recruitment, filters,props.nowMs), [props.recruitment, filters,props.nowMs]);

  return <View style={styles.content}>
    <View style={styles.heroPanel}>
      <Text style={styles.eyebrow}>PARTY</Text>
      <Text style={styles.title}>{props.party ? `Party • ${props.party.members.length}/4` : 'Adventure Together'}</Text>
      <Text style={styles.muted}>{props.party ? `${partyOpenSpots(props.party)} open spot${partyOpenSpots(props.party) === 1 ? '' : 's'} • ${props.party.focus}` : 'Create a persistent Party or find people without needing the same quest.'}</Text>
      <View style={styles.rowWrap}>
        {!props.party && <PixelButton label="Create Party" onPress={props.onCreateParty} />}
        {props.party && <PixelButton label="Party Chat" onPress={props.onOpenPartyChat} />}
        {props.party && <PixelButton label="Leave" secondary onPress={props.onLeaveParty} />}
        <PixelButton label={props.party ? 'Find Members' : 'Find Party'} secondary onPress={() => props.onCreateRecruitmentPost?.(props.party ? 'party_recruiting' : 'looking_for_party')} />
      </View>
    </View>

    {props.party && <View style={styles.panel}>
      <Text style={styles.sectionTitle}>PARTY MEMBERS</Text>
      {props.party.members.map(member => <View key={member.accountId} style={styles.memberRow}>
        <IdentityArtwork name={member.characterName} className={member.className}/>
        <View style={styles.grow}><Text style={styles.bodyStrong}>{member.characterName}</Text><Text style={styles.muted}>{member.className}{member.isLeader?' · Leader':''}</Text><RoleBadge role={member.role}/></View>
      </View>)}
    </View>}

    {props.party && <View style={styles.panel}>
      <Text style={styles.sectionTitle}>PARTY CONTRACTS</Text>
      <Text style={styles.muted}>Shared weekly progress. Personal minimums prevent zero-contribution rewards.</Text>
      {props.contracts.map(contract => <View key={contract.id}><ContractCard contract={contract} nowMs={props.nowMs} />{contract.rewards?.map(reward=><PixelButton key={reward.id} label={reward.claimed?'Reward claimed':`Claim ${reward.reward.gold} Gold`} onPress={!reward.claimed&&props.onClaimReward?()=>props.onClaimReward!(reward.id):undefined}/>)}</View>)}
      {!props.contracts.length && <Text style={styles.empty}>No active Contract right now.</Text>}
    </View>}

    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{props.recruitmentMode==='looking_for_party'?'PLAYERS LOOKING FOR PARTY':'PARTIES LOOKING FOR MEMBERS'}</Text>
      <Text style={styles.muted}>{props.recruitmentMode==='looking_for_party'?'Browse players advertising themselves for a Party.':'Browse persistent Parties that still have open member slots.'}</Text>
      <RecruitmentFiltersPanel value={filters} onChange={setFilters} hidePostType/>
      <View style={styles.quickActions}>
        {props.recruitmentMode==='looking_for_party'?<PixelButton label="Post my LFG" secondary onPress={() => props.onCreateRecruitmentPost?.('looking_for_party')} />:props.party?<PixelButton label="Post Party LFM" secondary onPress={() => props.onCreateRecruitmentPost?.('party_recruiting')} />:null}
      </View>
      {cards.map(card => <RecruitmentListing key={card.id} card={card} nowMs={props.nowMs} onPress={() => props.onOpenRecruitmentPost?.(card.id)} />)}
      {!cards.length && <Text style={styles.empty}>No fresh posts match these filters.</Text>}
    </View>
  </View>;
}

function ContractCard({ contract, nowMs }: { contract: PartyContractView; nowMs: number }) {
  const ratio = contractProgressRatio(contract);
  const eligible = personalContributionEligible(contract);
  const endsAtMs=contract.endsAtMs??(contract.expiresAt?Date.parse(contract.expiresAt):nowMs);
  const hours = Math.max(0, Math.ceil((endsAtMs - nowMs) / 3_600_000));
  return <View style={styles.contractCard}>
    <View style={styles.between}><Text style={styles.bodyStrong}>{contract.name}</Text><Text style={styles.badge}>{(contract.category??contract.focus??'mixed').toUpperCase()}</Text></View>
    <Text style={styles.muted}>{contract.cadence === 'weekly' ? 'Weekly Contract' : 'Ranked Mini-Event'} • {hours}h left</Text>
    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} /></View>
    <Text style={styles.small}>{contract.totalPoints} / {contract.targetPoints} normalized pts</Text>
    <Text style={eligible ? styles.good : styles.warning}>Your contribution: {contract.personalPoints ?? 0} / {contract.minimumPersonalPoints ?? 0} minimum {eligible ? '✓' : ''}</Text>
    {(contract.objectives??[]).map(objective => <Text key={objective.id} style={styles.objective}>• {objective.label}: {objective.progressUnits}/{objective.targetUnits}</Text>)}
  </View>;
}

function PixelButton({ label, secondary, onPress }: { label: string; secondary?: boolean; onPress?: () => void }) {
  return <GameButton title={label} tone={secondary?'secondary':'primary'} disabled={!onPress} onPress={onPress??(()=>{})}/>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, content: { padding: 12, gap: 12, paddingBottom: 28 },
  heroPanel: { borderRadius:radii.lg,borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, padding: 14, gap: 8 },
  panel: { borderRadius:radii.md,borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, padding: 12, gap: 9 },
  eyebrow: { color: equipmentColors.selectedLine, fontSize: 11, fontWeight: '800', letterSpacing: 2 }, title: { ...typography.hero,color: equipmentColors.goldSoft },
  sectionTitle: { ...typography.title,color: equipmentColors.goldSoft }, bodyStrong: { color: C.text, fontWeight: '800', fontSize: 14 },
  body: { color: C.text, fontSize: 13, lineHeight: 18 }, muted: { color: C.muted, fontSize: 12, lineHeight: 17 }, small: { color: C.muted, fontSize: 11 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, grow: { flex: 1,minWidth:0 },
  button: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 2, borderColor: equipmentColors.lineStrong, backgroundColor: equipmentColors.selected },
  buttonSecondary: { backgroundColor: C.panel2, borderColor: C.line }, buttonText: { color: C.text, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  pressed: { opacity: 0.76 }, disabled: { opacity: 0.4 },
  memberRow: { paddingVertical:10,minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  avatar: { width: 38, height: 38, borderWidth: 2, borderColor: C.line, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: equipmentColors.goldSoft, fontWeight: '900' },
  contractCard: { borderRadius:radii.md,borderWidth: 1, borderColor: C.line, backgroundColor: equipmentColors.panel, padding: 10, gap: 6 }, badge: { color: equipmentColors.selectedLine, fontWeight: '900', fontSize: 10 },
  progressTrack: { height: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg }, progressFill: { height: '100%', backgroundColor: equipmentColors.selectedLine },
  good: { color: C.good, fontSize: 11, fontWeight: '700' }, warning: { color: C.warning, fontSize: 11, fontWeight: '700' }, objective: { color: C.text, fontSize: 11 },
  search: { minHeight: 46, color: C.text, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 },
  chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, paddingHorizontal: 11 }, chipSelected: { borderColor: equipmentColors.selectedLine, backgroundColor: equipmentColors.selected },
  chipText: { color: C.muted, fontWeight: '700', textTransform: 'capitalize' }, chipTextSelected: { color: C.text, fontWeight: '900', textTransform: 'capitalize' },
  quickActions: { flexDirection: 'row', gap: 8 }, recruitCard: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, padding: 10, gap: 6 },
  time: { color: C.muted, fontSize: 11, fontWeight: '700' }, timeSoon: { color: C.warning, fontSize: 11, fontWeight: '900' }, context: { color: C.info, fontSize: 11 },
  tag: { color: C.text, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, paddingHorizontal: 6, paddingVertical: 3, fontSize: 10 },
  empty: { color: C.muted, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  activityPreferenceLabel,
  contractEligibilityLabel,
  contractProgressPercent,
  playStyleLabel,
  type PartyActivityPreference,
  type PartyContractView,
  type PartyPlayStyle,
  type PartyView,
} from '../core/party-social';

type Tab = 'party' | 'contracts' | 'recruit';

export interface PartyHubPanelProps {
  party: PartyView | null;
  contracts: PartyContractView[];
  canManageParty: boolean;
  onCreateParty?: (focus: PartyActivityPreference, style: PartyPlayStyle) => void;
  onFindParty?: () => void;
  onOpenPartyChat?: () => void;
  onToggleRecruitment?: () => void;
  onOpenRecruitmentBoard?: () => void;
  onAcceptContract?: (contractId: string) => void;
  onClaimContract?: (contractId: string) => void;
  onLeaveParty?: () => void;
}

const focusOptions: PartyActivityPreference[] = ['combat', 'skilling', 'mixed'];

export function PartyHubPanel(props: PartyHubPanelProps) {
  const [tab, setTab] = useState<Tab>('party');
  const [createFocus, setCreateFocus] = useState<PartyActivityPreference>('mixed');
  const activeContracts = useMemo(() => props.contracts.filter((contract) => !contract.complete), [props.contracts]);

  if (!props.party) {
    return (
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>SOCIAL · PARTY</Text>
        <Text style={styles.title}>Adventure Together</Text>
        <Text style={styles.copy}>Persistent Parties hold up to four players. Party Contracts are asynchronous, so everyone can contribute on their own schedule.</Text>
        <Text style={styles.sectionTitle}>Preferred activity</Text>
        <View style={styles.chips}>
          {focusOptions.map((focus) => (
            <Pressable key={focus} onPress={() => setCreateFocus(focus)} style={[styles.chip, createFocus === focus && styles.chipActive]}>
              <Text style={[styles.chipText, createFocus === focus && styles.chipTextActive]}>{activityPreferenceLabel[focus]}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primaryButton} onPress={() => props.onCreateParty?.(createFocus, 'balanced')}>
          <Text style={styles.primaryButtonText}>Create Party</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={props.onFindParty}>
          <Text style={styles.secondaryButtonText}>Find Party / LFG</Text>
        </Pressable>
      </View>
    );
  }

  const party = props.party;
  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>PARTY · {party.members.length}/4</Text>
          <Text style={styles.title}>{party.name}</Text>
          <Text style={styles.meta}>{activityPreferenceLabel[party.activityPreference]} · {playStyleLabel[party.playStyle]}</Text>
        </View>
        <Pressable style={styles.chatButton} onPress={props.onOpenPartyChat}><Text style={styles.chatButtonText}>Chat</Text></Pressable>
      </View>

      <View style={styles.tabs}>
        {(['party', 'contracts', 'recruit'] as Tab[]).map((value) => (
          <Pressable key={value} style={[styles.tab, tab === value && styles.tabActive]} onPress={() => setTab(value)}>
            <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>{value === 'party' ? 'Party' : value === 'contracts' ? 'Contracts' : 'Recruit'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'party' && (
        <View>
          {party.members.map((member) => (
            <View key={member.accountId} style={styles.memberRow}>
              <View style={[styles.statusDot, member.online === false && styles.statusDotOffline]} />
              <View style={styles.flex}>
                <Text style={styles.memberName}>{member.displayName}{member.isLeader ? '  ★' : ''}</Text>
                <Text style={styles.memberMeta}>{member.className ?? 'Adventurer'}{member.combatLevel ? ` · Lv ${member.combatLevel}` : ''}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.hint}>Base Parties do not require Tank / Damage / Support composition. The strict 1 Tank + 2 Damage + 1 Support rule remains exclusive to Live Dungeons.</Text>
          <Pressable style={styles.dangerButton} onPress={props.onLeaveParty}><Text style={styles.dangerText}>Leave Party</Text></Pressable>
        </View>
      )}

      {tab === 'contracts' && (
        <ScrollView style={styles.contractList} nestedScrollEnabled>
          {props.contracts.map((contract) => {
            const percent = contractProgressPercent(contract);
            return (
              <View key={contract.id} style={styles.contractCard}>
                <View style={styles.headerRow}>
                  <View style={styles.flex}>
                    <Text style={styles.contractName}>{contract.name}</Text>
                    <Text style={styles.meta}>{activityPreferenceLabel[contract.focus]} · {percent}%</Text>
                  </View>
                  <Text style={contract.eligible ? styles.good : styles.muted}>{contractEligibilityLabel(contract)}</Text>
                </View>
                <Text style={styles.copySmall}>{contract.description}</Text>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
                <View style={styles.statRow}>
                  <Text style={styles.statText}>{contract.totalPoints.toLocaleString()} / {contract.targetPoints.toLocaleString()} pts</Text>
                  <Text style={styles.statText}>You: {contract.personalPoints.toLocaleString()}</Text>
                </View>
                {contract.focus === 'mixed' && <Text style={styles.muted}>Combat {contract.combatPoints.toLocaleString()} · Skilling {contract.skillingPoints.toLocaleString()}</Text>}
                {contract.complete && contract.eligible ? (
                  <Pressable style={styles.primaryButtonCompact} onPress={() => props.onClaimContract?.(contract.id)}><Text style={styles.primaryButtonText}>Claim Reward</Text></Pressable>
                ) : !contract.complete && !activeContracts.some((x) => x.id === contract.id) ? (
                  <Pressable style={styles.secondaryButtonCompact} onPress={() => props.onAcceptContract?.(contract.id)}><Text style={styles.secondaryButtonText}>Accept</Text></Pressable>
                ) : null}
              </View>
            );
          })}
          <Text style={styles.hint}>Points are normalized by expected activity time and difficulty. Long offline sessions can contribute, but daily credit caps prevent one AFK settlement from finishing the whole contract.</Text>
        </ScrollView>
      )}

      {tab === 'recruit' && (
        <View>
          <Text style={styles.sectionTitle}>Looking for members</Text>
          <Text style={styles.copy}>Recruit around Combat, Skilling or Mixed preferences instead of one exact quest. Broad tags such as Bosses, Crafting, Weekly Contracts and Party Events help players find compatible groups.</Text>
          {props.canManageParty && (
            <Pressable style={styles.primaryButton} onPress={props.onToggleRecruitment}>
              <Text style={styles.primaryButtonText}>{party.recruitmentOpen ? 'Update / Close Listing' : 'Open Party Listing'}</Text>
            </Pressable>
          )}
          <Pressable style={styles.secondaryButton} onPress={props.onOpenRecruitmentBoard}><Text style={styles.secondaryButtonText}>Browse Players & Parties</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#101923', borderWidth: 1, borderColor: '#34475b', borderRadius: 12, padding: 14, gap: 10 },
  flex: { flex: 1 },
  eyebrow: { color: '#89a9c7', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#f4e6bd', fontSize: 22, fontWeight: '800' },
  copy: { color: '#c6d1dc', fontSize: 14, lineHeight: 20 },
  copySmall: { color: '#c6d1dc', fontSize: 13, lineHeight: 18 },
  meta: { color: '#8fa2b4', fontSize: 12 },
  sectionTitle: { color: '#d9c58f', fontSize: 14, fontWeight: '800', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#3b4d5e', backgroundColor: '#172330' },
  chipActive: { borderColor: '#d7b96a', backgroundColor: '#2d2a21' },
  chipText: { color: '#aab9c7', fontWeight: '700' },
  chipTextActive: { color: '#f0d991' },
  primaryButton: { backgroundColor: '#9b762d', borderWidth: 1, borderColor: '#d5b45a', paddingVertical: 11, paddingHorizontal: 13, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  primaryButtonCompact: { backgroundColor: '#9b762d', borderWidth: 1, borderColor: '#d5b45a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  primaryButtonText: { color: '#fff5d1', fontWeight: '800' },
  secondaryButton: { backgroundColor: '#182837', borderWidth: 1, borderColor: '#46627d', paddingVertical: 11, paddingHorizontal: 13, borderRadius: 8, alignItems: 'center' },
  secondaryButtonCompact: { backgroundColor: '#182837', borderWidth: 1, borderColor: '#46627d', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  secondaryButtonText: { color: '#cce2f5', fontWeight: '800' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatButton: { backgroundColor: '#1d3548', borderColor: '#4d7894', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chatButtonText: { color: '#ccecff', fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, backgroundColor: '#16222d', alignItems: 'center', borderWidth: 1, borderColor: '#2e4051' },
  tabActive: { borderColor: '#c39e4e', backgroundColor: '#28251d' },
  tabText: { color: '#91a5b6', fontWeight: '800' },
  tabTextActive: { color: '#f0d991' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2e3c49' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#72c78f' },
  statusDotOffline: { backgroundColor: '#65717b' },
  memberName: { color: '#e6eef5', fontWeight: '800', fontSize: 14 },
  memberMeta: { color: '#8799a9', fontSize: 12 },
  hint: { color: '#8293a2', fontSize: 11, lineHeight: 16, marginTop: 7 },
  dangerButton: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: '#6c4650', backgroundColor: '#2a1b20' },
  dangerText: { color: '#e2a8b0', fontWeight: '800' },
  contractList: { maxHeight: 520 },
  contractCard: { backgroundColor: '#14202b', borderRadius: 9, borderWidth: 1, borderColor: '#304252', padding: 11, marginBottom: 9, gap: 6 },
  contractName: { color: '#f0dfab', fontWeight: '800', fontSize: 15 },
  good: { color: '#91d7a5', fontWeight: '800', fontSize: 11 },
  muted: { color: '#8496a6', fontSize: 11 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#263644', overflow: 'hidden', marginTop: 3 },
  progressFill: { height: '100%', backgroundColor: '#b38a3c' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  statText: { color: '#b8c7d4', fontSize: 11, fontWeight: '700' },
});

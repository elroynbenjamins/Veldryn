import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  activityPreferenceLabel,
  playStyleLabel,
  type PartyActivityPreference,
  type PartyRecruitmentCard,
  type PartySeekerCard,
} from '../core/party-social';

type Mode = 'parties' | 'players';

export interface RecruitmentBoardPanelProps {
  parties: PartyRecruitmentCard[];
  players: PartySeekerCard[];
  onRequestJoin?: (partyId: string) => void;
  onInvitePlayer?: (accountId: string) => void;
  onCreatePlayerPost?: () => void;
  onCreatePartyPost?: () => void;
}

export function RecruitmentBoardPanel(props: RecruitmentBoardPanelProps) {
  const [mode, setMode] = useState<Mode>('parties');
  const [focus, setFocus] = useState<PartyActivityPreference | 'all'>('all');
  const [focusOpen,setFocusOpen]=useState(false);
  const matches = (value: PartyActivityPreference) => focus === 'all' || value === focus || value === 'mixed';
  const parties = useMemo(() => props.parties.filter((item) => matches(item.activityPreference)), [props.parties, focus]);
  const players = useMemo(() => props.players.filter((item) => matches(item.activityPreference)), [props.players, focus]);
  const focusLabel=focus==='all'?'Any activity':activityPreferenceLabel[focus];

  return <View style={styles.panel}>
    <Text style={styles.eyebrow}>LOOKING FOR GROUP</Text>
    <Text style={styles.title}>Party Board</Text>
    <View style={styles.tabs}>
      <Pressable style={[styles.tab, mode === 'parties' && styles.tabActive]} onPress={() => setMode('parties')}><Text style={styles.tabText}>Parties LF Members</Text></Pressable>
      <Pressable style={[styles.tab, mode === 'players' && styles.tabActive]} onPress={() => setMode('players')}><Text style={styles.tabText}>Players LFG</Text></Pressable>
    </View>
    <View style={styles.filterWrap}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:focusOpen}} style={[styles.filterDropdown,focus!=='all'&&styles.filterDropdownActive]} onPress={()=>setFocusOpen(value=>!value)}>
        <View style={styles.flex}><Text style={styles.filterLabel}>Activity</Text><Text style={styles.filterValue}>{focusLabel}</Text></View><Text style={styles.chevron}>{focusOpen?'⌃':'⌄'}</Text>
      </Pressable>
      {focusOpen?<View style={styles.filterMenu}>{(['all', 'combat', 'skilling', 'mixed'] as const).map((value) => <Pressable key={value} style={[styles.filterOption, focus === value && styles.filterOptionActive]} onPress={() => {setFocus(value);setFocusOpen(false);}}><Text style={[styles.filterText,focus===value&&styles.filterTextActive]}>{focus===value?'✓  ':''}{value === 'all' ? 'Any activity' : activityPreferenceLabel[value]}</Text></Pressable>)}</View>:null}
    </View>
    <Text style={styles.explainer}>Match on broad play interests so parties can rotate between contracts and events.</Text>
    <ScrollView style={styles.list} nestedScrollEnabled>
      {mode === 'parties' ? parties.map((party) => <View key={party.id} style={styles.card}>
        <View style={styles.row}><View style={styles.flex}><Text style={styles.cardTitle}>{party.partyName}</Text><Text style={styles.meta}>{party.memberCount}/4 · {activityPreferenceLabel[party.activityPreference]} · {playStyleLabel[party.playStyle]}</Text></View>{typeof party.compatibilityScore === 'number' && <Text style={styles.match}>{party.compatibilityScore}% match</Text>}</View>
        <Text style={styles.description}>{party.description}</Text><View style={styles.tags}>{party.goalTags.map((tag) => <Text key={tag} style={styles.tag}>{tag.replace(/_/g, ' ')}</Text>)}</View>
        <Pressable style={styles.action} onPress={() => props.onRequestJoin?.(party.id)}><Text style={styles.actionText}>Request Join</Text></Pressable>
      </View>) : players.map((player) => <View key={`${player.accountId}:${player.characterId}`} style={styles.card}>
        <Text style={styles.cardTitle}>{player.displayName}</Text><Text style={styles.meta}>{player.className ?? 'Adventurer'}{player.combatLevel ? ` · Lv ${player.combatLevel}` : ''} · {activityPreferenceLabel[player.activityPreference]} · {playStyleLabel[player.playStyle]}</Text>
        <Text style={styles.description}>{player.description}</Text><View style={styles.tags}>{player.goalTags.map((tag) => <Text key={tag} style={styles.tag}>{tag.replace(/_/g, ' ')}</Text>)}</View>
        <Pressable style={styles.action} onPress={() => props.onInvitePlayer?.(player.accountId)}><Text style={styles.actionText}>Invite to Party</Text></Pressable>
      </View>)}
    </ScrollView>
    <Pressable style={styles.postButton} onPress={mode === 'parties' ? props.onCreatePartyPost : props.onCreatePlayerPost}><Text style={styles.postButtonText}>{mode === 'parties' ? 'Post Party Listing' : 'Advertise Myself'}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#0f1822', borderColor: '#34495d', borderWidth: 1, borderRadius: 12, padding: 14, gap: 9 },
  eyebrow: { color: '#7fa2bf', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, title: { color: '#f2e0a9', fontWeight: '900', fontSize: 21 },
  tabs: { flexDirection: 'row', gap: 6 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8, backgroundColor: '#172531', borderWidth: 1, borderColor: '#304659' }, tabActive: { backgroundColor: '#29251c', borderColor: '#c19b4d' }, tabText: { color: '#c1ced8', fontWeight: '800', fontSize: 12 },
  filterWrap:{position:'relative',zIndex:5},filterDropdown:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,borderRadius:9,borderWidth:1,borderColor:'#354858',backgroundColor:'#14212c',paddingHorizontal:11},filterDropdownActive:{borderColor:'#6fa2c2',backgroundColor:'#1a3141'},filterLabel:{color:'#7f95a8',fontSize:10,fontWeight:'800',textTransform:'uppercase',letterSpacing:.6},filterValue:{color:'#d8e4ec',fontSize:13,fontWeight:'900'},chevron:{color:'#7fc4e4',fontSize:18,fontWeight:'900'},filterMenu:{marginTop:5,borderWidth:1,borderColor:'#354858',borderRadius:9,backgroundColor:'#111d27',overflow:'hidden'},filterOption:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderBottomWidth:1,borderBottomColor:'#263846'},filterOptionActive:{backgroundColor:'#1c3444'},filterText:{color:'#c6d2dc',fontWeight:'700',fontSize:12},filterTextActive:{color:'#e9f7ff',fontWeight:'900'},
  explainer: { color: '#8193a3', fontSize: 11, lineHeight: 16 }, list: { maxHeight: 520 }, card: { padding: 11, borderRadius: 9, backgroundColor: '#15232e', borderWidth: 1, borderColor: '#2f4354', marginBottom: 8, gap: 5 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, flex: { flex: 1 }, cardTitle: { color: '#e9eef2', fontWeight: '900', fontSize: 15 }, meta: { color: '#8ca0b0', fontSize: 11 }, match: { color: '#9fd7ad', fontSize: 11, fontWeight: '900' }, description: { color: '#c4d0d9', fontSize: 13, lineHeight: 18 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, tag: { color: '#c6b77f', borderColor: '#655a38', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontSize: 10, textTransform: 'capitalize' }, action: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#1e3c4f', borderColor: '#5483a0', borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 }, actionText: { color: '#d9f2ff', fontWeight: '900', fontSize: 12 }, postButton: { backgroundColor: '#8d6b2b', borderColor: '#d0ae58', borderWidth: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }, postButtonText: { color: '#fff3c9', fontWeight: '900' },
});

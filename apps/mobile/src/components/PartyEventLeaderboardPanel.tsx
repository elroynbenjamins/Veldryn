import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PartyEventLeaderboardView } from '../core/party-social';

type Audience = 'global' | 'friends' | 'guild';
export interface PartyEventLeaderboardPanelProps {
  boards: Partial<Record<Audience, PartyEventLeaderboardView>>;
  onAudienceChange?: (audience: Audience) => void;
}

export function PartyEventLeaderboardPanel({ boards, onAudienceChange }: PartyEventLeaderboardPanelProps) {
  const [audience, setAudience] = useState<Audience>('global');
  const board = boards[audience] ?? boards.global;
  const select = (next: Audience) => { setAudience(next); onAudienceChange?.(next); };
  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>PARTY LEADERBOARD</Text>
      <View style={styles.tabs}>
        {(['global','friends','guild'] as Audience[]).map((item) => <Pressable key={item} style={[styles.tab,audience===item&&styles.active]} onPress={()=>select(item)}><Text style={styles.tabText}>{item}</Text></Pressable>)}
      </View>
      {board?.ownParty && <View style={styles.own}><Text style={styles.ownText}>Your Party · #{board.ownParty.rank}</Text><Text style={styles.ownScore}>{board.ownParty.score.toLocaleString()}</Text></View>}
      <ScrollView style={styles.list} nestedScrollEnabled>
        {(board?.entries ?? []).map((entry) => (
          <View key={entry.partyId} style={[styles.row,entry.isOwnParty&&styles.ownRow]}>
            <Text style={styles.rank}>#{entry.rank}</Text>
            <View style={styles.flex}><Text numberOfLines={1} style={styles.name}>{entry.partyName}</Text><Text style={styles.meta}>{entry.meaningfulContributors} contributors · top {Math.max(1,Math.ceil(entry.percentile))}%</Text></View>
            <Text style={styles.score}>{entry.score.toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.hint}>Rank rewards are prestige-heavy. Friends and Guild views preserve the same global rank instead of creating easier private reward ladders.</Text>
    </View>
  );
}
const styles=StyleSheet.create({
  panel:{backgroundColor:'#101923',borderWidth:1,borderColor:'#34475b',borderRadius:12,padding:12,gap:8},eyebrow:{color:'#8ca8bb',fontSize:10,fontWeight:'900',letterSpacing:1},
  tabs:{flexDirection:'row',gap:5},tab:{flex:1,alignItems:'center',paddingVertical:7,borderRadius:7,borderWidth:1,borderColor:'#324555',backgroundColor:'#17232d'},active:{borderColor:'#b99349',backgroundColor:'#29251d'},tabText:{color:'#c5d1d9',fontWeight:'900',fontSize:10,textTransform:'capitalize'},
  own:{flexDirection:'row',justifyContent:'space-between',backgroundColor:'#212a22',borderWidth:1,borderColor:'#587557',borderRadius:7,padding:8},ownText:{color:'#c8dfbc',fontWeight:'900'},ownScore:{color:'#f0dda4',fontWeight:'900'},
  list:{maxHeight:340},row:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#233440'},ownRow:{backgroundColor:'#18291f'},rank:{color:'#d6bd72',width:36,fontWeight:'900'},flex:{flex:1},name:{color:'#e7edf1',fontWeight:'900'},meta:{color:'#899ba8',fontSize:10},score:{color:'#d6e1e7',fontWeight:'900'},hint:{color:'#8194a2',fontSize:10,lineHeight:14},
});

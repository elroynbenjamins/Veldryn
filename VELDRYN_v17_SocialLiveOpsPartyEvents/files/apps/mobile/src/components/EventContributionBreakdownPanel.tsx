import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { eventActivityLabel, type EventContributionBreakdownView } from '../core/party-social';

export function EventContributionBreakdownPanel({ breakdown }: { breakdown: EventContributionBreakdownView }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>YOUR CONTRIBUTION</Text>
      <Text style={styles.total}>{breakdown.totalPoints.toLocaleString()} pts</Text>
      {breakdown.byActivity.map((row) => (
        <View key={row.activityKind} style={styles.row}>
          <Text style={styles.label}>{eventActivityLabel[row.activityKind]}</Text>
          <Text style={styles.points}>{row.points.toLocaleString()}</Text>
        </View>
      ))}
      {breakdown.topDetails.length > 0 && <Text style={styles.subhead}>Top sources</Text>}
      {breakdown.topDetails.slice(0, 8).map((row) => (
        <View key={`${row.activityKind}:${row.contentId}`} style={styles.detailRow}>
          <Text numberOfLines={1} style={styles.detailLabel}>{row.contentId.replace(/_/g, ' ')}</Text>
          <Text style={styles.detailPoints}>+{row.points}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel:{backgroundColor:'#111b25',borderWidth:1,borderColor:'#334a5c',borderRadius:10,padding:12,gap:6},
  eyebrow:{color:'#8faabd',fontSize:10,fontWeight:'900',letterSpacing:1}, total:{color:'#f1d995',fontSize:24,fontWeight:'900'},
  row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:5,borderBottomWidth:1,borderBottomColor:'#223341'},
  label:{color:'#c7d3dc',fontSize:12,fontWeight:'800'},points:{color:'#e8eef2',fontSize:12,fontWeight:'900'},
  subhead:{color:'#bda86f',fontSize:11,fontWeight:'900',marginTop:4},detailRow:{flexDirection:'row',justifyContent:'space-between',gap:8},
  detailLabel:{color:'#8fa0ad',fontSize:11,flex:1,textTransform:'capitalize'},detailPoints:{color:'#a9d8b0',fontSize:11,fontWeight:'900'},
});

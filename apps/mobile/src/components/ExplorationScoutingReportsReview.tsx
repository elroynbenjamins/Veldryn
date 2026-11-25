/** Unregistered report UI; no live claim action. */
import {StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {scoutingReportsReview} from '../core/exploration-scouting-settlement-review';
type Reports=ReturnType<typeof scoutingReportsReview>;
export function ExplorationScoutingReportsReview({reports}:{reports:Reports}){
 const C=useGameTheme();
 return <View style={s.root}>
  <Text style={[s.title,{color:C.text}]}>Scouting Reports</Text>
  {!reports.all.length?<Text style={{color:C.muted}}>No scouting reports yet.</Text>:null}
  {reports.training.map(r=><View key={'t:'+r.id} style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}>
   <Text style={[s.heading,{color:C.text}]}>{r.discovery?'Route discovery':'Exploration training'}</Text>
   <Text style={{color:C.muted}}>{r.otherCharacter?'Assigned by another character':r.claimable?'Report ready':r.status==='claimed'?'Collected':Math.ceil(r.remainingMs/60000)+'m remaining'}</Text>
   <Text style={{color:C.text}}>{r.explorationXp} Exploration XP{r.trainingMinutes?' · '+r.trainingMinutes+'m assignment':''}</Text>
  </View>)}
  {reports.camps.map(r=><View key={'c:'+r.id} style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}>
   <Text style={[s.heading,{color:C.text}]}>{r.missionId}</Text>
   <Text style={{color:C.muted}}>{r.otherCharacter?'Assigned by another character':r.claimable?'Companions returned':r.status==='claimed'?'Collected':Math.ceil(r.remainingMs/60000)+'m remaining'}</Text>
   {r.final?<><Text style={{color:C.good}}>Grade {r.final.grade??'—'} · Final rewards</Text><Text style={{color:C.text}}>{r.final.reward.gold} Gold · {r.final.reward.companionEssence} Essence · {r.final.reward.companionXp} Companion XP</Text>{r.final.reward.bondstones?<Text style={{color:C.special}}>Bondstone ×{r.final.reward.bondstones}</Text>:null}</>:r.preview?<><Text style={{color:C.text}}>Base preview: {r.preview.gold} Gold · {r.preview.essence} Essence</Text><Text style={{color:C.muted}}>Rare bonus outcome remains hidden until claim.</Text></>:null}
  </View>)}
  {reports.legacy.map(r=><View key={'l:'+r.id} style={[s.card,{borderColor:C.warning,backgroundColor:C.panel}]}>
   <Text style={[s.heading,{color:C.text}]}>Previous expedition</Text><Text style={{color:C.muted}}>{r.missionId} · {r.claimable?'Original rewards ready':r.status==='claimed'?'Collected':Math.ceil(r.remainingMs/60000)+'m remaining'}</Text>
   <Text style={{color:C.text}}>Original mission version and rewards are preserved.</Text>
  </View>)}
  <Text style={{color:C.muted}}>Review only · claim controls remain disabled until the 2.0 server transaction is wired.</Text>
 </View>;
}
const s=StyleSheet.create({root:{gap:10},title:{fontSize:18,fontWeight:'800'},card:{borderWidth:1,borderRadius:10,padding:12,gap:5},heading:{fontSize:14,fontWeight:'800'}});

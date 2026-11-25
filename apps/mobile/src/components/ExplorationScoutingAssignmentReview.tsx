/** Unregistered review UI. Deliberately no dispatch/claim actions. */
import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {scoutingMissionSetupReview} from '../core/exploration-scouting-ui-review';
type Setup=ReturnType<typeof scoutingMissionSetupReview>;
export function ExplorationScoutingAssignmentReview({setup}:{setup:Setup}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(),[]),[showAll,setShowAll]=useState(false);
 const shown=showAll?setup.candidates:setup.candidates.slice(0,6);
 return <View style={s.root}>
  <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}>
   <Text style={[s.title,{color:C.text}]}>{setup.mission.name}</Text>
   <Text style={{color:C.muted}}>{setup.mission.region} · Exploration Lv {setup.mission.requiredLevel} · Camp {setup.mission.minimumCamp}</Text>
   <Text style={{color:C.text}}>Team speed +{Math.round(setup.teamBonus*100)}% · Expected grade {setup.expectedGrade??'—'}</Text>
   <Text style={{color:C.muted}}>Preferred affinities: {setup.route.preferredAffinities.join(' · ')}</Text>
  </View>
  <Text style={[s.section,{color:C.text}]}>Choose companions</Text>
  {shown.map(c=><View key={c.id} style={[s.rowCard,{borderColor:c.selected?C.selectionLine:C.line,backgroundColor:c.selected?C.selection:C.panel}]}>
   <View style={s.flex}><Text style={[s.name,{color:C.text}]}>{c.name}</Text><Text style={{color:C.muted}}>Lv {c.level} · Bond {c.bond} · {c.affinity}</Text></View>
   <View style={s.right}><Text style={{color:c.preferredAffinity?C.good:C.muted}}>{c.preferredAffinity?'Affinity match':'Standard fit'}</Text><Text style={{color:C.muted}}>+{Math.round(c.speedBonus*100)}% speed</Text><Text style={{color:c.available?C.text:C.warning}}>{c.available?(c.selected?'Selected':'Available'):'Busy'}</Text></View>
  </View>)}
  {setup.candidates.length>6?<Pressable accessibilityRole="button" onPress={()=>setShowAll(v=>!v)} style={[s.button,{borderColor:C.line}]}><Text style={{color:C.text}}>{showAll?'Show fewer':'Show all companions'}</Text></Pressable>:null}
  <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}>
   <Text style={[s.section,{color:C.text}]}>Mission preview</Text>
   {setup.preview?<><Text style={{color:C.text}}>{Math.ceil(setup.preview.durationMs/60000)} min · {setup.preview.explorationXp} Exploration XP</Text><Text style={{color:C.muted}}>{setup.preview.stamina} Stamina · {setup.preview.goldCost} Gold cost</Text><Text style={{color:C.text}}>Rewards: {setup.preview.goldReward} Gold · {setup.preview.essence} Essence · {setup.preview.companionXp} Companion XP each · {setup.preview.bondXp} Bond XP each</Text>{setup.preview.bondstoneEligible?<Text style={{color:C.special}}>Rare Bondstone eligible · shared weekly cap applies</Text>:null}</>:<Text style={{color:C.warning}}>{setup.blockedReason??'Select a valid team'}</Text>}
   <Text style={{color:C.muted}}>Review only · final send button remains disabled until 2.0 integration.</Text>
  </View>
 </View>;
}
function makeStyles(){return StyleSheet.create({root:{gap:10},card:{borderWidth:1,borderRadius:10,padding:12,gap:5},rowCard:{minHeight:58,borderWidth:1,borderRadius:10,padding:10,flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},right:{alignItems:'flex-end',gap:2},title:{fontSize:18,fontWeight:'800'},section:{fontSize:14,fontWeight:'800'},name:{fontWeight:'700'},button:{minHeight:44,borderWidth:1,borderRadius:8,alignItems:'center',justifyContent:'center',paddingHorizontal:12}});}

import {useCallback,useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {ScoutingSnapshotProjection} from '../../../../backend/src/server/exploration/scouting-types';
import {scoutingClient,scoutingOnlineConfigured} from '../online/scouting-client';
import {scoutingOnlineView} from '../core/exploration-scouting-online-review';
import {useGameTheme} from '../theme/ThemeContext';

export function ExplorationScoutingOnlineReview({state}:{state:GameState}){
 const C=useGameTheme(),characterId=state.character?.id??'',s=useMemo(()=>styles(),[]);
 const [snapshot,setSnapshot]=useState<ScoutingSnapshotProjection|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0);
 const reload=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{let active=true;
  if(!characterId){setSnapshot(null);setError('Choose a character to view Exploration.');return()=>{active=false};}
  if(!scoutingOnlineConfigured){setSnapshot(null);setError('Exploration 2.0 server is not configured.');return()=>{active=false};}
  setLoading(true);setError('');
  scoutingClient.snapshot(characterId).then(value=>{if(active)setSnapshot(value)}).catch(e=>{if(active){setSnapshot(null);setError(e instanceof Error?e.message:'Exploration is unavailable.')}}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[characterId,revision]);
 if(loading&&!snapshot)return <View style={s.root}><Text style={{color:C.muted}}>Loading account Exploration…</Text></View>;
 if(!snapshot)return <View style={s.root}><View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={[s.title,{color:C.text}]}>Exploration</Text><Text style={{color:C.warning}}>{error||'Authoritative account Exploration is unavailable.'}</Text><Text style={{color:C.muted}}>No character-local XP fallback is used in 2.0.</Text><Pressable accessibilityRole="button" onPress={reload} style={[s.button,{borderColor:C.line}]}><Text style={{color:C.text}}>Retry</Text></Pressable></View></View>;
 let view;try{view=scoutingOnlineView(snapshot,characterId)}catch(e){return <View style={s.root}><Text style={{color:C.warning}}>{e instanceof Error?e.message:'Invalid Exploration snapshot.'}</Text></View>;}
 return <View style={s.root}>
  <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={[s.title,{color:C.text}]}>Exploration · Account Lv. {view.account.level}</Text><Text style={{color:C.text}}>{view.account.xp.toLocaleString()} total XP</Text><Text style={{color:C.muted}}>Account-wide skill · 0 contribution to character-slot unlocks</Text></View>
  <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={[s.heading,{color:C.text}]}>Scouting Camp</Text><Text style={{color:C.text}}>{view.camp.active}/{view.camp.capacity} teams active · {view.camp.free} free</Text><Text style={{color:C.muted}}>{view.legacyReports} previous expedition report{view.legacyReports===1?'':'s'} retained</Text></View>
  <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={[s.heading,{color:C.text}]}>Character access retained</Text><Text style={{color:C.text}}>{view.character.regions.length?view.character.regions.join(' · '):'No retained regions'}</Text><Text style={{color:C.muted}}>{view.character.routes.length} mapped routes · {view.character.areas.length} retained regional areas</Text></View>
  <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={[s.heading,{color:C.text}]}>Assignments</Text>{view.assignments.length?view.assignments.map(a=><Text key={a.assignmentId} style={{color:C.muted}}>{a.kind} · {a.status}{a.otherCharacter?' · another character':''}</Text>):<Text style={{color:C.muted}}>No new Scouting assignments.</Text>}<Text style={{color:C.muted}}>Dispatch and claim remain disabled until settlement passes the 2.0 release gate.</Text></View>
  <Pressable accessibilityRole="button" onPress={reload} style={[s.button,{borderColor:C.line}]}><Text style={{color:C.text}}>Refresh</Text></Pressable>
 </View>;
}
const styles=()=>StyleSheet.create({root:{gap:10},card:{borderWidth:1,borderRadius:10,padding:12,gap:5},title:{fontSize:18,fontWeight:'800'},heading:{fontSize:14,fontWeight:'800'},button:{minHeight:44,borderWidth:1,borderRadius:8,justifyContent:'center',alignItems:'center',paddingHorizontal:12}});

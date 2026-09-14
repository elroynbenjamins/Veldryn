import {useEffect,useState} from 'react';
import {ActivityIndicator,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {achievementsClient,achievementsOnlineConfigured} from '../online/achievements-client';
import type {AchievementSnapshotProjection} from '../core/achievement-types';
import {C,spacing,typography} from '../theme/theme';

export function AchievementsScreen(){
  const [snapshot,setSnapshot]=useState<AchievementSnapshotProjection|null>(null);
  const [showcase,setShowcase]=useState<string[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function load(){if(!achievementsOnlineConfigured){setError('Achievements require the authenticated online server.');return}setLoading(true);setError('');try{const next=await achievementsClient.snapshot();setSnapshot(next);setShowcase(next.showcaseIds)}catch(e){setError(e instanceof Error?e.message:'Could not load Achievements.')}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  function toggle(id:string){setShowcase(current=>current.includes(id)?current.filter(value=>value!==id):current.length<3?[...current,id]:current)}
  async function saveShowcase(){setLoading(true);try{const result=await achievementsClient.showcase(showcase,`showcase-${Date.now()}`);setSnapshot(result.snapshot);setShowcase(result.showcaseIds)}catch(e){setError(e instanceof Error?e.message:'Could not save showcase.')}finally{setLoading(false)}}
  async function claim(id:string){setLoading(true);try{const result=await achievementsClient.claim(id,`claim-${Date.now()}-${id}`);setSnapshot(result.snapshot);setShowcase(result.snapshot.showcaseIds)}catch(e){setError(e instanceof Error?e.message:'Could not claim achievement.')}finally{setLoading(false)}}
  return <ScrollView contentContainerStyle={s.root}><Text style={s.heading}>Achievements</Text><Panel><Text style={s.title}>Prestige, not power</Text><Text style={s.copy}>Progress, score, Gold, and titles are calculated by the authenticated server. Achievements do not grant combat stats or multipliers.</Text><Text style={s.score}>Score: {snapshot?.score??'—'}</Text><Text style={s.copy}>Claimed: {snapshot?.claimedCount??'—'} · Showcase slots: {showcase.length}/3</Text><View style={s.button}><GameButton title="Save showcase" tone="secondary" disabled={loading||!snapshot} onPress={()=>void saveShowcase()}/></View></Panel>{loading&&<ActivityIndicator/>}{error&&<Panel><Text style={s.warning}>{error}</Text><GameButton title="Retry" tone="secondary" onPress={()=>void load()}/></Panel>}{snapshot?.entries.map(entry=><Panel key={entry.id}><View style={s.row}><View style={s.flex}><Text style={s.title}>{entry.name}</Text><Text style={s.copy}>{entry.category} · {entry.description}</Text><Text style={s.copy}>Progress {entry.progress}/{entry.required} · {entry.points} points</Text></View><View style={s.actions}><GameButton title={entry.claimed?'Claimed':entry.completed?'Claim':'Locked'} disabled={!entry.completed||entry.claimed||loading} onPress={()=>void claim(entry.id)}/>{entry.claimed&&<GameButton title={showcase.includes(entry.id)?'Shown':'Show'} tone="secondary" disabled={loading||(!showcase.includes(entry.id)&&showcase.length>=3)} onPress={()=>toggle(entry.id)}/>}</View></View></Panel>)}</ScrollView>
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},copy:{...typography.body,color:C.muted,lineHeight:21},score:{...typography.hero,color:C.accent,marginTop:spacing.md},warning:{...typography.bodyStrong,color:C.warning},row:{flexDirection:'row',gap:spacing.md,alignItems:'center'},flex:{flex:1,minWidth:0},actions:{gap:spacing.xs},button:{marginTop:spacing.md}});

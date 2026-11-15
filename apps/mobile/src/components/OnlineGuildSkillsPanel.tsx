import {useEffect,useMemo,useRef,useState} from 'react';
import {useGameplayText} from '../i18n/gameplay';
import {AppState,Platform,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {LoadingState} from './LoadingState';
import {GuildSpecializationPaths} from './GuildSpecializationPaths';
import {loadOnlineGuildSkills,upgradeOnlineGuildSkill,type GuildSkillsSnapshot} from '../online/guild-skills';
import {typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {openStoreListing} from '../online/app-version-gate';

/** Server-verified skill ranks and bank balances become the metrics record the
 * presentation reads, so nothing is invented on-device. */
function snapshotMetrics(snapshot:GuildSkillsSnapshot):Record<string,number>{
 const metrics:Record<string,number>={};
 for(const node of snapshot.nodes)metrics[`guild_skill_${node.id}`]=node.rank;
 for(const row of snapshot.bank)metrics[`guild_bank_${row.resourceId}`]=row.amount;
 return metrics;
}

const upgradeError:Record<string,string>={
 guild_skill_not_released:'This bonus is being finalised and cannot be purchased yet.',
 guild_skill_not_leader:'Only Officers and Leaders can allocate Guild Skills.',
 guild_skill_max_rank:'That skill is already at its maximum rank.',
 insufficient_skill_points:'No Guild Skill points remaining.',
 insufficient_guild_bank_materials:'The Guild Bank is missing required materials.',
 guild_membership_required:'Join a Guild to allocate Guild Skills.',
 guild_skill_request_conflict:'That upgrade is already being processed. Refresh to confirm.',
};

export function OnlineGuildSkillsPanel({onViewBank}:{onViewBank?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {gl,language}=useGameplayText();
 const de=(value:string)=>language==='de'?gl(value):value;
 const [snapshot,setSnapshot]=useState<GuildSkillsSnapshot|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[noticeSuccess,setNoticeSuccess]=useState(false);
 const mounted=useRef(true),upgradeFlight=useRef(false);

 const load=async()=>{
  if(!mounted.current)return;
  setLoading(true);
  try{
   const next=await loadOnlineGuildSkills();
   if(mounted.current){setSnapshot(next);setError('');}
  }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Unable to load Guild Skills.');}
  finally{if(mounted.current)setLoading(false);}
 };

 useEffect(()=>{
  mounted.current=true;
  void load();
  const listener=AppState.addEventListener('change',next=>{if(next==='active')void load()});
  return()=>{mounted.current=false;listener.remove();};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const releasedIds=useMemo(()=>new Set((snapshot?.nodes??[]).filter(n=>n.released).map(n=>n.id)),[snapshot]);
 const metrics=useMemo(()=>snapshot?snapshotMetrics(snapshot):undefined,[snapshot]);

 const spend=async(skillId:string)=>{
  if(!snapshot||busy||upgradeFlight.current)return;
  const node=snapshot.nodes.find(n=>n.id===skillId);
  if(!node)return;
  if(!node.released){setNotice(de(upgradeError.guild_skill_not_released));setNoticeSuccess(false);return;}
  upgradeFlight.current=true;
  setBusy(true);setNotice('');setNoticeSuccess(false);
  // Idempotent per (skill, target rank): a retry reuses the key, so a dropped
  // response can never charge the Guild Bank twice for the same rank.
  const requestKey=`${skillId}-r${node.rank+1}`;
  try{
   const result=await upgradeOnlineGuildSkill(skillId,requestKey);
   setNotice(result.alreadyProcessed?de('Already applied. Synced your ranks.'):language==='de'?`${de(node.name)} auf Rang ${result.rank} verbessert.`:`${node.name} upgraded to rank ${result.rank}.`);
   setNoticeSuccess(true);
   await load();
  }catch(reason){
   const code=reason instanceof Error?reason.message:'';
   setNotice(de(upgradeError[code]??'Could not complete the upgrade. Try again.'));setNoticeSuccess(false);
  }finally{upgradeFlight.current=false;if(mounted.current)setBusy(false);}
 };

 if(loading&&!snapshot)return <LoadingState label={de('Loading Guild Skills…')} detail={de('Reading authoritative skill points, ranks and Guild Bank materials.')}/>;
 if(error&&!snapshot){
  const updateRequired=error==='app_update_required';
  return <Panel>
   <Text style={s.title}>{de('Guild Skills')}</Text>
   <Text accessibilityRole="alert" style={updateRequired?s.copy:s.error}>{updateRequired?de('A newer version of VELDRYN is needed to view Guild Skills. Your other Guild activities are still available.'):de(error)}</Text>
   {updateRequired&&Platform.OS==='android'?<GameButton compact title={de('Check Google Play for update')} onPress={()=>openStoreListing()}/>:null}
   <GameButton compact tone="secondary" title={de(updateRequired?'Check again':'Retry')} loading={loading} disabled={loading} onPress={()=>void load()}/>
  </Panel>;
 }
 if(!snapshot)return <Panel><Text style={s.title}>{de('Guild Skills')}</Text><Text style={s.copy}>{de('Join a Guild to shape shared Skill Trees.')}</Text></Panel>;

 const noneReleased=releasedIds.size===0;
 return <View style={s.root}>
  {noneReleased?<View style={[s.releaseNotice,{backgroundColor:C.infoSurface,borderColor:C.info}]}><Text style={s.kicker}>{de('BONUSES ACTIVATING SOON')}</Text><Text style={s.copy}>{de('Skill ranks and materials can be reviewed. Upgrades remain disabled until released.')}</Text></View>:null}
  <GuildSpecializationPaths
   guildLevel={snapshot.guildLevel}
   skillPoints={snapshot.skillPoints}
   metrics={metrics}
   nodeCosts={Object.fromEntries(snapshot.nodes.map(node=>[node.id,node.costs]))}
   canUpgrade={snapshot.canUpgrade&&!busy&&!loading}
   isReleased={id=>releasedIds.has(id)}
   onSpend={id=>void spend(id)}
   onViewBank={onViewBank}
  />
  {busy?<Text accessibilityRole="alert" style={s.copy}>{de('Processing upgrade…')}</Text>:null}
  {notice?<Text accessibilityRole="alert" style={[s.notice,{color:noticeSuccess?C.good:C.warning}]}>{notice}</Text>:null}
  <GameButton compact tone="secondary" title={de(loading?'Refreshing…':'Refresh Guild Skills')} loading={loading} disabled={loading||busy} onPress={()=>void load()}/>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10,minWidth:0},
 releaseNotice:{gap:4,paddingHorizontal:11,paddingVertical:9,borderWidth:1,borderRadius:8},
 title:{...typography.title,color:C.text},
 kicker:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},
 copy:{fontSize:13,lineHeight:19,color:C.muted},
 error:{fontSize:13,color:C.bad},
 notice:{fontSize:12.5,fontWeight:'700'},
});}

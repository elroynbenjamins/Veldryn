import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {ForgeCraftResult} from '../core/game-commands';
import {equipmentCraftQueueModel} from '../core/equipment-crafting-queue';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {ForgeClaimBanner} from './ForgeResultFeedback';
import {ItemArtwork} from './ItemArtwork';

const NOOP=()=>{};

function duration(seconds:number){
  const s=Math.max(0,Math.ceil(seconds));
  if(s<60)return s+'s';
  const m=Math.ceil(s/60);
  return m<60?m+'m':Math.floor(m/60)+'h '+(m%60)+'m';
}

export function EquipmentCraftQueuePanel({state,onClaim,onClaimAll,onCancel,onMoveWaiting,forgeResults,onDismissForgeResults}:{state:GameState;onClaim:(jobId:string)=>void;onClaimAll:()=>void;onCancel:(jobId:string)=>void;onMoveWaiting:(jobId:string,direction:'up'|'down')=>void;forgeResults?:readonly ForgeCraftResult[]|null;onDismissForgeResults?:()=>void}){
  const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const [now,setNow]=useState(Date.now()),[showUnlocks,setShowUnlocks]=useState(false);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  const model=equipmentCraftQueueModel(state,now),earnedBonus=model.slotInfo.sources.filter(row=>row.id!=='base'&&row.earned).length;
  const readyJobs=model.jobs.filter(job=>job.status==='ready'),activeJobs=model.jobs.filter(job=>job.status==='active'),waitingJobs=model.jobs.filter(job=>job.status==='waiting');
  return <View style={s.card}>
    <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>EQUIPMENT FORGE</Text><Text style={s.title}>Crafting Queue</Text><Text style={s.meta}>{model.active}/{model.slotInfo.capacity} active · {model.waiting}/{model.waitingCapacity} waiting · {model.ready} finished</Text></View><View style={[s.slotBadge,{borderColor:model.freeSlots?C.good:C.warning}]}><Text style={[s.slotValue,{color:model.freeSlots?C.good:C.warning}]}>{model.slotInfo.capacity}</Text><Text style={s.slotLabel}>ACTIVE</Text></View></View>
    {!!forgeResults?.length&&<ForgeClaimBanner results={forgeResults} reduceMotion={state.settings.reduceMotion} onDismiss={onDismissForgeResults??NOOP}/>}

    {readyJobs.length>0&&<View style={s.group}><Text style={s.groupLabel}>FINISHED</Text>{readyJobs.map(job=><View key={job.id} style={[s.job,s.jobReady]}>{job.outputItemId?<ItemArtwork itemId={job.outputItemId} size={44}/>:null}<View style={s.flex}><Text style={s.jobName}>{job.name}</Text><Text style={s.meta}>Finished · ready to claim</Text></View><GameButton compact title="Claim" onPress={()=>onClaim(job.id)}/></View>)}</View>}

    {activeJobs.length>0&&<View style={s.group}><Text style={s.groupLabel}>CRAFTING NOW</Text>{activeJobs.map(job=>{const progress=Math.max(2,Math.min(100,100-(job.remainingSeconds/job.durationSeconds)*100));return <View key={job.id} style={s.job}>{job.outputItemId?<ItemArtwork itemId={job.outputItemId} size={44}/>:null}<View style={s.flex}><Text style={s.jobName}>{job.name}</Text><Text style={s.meta}>{duration(job.remainingSeconds)} remaining · {duration(job.durationSeconds)} craft</Text><View style={s.track}><View style={[s.fill,{width:(progress+'%') as `${number}%`}]}/></View></View><View style={s.jobActions}><Text style={s.running}>CRAFTING</Text><GameButton compact title="Cancel" tone="secondary" onPress={()=>onCancel(job.id)}/></View></View>})}</View>}

    {waitingJobs.length>0&&<View style={s.group}><View style={s.groupHead}><Text style={s.groupLabel}>WAITING BACKLOG</Text><Text style={s.meta}>{waitingJobs.length}/{model.waitingCapacity}</Text></View>{waitingJobs.map((job,index)=><View key={job.id} style={[s.job,s.jobWaiting]}>{job.outputItemId?<ItemArtwork itemId={job.outputItemId} size={44}/>:null}<View style={s.waitBadge}><Text style={s.waitNumber}>#{job.waitingPosition}</Text><Text style={s.waitText}>WAIT</Text></View><View style={s.flex}><Text style={s.jobName}>{job.name}</Text><Text style={s.meta}>Starts in ~{duration(job.startInSeconds)} · {duration(job.durationSeconds)} craft</Text><Text style={s.waitRefund}>Reserved · full refund before forge start</Text></View><View style={s.waitActions}><View style={s.priorityRow}><Pressable accessibilityRole="button" accessibilityLabel={'Move '+job.name+' earlier'} disabled={index===0} onPress={()=>onMoveWaiting(job.id,'up')} style={[s.priority,index===0&&s.disabled]}><Text style={s.priorityText}>↑</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={'Move '+job.name+' later'} disabled={index===waitingJobs.length-1} onPress={()=>onMoveWaiting(job.id,'down')} style={[s.priority,index===waitingJobs.length-1&&s.disabled]}><Text style={s.priorityText}>↓</Text></Pressable></View><GameButton compact title="Cancel" tone="secondary" onPress={()=>onCancel(job.id)}/></View></View>)}</View>}

    {!model.jobs.length?<Text style={s.empty}>No equipment is being crafted. Start a gear recipe below to use a forge slot.</Text>:null}
    {model.ready>1?<GameButton title={'Claim all finished · '+model.ready} onPress={onClaimAll}/>:null}
    <Text style={s.cancelNote}>Waiting cancellation: 100% materials + Gold. Active cancellation: 100% materials + 90% Gold.</Text>

    <Pressable accessibilityRole="button" accessibilityState={{expanded:showUnlocks}} onPress={()=>setShowUnlocks(value=>!value)} style={s.unlockToggle}><View style={s.flex}><Text style={s.unlockTitle}>Forge capacity · {model.slotInfo.capacity}/{model.slotInfo.max} active + {model.waitingCapacity} waiting</Text><Text style={s.meta}>{earnedBonus?earnedBonus+' bonus source'+(earnedBonus===1?'':'s')+' active':'3 base slots active'}</Text></View><Text style={s.chevron}>{showUnlocks?'−':'+'}</Text></Pressable>
    {showUnlocks&&<View style={s.sources}>{model.slotInfo.sources.map(row=><View key={row.id} style={s.source}><Text style={[s.sourceMark,row.earned?s.earned:s.locked]}>{row.earned?'✓':'○'}</Text><View style={s.flex}><Text style={s.sourceName}>{row.label}</Text><Text style={s.meta}>{row.id==='base'?'+3 base slots':'+1 active slot'+(model.slotInfo.capacity>=model.slotInfo.max&&row.earned?' · active cap reached':'')}</Text></View></View>)}<Text style={s.capNote}>Active slot bonuses stack to a maximum of 5. The separate waiting backlog always holds up to 5 reserved equipment crafts.</Text></View>}
  </View>;
}

function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
  card:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:E.line,borderRadius:radii.md,backgroundColor:E.panel},
  head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:E.goldSoft,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},meta:{...typography.caption,color:C.muted},
  slotBadge:{width:58,minHeight:48,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:radii.sm,backgroundColor:C.panel2},slotValue:{fontSize:20,lineHeight:23,fontWeight:'900'},slotLabel:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.6},
  group:{gap:5},groupHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},groupLabel:{fontSize:8,lineHeight:11,color:C.muted,fontWeight:'900',letterSpacing:.8},
  job:{minHeight:64,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},jobReady:{borderColor:C.good,backgroundColor:C.goodSurface},jobWaiting:{borderColor:C.info,backgroundColor:C.infoSurface},jobName:{...typography.bodyStrong,color:C.text},jobActions:{alignItems:'flex-end',gap:4},running:{...typography.caption,color:E.goldSoft,fontWeight:'900'},
  track:{height:5,marginTop:5,borderRadius:99,backgroundColor:C.bg,overflow:'hidden'},fill:{height:'100%',backgroundColor:E.selectedLine},empty:{...typography.body,color:C.muted,paddingVertical:4},cancelNote:{fontSize:9,lineHeight:13,color:C.muted},
  waitBadge:{width:38,minHeight:42,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.info,borderRadius:radii.sm},waitNumber:{fontSize:12,color:C.info,fontWeight:'900'},waitText:{fontSize:7,color:C.muted,fontWeight:'900'},waitRefund:{fontSize:8,lineHeight:11,color:C.good,fontWeight:'800'},waitActions:{alignItems:'flex-end',gap:4},priorityRow:{flexDirection:'row',gap:4},priority:{width:32,height:28,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.bg},priorityText:{fontSize:16,lineHeight:18,color:C.text,fontWeight:'900'},disabled:{opacity:.3},
  unlockToggle:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line,paddingTop:spacing.sm},unlockTitle:{...typography.bodyStrong,color:C.text},chevron:{fontSize:18,color:C.muted,fontWeight:'900'},
  sources:{gap:4},source:{minHeight:36,flexDirection:'row',alignItems:'center',gap:8},sourceMark:{width:18,textAlign:'center',fontWeight:'900'},earned:{color:C.good},locked:{color:C.muted},sourceName:{...typography.caption,color:C.text,fontWeight:'800'},capNote:{fontSize:9,lineHeight:13,color:C.muted,paddingTop:4},
});}

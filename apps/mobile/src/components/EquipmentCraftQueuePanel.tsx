import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {equipmentCraftQueueModel} from '../core/equipment-crafting-queue';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

function duration(seconds:number){
  const s=Math.max(0,Math.ceil(seconds));
  if(s<60)return s+'s';
  const m=Math.ceil(s/60);
  return m<60?m+'m':Math.floor(m/60)+'h '+(m%60)+'m';
}

export function EquipmentCraftQueuePanel({state,onClaim,onClaimAll}:{state:GameState;onClaim:(jobId:string)=>void;onClaimAll:()=>void}){
  const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const [now,setNow]=useState(Date.now()),[showUnlocks,setShowUnlocks]=useState(false);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  const model=equipmentCraftQueueModel(state,now),earnedBonus=model.slotInfo.sources.filter(row=>row.id!=='base'&&row.earned).length;
  return <View style={s.card}>
    <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>EQUIPMENT FORGE</Text><Text style={s.title}>Crafting Queue</Text><Text style={s.meta}>{model.active}/{model.slotInfo.capacity} active · {model.freeSlots} free · max {model.slotInfo.max}</Text></View><View style={[s.slotBadge,{borderColor:model.freeSlots?C.good:C.warning}]}><Text style={[s.slotValue,{color:model.freeSlots?C.good:C.warning}]}>{model.slotInfo.capacity}</Text><Text style={s.slotLabel}>SLOTS</Text></View></View>
    {model.jobs.length?<View style={s.jobs}>{model.jobs.map(job=><View key={job.id} style={[s.job,job.ready&&s.jobReady]}><View style={s.flex}><Text style={s.jobName}>{job.name}</Text><Text style={s.meta}>{job.ready?'Finished · ready to claim':duration(job.remainingSeconds)+' remaining'}</Text>{!job.ready&&<View style={s.track}><View style={[s.fill,{width:(Math.max(2,Math.min(100,100-(job.remainingSeconds/Math.max(1,(job.completesAtMs-job.startedAtMs)/1000))*100)))+'%'}]}/></View>}</View>{job.ready?<GameButton compact title="Claim" onPress={()=>onClaim(job.id)}/>:<Text style={s.running}>CRAFTING</Text>}</View>)}</View>:<Text style={s.empty}>No equipment is being crafted. Start a gear recipe below to use a slot.</Text>}
    {model.ready>1?<GameButton title={'Claim all finished · '+model.ready} onPress={onClaimAll}/>:null}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showUnlocks}} onPress={()=>setShowUnlocks(value=>!value)} style={s.unlockToggle}><View style={s.flex}><Text style={s.unlockTitle}>Queue slots · {model.slotInfo.capacity}/{model.slotInfo.max}</Text><Text style={s.meta}>{earnedBonus?earnedBonus+' bonus source'+(earnedBonus===1?'':'s')+' active':'3 base slots active'}</Text></View><Text style={s.chevron}>{showUnlocks?'−':'+'}</Text></Pressable>
    {showUnlocks&&<View style={s.sources}>{model.slotInfo.sources.map(row=><View key={row.id} style={s.source}><Text style={[s.sourceMark,row.earned?s.earned:s.locked]}>{row.earned?'✓':'○'}</Text><View style={s.flex}><Text style={s.sourceName}>{row.label}</Text><Text style={s.meta}>{row.id==='base'?'+3 base slots':'+1 slot'+(model.slotInfo.capacity>=model.slotInfo.max&&row.earned?' · cap already reached':'')}</Text></View></View>)}<Text style={s.capNote}>Bonuses stack, but the account-wide equipment crafting queue is always capped at 5 active slots.</Text></View>}
  </View>;
}

function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
  card:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:E.line,borderRadius:radii.md,backgroundColor:E.panel},
  head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:E.goldSoft,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},meta:{...typography.caption,color:C.muted},
  slotBadge:{width:58,minHeight:48,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:radii.sm,backgroundColor:C.panel2},slotValue:{fontSize:20,lineHeight:23,fontWeight:'900'},slotLabel:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.6},
  jobs:{gap:6},job:{minHeight:62,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},jobReady:{borderColor:C.good,backgroundColor:C.goodSurface},jobName:{...typography.bodyStrong,color:C.text},running:{...typography.caption,color:E.goldSoft,fontWeight:'900'},
  track:{height:5,marginTop:5,borderRadius:99,backgroundColor:C.bg,overflow:'hidden'},fill:{height:'100%',backgroundColor:E.selectedLine},empty:{...typography.body,color:C.muted,paddingVertical:4},
  unlockToggle:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line,paddingTop:spacing.sm},unlockTitle:{...typography.bodyStrong,color:C.text},chevron:{fontSize:18,color:C.muted,fontWeight:'900'},
  sources:{gap:4},source:{minHeight:36,flexDirection:'row',alignItems:'center',gap:8},sourceMark:{width:18,textAlign:'center',fontWeight:'900'},earned:{color:C.good},locked:{color:C.muted},sourceName:{...typography.caption,color:C.text,fontWeight:'800'},capNote:{fontSize:9,lineHeight:13,color:C.muted,paddingTop:4},
});}

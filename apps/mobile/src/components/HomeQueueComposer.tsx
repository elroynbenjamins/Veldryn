import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {ActivityQueueGoal,GameState,QueuedActivity} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {ALCHEMY_RECIPES} from '../content/alchemy';
import {WORLD_ZONES} from '../content/world-map';
import {activityQueueCapacity,activityQueueHandoffStatus,enqueueActivity,normalizeActivityQueue,queuedActivityPlanningReadiness,queuedActivityReadiness} from '../core/activity-queue';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {GameButton} from './GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

type Category='combat'|'gathering'|'crafting';
type Preset='kills50'|'kills100'|'time15'|'time30'|'items100'|'items250'|'nextLevel'|'open';
type Candidate={id:string;name:string;subtitle:string;activity:QueuedActivity;level?:number};
type Props={visible:boolean;state:GameState;onClose:()=>void;onAdd:(entry:QueuedActivity)=>Promise<boolean>;onSetCurrentGoal:(goal:ActivityQueueGoal)=>Promise<boolean>;onOpenSkills:()=>void};

export function HomeQueueComposer({visible,state,onClose,onAdd,onSetCurrentGoal,onOpenSkills}:Props){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [category,setCategory]=useState<Category>('combat');
 const [selectedId,setSelectedId]=useState('');
 const [preset,setPreset]=useState<Preset>('kills50');
 const [busy,setBusy]=useState(false);
 const region=WORLD_ZONES.find(row=>row.id===state.currentRegionId);
 const alchemyLevel=state.skills.find(row=>row.skillId==='alchemy')?.level??1;
 const combat:Candidate[]=MONSTERS.filter(row=>!row.boss&&row.zone===region?.name&&state.unlockedMonsterIds.includes(row.id)).map(row=>({id:row.id,name:row.name,subtitle:'Level '+row.level+' · '+region?.name,activity:{kind:'combat',targetId:row.id}}));
 const gathering:Candidate[]=[...GATHERING,...HERB_NODES].filter(row=>row.zoneId===state.currentRegionId&&(state.skills.find(skill=>skill.skillId===row.skillId)?.level??1)>=row.unlockLevel).map(row=>({id:row.id,name:row.name,subtitle:row.skillId+' · Level '+row.unlockLevel,activity:{kind:'gathering',targetId:row.id},level:state.skills.find(skill=>skill.skillId===row.skillId)?.level??1}));
 const crafting:Candidate[]=ALCHEMY_RECIPES.filter(row=>row.level<=alchemyLevel).map(row=>({id:row.id,name:row.name,subtitle:'Alchemy · Level '+row.level,activity:{kind:'alchemy',targetId:row.id}}));
 const candidates=category==='combat'?combat:category==='gathering'?gathering:crafting;
 const selected=candidates.find(row=>row.id===selectedId)??candidates[0];
 const capacity=activityQueueCapacity(state),queue=normalizeActivityQueue(state.character?.activityQueue,capacity),full=queue.length>=capacity;
 const options:{id:Preset;label:string}[]=category==='combat'?[{id:'kills50',label:'50 defeats'},{id:'kills100',label:'100 defeats'},{id:'time15',label:'15 minutes'},{id:'time30',label:'30 minutes'},{id:'open',label:'No auto-stop'}]:
 category==='gathering'?[{id:'items100',label:'100 resources'},{id:'items250',label:'250 resources'},{id:'time15',label:'15 minutes'},{id:'time30',label:'30 minutes'},...(selected&&selected.level!==undefined&&selected.level<100?[{id:'nextLevel' as const,label:'Next skill level'}]:[]),{id:'open',label:'No auto-stop'}]:[];
 const chosen=options.some(row=>row.id===preset)?preset:category==='combat'?'kills50':'items100';
 const goal:ActivityQueueGoal|undefined=chosen==='kills50'?{kind:'session_kills',value:50}:chosen==='kills100'?{kind:'session_kills',value:100}:chosen==='items100'?{kind:'item_quantity',value:100}:chosen==='items250'?{kind:'item_quantity',value:250}:chosen==='time15'?{kind:'duration_seconds',value:900}:chosen==='time30'?{kind:'duration_seconds',value:1800}:chosen==='nextLevel'&&selected?.level!==undefined?{kind:'skill_level',value:Math.min(100,selected.level+1)}:undefined;
 const entry:QueuedActivity|undefined=selected?{...selected.activity,...(category!=='crafting'&&goal?{goal}:{})}:undefined;
 const runtime=queuedActivityReadiness(state,entry),planning=queuedActivityPlanningReadiness(state,entry);
 // A missing ingredient is a valid Alchemy plan, but will block execution until available.
 const canAdd=!!entry&&!full&&planning.ready&&!busy;
 let preview=activityQueueHandoffStatus(state);
 if(entry&&!full&&queue.length===0){try{preview=activityQueueHandoffStatus(enqueueActivity(state,entry));}catch{/* Surface the full/invalid warning instead. */}}
 const hasActive=!!state.activity;
 const needsHandoff=hasActive&&queue.length===0&&!preview.armed&&!state.activity?.queueGoalCompletedAtMs;
 const canSetCurrentGoal=needsHandoff&&!!state.activity&&['combat','mining','woodcutting','fishing','herbalism'].includes(state.activity.kind);
 const selectCategory=(next:Category)=>{setCategory(next);setSelectedId('');setPreset(next==='combat'?'kills50':next==='gathering'?'items100':'open');};
 const add=async()=>{if(!entry||!canAdd)return;setBusy(true);try{if(await onAdd(entry))onClose();}finally{setBusy(false)}};
 const setHandoff=async()=>{if(!canSetCurrentGoal||busy)return;setBusy(true);try{await onSetCurrentGoal({kind:'duration_seconds',value:1800});}finally{setBusy(false)}};
 return <GameModalSurface visible={visible} reduceMotion={state.settings.reduceMotion} onClose={onClose} dismissOnBackdrop={!busy} surfaceStyle={s.surface}>
   <GameModalHeader eyebrow="HOME · COMMAND DECK" title="Add to activity queue" onClose={onClose} closeDisabled={busy}/>
   <View style={s.headline}><Text style={s.muted}>Choose a job for the next free queue slot.</Text><Text style={s.count}>{queue.length}/{capacity} queued</Text></View>
   <View style={s.tabs}>
    {([['combat','Combat'],['gathering','Gathering'],['crafting','Crafting']] as const).map(([id,label])=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:category===id}} onPress={()=>selectCategory(id)} style={[s.tab,category===id&&s.activeTab]}><Text style={[s.tabLabel,category===id&&s.activeTabLabel]}>{label}</Text></Pressable>)}
   </View>
   <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    {category==='crafting'?<View style={s.note}><Text style={s.infoStrong}>Alchemy reservations</Text><Text style={s.muted}>Alchemy is supported in the activity queue. Equipment Forge and Cooking have independent crafting flows; no automatic multi-step crafting is implied.</Text><GameButton compact title="Open Skills / Forge" tone="secondary" onPress={()=>{onClose();onOpenSkills();}}/></View>:null}
    {category!=='crafting'?<Text style={s.section}>AVAILABLE IN {region?.name?.toUpperCase()??'THIS REGION'}</Text>:<Text style={s.section}>UNLOCKED ALCHEMY RECIPES</Text>}
    {candidates.length===0?<View style={s.note}><Text style={s.name}>No activities unlocked here yet</Text><Text style={s.muted}>Visit the appropriate Combat or Skills screen to unlock more options, or travel to another region.</Text></View>:candidates.map(row=>{
      const ready=queuedActivityReadiness(state,row.activity),plan=queuedActivityPlanningReadiness(state,row.activity);
      return <Pressable key={row.id} accessibilityRole="radio" accessibilityState={{checked:selected?.id===row.id,disabled:!plan.ready}} disabled={!plan.ready||busy} onPress={()=>setSelectedId(row.id)} style={[s.option,selected?.id===row.id&&s.optionSelected,!plan.ready&&s.unavailable]}>
       <View style={[s.radio,selected?.id===row.id&&s.radioSelected]}/>
       <View style={s.optionCopy}><Text style={s.name}>{row.name}</Text><Text style={s.muted}>{row.subtitle}</Text>{!ready.ready?<Text style={s.warning}>{ready.blocker??'Not ready'}</Text>:null}</View>
       <Text style={[s.ready,ready.ready?s.good:!plan.ready?s.warning:s.info]}>{ready.ready?'READY':plan.ready?'PLANNED':'LOCKED'}</Text>
      </Pressable>;
    })}
    {selected&&category!=='crafting'?<View style={s.goals}><Text style={s.section}>STOP / HANDOFF TARGET</Text><View style={s.goalGrid}>{options.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:chosen===option.id}} disabled={busy} onPress={()=>setPreset(option.id)} style={[s.chip,chosen===option.id&&s.chipSelected]}><Text style={[s.chipText,chosen===option.id&&s.chipTextSelected]}>{option.label}</Text></Pressable>)}</View>{chosen==='open'?<Text style={s.warning}>Without a goal this activity continues until stopped or interrupted. It cannot automatically hand off to the following activity.</Text>:<Text style={s.muted}>This target applies to the selected queued activity after it starts, not to the current running activity.</Text>}</View>:null}
    {entry?<View style={s.safety}><Text style={s.section}>READINESS & HANDOFF SAFETY</Text><Text style={runtime.ready?s.good:s.warning}>{runtime.ready?'● Can run with current unlocks and location.':'● '+(runtime.blocker??'Activity not ready.')}</Text>{category==='crafting'&&!runtime.ready&&planning.ready?<Text style={s.muted}>You can plan this recipe, but the queue will pause until the required ingredients and Gold are available.</Text>:null}
      {full?<Text style={s.warning}>Queue is full. Remove an entry before adding another.</Text>:hasActive&&queue.length>0?<Text style={s.muted}>This job will follow the {queue.length} already queued {queue.length===1?'entry':'entries'}. Existing handoff goals and safety rules remain in control.</Text>:needsHandoff?<><Text style={s.warning}>The current activity has no eligible automatic stop. This queued job will wait until you stop it or set a valid target.</Text>{canSetCurrentGoal?<GameButton compact title={busy?'Setting handoff…':'Set current activity to stop in 30m'} disabled={busy} tone="secondary" onPress={()=>void setHandoff()}/>:null}</>:hasActive?<Text style={preview.armed?s.good:s.muted}>{preview.armed?'A handoff trigger is configured for the active activity.':'The current activity must finish or stop before the next job begins.'}</Text>:<Text style={s.muted}>No activity is running. Add this job, then use Start next from the queue.</Text>}
      {preview.safetyEnabled?<Text style={s.muted}>Your configured food, inventory and recovery safety rules remain active.</Text>:null}
      <Text style={s.muted}>Ready means the queue accepts this activity; it does not guarantee combat survival, free inventory space or future materials.</Text>
    </View>:null}
   </ScrollView>
   <View style={s.footer}><GameButton compact title="Cancel" tone="secondary" disabled={busy} onPress={onClose}/><View style={s.action}><GameButton title={busy?'Adding…':full?'Queue full':'Add to queue'} disabled={!canAdd} onPress={()=>void add()}/></View></View>
 </GameModalSurface>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 surface:{maxWidth:640},
 headline:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,paddingBottom:12},
 muted:{fontSize:11,lineHeight:16,color:C.muted},count:{fontSize:11,fontWeight:'800',color:C.accent},
 tabs:{flexDirection:'row',gap:5,paddingBottom:8},tab:{flex:1,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:C.panel},
 activeTab:{backgroundColor:C.selection,borderColor:C.selectionLine},tabLabel:{fontSize:12,fontWeight:'700',color:C.muted},activeTabLabel:{color:C.text},
 scroll:{flexGrow:0,maxHeight:440},content:{gap:8,paddingBottom:14},
 section:{fontSize:10,fontWeight:'900',letterSpacing:.7,color:C.accent},
 option:{minHeight:58,padding:9,borderWidth:1,borderRadius:9,borderColor:C.line,backgroundColor:C.panel,flexDirection:'row',alignItems:'center',gap:10},
 optionSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 unavailable:{opacity:.55},radio:{width:15,height:15,borderRadius:8,borderWidth:2,borderColor:C.lineStrong},radioSelected:{borderColor:C.accent,backgroundColor:C.accent},
 optionCopy:{flex:1,minWidth:0,gap:3},name:{fontSize:12,fontWeight:'800',color:C.text},ready:{fontSize:9,fontWeight:'900'},
 good:{color:C.good},info:{color:C.info},warning:{color:C.warning},
 goals:{gap:9,padding:11,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 goalGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{minHeight:40,minWidth:90,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},chipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},chipText:{fontSize:11,fontWeight:'700',color:C.muted},chipTextSelected:{color:C.text},
 safety:{gap:8,padding:11,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface,borderRadius:8},
 note:{gap:7,padding:10,backgroundColor:C.panelRaised,borderRadius:8},infoStrong:{fontSize:12,fontWeight:'800',color:C.info},
 footer:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderTopWidth:1,borderColor:C.line},action:{flex:1}
});}

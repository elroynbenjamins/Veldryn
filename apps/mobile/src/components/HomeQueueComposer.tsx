import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {ActivityQueueGoal,GameState,QueuedActivity} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {ALCHEMY_RECIPES} from '../content/alchemy';
import {WORLD_ZONES} from '../content/world-map';
import {activityQueueAvailableRegions,activityQueueCrossRegionAllowed,activityQueueCapacity,activityQueueGoalCurrentValue,activityQueueGoalIssue,activityQueueHandoffStatus,currentActivityHandoffGoalIssue,enqueueActivity,normalizeActivityQueue,queuedActivityPlanningReadiness,queuedActivityReadiness} from '../core/activity-queue';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {GameButton} from './GameButton';
import {ActivityArtwork} from './ActivityArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

type Category='combat'|'gathering'|'crafting';
type Preset='kills50'|'kills100'|'time15'|'time30'|'items100'|'items250'|'nextLevel'|'open';
type Candidate={id:string;name:string;subtitle:string;activity:QueuedActivity;level?:number};
type CurrentHandoffChoice='30m'|'60m'|'next_level'|'keep_running';
type CurrentHandoffPlan={targetId:string;goal?:ActivityQueueGoal;keepCurrentRunning?:true};
type Props={visible:boolean;state:GameState;onClose:()=>void;onAdd:(entry:QueuedActivity,handoff?:CurrentHandoffPlan)=>Promise<boolean>;onOpenSkills:()=>void};

export function HomeQueueComposer({visible,state,onClose,onAdd,onOpenSkills}:Props){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [category,setCategory]=useState<Category>('combat');
 const [selectedId,setSelectedId]=useState('');
 const [preset,setPreset]=useState<Preset>('kills50');
 const [handoffChoice,setHandoffChoice]=useState<CurrentHandoffChoice>('30m');
 const [busy,setBusy]=useState(false);
 const [regionId,setRegionId]=useState(state.currentRegionId);
 const regions=activityQueueAvailableRegions(state),premium=activityQueueCrossRegionAllowed(state);
 const selectedRegionId=regions.some(row=>row.id===regionId)?regionId:state.currentRegionId;
 const region=WORLD_ZONES.find(row=>row.id===selectedRegionId);
 useEffect(()=>{if(visible){setRegionId(state.currentRegionId);setSelectedId('');setHandoffChoice('30m');}},[visible,state.currentRegionId]);
 const alchemyLevel=state.skills.find(row=>row.skillId==='alchemy')?.level??1;
 const combat:Candidate[]=MONSTERS.filter(row=>!row.boss&&row.zone===region?.name&&state.unlockedMonsterIds.includes(row.id)).map(row=>({id:row.id,name:row.name,subtitle:'Level '+row.level+' · '+region?.name,activity:{kind:'combat',targetId:row.id}}));
 const gathering:Candidate[]=[...GATHERING,...HERB_NODES].filter(row=>row.zoneId===selectedRegionId&&(state.skills.find(skill=>skill.skillId===row.skillId)?.level??1)>=row.unlockLevel).map(row=>({id:row.id,name:row.name,subtitle:row.skillId+' · Level '+row.unlockLevel,activity:{kind:'gathering',targetId:row.id},level:state.skills.find(skill=>skill.skillId===row.skillId)?.level??1}));
 const crafting:Candidate[]=ALCHEMY_RECIPES.filter(row=>row.level<=alchemyLevel).map(row=>({id:row.id,name:row.name,subtitle:'Alchemy · Level '+row.level,activity:{kind:'alchemy',targetId:row.id}}));
 const candidates=category==='combat'?combat:category==='gathering'?gathering:crafting;
 const selected=candidates.find(row=>row.id===selectedId)??candidates[0];
 const capacity=activityQueueCapacity(state),queue=normalizeActivityQueue(state.character?.activityQueue,capacity),full=queue.length>=capacity;
 const stored=selected?activityQueueGoalCurrentValue(state,{...selected.activity,goal:{kind:'item_quantity',value:1}})??0:0;
 const options:{id:Preset;label:string}[]=category==='combat'?[{id:'kills50',label:'50 defeats'},{id:'kills100',label:'100 defeats'},{id:'time15',label:'15 minutes'},{id:'time30',label:'30 minutes'},{id:'open',label:'No auto-stop'}]:
 category==='gathering'?[{id:'items100',label:'+100 in storage'},{id:'items250',label:'+250 in storage'},{id:'time15',label:'15 minutes'},{id:'time30',label:'30 minutes'},...(selected&&selected.level!==undefined&&selected.level<100?[{id:'nextLevel' as const,label:'Next skill level'}]:[]),{id:'open',label:'No auto-stop'}]:[];
 const chosen=options.some(row=>row.id===preset)?preset:category==='combat'?'kills50':'time30';
 const goal:ActivityQueueGoal|undefined=chosen==='kills50'?{kind:'session_kills',value:50}:chosen==='kills100'?{kind:'session_kills',value:100}:chosen==='items100'?{kind:'item_quantity',value:Math.min(1000000,stored+100)}:chosen==='items250'?{kind:'item_quantity',value:Math.min(1000000,stored+250)}:chosen==='time15'?{kind:'duration_seconds',value:900}:chosen==='time30'?{kind:'duration_seconds',value:1800}:chosen==='nextLevel'&&selected?.level!==undefined?{kind:'skill_level',value:Math.min(100,selected.level+1)}:undefined;
 const entry:QueuedActivity|undefined=selected?{...selected.activity,...(category!=='crafting'&&goal?{goal}:{})}:undefined;
 const runtime=queuedActivityReadiness(state,entry),planning=queuedActivityPlanningReadiness(state,entry);
 const goalIssue=entry?activityQueueGoalIssue(state,entry):undefined;
 // Missing Alchemy ingredients may be planned, but execution waits for materials.
 let preview=activityQueueHandoffStatus(state);
 if(entry&&!full&&queue.length===0){try{preview=activityQueueHandoffStatus(enqueueActivity(state,entry));}catch{/* Surface the full/invalid warning instead. */}}
 const hasActive=!!state.activity;
 const needsHandoff=hasActive&&queue.length===0&&!preview.armed&&!state.activity?.queueGoalCompletedAtMs;
 const canSetCurrentGoal=needsHandoff&&!!state.activity&&['combat','mining','woodcutting','fishing','herbalism'].includes(state.activity.kind);
 const currentActivity=state.activity;
 const currentSkill= currentActivity&&currentActivity.kind!=='combat'
  ?[...GATHERING,...HERB_NODES].find(row=>row.id===currentActivity.targetId)?.skillId:undefined;
 const currentLevel=currentSkill?state.skills.find(row=>row.skillId===currentSkill)?.level??1:undefined;
 const canNextLevel=canSetCurrentGoal&&currentLevel!==undefined&&currentLevel<100;
 const handoffGoal:ActivityQueueGoal|undefined=canSetCurrentGoal?
  handoffChoice==='30m'?{kind:'duration_seconds',value:1800}:
  handoffChoice==='60m'?{kind:'duration_seconds',value:3600}:
  handoffChoice==='next_level'&&canNextLevel?{kind:'skill_level',value:currentLevel!+1}:undefined:undefined;
 const explicitKeep=handoffChoice==='keep_running'||!canSetCurrentGoal;
 const handoffIssue=needsHandoff&&!explicitKeep&&currentActivity
  ?handoffGoal?currentActivityHandoffGoalIssue(state,currentActivity.targetId,handoffGoal):'Choose a valid handoff option.':undefined;
 const canAdd=!!entry&&!full&&planning.ready&&!goalIssue&&!busy&&(!needsHandoff||explicitKeep||!!handoffGoal)&&!handoffIssue;
 const selectCategory=(next:Category)=>{setCategory(next);setSelectedId('');setPreset(next==='combat'?'kills50':next==='gathering'?'time30':'open');};
 const add=async()=>{if(!entry||!canAdd)return;setBusy(true);try{
  const handoff=needsHandoff&&currentActivity
   ?{targetId:currentActivity.targetId,...(explicitKeep?{keepCurrentRunning:true as const}:{goal:handoffGoal})}:undefined;
  if(await onAdd(entry,handoff))onClose();
 }finally{setBusy(false)}};
 return <GameModalSurface visible={visible} reduceMotion={state.settings.reduceMotion} onClose={onClose} dismissOnBackdrop={!busy} surfaceStyle={s.surface}>
   <GameModalHeader eyebrow="HOME · COMMAND DECK" title="Add to activity queue" onClose={onClose} closeDisabled={busy}/>
   <View style={s.headline}><Text style={s.muted}>Choose a job for the next free queue slot.</Text><Text style={s.count}>{queue.length}/{capacity} queued</Text></View>
   <View style={s.tabs}>
    {([['combat','Combat'],['gathering','Gathering'],['crafting','Crafting']] as const).map(([id,label])=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:category===id}} onPress={()=>selectCategory(id)} style={[s.tab,category===id&&s.activeTab]}><Text style={[s.tabLabel,category===id&&s.activeTabLabel]}>{label}</Text></Pressable>)}
   </View>
   <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    {category==='crafting'?<View style={s.note}><Text style={s.infoStrong}>Alchemy reservations</Text><Text style={s.muted}>Alchemy is supported in the activity queue. Equipment Forge and Cooking have independent crafting flows; no automatic multi-step crafting is implied.</Text><GameButton compact title="Open Skills / Forge" tone="secondary" onPress={()=>{onClose();onOpenSkills();}}/></View>:null}
    {category!=='crafting'&&premium?<View style={s.note}><Text style={s.section}>UNLOCKED QUEUE REGIONS</Text><View style={s.goalGrid}>{regions.map(zone=><Pressable key={zone.id} accessibilityRole="radio" accessibilityState={{checked:zone.id===selectedRegionId}} disabled={busy} onPress={()=>{setRegionId(zone.id);setSelectedId('');}} style={[s.chip,zone.id===selectedRegionId&&s.chipSelected]}><Text style={[s.chipText,zone.id===selectedRegionId&&s.chipTextSelected]}>{zone.id===selectedRegionId?'✓ ':''}{zone.name}</Text></Pressable>)}</View>{selectedRegionId!==state.currentRegionId?<Text style={s.muted}>{state.settings.autoTravelQueuedActivities?'Auto-travel will switch to this unlocked region at a normal queue handoff.':'Auto-travel is disabled. You can plan this activity now, but must enable Auto-travel in Gameplay Settings or travel manually before it starts.'}</Text>:null}</View>:null}
    {category!=='crafting'?<Text style={s.section}>AVAILABLE IN {region?.name?.toUpperCase()??'THIS REGION'}</Text>:<Text style={s.section}>UNLOCKED ALCHEMY RECIPES</Text>} 
    {candidates.length===0?<View style={s.note}><Text style={s.name}>No activities unlocked here yet</Text><Text style={s.muted}>Visit the appropriate Combat or Skills screen to unlock more options, or travel to another region.</Text></View>:candidates.map(row=>{
      const ready=queuedActivityReadiness(state,row.activity),plan=queuedActivityPlanningReadiness(state,row.activity);
      return <Pressable key={row.id} accessibilityRole="radio" accessibilityState={{checked:selected?.id===row.id,disabled:!plan.ready}} disabled={!plan.ready||busy} onPress={()=>setSelectedId(row.id)} style={[s.option,selected?.id===row.id&&s.optionSelected,!plan.ready&&s.unavailable]}>
       <View style={[s.radio,selected?.id===row.id&&s.radioSelected]}/><View style={s.artwork}>{row.activity.kind==='combat'?<MonsterPortraitFrame monster={MONSTERS.find(monster=>monster.id===row.id)!} size={34} framed={false} reduceMotion={state.settings.reduceMotion}/>:<ActivityArtwork id={row.activity.kind==='alchemy'?'alchemy':([...GATHERING,...HERB_NODES].find(node=>node.id===row.id)?.skillId??'mining')} size={32}/>}</View>
       <View style={s.optionCopy}><Text style={s.name}>{row.name}</Text><Text style={s.muted}>{row.subtitle}</Text>{!ready.ready?<Text style={s.warning}>{ready.blocker??'Not ready'}</Text>:null}</View>
       <Text style={[s.ready,ready.ready?s.good:!plan.ready?s.warning:s.info]}>{ready.ready?'READY':plan.ready?'PLANNED':'LOCKED'}</Text>
      </Pressable>;
    })}
    {selected&&category!=='crafting'?<View style={s.goals}><Text style={s.section}>STOP / HANDOFF TARGET</Text><View style={s.goalGrid}>{options.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:chosen===option.id}} disabled={busy} onPress={()=>setPreset(option.id)} style={[s.chip,chosen===option.id&&s.chipSelected]}><Text style={[s.chipText,chosen===option.id&&s.chipTextSelected]}>{option.label}</Text></Pressable>)}</View>{goalIssue?<Text accessibilityRole="alert" style={s.warning}>{goalIssue}</Text>:null}{chosen==='open'?<Text style={s.warning}>Without a queue goal, this activity does not trigger a handoff by itself. Applicable idle rules may still stop it.</Text>:<Text style={s.muted}>{chosen==='items100'||chosen==='items250'?`You hold ${stored.toLocaleString()} now. Stop at ${goal?.value.toLocaleString()} total across inventory, bank and overflow. `:''}This target applies after the queued activity starts, not to the current activity.</Text>}</View>:null}
    {needsHandoff&&currentActivity?<View style={s.goals}>
      <Text style={s.section}>CURRENT ACTIVITY HANDOFF</Text>
      <Text style={s.name}>{currentActivity.kind==='combat'?'Combat':currentSkill??currentActivity.kind} is running</Text>
      <Text style={s.muted}>Choose when to leave your current activity. A 30-minute stop begins when you confirm this queue entry.</Text>
      {canSetCurrentGoal?<View style={s.goalGrid}>
       {([['30m','After 30 minutes'],['60m','After 60 minutes'],...(canNextLevel?[['next_level','At next skill level']]:[]),['keep_running','Keep running · queue waits']] as Array<[CurrentHandoffChoice,string]>).map(([id,label])=><Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:handoffChoice===id}} disabled={busy} onPress={()=>setHandoffChoice(id)} style={[s.chip,handoffChoice===id&&s.chipSelected]}><Text style={[s.chipText,handoffChoice===id&&s.chipTextSelected]}>{handoffChoice===id?'✓ ':''}{label}</Text></Pressable>)}
      </View>:<Text style={s.warning}>This activity cannot accept a custom handoff target. It must finish on its own, or you must stop it manually.</Text>}
      {handoffIssue?<Text accessibilityRole="alert" style={s.warning}>{handoffIssue}</Text>:null}
      {explicitKeep?<Text accessibilityRole="alert" style={s.warning}>Queued activities will NOT start automatically while the current activity continues. Stop it manually or configure an applicable stop rule.</Text>:<Text style={s.good}>● The queue will advance after this goal, provided the next activity is ready and safety rules allow it.</Text>}
     </View>:null}
    {entry?<View style={s.safety}><Text style={s.section}>READINESS & HANDOFF SAFETY</Text><Text style={runtime.ready?s.good:s.warning}>{runtime.ready?'● Can run with current unlocks and location.':'● '+(runtime.blocker??'Activity not ready.')}</Text>{category==='crafting'&&!runtime.ready&&planning.ready?<Text style={s.muted}>You can plan this recipe, but the queue will pause until the required ingredients and Gold are available.</Text>:null}
      {full?<Text style={s.warning}>Queue is full. Remove an entry before adding another.</Text>:hasActive&&queue.length>0?<Text style={s.muted}>This job will follow the {queue.length} already queued {queue.length===1?'entry':'entries'}. Existing handoff goals and safety rules remain in control.</Text>:needsHandoff?<Text style={explicitKeep?s.warning:s.muted}>{explicitKeep?'Your queue will wait for a manual stop or eligible idle rule.':'Your selected stop is saved atomically with the queued activity. You can close the app after saving.'}</Text>:hasActive?<Text style={preview.armed?s.good:s.muted}>{preview.armed?'A handoff trigger is configured for the active activity.':'The current activity must finish or stop before the next job begins.'}</Text>:<Text style={s.muted}>No activity is running. Add this job, then use Start next from the queue.</Text>}
      {preview.safetyEnabled?<Text style={s.muted}>Your configured food, inventory and recovery safety rules remain active.</Text>:null}
      <Text style={s.muted}>Ready means the queue accepts this activity; it does not guarantee combat survival, free inventory space or future materials.</Text>
    </View>:null}
   </ScrollView>
   <View style={s.footer}><GameButton compact title="Cancel" tone="secondary" disabled={busy} onPress={onClose}/><View style={s.action}><GameButton title={busy?'Adding…':full?'Queue full':needsHandoff?'Confirm handoff & add':'Add to queue'} disabled={!canAdd} onPress={()=>void add()}/></View></View>
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
 artwork:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:7,backgroundColor:C.stage},optionCopy:{flex:1,minWidth:0,gap:3},name:{fontSize:12,fontWeight:'800',color:C.text},ready:{fontSize:9,fontWeight:'900'},
 good:{color:C.good},info:{color:C.info},warning:{color:C.warning},
 goals:{gap:9,padding:11,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 goalGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{minHeight:40,minWidth:90,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},chipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},chipText:{fontSize:11,fontWeight:'700',color:C.muted},chipTextSelected:{color:C.text},
 safety:{gap:8,padding:11,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface,borderRadius:8},
 note:{gap:7,padding:10,backgroundColor:C.panelRaised,borderRadius:8},infoStrong:{fontSize:12,fontWeight:'800',color:C.info},
 footer:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderTopWidth:1,borderColor:C.line},action:{flex:1}
});}

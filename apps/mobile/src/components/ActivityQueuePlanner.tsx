import {useGameplayText} from '../i18n/gameplay';
import {useMemo,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import type {ActivityQueueGoal,GameState,GatheringSkillId,QueuedActivity} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {activityQueueCapacity,activityQueueRegion,activityQueueAvailableRegions,activityQueueCrossRegionAllowed,activityQueueGoalIssue,currentActivityNeedsQueueHandoff,currentActivityHandoffGoalIssue,normalizeActivityQueueGoal,queuedActivityReadiness,queuedActivityPlanningReadiness,queueSkillReadiness} from '../core/activity-queue';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {FAITH_TIERS,HOLY_WATER_ID} from '../content/faith';
import {EXPLORATION_ROUTES} from '../content/exploration';
import {ALCHEMY_RECIPES} from '../content/alchemy';
import {WORLD_ZONES} from '../content/world-map';
import {itemDef} from '../content/items';
import {useGameTheme} from '../theme/ThemeContext';
import {uiIcons} from '../theme/ui-icons';
import type {ThemeColors} from '../theme/theme';
import {ResourceArtwork} from './ResourceArtwork';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ActivityArtwork} from './ActivityArtwork';
import {ActionQueuePanel} from './ActionQueuePanel';
import {processingRecipeDef} from '../core/processing';

const goals:Array<{kind:ActivityQueueGoal['kind'];label:string}>=[
 {kind:'item_quantity',label:'Resource quantity'},
 {kind:'skill_level',label:'Skill level'},
 {kind:'duration_seconds',label:'Duration'},
 {kind:'session_kills',label:'Enemies defeated'},
];
type QueueSkillId=GatheringSkillId|'combat'|'faith'|'exploration'|'alchemy'|'smithing'|'cooking';
const skills:Array<{id:QueueSkillId;label:string}>=[{id:'combat',label:'Combat'},{id:'woodcutting',label:'Woodcutting'},{id:'mining',label:'Mining'},{id:'fishing',label:'Fishing'},{id:'herbalism',label:'Herbalism'},{id:'smithing',label:'Smithing'},{id:'cooking',label:'Cooking'},{id:'alchemy',label:'Alchemy'},{id:'faith',label:'Faith'},{id:'exploration',label:'Exploration'}];
const activities:Array<{id:string;name:string;skillId:QueueSkillId;itemId?:string}>=[...GATHERING,...HERB_NODES,...MONSTERS.filter(row=>!row.boss).map(row=>({id:row.id,name:row.name,skillId:'combat' as const})),...RECIPES.filter(recipe=>(recipe.skillId==='smithing'||recipe.skillId==='cooking')&&!!processingRecipeDef(recipe.id)).map(recipe=>({id:recipe.id,name:recipe.name,skillId:recipe.skillId as 'smithing'|'cooking'})),...ALCHEMY_RECIPES.map(row=>({id:row.id,name:row.name,skillId:'alchemy' as const})),...FAITH_TIERS.map(row=>({id:row.id,name:row.name,skillId:'faith' as const,itemId:HOLY_WATER_ID})),...EXPLORATION_ROUTES.map(row=>({id:row.id,name:row.name,skillId:'exploration' as const}))];
function queueKindForSkill(skillId:QueueSkillId):QueuedActivity['kind']{return skillId==='combat'?'combat':skillId==='faith'?'faith':skillId==='exploration'?'exploration':skillId==='alchemy'?'alchemy':skillId==='smithing'||skillId==='cooking'?'processing':'gathering';}

export function ActivityQueuePlanner({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const {height}=useWindowDimensions();
 const [skillId,setSkillId]=useState<QueueSkillId>("woodcutting"),[chooseSkill,setChooseSkill]=useState(false);
 const [regionFilter,setRegionFilter]=useState(state.currentRegionId);
 const availableRegions=activityQueueAvailableRegions(state);
 const selectedRegion=availableRegions.some(row=>row.id===regionFilter)?regionFilter:state.currentRegionId;
 const nodes=activities.filter(row=>row.skillId===skillId&&(!activityQueueRegion({kind:queueKindForSkill(row.skillId),targetId:row.id})||activityQueueRegion({kind:queueKindForSkill(row.skillId),targetId:row.id})?.id===selectedRegion)),combat=skillId==='combat',faith=skillId==='faith',alchemy=skillId==='alchemy',processing=skillId==='smithing'||skillId==='cooking',exploration=skillId==='exploration',queueKind=queueKindForSkill(skillId);
 const [open,setOpen]=useState(false),[choose,setChoose]=useState(false),[selected,setSelected]=useState(''),[kind,setKind]=useState<ActivityQueueGoal['kind']>('item_quantity'),[amount,setAmount]=useState('500'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [handoffChoice,setHandoffChoice]=useState<'30m'|'60m'|'keep_running'>('30m');
 const node=nodes.find(row=>row.id===selected)??nodes[0];
 const current=!faith&&!alchemy&&!processing&&!!node&&state.activity?.targetId===node.id&&state.activity.kind===(queueKind==='gathering'?skillId:queueKind);
 const ready=node?queuedActivityPlanningReadiness(state,{kind:queueKind,targetId:node.id,...(faith?{faithPracticeCount:Number(amount)}:{})}):{ready:false};
 const canStartNow=!!node&&queuedActivityReadiness(state,{kind:queueKind,targetId:node.id,...(faith?{faithPracticeCount:Number(amount)}:{})}).ready;
 const full=(state.character?.activityQueue?.length??0)>=activityQueueCapacity(state);
 const count=Number(amount),goal=normalizeActivityQueueGoal({kind,value:kind==='duration_seconds'?count*60:count});
 const valid=alchemy||processing?true:faith?amount.trim()!==''&&Number.isSafeInteger(count)&&count>=1&&count<=1000:amount.trim()!==''&&Number.isSafeInteger(count)&&!!goal;
 const stored=node?[...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks].filter(row=>row.itemId===node.itemId).reduce((sum,row)=>sum+row.quantity,0):0;
 const level=state.skills.find(row=>row.skillId===skillId)?.level??1;
 const targetReached=!faith&&!alchemy&&!processing&&(kind==='item_quantity'?count<=stored:kind==='skill_level'?count<=level:false);
 const targetIssue=goal&&node?activityQueueGoalIssue(state,{kind:queueKind,targetId:node.id,goal}):undefined;
 const needsHandoff=!current&&currentActivityNeedsQueueHandoff(state);
 const canSetHandoff=!!state.activity&&['combat','mining','woodcutting','fishing','herbalism'].includes(state.activity.kind);
 const keepRunning=!canSetHandoff||handoffChoice==='keep_running';
 const currentGoal=needsHandoff&&!keepRunning?{kind:'duration_seconds' as const,value:handoffChoice==='60m'?3600:1800}:undefined;
 const currentIssue=currentGoal&&state.activity?currentActivityHandoffGoalIssue(state,state.activity.targetId,currentGoal):undefined;
 const close=()=>{if(!busy)setOpen(false);};
 const launch=()=>{
  const active=activities.find(row=>row.id===state.activity?.targetId),entry=active??activities.find(row=>queuedActivityPlanningReadiness(state,{kind:queueKindForSkill(row.skillId),targetId:row.id,...(row.skillId==='faith'?{faithPracticeCount:1}:{})}).ready)??activities[0],saved=active?state.activity?.queueGoal:undefined;
  const selectedKind=saved?.kind??(entry.skillId==='combat'?'session_kills':entry.skillId==='exploration'?'duration_seconds':'item_quantity');
  const selectedItem=activities.find(row=>row.id===entry.id)?.itemId;
  const storedNow=selectedItem?[...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks].reduce((sum,row)=>sum+(row.itemId===selectedItem?row.quantity:0),0):0;
  const defaultValue=selectedKind==='item_quantity'?Math.min(1000000,Math.max(500,storedNow+100)):selectedKind==='skill_level'?Math.min(100,(state.skills.find(row=>row.skillId===entry.skillId)?.level??1)+1):selectedKind==='duration_seconds'?30:50;
  setRegionFilter(activityQueueRegion({kind:queueKindForSkill(entry.skillId),targetId:entry.id})?.id??state.currentRegionId);
  setHandoffChoice('30m');setSkillId(entry.skillId);setSelected(entry.id);setKind(selectedKind);setAmount(String(saved?(saved.kind==='duration_seconds'?saved.value/60:saved.value):entry.skillId==='faith'||entry.skillId==='alchemy'?1:defaultValue));setError('');setChoose(false);setChooseSkill(false);setOpen(true);
 };
 const save=async()=>{
  if(!node||!valid||targetReached||targetIssue||currentIssue||(!alchemy&&!faith&&!processing&&!goal)||busy||!ready.ready||(!current&&full))return;
  setBusy(true);setError('');
  try{
   await onCommand({type:current?'queue_set_goal':'queue_add',args:current?{id:node.id,goal}:{kind:queueKind,id:node.id,...(faith?{count}:alchemy||processing?{}:{goal}),...(needsHandoff&&state.activity?(keepRunning?{keepCurrentRunning:true}:{handoffTargetId:state.activity.targetId,handoffGoal:currentGoal}):{})}});
   if(canStartNow&&!current&&!state.activity&&!state.character?.activityQueue?.length)await onCommand({type:'queue_start'});
   setOpen(false);
  }catch(e){setError(e instanceof Error?e.message:gt("Could not update the queue."));}finally{setBusy(false);}
 };
 const manage=async(command:GameCommand)=>{if(busy)return;setBusy(true);setError('');try{await onCommand(command);}catch(e){setError(e instanceof Error?e.message:gt("Could not update the queue."));}finally{setBusy(false);}};
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel={gt("Queue activity")} onPress={launch} style={({pressed})=>[s.trigger,pressed&&s.pressed]}>
   <Image source={uiIcons.quests} style={s.icon}/><Text style={s.triggerText}>{gt("Queue activity")}</Text>
  </Pressable>
  <GameModalSurface visible={open} onClose={close} reduceMotion={state.settings.reduceMotion} surfaceStyle={{maxHeight:height*.9}}>
   <GameModalHeader eyebrow={gt("Skills").toLocaleUpperCase(language)} title={gt("Activity queue")} onClose={close} closeDisabled={busy}/>
   <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View pointerEvents={busy?'none':'auto'}><ActionQueuePanel state={state} onRemove={index=>void manage({type:'queue_remove',args:{index}})} onMove={(index,direction)=>void manage({type:'queue_move',args:{index,direction}})} onClear={()=>void manage({type:'queue_clear'})} onStartNext={()=>void manage({type:'queue_start'})}/></View>
    <Text style={s.meta}>{gt('Queue location: {region}',{region:WORLD_ZONES.find(zone=>zone.id===selectedRegion)?.name??selectedRegion})} · {activityQueueCrossRegionAllowed(state)?gt('VIP, VIP+ and Supporter can plan activities in unlocked regions.'):gt('Regional activities must be queued in their own region.')}</Text>
    {activityQueueCrossRegionAllowed(state)&&<View style={s.options}><Text style={s.label}>{gt('Choose queue region')}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6,padding:4}}>{availableRegions.map(zone=><Pressable key={zone.id} accessibilityRole="radio" accessibilityState={{checked:zone.id===selectedRegion}} disabled={busy} onPress={()=>{setRegionFilter(zone.id);setSelected('');setChoose(false);setError('');}} style={[s.option,{minHeight:40,borderRadius:7,borderWidth:1,borderColor:zone.id===selectedRegion?C.accent:C.line}]}><Text style={s.name}>{zone.id===selectedRegion?'✓ ':''}{zone.name}</Text></Pressable>)}</View></View>}
    {activityQueueCrossRegionAllowed(state)&&selectedRegion!==state.currentRegionId?<Text style={s.meta}>{state.settings.autoTravelQueuedActivities?gt('Auto-travel is enabled for safe queue handoffs.'):gt('Auto-travel is off. Enable it in Settings or travel manually before starting this activity.')}</Text>:null}
    <Text style={s.label}>{gt("Skill")}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={gt("Choose queue skill")} accessibilityState={{expanded:chooseSkill}} disabled={busy} onPress={()=>{setChooseSkill(value=>!value);setChoose(false);}} style={s.selection}><ActivityArtwork id={skillId}/><Text style={[s.name,s.flex]}>{gl(skills.find(row=>row.id===skillId)?.label)}</Text><Image source={uiIcons.next} style={s.icon}/></Pressable>
    {chooseSkill?<View style={s.options}>{skills.map(skill=>{
     const availability=queueSkillReadiness({...state,currentRegionId:selectedRegion},skill.id),disabled=busy||!availability.ready;
     return <Pressable key={skill.id} accessibilityRole="radio" accessibilityState={{checked:skillId===skill.id,disabled}} disabled={disabled} onPress={()=>{setSkillId(skill.id);const available=activities.filter(row=>row.skillId===skill.id&&(!activityQueueRegion({kind:queueKindForSkill(row.skillId),targetId:row.id})||activityQueueRegion({kind:queueKindForSkill(row.skillId),targetId:row.id})?.id===selectedRegion));setSelected((available.find(row=>queuedActivityPlanningReadiness(state,{kind:queueKindForSkill(skill.id),targetId:row.id,...(skill.id==='faith'?{faithPracticeCount:1}:{})}).ready)??available[0])?.id??'');setKind(skill.id==='combat'?'session_kills':skill.id==='exploration'?'duration_seconds':'item_quantity');setAmount(skill.id==='combat'?'50':skill.id==='faith'||skill.id==='alchemy'?'1':skill.id==='exploration'?'30':'500');setChooseSkill(false);setChoose(false);setError('');}} style={[s.option,{flexDirection:'row',alignItems:'center',gap:10},!availability.ready&&s.disabled]}><ActivityArtwork id={skill.id} size={28}/><View style={s.flex}><Text style={s.name}>{gl(skill.label)}</Text>{!availability.ready?<Text style={s.meta}>{gl(availability.blocker)}</Text>:null}</View></Pressable>;
    })}</View>:null}
    <Text style={s.label}>{gt("Activity")}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={gt("Choose queued activity")} accessibilityState={{expanded:choose}} disabled={busy} onPress={()=>setChoose(value=>!value)} style={s.selection}>
     {node?.itemId?<ResourceArtwork itemId={node.itemId} size={40}/>:<ActivityArtwork id={skillId}/>}<View style={s.flex}><Text style={s.name}>{node?.name??gt("No activity available")}</Text><Text style={s.meta}>{current?gt("Currently active"):ready.ready?gt("Available"):gl(ready.blocker)}</Text></View><Image source={uiIcons.next} style={s.icon}/>
    </Pressable>
    {choose?<View style={s.options}>{nodes.map(row=>{const availability=queuedActivityPlanningReadiness(state,{kind:queueKind,targetId:row.id,...(faith?{faithPracticeCount:count}:{})});return <Pressable key={row.id} accessibilityRole="radio" accessibilityState={{checked:node?.id===row.id,disabled:!availability.ready}} disabled={!availability.ready||busy} onPress={()=>{setSelected(row.id);setChoose(false);setError('');}} style={[s.option,!availability.ready&&s.disabled]}><Text style={s.name}>{row.name}</Text>{!availability.ready?<Text style={s.meta}>{gl(availability.blocker)}</Text>:null}</Pressable>;})}</View>:null}
    {faith||alchemy||processing?null:<><Text style={s.label}>{gt("Goal")}</Text>
    <View accessibilityRole="radiogroup">{goals.filter(option=>combat?['session_kills','duration_seconds'].includes(option.kind):exploration?option.kind==='duration_seconds':option.kind!=='session_kills').map(option=><Pressable key={option.kind} accessibilityRole="radio" accessibilityState={{checked:kind===option.kind}} disabled={busy} onPress={()=>{setKind(option.kind);setAmount(String(option.kind==='session_kills'?50:option.kind==='duration_seconds'?180:option.kind==='skill_level'?Math.min(100,level+1):Math.max(500,stored+100)));setError('');}} style={s.radioRow}><View style={[s.radio,kind===option.kind&&s.radioSelected]}/><Text style={s.name}>{gl(option.label)}</Text></Pressable>)}</View></>}
    {alchemy||processing?<Text style={s.meta}>{processing?gt('Processes this recipe until its materials, Gold, or your AFK time runs out.'):gt('Starts this brew until its materials, Gold, or your AFK time runs out.')} {gt('Materials and Gold are checked when this queued activity starts.')}</Text>:<><Text style={s.label}>{faith?gl('Practices to reserve'):kind==='session_kills'?gt("Enemies to defeat"):kind==='duration_seconds'?gt("Minutes"):kind==='skill_level'?gt("Target skill level"):gt('Total {item} in storage',{item:node?.itemId?itemDef(node.itemId).name:gt('resources')})}</Text>
    <TextInput accessibilityLabel={faith?gl('Faith practices to reserve'):gt("Queue goal amount")} keyboardType="number-pad" editable={!busy} value={amount} onChangeText={setAmount} style={s.input}/>
    <Text style={s.meta}>{faith?gl(`Uses ${((FAITH_TIERS.find(row=>row.id===node?.id)?.water??0)*count).toLocaleString(language)} Holy Water.`):kind==='session_kills'?gt("New defeats in this activity"):kind==='duration_seconds'?gt("1-1800 minutes"):kind==='skill_level'?gt("Current level: {level} / 100",{level}):gt("Currently stored: {count}",{count:stored.toLocaleString(language)})}</Text></>}
    {valid&&targetReached?<Text accessibilityRole="alert" style={s.warning}>{targetIssue??gt("This goal is already reached.")}</Text>:null}
    {!valid?<Text style={s.warning}>{gt("Enter a whole number from 1 to {max}.",{max:(faith?1000:kind==='duration_seconds'?1800:kind==='skill_level'?100:1000000).toLocaleString(language)})}</Text>:null}
    {!current&&full?<Text style={s.warning}>{gt("Queue full ({count} activities).",{count:activityQueueCapacity(state)})}</Text>:null}
    {needsHandoff&&state.activity?<View style={s.options}>
     <Text style={s.label}>{gt('Current activity handoff')}</Text>
     <Text style={s.meta}>{gt('Your running activity needs a stop condition for this queued job to begin automatically.')}</Text>
     {canSetHandoff?([
       ['30m',gt('Stop current activity after 30 minutes')],
       ['60m',gt('Stop current activity after 60 minutes')],
       ['keep_running',gt('Keep running · queued activities will wait')]
     ] as const).map(([id,label])=><Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:handoffChoice===id}} onPress={()=>setHandoffChoice(id)} disabled={busy} style={s.radioRow}><View style={[s.radio,handoffChoice===id&&s.radioSelected]}/><Text style={[s.name,s.flex]}>{label}</Text></Pressable>):<Text style={s.warning}>{gt('This current activity must finish or be stopped manually before the queue can advance.')}</Text>}
     {keepRunning?<Text accessibilityRole="alert" style={s.warning}>{gt('The queue will NOT advance automatically until your current activity stops or an applicable idle rule triggers.')}</Text>:<Text style={s.meta}>{gt('Your selected stop and the new queue entry are saved together. The timer starts when you confirm.')}</Text>}
     {currentIssue?<Text accessibilityRole="alert" style={s.warning}>{gl(currentIssue)}</Text>:null}
    </View>:null}
    {error?<Text accessibilityRole="alert" style={s.warning}>{gl(error)}</Text>:null}
   </ScrollView>
   <View style={s.footer}><GameButton title={busy?gt("Saving..."):current?gt("Set current goal"):canStartNow&&!state.activity&&!state.character?.activityQueue?.length?faith?gl('Start practice'):alchemy?gt('Start brewing'):processing?gt('Start processing'):gt("Start with goal"):gt("Add to queue")} onPress={save} disabled={busy||!valid||targetReached||!!targetIssue||!!currentIssue||!ready.ready||(!current&&full)}/></View>
  </GameModalSurface>
 </>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 trigger:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel},triggerText:{fontSize:14,fontWeight:'700',color:C.text},icon:{width:22,height:22},pressed:{opacity:.7},
 scroll:{flexShrink:1},content:{gap:10,paddingVertical:16},label:{fontSize:13,fontWeight:'700',color:C.muted},selection:{flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:1,borderColor:C.lineStrong,borderRadius:8},flex:{flex:1,minWidth:0},name:{fontSize:14,lineHeight:20,color:C.text},meta:{fontSize:12,lineHeight:18,color:C.muted},options:{borderWidth:1,borderColor:C.line,borderRadius:8},option:{minHeight:48,padding:12,borderBottomWidth:1,borderBottomColor:C.line},disabled:{opacity:.4},radioRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:12},radio:{width:20,height:20,borderWidth:2,borderColor:C.muted,borderRadius:10},radioSelected:{borderColor:C.good,backgroundColor:C.good},input:{minHeight:48,padding:12,fontSize:18,color:C.text,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel},warning:{fontSize:13,lineHeight:19,color:C.warning},footer:{paddingTop:12,borderTopWidth:1,borderTopColor:C.line},
});}

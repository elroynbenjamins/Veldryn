import {useGameplayText} from '../i18n/gameplay';
import {useMemo,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import type {ActivityQueueGoal,GameState,GatheringSkillId} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {activityQueueCapacity,normalizeActivityQueueGoal,queuedActivityReadiness,queueSkillReadiness} from '../core/activity-queue';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {useGameTheme} from '../theme/ThemeContext';
import {uiIcons} from '../theme/ui-icons';
import type {ThemeColors} from '../theme/theme';
import {ResourceArtwork} from './ResourceArtwork';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ActivityArtwork} from './ActivityArtwork';
import {ActionQueuePanel} from './ActionQueuePanel';

const goals:Array<{kind:ActivityQueueGoal['kind'];label:string}>=[
 {kind:'item_quantity',label:'Resource quantity'},
 {kind:'skill_level',label:'Skill level'},
 {kind:'duration_seconds',label:'Duration'},
 {kind:'session_kills',label:'Enemies defeated'},
];
const skills:Array<{id:GatheringSkillId|'combat';label:string}>=[{id:'combat',label:'Combat'},{id:'woodcutting',label:'Woodcutting'},{id:'mining',label:'Mining'},{id:'fishing',label:'Fishing'},{id:'herbalism',label:'Herbalism'}];
const activities:Array<{id:string;name:string;skillId:GatheringSkillId|'combat';itemId?:string}>=[...GATHERING,...HERB_NODES,...MONSTERS.filter(row=>!row.boss).map(row=>({id:row.id,name:row.name,skillId:'combat' as const}))];

export function ActivityQueuePlanner({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const {height}=useWindowDimensions();
 const [skillId,setSkillId]=useState<GatheringSkillId|'combat'>("woodcutting"),[chooseSkill,setChooseSkill]=useState(false);
 const nodes=activities.filter(row=>row.skillId===skillId),combat=skillId==='combat';
 const [open,setOpen]=useState(false),[choose,setChoose]=useState(false),[selected,setSelected]=useState(''),[kind,setKind]=useState<ActivityQueueGoal['kind']>('item_quantity'),[amount,setAmount]=useState('500'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const node=nodes.find(row=>row.id===selected)??nodes[0];
 const current=!!node&&state.activity?.targetId===node.id;
 const ready=node?queuedActivityReadiness(state,{kind:combat?"combat":"gathering",targetId:node.id}):{ready:false};
 const full=(state.character?.activityQueue?.length??0)>=activityQueueCapacity(state);
 const count=Number(amount),goal=normalizeActivityQueueGoal({kind,value:kind==='duration_seconds'?count*60:count});
 const valid=amount.trim()!==''&&Number.isSafeInteger(count)&&!!goal;
 const stored=node?[...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks].filter(row=>row.itemId===node.itemId).reduce((sum,row)=>sum+row.quantity,0):0;
 const level=state.skills.find(row=>row.skillId===skillId)?.level??1;
 const targetReached=kind==='item_quantity'?count<=stored:kind==='skill_level'?count<=level:false;
 const close=()=>{if(!busy)setOpen(false);};
 const launch=()=>{
  const active=activities.find(row=>row.id===state.activity?.targetId),entry=active??activities.find(row=>queuedActivityReadiness(state,{kind:row.skillId==='combat'?"combat":"gathering",targetId:row.id}).ready)??activities[0],saved=active?state.activity?.queueGoal:undefined;
  setSkillId(entry.skillId);setSelected(entry.id);setKind(saved?.kind??(entry.skillId==='combat'?'session_kills':'item_quantity'));setAmount(String(saved?(saved.kind==='duration_seconds'?saved.value/60:saved.value):entry.skillId==='combat'?50:500));setError('');setChoose(false);setChooseSkill(false);setOpen(true);
 };
 const save=async()=>{
  if(!node||!valid||!goal||busy||!ready.ready||(!current&&full))return;
  setBusy(true);setError('');
  try{
   await onCommand({type:current?'queue_set_goal':'queue_add',args:current?{id:node.id,goal}:{kind:combat?"combat":"gathering",id:node.id,goal}});
   if(!current&&!state.activity&&!state.character?.activityQueue?.length)await onCommand({type:'queue_start'});
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
    <Text style={s.label}>{gt("Skill")}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={gt("Choose queue skill")} accessibilityState={{expanded:chooseSkill}} disabled={busy} onPress={()=>{setChooseSkill(value=>!value);setChoose(false);}} style={s.selection}><ActivityArtwork id={skillId}/><Text style={[s.name,s.flex]}>{gl(skills.find(row=>row.id===skillId)?.label)}</Text><Image source={uiIcons.next} style={s.icon}/></Pressable>
    {chooseSkill?<View style={s.options}>{skills.map(skill=>{
     const availability=queueSkillReadiness(state,skill.id),disabled=busy||!availability.ready;
     return <Pressable key={skill.id} accessibilityRole="radio" accessibilityState={{checked:skillId===skill.id,disabled}} disabled={disabled} onPress={()=>{setSkillId(skill.id);const available=activities.filter(row=>row.skillId===skill.id);setSelected((available.find(row=>queuedActivityReadiness(state,{kind:skill.id==='combat'?"combat":"gathering",targetId:row.id}).ready)??available[0])?.id??'');setKind(skill.id==='combat'?'session_kills':'item_quantity');setAmount(skill.id==='combat'?'50':'500');setChooseSkill(false);setChoose(false);setError('');}} style={[s.option,{flexDirection:'row',alignItems:'center',gap:10},!availability.ready&&s.disabled]}><ActivityArtwork id={skill.id} size={28}/><View style={s.flex}><Text style={s.name}>{gl(skill.label)}</Text>{!availability.ready?<Text style={s.meta}>{gl(availability.blocker)}</Text>:null}</View></Pressable>;
    })}</View>:null}
    <Text style={s.label}>{gt("Activity")}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={gt("Choose queued activity")} accessibilityState={{expanded:choose}} disabled={busy} onPress={()=>setChoose(value=>!value)} style={s.selection}>
     {node?.itemId?<ResourceArtwork itemId={node.itemId} size={40}/>:<ActivityArtwork id="combat"/>}<View style={s.flex}><Text style={s.name}>{node?.name??gt("No activity available")}</Text><Text style={s.meta}>{current?gt("Currently active"):ready.ready?gt("Available"):gl(ready.blocker)}</Text></View><Image source={uiIcons.next} style={s.icon}/>
    </Pressable>
    {choose?<View style={s.options}>{nodes.map(row=>{const availability=queuedActivityReadiness(state,{kind:combat?"combat":"gathering",targetId:row.id});return <Pressable key={row.id} accessibilityRole="radio" accessibilityState={{checked:node?.id===row.id,disabled:!availability.ready}} disabled={!availability.ready||busy} onPress={()=>{setSelected(row.id);setChoose(false);setError('');}} style={[s.option,!availability.ready&&s.disabled]}><Text style={s.name}>{row.name}</Text>{!availability.ready?<Text style={s.meta}>{gl(availability.blocker)}</Text>:null}</Pressable>;})}</View>:null}
    <Text style={s.label}>{gt("Goal")}</Text>
    <View accessibilityRole="radiogroup">{goals.filter(option=>combat?['session_kills','duration_seconds'].includes(option.kind):option.kind!=='session_kills').map(option=><Pressable key={option.kind} accessibilityRole="radio" accessibilityState={{checked:kind===option.kind}} disabled={busy} onPress={()=>{setKind(option.kind);setAmount(String(option.kind==='session_kills'?50:option.kind==='duration_seconds'?180:option.kind==='skill_level'?Math.min(100,level+1):Math.max(500,stored+100)));setError('');}} style={s.radioRow}><View style={[s.radio,kind===option.kind&&s.radioSelected]}/><Text style={s.name}>{gl(option.label)}</Text></Pressable>)}</View>
    <Text style={s.label}>{kind==='session_kills'?gt("Enemies to defeat"):kind==='duration_seconds'?gt("Minutes"):kind==='skill_level'?gt("Target skill level"):gt('Total {item} in storage',{item:node?.itemId?itemDef(node.itemId).name:gt('resources')})}</Text>
    <TextInput accessibilityLabel={gt("Queue goal amount")} keyboardType="number-pad" editable={!busy} value={amount} onChangeText={setAmount} style={s.input}/>
    <Text style={s.meta}>{kind==='session_kills'?gt("New defeats in this activity"):kind==='duration_seconds'?gt("1-1800 minutes"):kind==='skill_level'?gt("Current level: {level} / 100",{level}):gt("Currently stored: {count}",{count:stored.toLocaleString(language)})}</Text>
    {valid&&targetReached?<Text style={s.warning}>{gt("This goal is already reached.")}</Text>:null}
    {!valid?<Text style={s.warning}>{gt("Enter a whole number from 1 to {max}.",{max:(kind==='duration_seconds'?1800:kind==='skill_level'?100:1000000).toLocaleString(language)})}</Text>:null}
    {!current&&full?<Text style={s.warning}>{gt("Queue full ({count} activities).",{count:activityQueueCapacity(state)})}</Text>:null}
    {error?<Text accessibilityRole="alert" style={s.warning}>{gl(error)}</Text>:null}
   </ScrollView>
   <View style={s.footer}><GameButton title={busy?gt("Saving..."):current?gt("Set current goal"):!state.activity&&!state.character?.activityQueue?.length?gt("Start with goal"):gt("Add to queue")} onPress={()=>void save()} disabled={busy||!valid||!ready.ready||(!current&&full)}/></View>
  </GameModalSurface>
 </>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 trigger:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel},triggerText:{fontSize:14,fontWeight:'700',color:C.text},icon:{width:22,height:22},pressed:{opacity:.7},
 scroll:{flexShrink:1},content:{gap:10,paddingVertical:16},label:{fontSize:13,fontWeight:'700',color:C.muted},selection:{flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:1,borderColor:C.lineStrong,borderRadius:8},flex:{flex:1,minWidth:0},name:{fontSize:14,lineHeight:20,color:C.text},meta:{fontSize:12,lineHeight:18,color:C.muted},options:{borderWidth:1,borderColor:C.line,borderRadius:8},option:{minHeight:48,padding:12,borderBottomWidth:1,borderBottomColor:C.line},disabled:{opacity:.4},radioRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:12},radio:{width:20,height:20,borderWidth:2,borderColor:C.muted,borderRadius:10},radioSelected:{borderColor:C.good,backgroundColor:C.good},input:{minHeight:48,padding:12,fontSize:18,color:C.text,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,backgroundColor:C.panel},warning:{fontSize:13,lineHeight:19,color:C.warning},footer:{paddingTop:12,borderTopWidth:1,borderTopColor:C.line},
});}

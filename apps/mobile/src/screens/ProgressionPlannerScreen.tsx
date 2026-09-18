import {useMemo,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {progressionGoalView,type GoalContext,type GoalKind,type ProgressionGoal} from '../core/progression-goals-v40';
import type {IdleRuleSet} from '../core/idle-rules-v40';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {C,radii,spacing,typography} from '../theme/theme';

type AuthorKind='skill_level'|'monster_kills'|'mastery_rank'|'weekly_order';
const KIND_LABEL:Record<AuthorKind,string>={skill_level:'Skill Level',monster_kills:'Monster Kills',mastery_rank:'Profession Mastery',weekly_order:'Weekly Order'};
type Source={id:string;label:string;current:number;defaultTarget:number};

function quantities(state:GameState){const out:Record<string,number>={};for(const stack of [...state.inventory.stacks,...state.bank.stacks])out[stack.itemId]=(out[stack.itemId]??0)+stack.quantity;return out}
function context(state:GameState):GoalContext{
 return {
  skillLevels:Object.fromEntries(state.skills.map(row=>[row.skillId,row.level])),
  skillXp:Object.fromEntries(state.skills.map(row=>[row.skillId,row.xp])),
  itemQuantities:quantities(state),recipeCraftCounts:{},
  monsterKills:{...(state.character?.monsterMasteryPoints??{})},
  ownedPetIds:Object.fromEntries([...(state.account.unlockedCosmeticPetIds??[]),...(state.character?.ownedPetIds??[])].map(id=>[id,true as const])),
  craftedSetPieceCounts:{},dungeonClears:{},
  masteryPoints:Object.fromEntries(Object.entries(state.account.professionMasteryByAction??{}).map(([id,row])=>[id,row.points])),
  weeklyOrderProgress:Object.fromEntries((state.account.weeklyOrders?.orders??[]).map(row=>[row.id,row.progress])),
 };
}
function sources(state:GameState,kind:AuthorKind):Source[]{
 if(kind==='skill_level')return state.skills.map(row=>({id:row.skillId,label:row.skillId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),current:row.level,defaultTarget:Math.min(100,Math.max(row.level+5,10))}));
 if(kind==='monster_kills')return MONSTERS.filter(row=>!row.boss&&state.unlockedMonsterIds.includes(row.id)).map(row=>({id:row.id,label:row.name,current:state.character?.monsterMasteryPoints?.[row.id]??0,defaultTarget:Math.max(50,(state.character?.monsterMasteryPoints?.[row.id]??0)+100)}));
 if(kind==='mastery_rank'){const ids=[...new Map([...GATHERING,...HERB_NODES,...RECIPES.filter(row=>!row.noviceSetId)].map(row=>[row.id,row])).values()];return ids.slice(0,120).map((row:any)=>({id:row.id,label:row.name,current:0,defaultTarget:10}));}
 return (state.account.weeklyOrders?.orders??[]).map(row=>({id:row.id,label:row.title,current:row.progress,defaultTarget:row.target}));
}
function makeGoal(kind:AuthorKind,source:Source,target:number,characterId:string,now:number):ProgressionGoal{
 const base={id:`goal:${now}:${source.id}`,characterId,kind,title:`${KIND_LABEL[kind]} · ${source.label}`,createdAtMs:now,pinnedAtMs:now} as any;
 if(kind==='skill_level')return {...base,kind,skillId:source.id,targetLevel:Math.max(2,Math.min(100,target))};
 if(kind==='monster_kills')return {...base,kind,monsterId:source.id,targetKills:Math.max(1,target)};
 if(kind==='mastery_rank')return {...base,kind,actionId:source.id,targetRank:Math.max(1,Math.min(50,target))};
 return {...base,kind,orderId:source.id,targetProgress:source.defaultTarget};
}

export function ProgressionPlannerScreen({state,onChange,onCommand}:{state:GameState;onChange:(next:GameState)=>void|Promise<void>;onCommand?:(command:GameCommand)=>Promise<void>}){
 const character=state.character!,goals=character.progressionGoals??[],rules=character.idleRulesV40??[],activeRuleId=character.activeIdleRuleIdV40;
 const [open,setOpen]=useState(false),[kind,setKind]=useState<AuthorKind>('skill_level'),[sourceOpen,setSourceOpen]=useState(false),[selectedId,setSelectedId]=useState<string>(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const goalContext=useMemo(()=>context(state),[state]);
 const candidates=sources(state,kind),selected=candidates.find(row=>row.id===selectedId)??candidates[0];
 const saveGoals=async(next:ProgressionGoal[])=>{setBusy(true);setMessage('');try{if(onCommand)await onCommand({type:'goals_set',args:{goals:next}});else await onChange({...state,character:{...character,progressionGoals:next}});setMessage('Working Toward goals updated.')}catch(e){setMessage(e instanceof Error?e.message:'Could not update goals.')}finally{setBusy(false)}};
 const saveRules=async(next:IdleRuleSet[],activeId?:string)=>{setBusy(true);setMessage('');try{if(onCommand)await onCommand({type:'idle_rules_set',args:{rules:next,activeId:activeId??null}});else await onChange({...state,character:{...character,idleRulesV40:next,activeIdleRuleIdV40:activeId}});setMessage('Idle Rules updated.')}catch(e){setMessage(e instanceof Error?e.message:'Could not update Idle Rules.')}finally{setBusy(false)}};
 const addGoal=async()=>{if(!selected||goals.length>=3)return;const target=selected.defaultTarget,next=[...goals,makeGoal(kind,selected,target,character.id,Date.now())];await saveGoals(next);setOpen(false);setSelectedId(undefined)};
 const preset=(hours:number):IdleRuleSet=>({id:`idle-duration-${hours}h`,characterId:character.id,name:`Safe ${hours}h session`,conditions:[{id:'duration',kind:'duration_seconds',value:hours*3600,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true});
 const weeklyRule=():IdleRuleSet|undefined=>{const order=state.account.weeklyOrders?.orders.find(row=>row.progress<row.target);return order?{id:`idle-weekly-${order.id}`,characterId:character.id,name:'Stop at Weekly Order',conditions:[{id:'weekly',kind:'weekly_order_progress',targetId:order.id,value:order.target,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true}:undefined};
 const addRule=async(rule:IdleRuleSet|undefined)=>{if(!rule)return;const next=[...rules.filter(row=>row.id!==rule.id),rule].slice(-5);await saveRules(next,rule.id)};
 return <><ScrollView contentContainerStyle={s.root}>
   <Text style={s.kicker}>PROGRESSION & TASKS</Text><Text accessibilityRole="header" style={s.heading}>Working Toward</Text><Text style={s.copy}>Pin a few meaningful goals and choose safe stop conditions for idle activities. These tools organize progression; they do not increase the 24h base / 36h maximum Offline Reserve.</Text>
   <Panel><View style={s.between}><View style={s.flex}><Text style={s.title}>Pinned Goals</Text><Text style={s.copy}>Up to 3 character-specific goals.</Text></View><Text style={s.count}>{goals.length}/3</Text></View>
    {goals.length?goals.map(goal=>{const view=progressionGoalView(goal,goalContext);return <View key={goal.id} style={s.goal}><View style={s.between}><View style={s.flex}><Text style={s.goalName}>{goal.title}</Text><Text style={s.meta}>{view.status.toUpperCase()} · {Math.floor(view.current).toLocaleString()} / {Math.floor(view.target).toLocaleString()}</Text></View><Text style={[s.percent,view.status==='complete'&&s.done]}>{Math.round(view.progress*100)}%</Text></View><View style={s.track}><View style={[s.fill,{width:(Math.max(2,view.progress*100)+'%') as any}]}/></View><View style={s.goalFooter}><Text style={s.meta}>{view.etaLabel}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void saveGoals(goals.filter(row=>row.id!==goal.id))} style={s.remove}><Text style={s.removeText}>Remove</Text></Pressable></View></View>}):<Text style={s.empty}>No pinned goals yet.</Text>}
    <GameButton title={goals.length>=3?'3 goals pinned':'Add Goal'} disabled={busy||goals.length>=3} onPress={()=>setOpen(true)}/>
   </Panel>
   <Panel><Text style={s.title}>Advanced Idle Rules</Text><Text style={s.copy}>Idle Rules are stop-only. They cannot auto-travel, chain activities, or extend Offline Reserve.</Text>
    {rules.length?rules.map(rule=><View key={rule.id} style={[s.rule,activeRuleId===rule.id&&s.ruleActive]}><View style={s.flex}><Text style={s.goalName}>{rule.name}</Text><Text style={s.meta}>{rule.conditions.length} stop condition{rule.conditions.length===1?'':'s'} · food safety {rule.stopIfOutOfFood?'on':'off'} · overflow safety {rule.stopIfRewardsWouldOverflow?'on':'off'}</Text></View><GameButton title={activeRuleId===rule.id?'Active':'Use'} tone={activeRuleId===rule.id?'primary':'secondary'} disabled={busy} onPress={()=>void saveRules(rules,activeRuleId===rule.id?undefined:rule.id)}/></View>):<Text style={s.empty}>No custom Idle Rule selected. Existing combat food and storage protections still apply.</Text>}
    <View style={s.actions}><View style={s.flex}><GameButton title="Safe 1h" tone="secondary" disabled={busy} onPress={()=>void addRule(preset(1))}/></View><View style={s.flex}><GameButton title="Safe 4h" tone="secondary" disabled={busy} onPress={()=>void addRule(preset(4))}/></View></View>
    <GameButton title="Stop at active Weekly Order" tone="secondary" disabled={busy||!weeklyRule()} onPress={()=>void addRule(weeklyRule())}/>
    {activeRuleId?<GameButton title="Disable active Idle Rule" tone="secondary" disabled={busy} onPress={()=>void saveRules(rules,undefined)}/>:null}
   </Panel>
   {!!message&&<Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
 </ScrollView>
 <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}><View style={s.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setOpen(false)}/><View style={s.sheet}><Text style={s.title}>Add Working Toward Goal</Text><Text style={s.label}>Goal type</Text><View style={s.typeRows}>{(Object.keys(KIND_LABEL) as AuthorKind[]).map(value=><Pressable key={value} onPress={()=>{setKind(value);setSelectedId(undefined)}} style={[s.option,kind===value&&s.optionActive]}><Text style={[s.optionText,kind===value&&s.optionTextActive]}>{kind===value?'✓ ':''}{KIND_LABEL[value]}</Text></Pressable>)}</View><Text style={s.label}>Target</Text><Pressable onPress={()=>setSourceOpen(value=>!value)} style={s.dropdown}><Text style={s.dropdownText}>{selected?.label??'No available target'}</Text><Text style={s.chevron}>{sourceOpen?'⌃':'⌄'}</Text></Pressable>{sourceOpen?<ScrollView style={s.sourceList} nestedScrollEnabled>{candidates.map(row=><Pressable key={row.id} onPress={()=>{setSelectedId(row.id);setSourceOpen(false)}} style={[s.sourceRow,selected?.id===row.id&&s.sourceSelected]}><View style={s.flex}><Text style={s.sourceName}>{row.label}</Text><Text style={s.meta}>Current {row.current.toLocaleString()} · target {row.defaultTarget.toLocaleString()}</Text></View>{selected?.id===row.id?<Text style={s.done}>✓</Text>:null}</Pressable>)}</ScrollView>:null}<Text style={s.copy}>Targets use safe defaults based on current progress. You can replace or remove the goal later.</Text><View style={s.actions}><View style={s.flex}><GameButton title="Cancel" tone="secondary" onPress={()=>setOpen(false)}/></View><View style={s.flex}><GameButton title="Pin Goal" disabled={!selected||busy} onPress={()=>void addGoal()}/></View></View></View></View></Modal></>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},copy:{...typography.body,color:C.muted,lineHeight:20},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},flex:{flex:1,minWidth:0},count:{color:C.accent,fontSize:16,fontWeight:'900'},goal:{paddingVertical:9,borderTopWidth:1,borderTopColor:C.line,gap:5},goalName:{color:C.text,fontWeight:'900'},meta:{color:C.muted,fontSize:10,lineHeight:14},percent:{color:C.info,fontSize:13,fontWeight:'900'},done:{color:C.good,fontWeight:'900'},track:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},fill:{height:'100%',backgroundColor:C.accent},goalFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},remove:{minHeight:36,justifyContent:'center',paddingHorizontal:8},removeText:{color:C.bad,fontSize:10,fontWeight:'900'},empty:{color:C.muted,paddingVertical:10},rule:{minHeight:66,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderTopColor:C.line},ruleActive:{backgroundColor:'#14261d'},actions:{flexDirection:'row',gap:spacing.sm},message:{color:C.info,textAlign:'center',fontWeight:'800'},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},sheet:{maxHeight:'88%',backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,borderTopLeftRadius:20,borderTopRightRadius:20,padding:spacing.lg,gap:8},label:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,marginTop:4},typeRows:{gap:5},option:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},optionActive:{borderColor:C.accent,backgroundColor:C.panel2},optionText:{color:C.text,fontWeight:'800'},optionTextActive:{color:C.accent},dropdown:{minHeight:50,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},dropdownText:{flex:1,color:C.text,fontWeight:'900'},chevron:{color:C.accent,fontSize:18,fontWeight:'900'},sourceList:{maxHeight:240,borderWidth:1,borderColor:C.line,borderRadius:radii.md},sourceRow:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.panel},sourceSelected:{backgroundColor:C.panel2},sourceName:{color:C.text,fontWeight:'800'}});

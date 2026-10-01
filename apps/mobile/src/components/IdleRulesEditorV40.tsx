import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Switch,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {SearchField} from './SearchField';
import {Panel} from './Panel';
import type {GameState} from '../core/types';
import {MAX_IDLE_RULE_SETS,upsertIdleRuleSet,type IdleRuleSet,type IdleStopCondition,type IdleStopKind} from '../core/idle-rules-v40';
import {ITEMS} from '../content/items';
import {MONSTERS} from '../content/monsters';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

const KIND_LABEL:Record<IdleStopKind,string>={
 item_quantity:'Item quantity',skill_level:'Skill level',monster_kills:'Monster kills',session_kills:'Hunt session kills',champion_defeats:'Champion defeats',weekly_order_progress:'Weekly Order',food_below:'Food remaining',free_slots_below:'Free storage slots',duration_seconds:'Elapsed duration'
};
type Picker='kind'|'target'|null;
type Target={id:string;label:string;current?:number};

function targetRows(state:GameState,kind:IdleStopKind,query:string):Target[]{
 let rows:Target[]=[];
 if(kind==='item_quantity'){
   const qty:Record<string,number>={};for(const stack of [...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks])qty[stack.itemId]=(qty[stack.itemId]??0)+stack.quantity;
   rows=ITEMS.map(item=>({id:item.id,label:item.name,current:qty[item.id]??0}));
 }else if(kind==='skill_level')rows=state.skills.map(skill=>({id:skill.skillId,label:skill.skillId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),current:skill.level}));
 else if(kind==='monster_kills')rows=MONSTERS.filter(monster=>!monster.boss&&state.unlockedMonsterIds.includes(monster.id)).map(monster=>({id:monster.id,label:monster.name,current:state.character?.monsterMasteryPoints?.[monster.id]??0}));
 else if(kind==='weekly_order_progress')rows=(state.account.weeklyOrders?.orders??[]).map(order=>({id:order.id,label:order.title,current:order.progress}));
 const term=query.trim().toLowerCase();return rows.filter(row=>!term||row.label.toLowerCase().includes(term)||row.id.toLowerCase().includes(term)).slice(0,80);
}
function needsTarget(kind:IdleStopKind){return ['item_quantity','skill_level','monster_kills','weekly_order_progress'].includes(kind)}
function valueLabel(kind:IdleStopKind){return kind==='duration_seconds'?'Minutes':kind==='food_below'?'Stop at or below food':kind==='free_slots_below'?'Stop at or below free slots':'Target value'}
function displayCondition(condition:IdleStopCondition,state:GameState,p:(text:string)=>string){
 const label=p(KIND_LABEL[condition.kind]),target=condition.targetId?(ITEMS.find(row=>row.id===condition.targetId)?.name??MONSTERS.find(row=>row.id===condition.targetId)?.name??state.skills.find(row=>row.skillId===condition.targetId)?.skillId??state.account.weeklyOrders?.orders.find(row=>row.id===condition.targetId)?.title??condition.targetId):'';
 const value=condition.kind==='duration_seconds'?Math.round(condition.value/60)+' min':condition.value.toLocaleString();
 return label+(target?' · '+target:'')+' · '+value;
}

export function IdleRulesEditorV40({state,rules,activeRuleId,busy,onSave}:{state:GameState;rules:IdleRuleSet[];activeRuleId?:string;busy:boolean;onSave:(rules:IdleRuleSet[],activeId?:string)=>Promise<void>}){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),character=state.character!,{width,fontScale}=useWindowDimensions(),stackActions=width<360||fontScale>=1.25;
 const [open,setOpen]=useState(false),[name,setName]=useState('My Idle Rule'),[kind,setKind]=useState<IdleStopKind>('duration_seconds'),[targetId,setTargetId]=useState<string>(),[value,setValue]=useState('60'),[conditions,setConditions]=useState<IdleStopCondition[]>([]),[foodSafety,setFoodSafety]=useState(true),[overflowSafety,setOverflowSafety]=useState(true),[picker,setPicker]=useState<Picker>(null),[query,setQuery]=useState(''),[notice,setNotice]=useState('');
 const targets=useMemo(()=>targetRows(state,kind,query),[state,kind,query]);
 const selectedTarget=targets.find(row=>row.id===targetId)??(targetId?targetRows(state,kind,'').find(row=>row.id===targetId):undefined);
 const resetDraft=()=>{setName(t("My Idle Rule"));setKind('duration_seconds');setTargetId(undefined);setValue('60');setConditions([]);setFoodSafety(true);setOverflowSafety(true);setPicker(null);setQuery('')};
 const chooseKind=(next:IdleStopKind)=>{setKind(next);setTargetId(undefined);setValue(next==='duration_seconds'?'60':next==='skill_level'?'10':'1');setPicker(null);setQuery('')};
 const addCondition=()=>{if(conditions.length>=6)return;const numeric=Math.max(0,Math.floor(Number(value)||0));if(needsTarget(kind)&&!targetId)return;const stored=kind==='duration_seconds'?numeric*60:numeric;const condition:IdleStopCondition={id:'condition-'+Date.now()+'-'+conditions.length,kind,...(targetId?{targetId}:{}),value:stored,enabled:true};setConditions(current=>[...current,condition]);};
 const saveNew=async()=>{if(!conditions.length&&!foodSafety&&!overflowSafety)return;const id='idle-rule-'+Date.now(),rule:IdleRuleSet={id,characterId:character.id,name:name.trim().slice(0,40)||t("Idle Rule"),conditions,stopIfOutOfFood:foodSafety,stopIfRewardsWouldOverflow:overflowSafety,finishCurrentCycle:true};try{await onSave(upsertIdleRuleSet(rules,rule),id);setNotice(t("Rule saved and activated."));setOpen(false);resetDraft();}catch(error){setNotice(error instanceof Error&&error.message==='idle_rule_limit_reached'?t("All {count} rule slots are in use. Delete one before adding another.",{count:MAX_IDLE_RULE_SETS}):t("Could not save this Idle Rule."));}};
 const remove=async(id:string)=>{const generated=id.startsWith('goal-rule:'),next=rules.filter(rule=>rule.id!==id);await onSave(next,activeRuleId===id?undefined:activeRuleId);setNotice(generated?t("Goal stop rule deleted. The pinned goal remains and can recreate it."):t("Idle Rule deleted."));};
 const quickBlocked=(hours:number)=>rules.length>=MAX_IDLE_RULE_SETS&&!rules.some(row=>row.id==='idle-duration-'+hours+'h');
 const quick=async(hours:number)=>{const id='idle-duration-'+hours+'h',rule:IdleRuleSet={id,characterId:character.id,name:'Safe '+hours+'h session',conditions:[{id:'duration',kind:'duration_seconds',value:hours*3600,enabled:true}],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true};try{await onSave(upsertIdleRuleSet(rules,rule),id);setNotice(t("Safe {hours}h session armed.",{hours}));}catch(error){setNotice(error instanceof Error&&error.message==='idle_rule_limit_reached'?t("All {count} rule slots are in use. Delete one before adding another.",{count:MAX_IDLE_RULE_SETS}):t("Could not activate this preset."));}};
 return <><Panel>
  <View style={s.heading}><View style={s.flex}><Text style={s.title}>{t("Advanced Idle Rules")}</Text><Text style={s.copy}>{t("Rules stop the current activity on the trusted settlement path. A non-safety stop can hand off to the next Action Queue entry in the same region; food/storage safety always pauses the queue. Rules never auto-travel or extend Offline Reserve.")}</Text></View><Text style={s.count}>{rules.length}/{MAX_IDLE_RULE_SETS}</Text></View>
  {rules.length?rules.map(rule=>{const generated=rule.id.startsWith('goal-rule:');return <View key={rule.id} style={[s.rule,stackActions&&s.ruleStack,activeRuleId===rule.id&&s.active]}><View style={s.flex}><View style={s.ruleTitleRow}><Text style={s.ruleName}>{rule.name}</Text>{generated?<Text style={s.generated}>{t("GOAL RULE")}</Text>:null}</View>{rule.conditions.map(condition=><Text key={condition.id} style={s.condition}>• {displayCondition(condition,state,p)}</Text>)}<Text style={s.safety}>{t("Food safety {food} · Overflow safety {overflow} · finish current cycle",{food:rule.stopIfOutOfFood?t("ON"):t("OFF"),overflow:rule.stopIfRewardsWouldOverflow?t("ON"):t("OFF")})}</Text></View><View style={[s.ruleActions,stackActions&&s.ruleActionsStack]}><GameButton compact title={activeRuleId===rule.id?t("Active"):t("Use")} tone={activeRuleId===rule.id?'primary':'secondary'} disabled={busy} onPress={()=>void onSave(rules,activeRuleId===rule.id?undefined:rule.id)}/><GameButton compact title={t("Delete")} tone="danger" disabled={busy} onPress={()=>void remove(rule.id)}/></View></View>}):<Text style={s.empty}>{t("No custom rule yet. Existing combat food safety still applies.")}</Text>}
  <View style={[s.actions,stackActions&&s.actionsStack]}><View style={s.flex}><GameButton compact title={t("Safe 1h")} tone="secondary" disabled={busy||quickBlocked(1)} onPress={()=>void quick(1)}/></View><View style={s.flex}><GameButton compact title={t("Safe 4h")} tone="secondary" disabled={busy||quickBlocked(4)} onPress={()=>void quick(4)}/></View></View>
  {rules.length>=MAX_IDLE_RULE_SETS?<Text style={s.limitHint}>{t("All rule slots are in use. Existing presets can still be refreshed; new presets will not replace another rule.")}</Text>:null}
  <GameButton title={rules.length>=MAX_IDLE_RULE_SETS?t("{count} rules saved",{count:MAX_IDLE_RULE_SETS}):t("Create Custom Rule")} disabled={busy||rules.length>=MAX_IDLE_RULE_SETS} onPress={()=>setOpen(true)}/>
 {!!notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>:null}</Panel>
 <GameModalSurface visible={open} reduceMotion={state.settings.reduceMotion} onClose={()=>setOpen(false)} backdropLabel={t("Cancel Idle Rule creation")}>
  <GameModalHeader eyebrow={t("ADVANCED IDLE RULES")} title={t("Create Idle Rule")} onClose={()=>setOpen(false)}/>
  <Text style={s.modalIntro}>{t("Add up to six stop conditions. The earliest reached condition stops the activity. Safety stops always pause the Action Queue.")}</Text>
  <ScrollView style={s.modalScroll} contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <Text style={s.label}>{t("Rule name")}</Text><GameTextInput value={name} onChangeText={setName} maxLength={40} placeholder={t("My Idle Rule")}/>
   <Text style={s.label}>{t("Conditions · {count}/6",{count:conditions.length})}</Text>{conditions.map(condition=><View key={condition.id} style={s.draftCondition}><Text style={s.conditionText}>{displayCondition(condition,state,p)}</Text><Pressable accessibilityRole="button" onPress={()=>setConditions(current=>current.filter(row=>row.id!==condition.id))} style={s.remove}><Text style={s.removeText}>{t("Remove")}</Text></Pressable></View>)}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:picker==='kind'}} onPress={()=>setPicker(picker==='kind'?null:'kind')} style={s.dropdown}><View style={s.flex}><Text style={s.dropdownLabel}>{t("CONDITION TYPE")}</Text><Text style={s.dropdownValue}>{p(KIND_LABEL[kind])}</Text></View><Text style={s.chevron}>{picker==='kind'?'⌃':'⌄'}</Text></Pressable>
   {picker==='kind'?<View style={s.menu}>{(Object.keys(KIND_LABEL) as IdleStopKind[]).map(option=><Pressable key={option} onPress={()=>chooseKind(option)} style={[s.menuRow,kind===option&&s.menuSelected]}><Text style={s.menuText}>{kind===option?'✓ ':''}{p(KIND_LABEL[option])}</Text></Pressable>)}</View>:null}
   {needsTarget(kind)?<><Pressable accessibilityRole="button" accessibilityState={{expanded:picker==='target'}} onPress={()=>setPicker(picker==='target'?null:'target')} style={s.dropdown}><View style={s.flex}><Text style={s.dropdownLabel}>{t("TARGET")}</Text><Text numberOfLines={1} style={s.dropdownValue}>{selectedTarget?.label??t("Choose target")}</Text></View><Text style={s.chevron}>{picker==='target'?'⌃':'⌄'}</Text></Pressable>{picker==='target'?<View style={s.targetMenu}><SearchField value={query} onChangeText={setQuery} placeholder={t("Search targets…")}/><ScrollView style={s.targetList} nestedScrollEnabled showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>{targets.map(row=><Pressable key={row.id} onPress={()=>{setTargetId(row.id);setPicker(null);setQuery('')}} style={[s.targetRow,targetId===row.id&&s.menuSelected]}><View style={s.flex}><Text style={s.menuText}>{targetId===row.id?'✓ ':''}{row.label}</Text>{row.current!==undefined?<Text style={s.current}>{t("Current")} {row.current.toLocaleString()}</Text>:null}</View></Pressable>)}</ScrollView></View>:null}</>:null}
   <Text style={s.label}>{p(valueLabel(kind))}</Text><GameTextInput value={value} onChangeText={setValue} keyboardType="number-pad" placeholder={kind==='duration_seconds'?t("Minutes"):t("Target value")}/>
   <GameButton title={conditions.length>=6?t("6 conditions added"):t("Add Condition")} tone="secondary" disabled={conditions.length>=6||(needsTarget(kind)&&!targetId)} onPress={addCondition}/>
   <View style={s.switchRow}><View style={s.flex}><Text style={s.ruleName}>{t("Food safety")}</Text><Text style={s.copy}>{t("Stop if carried auto-eat food is exhausted.")}</Text></View><Switch value={foodSafety} onValueChange={setFoodSafety} trackColor={{false:C.line,true:C.info}} thumbColor={C.text}/></View>
   <View style={s.switchRow}><View style={s.flex}><Text style={s.ruleName}>{t("Storage safety")}</Text><Text style={s.copy}>{t("Stop before the next reward would create additional Overflow.")}</Text></View><Switch value={overflowSafety} onValueChange={setOverflowSafety} trackColor={{false:C.line,true:C.info}} thumbColor={C.text}/></View>
  </ScrollView>
  <View style={[s.footer,stackActions&&s.footerStack]}><View style={s.flex}><GameButton title={t("Cancel")} tone="secondary" onPress={()=>{setOpen(false);resetDraft()}}/></View><View style={s.flex}><GameButton title={t("Save & Use Rule")} disabled={busy||(!conditions.length&&!foodSafety&&!overflowSafety)} onPress={()=>void saveNew()}/></View></View>
 </GameModalSurface></>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 heading:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted,lineHeight:18},count:{color:C.accent,fontSize:14,fontWeight:'900'},
 rule:{minHeight:74,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:9,borderTopWidth:1,borderTopColor:C.line},ruleStack:{alignItems:'stretch',flexDirection:'column'},active:{backgroundColor:C.goodSurface},ruleTitleRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6},ruleName:{...typography.bodyStrong,color:C.text},generated:{fontSize:8,lineHeight:11,color:C.info,fontWeight:'900',letterSpacing:.55,paddingHorizontal:6,paddingVertical:2,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},condition:{color:C.info,fontSize:10,lineHeight:15},safety:{color:C.muted,fontSize:9,marginTop:3},ruleActions:{width:88,gap:4},ruleActionsStack:{width:'100%'},
 empty:{color:C.muted,paddingVertical:10},actions:{flexDirection:'row',gap:spacing.sm},actionsStack:{flexDirection:'column'},limitHint:{...typography.caption,color:C.warning,lineHeight:16},notice:{...typography.caption,color:C.info,fontWeight:'800',lineHeight:16},
 modalIntro:{...typography.caption,color:C.muted,lineHeight:17,paddingBottom:4},modalScroll:{maxHeight:'68%'},sheetContent:{paddingVertical:spacing.sm,gap:8},
 label:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,marginTop:4},draftCondition:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},conditionText:{flex:1,color:C.text,fontSize:11,fontWeight:'700'},remove:{minHeight:36,justifyContent:'center',paddingHorizontal:6},removeText:{color:C.bad,fontSize:9,fontWeight:'900'},
 dropdown:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},dropdownLabel:{color:C.muted,fontSize:9,fontWeight:'900'},dropdownValue:{color:C.text,fontWeight:'900',marginTop:2},chevron:{color:C.accent,fontSize:19,fontWeight:'900'},
 menu:{borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden'},menuRow:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.panel},menuSelected:{backgroundColor:C.selection},menuText:{color:C.text,fontWeight:'800',textTransform:'capitalize'},
 targetMenu:{gap:6,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},targetList:{maxHeight:230},targetRow:{minHeight:48,justifyContent:'center',paddingHorizontal:9,borderBottomWidth:1,borderBottomColor:C.line},current:{color:C.muted,fontSize:9,marginTop:2},
 switchRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,borderTopWidth:1,borderTopColor:C.line},footer:{flexDirection:'row',gap:spacing.sm,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},footerStack:{flexDirection:'column'}
});}

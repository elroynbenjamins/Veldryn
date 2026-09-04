import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameState} from '../core/types';
import {QUESTS} from '../content/quests';
import {itemDef} from '../content/items';
import {JournalFilter,QuestDestination,journalEntries,questDestination} from '../core/quest-journal';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {StatBar} from '../components/StatBar';
import {C,spacing,typography} from '../theme/theme';

export function QuestScreen({state,onClaim,onNavigate}:{state:GameState;onClaim:(id:string)=>void;onNavigate:(destination:QuestDestination)=>void}){
  const [filter,setFilter]=useState<JournalFilter>('current'),[query,setQuery]=useState('');
  const [notice,setNotice]=useState(''),[error,setError]=useState('');
  const entries=journalEntries(state,filter,query);
  const claimed=QUESTS.filter(def=>state.quests.some(q=>q.questId===def.id&&q.status==='claimed')).length;
  const ready=state.quests.filter(q=>q.status==='complete').length;
  function claim(id:string){
    try{onClaim(id);const def=QUESTS.find(q=>q.id===id)!;setNotice(`Claimed ${def.name}: ${def.rewardGold} gold${def.rewardItemId?` and ${def.rewardItemQty??1}× ${itemDef(def.rewardItemId).name}`:''}.`);setError('')}
    catch(e){setError(e instanceof Error?e.message:'Unable to claim this quest.');setNotice('')}
  }
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <Text style={s.h}>Asterfall Journal</Text>
    <Panel><Text style={s.title}>{claimed===QUESTS.length?'Asterfall campaign complete':'Your Asterfall journey'}</Text><StatBar label="Chapters claimed" current={claimed} max={QUESTS.length}/><Text style={s.sub}>{claimed===QUESTS.length?'Every chapter reward has been claimed. You can revisit hunts, crafting, and equipment upgrades.':`${ready} reward${ready===1?'':'s'} ready to claim. Claim each chapter to unlock the next.`}</Text></Panel>
    <ScrollView horizontal contentContainerStyle={s.row}>{(['current','all','claimed','locked'] as const).map(value=><GameButton key={value} title={value==='current'?'Current':value==='all'?'All':value==='claimed'?'Completed':'Locked'} tone={filter===value?'primary':'secondary'} onPress={()=>setFilter(value)}/>)}</ScrollView>
    <TextInput accessibilityLabel="Search quests" style={s.input} placeholder="Search quest names or objectives…" placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    {!!notice&&<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}{!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {entries.length===0&&<Panel><Text style={s.title}>No matching chapters</Text><Text style={s.sub}>{filter==='current'&&claimed===QUESTS.length?'You have completed this journal. View Completed to revisit it.':'Try another search or view all chapters.'}</Text><GameButton title="Show all chapters" onPress={()=>{setQuery('');setFilter('all')}}/></Panel>}
    {entries.map(({def,quest,chapter,remaining,previous})=>{
      const destination=questDestination(def);
      return <Panel key={def.id}>
        <Text style={s.chapter}>CHAPTER {chapter} · {quest.status==='complete'?'REWARD READY':quest.status==='claimed'?'CLAIMED':quest.status.toUpperCase()}</Text>
        <Text style={s.title}>{def.name}</Text><Text style={s.sub}>{def.description}</Text>
        {quest.status==='locked'?<Text style={s.hint}>Claim “{previous??'the previous chapter'}” to unlock this objective. Progress is not tracked while locked.</Text>:<><StatBar label="Objective progress" current={Math.min(def.required,quest.progress)} max={def.required}/><Text style={s.hint}>{quest.status==='claimed'?'Reward already collected':quest.status==='complete'?'Objective complete — claim your reward':`${remaining} remaining`}</Text></>}
        <Text style={s.reward}>Reward: {def.rewardGold} gold{def.rewardItemId?` · ${def.rewardItemQty??1}× ${itemDef(def.rewardItemId).name}`:''}</Text>
        {quest.status==='active'&&<><Text style={s.sub}>{destination.hint}</Text><GameButton title={destination.label} tone="secondary" onPress={()=>onNavigate(destination)}/></>}
        {quest.status==='complete'&&<GameButton title="Claim chapter rewards" onPress={()=>claim(def.id)}/>}
      </Panel>;
    })}
  </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},chapter:{...typography.caption,color:C.accent,fontWeight:'900'},hint:{...typography.body,color:C.info},reward:{...typography.bodyStrong,color:C.accent},notice:{...typography.bodyStrong,color:C.good},error:{...typography.body,color:C.bad},row:{flexDirection:'row',gap:spacing.sm},input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel,fontSize:16}});

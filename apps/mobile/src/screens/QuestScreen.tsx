import {QuestReward} from '../components/QuestReward';
import {UiIcon} from '../components/UiIcon';
import {ActionFeedback} from '../components/ActionFeedback';
import {newlyConfirmedIds} from '../core/visual-feedback';
import {SearchField} from '../components/SearchField';
import {useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState} from '../core/types';
import {QUESTS} from '../content/quests';
import {JournalFilter,QuestDestination,journalEntries,questDestination} from '../core/quest-journal';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {StatBar} from '../components/StatBar';
import {C,equipmentColors,spacing,typography} from '../theme/theme';
import {QUEST_RARITIES,SeasonalPeriod,SeasonalQuest,seasonalQuestBoard} from '../core/seasonal-quests';

export function QuestScreen({state,onClaim,onClaimContract,onNavigate}:{state:GameState;onClaim:(id:string)=>void;onClaimContract:(period:SeasonalPeriod,id:string)=>void;onNavigate:(destination:QuestDestination)=>void}){
  const [filter,setFilter]=useState<JournalFilter>('current'),[query,setQuery]=useState('');
  const [notice,setNotice]=useState(''),[error,setError]=useState('');
  const [showContracts,setShowContracts]=useState(false);
  const confirmed=useRef({characterId:state.character?.id,quests:state.quests.filter(q=>q.status==='claimed').map(q=>q.questId),contracts:state.account.seasonalContractClaimIds??[]});
  useEffect(()=>{
    const next={characterId:state.character?.id,quests:state.quests.filter(q=>q.status==='claimed').map(q=>q.questId),contracts:state.account.seasonalContractClaimIds??[]};
    const previous=confirmed.current;confirmed.current=next;
    if(previous.characterId!==next.characterId){setNotice('');setError('');return;}
    const chapters=newlyConfirmedIds(previous.quests,next.quests),contracts=newlyConfirmedIds(previous.contracts,next.contracts);
    if(chapters.length){setNotice(chapters.map(id=>'Rewards received: '+(QUESTS.find(q=>q.id===id)?.name??'chapter')+'.').join(' '));setError('');}
    else if(contracts.length){setNotice('Contract rewards received.');setError('');}
  },[state.quests,state.account.seasonalContractClaimIds,state.character?.id]);
  const entries=journalEntries(state,filter,query);
  const daily=seasonalQuestBoard(state,'daily'),weekly=seasonalQuestBoard(state,'weekly'),monthly=seasonalQuestBoard(state,'monthly');
  const claimed=QUESTS.filter(def=>state.quests.some(q=>q.questId===def.id&&q.status==='claimed')).length;
  const ready=state.quests.filter(q=>q.status==='complete').length;
  function claim(id:string){
    try{setNotice('');setError('');onClaim(id)}
    catch(e){setError(e instanceof Error?e.message:'Unable to claim this quest.');setNotice('')}
  }
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <View style={s.journalHeading}><UiIcon name="quests" size={40}/><Text accessibilityRole="header" style={[s.h,s.flex]}>Asterfall Journal</Text></View>
    <Panel><Text style={s.title}>{claimed===QUESTS.length?'Asterfall campaign complete':'Your Asterfall journey'}</Text><StatBar reduceMotion={state.settings.reduceMotion} label="Chapters claimed" current={claimed} max={QUESTS.length}/><Text style={s.sub}>{claimed===QUESTS.length?'Every chapter reward has been claimed. You can revisit hunts, crafting, and equipment upgrades.':`${ready} reward${ready===1?'':'s'} ready to claim. Claim each chapter to unlock the next.`}</Text></Panel>
    <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{(['current','all','claimed','locked'] as const).map(value=><FilterChip key={value} label={`${value==='current'?'Current':value==='all'?'All':value==='claimed'?'Completed':'Locked'} · ${value==='current'?entries.length:value==='all'?QUESTS.length:value==='claimed'?claimed:state.quests.filter(quest=>quest.status==='locked').length}`} selected={filter===value} onPress={()=>setFilter(value)}/>)}</ScrollView>
    <SearchField accessibilityLabel="Search quests" placeholder="Search quest names or objectives…" placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showContracts}} onPress={()=>setShowContracts(value=>!value)} style={s.disclosure}><View style={s.flex}><Text style={s.chapter}>ROTATING CONTRACTS</Text><Text style={s.title}>{daily.length+weekly.length+monthly.length} daily, weekly & monthly objectives</Text></View><Text style={s.disclosureMark}>{showContracts?'−':'+'}</Text></Pressable>
    {showContracts&&<Panel><Text style={s.sub}>Class-aligned contracts award progressively stronger rarity caches.</Text><ContractRows state={state} label={`DAILY · ${daily[0]?.className??''}`} quests={daily} onClaim={onClaimContract}/><ContractRows state={state} label="WEEKLY" quests={weekly} onClaim={onClaimContract}/><ContractRows state={state} label="MONTHLY" quests={monthly} onClaim={onClaimContract}/></Panel>}
    {!!notice&&<ActionFeedback message={notice} reduceMotion={state.settings.reduceMotion}/>}{!!error&&<ActionFeedback message={error} tone="error" reduceMotion={state.settings.reduceMotion}/>}
    {entries.length===0&&<Panel><Text style={s.title}>No matching chapters</Text><Text style={s.sub}>{filter==='current'&&claimed===QUESTS.length?'You have completed this journal. View Completed to revisit it.':'Try another search or view all chapters.'}</Text><GameButton title="Show all chapters" onPress={()=>{setQuery('');setFilter('all')}}/></Panel>}
    {entries.map(({def,quest,chapter,remaining,previous})=>{
      const destination=questDestination(def);
      return <Panel key={def.id} accentColor={quest.status==='complete'?C.good:undefined} accentSurface={quest.status==='complete'?'#14272A':undefined}>
        <Text style={s.chapter}>CHAPTER {chapter} · {quest.status==='complete'?'REWARD READY':quest.status==='claimed'?'CLAIMED':quest.status.toUpperCase()}</Text>
        <Text style={s.title}>{def.name}</Text><Text style={s.sub}>{def.description}</Text>
        {quest.status==='locked'?<Text style={s.hint}>Claim “{previous??'the previous chapter'}” to unlock this objective. Progress is not tracked while locked.</Text>:<><StatBar reduceMotion={state.settings.reduceMotion} label="Objective progress" current={Math.min(def.required,quest.progress)} max={def.required}/><Text style={s.hint}>{quest.status==='claimed'?'Reward already collected':quest.status==='complete'?'Objective complete — claim your reward':`${remaining} remaining`}</Text></>}
        <QuestReward gold={def.rewardGold} itemId={def.rewardItemId} quantity={def.rewardItemQty??1} label={quest.status==='claimed'?'Rewards collected':'Chapter rewards'}/>
        {quest.status==='active'&&<><Text style={s.sub}>{destination.hint}</Text><GameButton title={destination.label} tone="secondary" onPress={()=>onNavigate(destination)}/></>}
        {quest.status==='complete'&&<GameButton title="Claim chapter rewards" onPress={()=>claim(def.id)}/>}
      </Panel>;
    })}
  </ScrollView>;
}
function FilterChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.filterChip,selected&&s.filterChipSelected,pressed&&s.pressed]}><Text style={[s.filterText,selected&&s.filterTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}
function ContractRows({state,label,quests,onClaim}:{state:GameState;label:string;quests:SeasonalQuest[];onClaim:(period:SeasonalPeriod,id:string)=>void}){return <><Text style={s.seasonLabel}>{label}</Text>{quests.map(quest=>{const rarity=QUEST_RARITIES[quest.rarity],claimed=(state.account.seasonalContractClaimIds??[]).includes(quest.id),ready=quest.progress>=quest.required;return <View key={quest.id} style={s.seasonQuest}><View style={s.contractHead}><Text style={s.seasonName}>{quest.name}</Text><View style={[s.rarity,{borderColor:rarity.color}]}><Text style={[s.rarityText,{color:rarity.color}]}>{rarity.label.toUpperCase()}</Text></View></View><Text style={s.sub}>{quest.description}</Text><StatBar reduceMotion={state.settings.reduceMotion} label={`${quest.progress}/${quest.required} progress · ${quest.tag.toUpperCase()}`} current={quest.progress} max={quest.required}/><QuestReward gold={quest.rewardGold} xp={quest.rewardXp} itemId={quest.rewardItemId} quantity={quest.rewardItemQty} label={rarity.cache}/>{claimed?<Text style={s.claimed}>✓ Cache claimed</Text>:ready?<GameButton title={`Claim ${rarity.label} cache`} onPress={()=>onClaim(quest.period,quest.id)}/>:<Text style={s.contractHint}>{quest.required-quest.progress} progress remaining</Text>}</View>})}</>}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},journalHeading:{flexDirection:'row',alignItems:'center',gap:12},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},chapter:{...typography.caption,color:C.accent,fontWeight:'900'},hint:{...typography.body,color:C.info},reward:{...typography.bodyStrong,color:C.accent},notice:{...typography.bodyStrong,color:C.good},error:{...typography.body,color:C.bad},disclosure:{minHeight:68,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},disclosureMark:{width:28,color:C.accent,fontSize:25,textAlign:'center'},flex:{flex:1,minWidth:0},filterChip:{minHeight:38,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},filterChipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},filterText:{fontSize:12,color:C.muted,fontWeight:'700'},filterTextSelected:{color:'#d9f3ff'},pressed:{opacity:.76},seasonLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1,marginTop:spacing.sm},seasonQuest:{gap:spacing.xs,borderTopWidth:1,borderColor:C.line,paddingTop:spacing.sm},contractHead:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},seasonName:{...typography.bodyStrong,color:C.text,flexGrow:1,flexBasis:180},rarity:{borderWidth:1,borderRadius:99,paddingHorizontal:spacing.sm,paddingVertical:2},rarityText:{fontSize:10,fontWeight:'900'},cache:{...typography.caption,fontWeight:'800'},claimed:{...typography.caption,color:C.good,fontWeight:'900'},contractHint:{...typography.caption,color:C.muted},row:{flexDirection:'row',gap:spacing.sm},input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel,fontSize:16}});

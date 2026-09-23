import {QuestReward} from '../components/QuestReward';
import {StatusPill} from '../components/StatusPill';
import {UiIcon} from '../components/UiIcon';
import {ActionFeedback} from '../components/ActionFeedback';
import {EmptyState} from '../components/EmptyState';
import {newlyConfirmedIds} from '../core/visual-feedback';
import {SearchField} from '../components/SearchField';
import {useEffect,useRef,useState,useMemo} from 'react';
import {Animated,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState} from '../core/types';
import {QUESTS,QUEST_ACTS,type QuestAct} from '../content/quests';
import {JournalFilter,QuestDestination,journalEntries,questDestination} from '../core/quest-journal';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {StatBar} from '../components/StatBar';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {QUEST_RARITIES,SeasonalPeriod,SeasonalQuest,seasonalQuestBoard} from '../core/seasonal-quests';
import {weeklyOrderBoardForState} from '../core/long-term-progression-runtime';
import type {WeeklyOrder} from '../core/weekly-orders-v41';
import {weeklyOrderDestination,weeklyOrderIdleRuleId,weeklyOrderQueueActivity} from '../core/weekly-order-integrations-v41';
import {MAX_ACTIVITY_QUEUE} from '../core/activity-queue';
import {WORLD_ZONES} from '../content/world-map';
import {questPresentationMeta} from '../core/quest-presentation';
import {contractAnticipation} from '../core/progress-anticipation';
import {fallenKnightWeeklyStatus} from '../core/weekly-boss';
import {QuestModeSwitch,type QuestMode} from '../components/QuestModeSwitch';
export type {QuestMode} from '../components/QuestModeSwitch';

type ClaimMoment={
  key:string;
  kind:'chapter'|'contract';
  eyebrow:string;
  title:string;
  detail:string;
  gold:number;
  xp?:number;
  itemId?:string;
  quantity?:number;
  rarityColor?:string;
};
function ClaimMomentCard({moment,reduceMotion}:{moment:ClaimMoment;reduceMotion:boolean}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),pulse=useRef(new Animated.Value(1)).current,accent=moment.rarityColor??C.good;
  useEffect(()=>{pulse.stopAnimation();pulse.setValue(1);if(reduceMotion)return;Animated.sequence([Animated.spring(pulse,{toValue:1.025,damping:9,stiffness:230,mass:.6,useNativeDriver:true}),Animated.spring(pulse,{toValue:1,damping:16,stiffness:210,mass:.7,useNativeDriver:true})]).start();return()=>pulse.stopAnimation()},[moment.key,reduceMotion,pulse]);
  return <Animated.View accessibilityLiveRegion="polite" style={[s.claimMoment,{borderColor:accent,transform:[{scale:pulse}]}]}>
    <View style={s.claimMomentHead}><View style={s.flex}><Text style={[s.claimMomentEyebrow,{color:accent}]}>✦ {moment.eyebrow}</Text><Text style={s.claimMomentTitle}>{moment.title}</Text><Text style={s.claimMomentDetail}>{moment.detail}</Text></View><StatusPill label="SECURED" tone="good"/></View>
    <QuestReward gold={moment.gold} xp={moment.xp} itemId={moment.itemId} quantity={moment.quantity??1} label="Rewards secured"/>
  </Animated.View>;
}

export function QuestScreen({state,mode,onModeChange,focusedWeeklyOrderId,onClaim,onClaimContract,onNavigate,onOpenWeeklyOrder,onPinWeeklyOrder,onQueueWeeklyOrder,onStopWeeklyOrder}:{state:GameState;mode:QuestMode;onModeChange:(mode:QuestMode)=>void;focusedWeeklyOrderId?:string;onClaim:(id:string)=>void;onClaimContract:(period:SeasonalPeriod,id:string)=>void;onNavigate:(destination:QuestDestination)=>void;onOpenWeeklyOrder:(order:WeeklyOrder)=>void;onPinWeeklyOrder:(order:WeeklyOrder)=>void;onQueueWeeklyOrder:(order:WeeklyOrder)=>void;onStopWeeklyOrder:(order:WeeklyOrder)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const [filter,setFilter]=useState<JournalFilter>('current'),[query,setQuery]=useState(''),[challengePeriod,setChallengePeriod]=useState<'all'|'daily'|'weekly'|'monthly'>('all');
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[claimMoment,setClaimMoment]=useState<ClaimMoment|null>(null);
  const confirmed=useRef({characterId:state.character?.id,quests:state.quests.filter(q=>q.status==='claimed').map(q=>q.questId),contracts:state.account.seasonalContractClaimIds??[]});
  useEffect(()=>{
    const next={characterId:state.character?.id,quests:state.quests.filter(q=>q.status==='claimed').map(q=>q.questId),contracts:state.account.seasonalContractClaimIds??[]};
    const previous=confirmed.current;confirmed.current=next;
    if(previous.characterId!==next.characterId){setNotice('');setError('');setClaimMoment(null);return;}
    const chapters=newlyConfirmedIds(previous.quests,next.quests),contracts=newlyConfirmedIds(previous.contracts,next.contracts);
    if(chapters.length){
      const id=chapters[chapters.length-1],def=QUESTS.find(q=>q.id===id);
      if(def)setClaimMoment({key:'chapter:'+id,kind:'chapter',eyebrow:'CHAPTER COMPLETE',title:def.name,detail:'Rewards secured · the next available story beat is now ready.',gold:def.rewardGold,itemId:def.rewardItemId,quantity:def.rewardItemQty??1});
      setNotice('');setError('');
    }else if(contracts.length){
      const id=contracts[contracts.length-1],contract=(['daily','weekly','monthly'] as const).flatMap(period=>seasonalQuestBoard(state,period)).find(row=>row.id===id);
      if(contract){const rarity=QUEST_RARITIES[contract.rarity];setClaimMoment({key:'contract:'+id,kind:'contract',eyebrow:rarity.label.toUpperCase()+' CACHE CLAIMED',title:contract.name,detail:'Challenge reward secured and added to your account.',gold:contract.rewardGold,xp:contract.rewardXp,itemId:contract.rewardItemId,quantity:contract.rewardItemQty,rarityColor:rarity.color});}
      setNotice('');setError('');
    }
  },[state.quests,state.account.seasonalContractClaimIds,state.character?.id]);
  const entries=journalEntries(state,filter,query);
  const daily=seasonalQuestBoard(state,'daily'),weekly=seasonalQuestBoard(state,'weekly'),monthly=seasonalQuestBoard(state,'monthly'),contractBoard=weeklyOrderBoardForState(state),pendingBoardRewards=(state.account.weeklyOrderPendingRewards??[]).filter(row=>row.weekKey===contractBoard.weekKey);
  const fallenKnightWeekly=state.defeatedBossIds.includes('FALLEN_KNIGHT')?fallenKnightWeeklyStatus(state,Date.now()):undefined;
  const claimed=QUESTS.filter(def=>state.quests.some(q=>q.questId===def.id&&q.status==='claimed')).length;
  const ready=state.quests.filter(q=>q.status==='complete').length;
  const currentDef=QUESTS.find(def=>state.quests.find(q=>q.questId===def.id)?.status!=='claimed')??QUESTS[QUESTS.length-1],currentAct=QUEST_ACTS[currentDef.act];
  const boardComplete=contractBoard.orders.filter(order=>order.progress>=order.target).length,boardActive=Math.max(0,contractBoard.orders.length-boardComplete);
  const focusedOrder=focusedWeeklyOrderId?contractBoard.orders.find(order=>order.id===focusedWeeklyOrderId):undefined,focusedOrderMissing=!!focusedWeeklyOrderId&&!focusedOrder;
  const challengeClaimedIds=new Set(state.account.seasonalContractClaimIds??[]),allChallenges=[...daily,...weekly,...monthly];
  const challengeReadyCount=allChallenges.filter(row=>row.progress>=row.required&&!challengeClaimedIds.has(row.id)).length,challengeClaimedCount=allChallenges.filter(row=>challengeClaimedIds.has(row.id)).length;
  const modeTitle=mode==='story'?'Asterfall Journal':mode==='contracts'?'Contract Board':'Class Challenges';
  const modeSubtitle=mode==='story'?'Campaign chapters, story rewards and the next Asterfall objective.':mode==='contracts'?'Weekly Hunt, Work, Regional and Threat jobs with exact progression routes.':'Personal daily, weekly and monthly objectives tied to your class.';
  function claim(id:string){
    try{setClaimMoment(null);setNotice('');setError('');onClaim(id)}
    catch(e){setError(e instanceof Error?e.message:'Unable to claim this quest.');setNotice('')}
  }
  function claimContract(period:SeasonalPeriod,id:string){
    try{setClaimMoment(null);setNotice('');setError('');onClaimContract(period,id)}
    catch(e){setError(e instanceof Error?e.message:'Unable to claim this contract.');setNotice('')}
  }
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <View style={s.journalHeading}><UiIcon name="quests" size={40}/><View style={s.flex}><Text style={s.hubEyebrow}>QUESTS & OBJECTIVES</Text><Text accessibilityRole="header" style={s.h}>{modeTitle}</Text><Text style={s.hubSubtitle}>{modeSubtitle}</Text></View></View>
    <QuestModeSwitch mode={mode} onChange={onModeChange} storyMeta={ready?ready+' ready':claimed+'/'+QUESTS.length+' claimed'} contractMeta={boardComplete+'/'+contractBoard.orders.length+' complete'} challengeMeta={challengeReadyCount?challengeReadyCount+' ready':challengeClaimedCount+'/'+allChallenges.length+' claimed'} storyAttention={ready} contractAttention={pendingBoardRewards.length} challengeAttention={challengeReadyCount}/>
    {mode==='story'?<>
    <Panel><Text style={s.actEyebrow}>ACT {roman(currentAct.act)} · {currentAct.name.toUpperCase()}</Text><Text style={s.title}>{claimed===QUESTS.length?'Asterfall campaign complete':currentAct.subtitle}</Text><StatBar reduceMotion={state.settings.reduceMotion} label="Chapters claimed" current={claimed} max={QUESTS.length}/><Text style={s.sub}>{claimed===QUESTS.length?'Every chapter reward has been claimed. You can revisit the story, hunts, crafting, and equipment upgrades.':`${ready} reward${ready===1?'':'s'} ready to claim. Claim each chapter to unlock the next story beat.`}</Text></Panel>
    <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{(['current','all','claimed','locked'] as const).map(value=><FilterChip key={value} label={`${value==='current'?'Current':value==='all'?'All':value==='claimed'?'Completed':'Locked'} · ${value==='current'?entries.length:value==='all'?QUESTS.length:value==='claimed'?claimed:state.quests.filter(quest=>quest.status==='locked').length}`} selected={filter===value} onPress={()=>setFilter(value)}/>)}</ScrollView>
    <SearchField accessibilityLabel="Search quests" placeholder="Search story, locations or objectives…" placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    </>:null}
    {mode==='contracts'?<>
      <Panel accentColor={C.info}>
        <View style={s.modeHeroHead}><View style={s.flex}><Text style={s.modeEyebrow}>WEEKLY BOARD · {contractBoard.weekKey}</Text><Text style={s.title}>{boardActive>0?boardActive+' active job'+(boardActive===1?'':'s'):'All posted jobs complete'}</Text></View>{pendingBoardRewards.length>0?<StatusPill label={pendingBoardRewards.length+' REWARD'+(pendingBoardRewards.length===1?'':'S')} tone="good"/>:<StatusPill label="WEEKLY" tone="info"/>}</View>
        <View style={s.modeStats}><View style={s.modeStat}><Text style={s.modeStatValue}>{contractBoard.orders.length}</Text><Text style={s.modeStatLabel}>POSTED</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{boardComplete}</Text><Text style={s.modeStatLabel}>COMPLETE</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{boardActive}</Text><Text style={s.modeStatLabel}>ACTIVE</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{pendingBoardRewards.length}</Text><Text style={s.modeStatLabel}>REWARDS</Text></View></View>
        <Text style={s.sub}>Jobs track exact activities during the current UTC week. Hunt named monsters, fill profession orders, stabilize regions, and unlock mastery-based Threat Bounties.</Text>
        <Text style={s.contractHint}>Resets {new Date(contractBoard.endsAtMs).toISOString().slice(0,10)} at 00:00 UTC.</Text>
      </Panel>
      {focusedOrderMissing?<ActionFeedback message="That focused weekly job expired or the board refreshed. Showing the current Contract Board instead." tone="info" reduceMotion={state.settings.reduceMotion}/>:null}
      <Panel>
        {focusedOrder?<View style={s.focusBanner}><Text style={s.focusBannerLabel}>FOCUSED CONTRACT</Text><Text numberOfLines={1} style={s.focusBannerTitle}>{focusedOrder.title}</Text><Text style={s.contractHint}>Opened from another gameplay screen and promoted to the top below.</Text></View>:null}
        <WeeklyOrderRows state={state} orders={contractBoard.orders} reduceMotion={state.settings.reduceMotion} focusedOrderId={focusedWeeklyOrderId} onOpenOrder={onOpenWeeklyOrder} onPinOrder={onPinWeeklyOrder} onQueueOrder={onQueueWeeklyOrder} onStopOrder={onStopWeeklyOrder}/>
        {contractBoard.completionClaimed?<Text style={s.claimed}>✓ Full Contract Board completion reward queued</Text>:<Text style={s.contractHint}>{boardComplete}/{contractBoard.orders.length} weekly jobs complete · finish every posting for the board completion reward.</Text>}
      </Panel>
      {fallenKnightWeekly?<Panel><View style={s.contractHead}><Text style={s.seasonName}>Break the Last Oath</Text><View style={[s.rarity,{borderColor:fallenKnightWeekly.bountyAwarded?C.good:C.warning}]}><Text style={[s.rarityText,{color:fallenKnightWeekly.bountyAwarded?C.good:C.warning}]}>WEEKLY BOSS</Text></View></View><Text style={s.sub}>Defeat the Fallen Knight once after the story clear to complete the Oathglass Bounty. Up to three rewarded rematch victories are available each UTC week.</Text><StatBar reduceMotion={state.settings.reduceMotion} label="Fallen Knight weekly bounty" current={Math.min(fallenKnightWeekly.rewardedClears,fallenKnightWeekly.bountyTarget)} max={fallenKnightWeekly.bountyTarget}/><Text style={fallenKnightWeekly.bountyAwarded?s.claimed:s.contractHint}>{fallenKnightWeekly.bountyAwarded?'✓ Oathglass Bounty secured':(fallenKnightWeekly.bountyTarget-fallenKnightWeekly.rewardedClears)+' victory'+(fallenKnightWeekly.bountyTarget-fallenKnightWeekly.rewardedClears===1?'':'ies')+' remaining · 1 Oathglass Fragment + 1 Tempering Core + 10 Gem Dust + 1 Regional Catalyst + bonus boss materials'}</Text><Text style={s.contractHint}>Weekly boss rewards · {fallenKnightWeekly.rewardedClears}/{fallenKnightWeekly.cap} clears · {fallenKnightWeekly.remaining} remaining</Text><GameButton compact title="Open Fallen Knight" tone="secondary" onPress={()=>onNavigate({tab:'World',zoneId:'KINGS_ROAD',label:"King's Road",hint:'Open the Fallen Knight encounter from the current region.'})}/></Panel>:null}
    </>:null}
    {mode==='challenges'?<>
      <Panel accentColor={C.special}>
        <View style={s.modeHeroHead}><View style={s.flex}><Text style={s.modeEyebrow}>PERSONAL OBJECTIVES</Text><Text style={s.title}>{challengeReadyCount>0?challengeReadyCount+' reward'+(challengeReadyCount===1?'':'s')+' ready':'Build toward your next class cache'}</Text></View>{challengeReadyCount>0?<StatusPill label="READY" tone="good"/>:<StatusPill label="CLASS" tone="special"/>}</View>
        <View style={s.modeStats}><View style={s.modeStat}><Text style={s.modeStatValue}>{allChallenges.length}</Text><Text style={s.modeStatLabel}>TOTAL</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{challengeReadyCount}</Text><Text style={s.modeStatLabel}>READY</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{challengeClaimedCount}</Text><Text style={s.modeStatLabel}>CLAIMED</Text></View></View>
        <Text style={s.sub}>Class-aligned challenges refresh on daily, weekly and monthly cadences and award progressively stronger rarity caches.</Text>
      </Panel>
      <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{(['all','daily','weekly','monthly'] as const).map(value=><FilterChip key={value} label={(value==='all'?'All':value.charAt(0).toUpperCase()+value.slice(1))+' · '+(value==='all'?allChallenges.length:value==='daily'?daily.length:value==='weekly'?weekly.length:monthly.length)} selected={challengePeriod===value} onPress={()=>setChallengePeriod(value)}/>)}</ScrollView>
      <Panel>
        {challengePeriod==='all'||challengePeriod==='daily'?<ContractRows state={state} label={'DAILY · '+(daily[0]?.className??'')} quests={daily} onClaim={claimContract}/>:null}
        {challengePeriod==='all'||challengePeriod==='weekly'?<ContractRows state={state} label="WEEKLY" quests={weekly} onClaim={claimContract}/>:null}
        {challengePeriod==='all'||challengePeriod==='monthly'?<ContractRows state={state} label="MONTHLY" quests={monthly} onClaim={claimContract}/>:null}
      </Panel>
    </>:null}
    {claimMoment&&<ClaimMomentCard moment={claimMoment} reduceMotion={state.settings.reduceMotion}/>}    {!!notice&&<ActionFeedback message={notice} reduceMotion={state.settings.reduceMotion}/>}{!!error&&<ActionFeedback message={error} tone="error" reduceMotion={state.settings.reduceMotion}/>}
    {mode==='story'?<>
    {entries.length===0&&<View style={s.emptyBlock}><EmptyState title="No matching chapters" message={filter==='current'&&claimed===QUESTS.length?'You have completed this journal. View Completed to revisit it.':'Try another search or view all chapters.'} icon="quests"/><GameButton compact title="Show all chapters" tone="secondary" onPress={()=>{setQuery('');setFilter('all')}}/></View>}
    {entries.map(({def,quest,chapter,remaining,previous})=>{
      const destination=questDestination(def),presentation=questPresentationMeta(def,C),statusColor=quest.status==='complete'?C.good:quest.status==='claimed'?C.muted:undefined,statusSurface=quest.status==='complete'?C.goodSurface:quest.status==='claimed'?C.panel2:undefined;
      return <Panel key={def.id} accentColor={presentation.color} accentSurface={presentation.surface}>
        <View style={s.questMetaRow}><Text style={s.chapter}>ACT {roman(def.act)} · CHAPTER {chapter}</Text><View style={[s.tierBadge,{borderColor:presentation.color,backgroundColor:presentation.surface}]}><Text style={[s.tierBadgeText,{color:presentation.color}]}>{presentation.label.toUpperCase()}</Text></View><View style={[s.statusBadge,statusColor&&{borderColor:statusColor},statusSurface&&{backgroundColor:statusSurface}]}><Text style={[s.statusBadgeText,statusColor&&{color:statusColor}]}>{quest.status==='complete'?'REWARD READY':quest.status==='claimed'?'CLAIMED':quest.status.toUpperCase()}</Text></View></View>
        <View style={s.locationRow}><Text style={[s.title,{color:presentation.color}]}>{def.name}</Text><Text style={s.location}>{def.location}</Text></View>
        <View style={[s.storyBlock,{borderLeftColor:presentation.color}]}><Text style={[s.storyLabel,{color:presentation.color}]}>STORY</Text><Text style={s.storyText}>{def.story}</Text></View>
        <Text style={s.objectiveLabel}>OBJECTIVE</Text><Text style={s.sub}>{def.description}</Text>
        {quest.status==='locked'?<Text style={s.hint}>Claim “{previous??'the previous chapter'}” to unlock this objective. Progress is not tracked while locked.</Text>:<><StatBar reduceMotion={state.settings.reduceMotion} label="Objective progress" current={Math.min(def.required,quest.progress)} max={def.required}/><Text style={s.hint}>{quest.status==='claimed'?'Reward already collected':quest.status==='complete'?'Objective complete — claim your reward':`${remaining} remaining`}</Text></>}
        <QuestReward gold={def.rewardGold} itemId={def.rewardItemId} quantity={def.rewardItemQty??1} label={quest.status==='claimed'?'Rewards collected':'Chapter rewards'}/>
        {quest.status==='active'&&<><Text style={s.sub}>{destination.hint}</Text><GameButton title={destination.label} tone="secondary" onPress={()=>onNavigate(destination)}/></>}
        {quest.status==='complete'&&<GameButton title="Claim chapter rewards" onPress={()=>claim(def.id)}/>}
      </Panel>;
    })}
    </>:null}
  </ScrollView>;
}
function roman(act:QuestAct){return act===1?'I':act===2?'II':'III'}
function FilterChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.filterChip,selected&&s.filterChipSelected,pressed&&s.pressed]}><Text style={[s.filterText,selected&&s.filterTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}
function WeeklyOrderRows({state,orders,reduceMotion,focusedOrderId,onOpenOrder,onPinOrder,onQueueOrder,onStopOrder}:{state:GameState;orders:WeeklyOrder[];reduceMotion:boolean;focusedOrderId?:string;onOpenOrder:(order:WeeklyOrder)=>void;onPinOrder:(order:WeeklyOrder)=>void;onQueueOrder:(order:WeeklyOrder)=>void;onStopOrder:(order:WeeklyOrder)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const kindLabel={hunt:'HUNT ORDER',profession:'WORK ORDER',regional:'REGIONAL PROBLEM',threat:'THREAT BOUNTY'} as const,queueFull=(state.character?.activityQueue?.length??0)>=MAX_ACTIVITY_QUEUE;
 const ordered=[...orders].sort((a,b)=>Number(b.id===focusedOrderId)-Number(a.id===focusedOrderId)||Number(a.progress>=a.target)-Number(b.progress>=b.target)||a.slot-b.slot);
 return <>{ordered.map(order=>{
  const region=WORLD_ZONES.find(zone=>zone.id===order.regionId),ready=order.progress>=order.target,remaining=Math.max(0,order.target-order.progress),destination=weeklyOrderDestination(order),queueable=weeklyOrderQueueActivity(order),pinned=(state.character?.progressionGoals??[]).some(goal=>goal.kind==='weekly_order'&&goal.orderId===order.id),stopRuleActive=state.character?.activeIdleRuleIdV40===weeklyOrderIdleRuleId(order),tone=order.kind==='regional'?C.warning:order.kind==='hunt'?C.bad:order.kind==='threat'?C.special:C.info;
  const fallback=order.kind==='regional'?('Resolve mounting trouble across '+(region?.name??order.source.label)+' through normal regional activity.'):order.kind==='threat'?('Complete the '+(order.challengeId??'required')+' Challenge Hunt against '+order.source.label+'.'):order.kind==='hunt'?('Bring down '+order.source.label+' for the posted hunt.'):('Fulfil the posted '+(order.professionKind??'profession')+' order: '+order.source.label+'.');
  const focused=order.id===focusedOrderId;
  return <View key={order.id} style={[s.seasonQuest,focused&&s.focusedContract]}><View style={s.contractHead}><Text style={s.seasonName}>{order.title}</Text>{focused?<View style={s.focusedPill}><Text style={s.focusedPillText}>FOCUSED</Text></View>:null}<View style={[s.rarity,{borderColor:tone}]}><Text style={[s.rarityText,{color:tone}]}>{kindLabel[order.kind]}</Text></View></View><Text style={s.sub}>{order.brief??fallback}</Text><StatBar reduceMotion={reduceMotion} label={order.progress+'/'+order.target+' progress'} current={order.progress} max={order.target}/><Text style={order.claimed?s.claimed:s.contractHint}>{order.claimed?'✓ Complete · reward queued':ready?'Complete · reward processing':remaining+' remaining · '+order.reward.label}</Text>{!ready?<><Text style={s.contractActionHint}>{destination.detail}</Text><View style={s.contractActions}><View style={s.contractPrimary}><GameButton compact title={destination.button} onPress={()=>onOpenOrder(order)}/></View><View style={s.contractSecondary}><GameButton compact title={pinned?'Pinned':'Pin'} selected={pinned} disabled={pinned||(state.character?.progressionGoals?.length??0)>=3} tone="secondary" onPress={()=>onPinOrder(order)}/></View>{queueable?<><View style={s.contractSecondary}><GameButton compact title={queueFull?'Queue full':'Queue'} disabled={queueFull} tone="secondary" onPress={()=>onQueueOrder(order)}/></View><View style={s.contractSecondary}><GameButton compact title={stopRuleActive?'Stop ✓':'Stop at done'} selected={stopRuleActive} tone="secondary" onPress={()=>onStopOrder(order)}/></View></>:null}</View></>:null}</View>
 })}</>;
}
function ContractRows({state,label,quests,onClaim}:{state:GameState;label:string;quests:SeasonalQuest[];onClaim:(period:SeasonalPeriod,id:string)=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),claimedIds=new Set(state.account.seasonalContractClaimIds??[]),ordered=[...quests].sort((a,b)=>Number(claimedIds.has(a.id))-Number(claimedIds.has(b.id))||Number(b.progress>=b.required)-Number(a.progress>=a.required)||b.progress/Math.max(1,b.required)-a.progress/Math.max(1,a.required));return <><Text style={s.seasonLabel}>{label}</Text>{ordered.map(quest=>{const rarity=QUEST_RARITIES[quest.rarity],claimed=(state.account.seasonalContractClaimIds??[]).includes(quest.id),ready=quest.progress>=quest.required,anticipation=contractAnticipation(quest.progress,quest.required),near=!claimed&&!ready&&anticipation.band!=='none';return <View key={quest.id} style={[s.seasonQuest,near&&s.seasonQuestNear]}><View style={s.contractHead}><Text style={s.seasonName}>{quest.name}</Text><View style={[s.rarity,{borderColor:rarity.color}]}><Text style={[s.rarityText,{color:rarity.color}]}>{rarity.label.toUpperCase()}</Text></View></View><Text style={s.sub}>{quest.description}</Text><StatBar reduceMotion={state.settings.reduceMotion} label={`${quest.progress}/${quest.required} progress · ${quest.tag.toUpperCase()}`} current={quest.progress} max={quest.required}/><QuestReward gold={quest.rewardGold} xp={quest.rewardXp} itemId={quest.rewardItemId} quantity={quest.rewardItemQty} label={rarity.cache}/>{claimed?<Text style={s.claimed}>✓ Cache claimed</Text>:ready?<GameButton compact title={`Claim ${rarity.label} cache`} onPress={()=>onClaim(quest.period,quest.id)}/>:<Text style={near?s.contractNear:s.contractHint}>{near?(anticipation.band==='next'?'NEXT PROGRESS COMPLETES IT · ':anticipation.band==='urgent'?'FINAL STRETCH · ':'ALMOST COMPLETE · '):''}{anticipation.remaining} progress remaining</Text>}</View>})}</>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},claimMoment:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderLeftWidth:4,borderRadius:10,backgroundColor:C.goodSurface},claimMomentHead:{flexDirection:'row',alignItems:'center',gap:spacing.sm},claimMomentEyebrow:{...typography.caption,fontWeight:'900',letterSpacing:.9},claimMomentTitle:{...typography.title,color:C.text,fontWeight:'900'},claimMomentDetail:{...typography.caption,color:C.muted},journalHeading:{flexDirection:'row',alignItems:'center',gap:12},hubEyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},hubSubtitle:{...typography.caption,color:C.muted,lineHeight:16},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},modeHeroHead:{flexDirection:'row',alignItems:'flex-start',gap:8},modeEyebrow:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},modeStats:{flexDirection:'row',gap:6},modeStat:{flex:1,minWidth:0,alignItems:'center',paddingVertical:7,paddingHorizontal:5,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},modeStatValue:{...typography.bodyStrong,color:C.text,fontWeight:'900'},modeStatLabel:{fontSize:7.5,lineHeight:10,color:C.muted,fontWeight:'900',letterSpacing:.45,textAlign:'center'},focusBanner:{gap:2,padding:8,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface,borderRadius:6},focusBannerLabel:{fontSize:8.5,color:C.info,fontWeight:'900',letterSpacing:.65},focusBannerTitle:{...typography.bodyStrong,color:C.text},chapter:{...typography.caption,color:C.accent,fontWeight:'900'},questMetaRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6},tierBadge:{borderWidth:1,borderRadius:99,paddingHorizontal:8,paddingVertical:2},tierBadgeText:{fontSize:9,lineHeight:12,fontWeight:'900',letterSpacing:.5},statusBadge:{borderWidth:1,borderColor:C.line,borderRadius:99,paddingHorizontal:8,paddingVertical:2,backgroundColor:C.panel2},statusBadgeText:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'900',letterSpacing:.35},actEyebrow:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},locationRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',justifyContent:'space-between',gap:spacing.sm},location:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},storyBlock:{gap:4,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.panel2,borderRadius:6},storyLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},storyText:{...typography.body,color:C.text,lineHeight:20},objectiveLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.7},hint:{...typography.body,color:C.info},reward:{...typography.bodyStrong,color:C.accent},notice:{...typography.bodyStrong,color:C.good},error:{...typography.body,color:C.bad},disclosure:{minHeight:60,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},disclosureMark:{width:28,color:C.accent,fontSize:25,textAlign:'center'},flex:{flex:1,minWidth:0},filterChip:{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},filterChipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},filterText:{fontSize:12,color:C.muted,fontWeight:'700'},filterTextSelected:{color:C.text},pressed:{opacity:.76},seasonLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1,marginTop:spacing.sm},seasonQuest:{gap:spacing.xs,borderTopWidth:1,borderColor:C.line,paddingTop:spacing.sm},seasonQuestNear:{borderLeftWidth:3,borderLeftColor:C.good,paddingLeft:spacing.sm,backgroundColor:C.goodSurface},focusedContract:{marginHorizontal:-6,paddingHorizontal:6,paddingBottom:6,borderLeftWidth:3,borderLeftColor:C.info,borderTopColor:C.info,backgroundColor:C.infoSurface,borderRadius:6},focusedPill:{paddingHorizontal:6,paddingVertical:2,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},focusedPillText:{fontSize:8,lineHeight:10,color:C.info,fontWeight:'900',letterSpacing:.55},contractHead:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},seasonName:{...typography.bodyStrong,color:C.text,flexGrow:1,flexBasis:180},rarity:{borderWidth:1,borderRadius:99,paddingHorizontal:spacing.sm,paddingVertical:2},rarityText:{fontSize:10,fontWeight:'900'},cache:{...typography.caption,fontWeight:'800'},claimed:{...typography.caption,color:C.good,fontWeight:'900'},contractHint:{...typography.caption,color:C.muted},contractNear:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.35},contractActionHint:{...typography.caption,color:C.info,lineHeight:16},contractActions:{flexDirection:'row',flexWrap:'wrap',alignItems:'stretch',gap:6},contractPrimary:{flexGrow:2,flexBasis:180},contractSecondary:{flexGrow:1,flexBasis:92},row:{flexDirection:'row',gap:spacing.sm},emptyBlock:{gap:spacing.sm},input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel,fontSize:16}});}

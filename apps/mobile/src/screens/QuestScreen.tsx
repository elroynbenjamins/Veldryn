import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,progressionError,type ProgressionKey} from '../i18n/progression';
import {ZoneSceneArtwork} from '../components/ZoneSceneArtwork';
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
import {activityQueueCapacity} from '../core/activity-queue';
import {WORLD_ZONES} from '../content/world-map';
import {weeklyOrderLockReason} from '../core/quest-availability';
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
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),pulse=useRef(new Animated.Value(1)).current,accent=moment.rarityColor??C.good;
  useEffect(()=>{pulse.stopAnimation();pulse.setValue(1);if(reduceMotion)return;Animated.sequence([Animated.spring(pulse,{toValue:1.025,damping:9,stiffness:230,mass:.6,useNativeDriver:true}),Animated.spring(pulse,{toValue:1,damping:16,stiffness:210,mass:.7,useNativeDriver:true})]).start();return()=>pulse.stopAnimation()},[moment.key,reduceMotion,pulse]);
  return <Animated.View accessibilityLiveRegion="polite" style={[s.claimMoment,{borderColor:accent,transform:[{scale:pulse}]}]}>
    <View style={s.claimMomentHead}><View style={s.flex}><Text style={[s.claimMomentEyebrow,{color:accent}]}>✦ {moment.eyebrow}</Text><Text style={s.claimMomentTitle}>{moment.title}</Text><Text style={s.claimMomentDetail}>{moment.detail}</Text></View><StatusPill label={t("SECURED")} tone="good"/></View>
    <QuestReward gold={moment.gold} xp={moment.xp} itemId={moment.itemId} quantity={moment.quantity??1} label={t("Rewards secured")} rarityColor={moment.rarityColor}/>
  </Animated.View>;
}

export function QuestScreen({state,mode,onModeChange,focusedWeeklyOrderId,onClaim,onClaimContract,onNavigate,onOpenWeeklyBoss,onOpenWeeklyOrder,onPinWeeklyOrder,onQueueWeeklyOrder,onStopWeeklyOrder}:{state:GameState;mode:QuestMode;onModeChange:(mode:QuestMode)=>void;focusedWeeklyOrderId?:string;onClaim:(id:string)=>void;onClaimContract:(period:SeasonalPeriod,id:string)=>void;onNavigate:(destination:QuestDestination)=>void;onOpenWeeklyBoss:()=>void;onOpenWeeklyOrder:(order:WeeklyOrder)=>void;onPinWeeklyOrder:(order:WeeklyOrder)=>void;onQueueWeeklyOrder:(order:WeeklyOrder)=>void;onStopWeeklyOrder:(order:WeeklyOrder)=>void}){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const [filter,setFilter]=useState<JournalFilter>('current'),[query,setQuery]=useState(''),[challengePeriod,setChallengePeriod]=useState<'all'|'daily'|'weekly'|'monthly'>('all');
  const [expandedStories,setExpandedStories]=useState<Record<string,boolean>>({});
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[claimMoment,setClaimMoment]=useState<ClaimMoment|null>(null);
  const confirmed=useRef({characterId:state.character?.id,quests:state.quests.filter(q=>q.status==='claimed').map(q=>q.questId),contracts:state.account.seasonalContractClaimIds??[]});
  useEffect(()=>{
    const next={characterId:state.character?.id,quests:state.quests.filter(q=>q.status==='claimed').map(q=>q.questId),contracts:state.account.seasonalContractClaimIds??[]};
    const previous=confirmed.current;confirmed.current=next;
    if(previous.characterId!==next.characterId){setNotice('');setError('');setClaimMoment(null);return;}
    const chapters=newlyConfirmedIds(previous.quests,next.quests),contracts=newlyConfirmedIds(previous.contracts,next.contracts);
    if(chapters.length){
      const id=chapters[chapters.length-1],def=QUESTS.find(q=>q.id===id);
      if(def)setClaimMoment({key:'chapter:'+id,kind:'chapter',eyebrow:t("CHAPTER COMPLETE"),title:def.name,detail:t("Rewards secured · the next available story beat is now ready."),gold:def.rewardGold,itemId:def.rewardItemId,quantity:def.rewardItemQty??1});
      setNotice('');setError('');
    }else if(contracts.length){
      const id=contracts[contracts.length-1],contract=(['daily','weekly','monthly'] as const).flatMap(period=>seasonalQuestBoard(state,period)).find(row=>row.id===id);
      if(contract){const rarity=QUEST_RARITIES[contract.rarity];setClaimMoment({key:'contract:'+id,kind:'contract',eyebrow:rarity.label.toUpperCase()+' CACHE CLAIMED',title:contract.name,detail:t("Challenge reward secured and added to your account."),gold:contract.rewardGold,xp:contract.rewardXp,itemId:contract.rewardItemId,quantity:contract.rewardItemQty,rarityColor:rarity.color});}
      setNotice('');setError('');
    }
  },[state.quests,state.account.seasonalContractClaimIds,state.character?.id]);
  const entries=journalEntries(state,filter,query);
  const daily=seasonalQuestBoard(state,'daily'),weekly=seasonalQuestBoard(state,'weekly'),monthly=seasonalQuestBoard(state,'monthly'),contractBoard=weeklyOrderBoardForState(state),pendingBoardRewards=(state.account.weeklyOrderPendingRewards??[]).filter(row=>row.weekKey===contractBoard.weekKey);
  const fallenKnightWeekly=state.defeatedBossIds.includes('FALLEN_KNIGHT')?fallenKnightWeeklyStatus(state,Date.now()):undefined;
  const claimed=QUESTS.filter(def=>state.quests.some(q=>q.questId===def.id&&q.status==='claimed')).length;
  const ready=state.quests.filter(q=>q.status==='complete').length;
  const readyQuest=QUESTS.find(def=>state.quests.some(q=>q.questId===def.id&&q.status==='complete'));
  const journalCounts={current:journalEntries(state,'current','').length,all:journalEntries(state,'all','').length,claimed:journalEntries(state,'claimed','').length,locked:journalEntries(state,'locked','').length};
  const currentDef=QUESTS.find(def=>state.quests.find(q=>q.questId===def.id)?.status!=='claimed')??QUESTS[QUESTS.length-1],currentAct=QUEST_ACTS[currentDef.act];
  const boardComplete=contractBoard.orders.filter(order=>order.progress>=order.target).length,boardActive=Math.max(0,contractBoard.orders.length-boardComplete);
  const focusedOrder=focusedWeeklyOrderId?contractBoard.orders.find(order=>order.id===focusedWeeklyOrderId):undefined,focusedOrderMissing=!!focusedWeeklyOrderId&&!focusedOrder;
  const nextBoardOrder=focusedOrder??contractBoard.orders.filter(order=>order.progress<order.target).sort((a,b)=>Number(b.regionId===state.currentRegionId)-Number(a.regionId===state.currentRegionId)||(b.progress/Math.max(1,b.target))-(a.progress/Math.max(1,a.target))||a.slot-b.slot)[0];
  const challengeClaimedIds=new Set(state.account.seasonalContractClaimIds??[]),allChallenges=[...daily,...weekly,...monthly];
  const challengeReadyCount=allChallenges.filter(row=>row.progress>=row.required&&!challengeClaimedIds.has(row.id)).length,challengeClaimedCount=allChallenges.filter(row=>challengeClaimedIds.has(row.id)).length;
  const nextChallenge=allChallenges.filter(row=>!challengeClaimedIds.has(row.id)&&row.progress<row.required).sort((a,b)=>(b.progress/Math.max(1,b.required))-(a.progress/Math.max(1,a.required))||a.required-b.required)[0];
  const modeTitle=mode==='story'?t("Asterfall Journal"):mode==='contracts'?t("Contract Board"):t("Class Challenges");
  const modeSubtitle=mode==='story'?t("Campaign chapters, story rewards and the next Asterfall objective."):mode==='contracts'?t("Weekly Hunt, Work, Regional and Threat jobs with exact progression routes."):t("Personal daily, weekly and monthly objectives tied to your class.");
  function claim(id:string){
    try{setClaimMoment(null);setNotice('');setError('');onClaim(id)}
    catch(e){setError(progressionError(language,e,"Unable to claim this quest."));setNotice('')}
  }
  function claimContract(period:SeasonalPeriod,id:string){
    try{setClaimMoment(null);setNotice('');setError('');onClaimContract(period,id)}
    catch(e){setError(progressionError(language,e,"Unable to claim this contract."));setNotice('')}
  }
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.scenicHeader}><ZoneSceneArtwork regionId={mode==='contracts'?'KINGS_ROAD':mode==='challenges'?'IRONWOOD':currentAct.act===1?'GREENFIELDS':currentAct.act===2?'IRONWOOD':'KINGS_ROAD'}/><View style={s.scenicShade}/><View style={s.scenicCopy}><Text style={s.scenicEyebrow}>{t("QUESTS & OBJECTIVES")}</Text><Text accessibilityRole="header" style={s.scenicTitle}>{modeTitle}</Text><Text style={s.scenicSubtitle}>{modeSubtitle}</Text></View></View>
    <QuestModeSwitch mode={mode} onChange={onModeChange} storyMeta={ready?t("{count} ready",{count:ready}):t("{current}/{total} claimed",{current:claimed,total:QUESTS.length})} contractMeta={t("{current}/{total} complete",{current:boardComplete,total:contractBoard.orders.length})} challengeMeta={challengeReadyCount?t("{count} ready",{count:challengeReadyCount}):t("{current}/{total} claimed",{current:challengeClaimedCount,total:allChallenges.length})} storyAttention={ready} contractAttention={pendingBoardRewards.length} challengeAttention={challengeReadyCount}/>
    {claimMoment&&<ClaimMomentCard moment={claimMoment} reduceMotion={state.settings.reduceMotion}/>} {!!notice&&<ActionFeedback message={notice} compact reduceMotion={state.settings.reduceMotion}/>} {!!error&&<ActionFeedback message={error} tone="error" compact reduceMotion={state.settings.reduceMotion}/>}
    {mode==='story'?<>
    {readyQuest?<Panel accentColor={C.good} accentSurface={C.goodSurface}><View style={s.modeHeroHead}><View style={s.flex}><Text style={[s.modeEyebrow,{color:C.good}]}>{t("REWARD READY")}</Text><Text style={s.title}>{readyQuest.name}</Text><Text style={s.sub}>{t("Objective complete — claim your reward")}</Text></View><StatusPill label={t("{count} ready",{count:ready})} tone="good"/></View><GameButton title={t("Claim chapter rewards")} onPress={()=>claim(readyQuest.id)}/></Panel>:null}
    <Panel><Text style={s.actEyebrow}>{t("ACT")} {roman(currentAct.act)} · {currentAct.name.toUpperCase()}</Text><Text style={s.title}>{claimed===QUESTS.length?t("Asterfall campaign complete"):currentAct.subtitle}</Text><StatBar reduceMotion={state.settings.reduceMotion} label={t("Chapters claimed")} current={claimed} max={QUESTS.length}/><Text style={s.sub}>{claimed===QUESTS.length?t("Every chapter reward has been claimed. You can revisit the story, hunts, crafting, and equipment upgrades."):t("Rewards ready: {count}. Claim each chapter to unlock the next story beat.",{count:ready})}</Text></Panel>
    <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.row,s.filterRail]} showsVerticalScrollIndicator={false}>{(['current','all','claimed','locked'] as const).map(value=><FilterChip key={value} label={`${value==='current'?t("Current"):value==='all'?t("All"):value==='claimed'?t("Completed"):t("Locked")} · ${journalCounts[value]}`} selected={filter===value} onPress={()=>setFilter(value)}/>)}</ScrollView>
    <SearchField accessibilityLabel={t("Search quests")} placeholder={t("Search story, locations or objectives…")} placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    </>:null}
    {mode==='contracts'?<>
      <Panel accentColor={C.info}>
        <View style={s.modeHeroHead}><View style={s.flex}><Text style={s.modeEyebrow}>{t("WEEKLY BOARD ·")} {contractBoard.weekKey}</Text><Text style={s.title}>{focusedOrder?t("Focused · {name}",{name:focusedOrder.title}):nextBoardOrder?t("Next · {name}",{name:nextBoardOrder.title}):t("All posted jobs complete")}</Text></View>{focusedOrder?<StatusPill label={t("FOCUSED")} tone="info"/>:pendingBoardRewards.length>0?<StatusPill label={t("{count} rewards",{count:pendingBoardRewards.length})} tone="good"/>:<StatusPill label={t("WEEKLY")} tone="info"/>}</View>
        <View style={s.modeStats}><View style={s.modeStat}><Text style={s.modeStatValue}>{contractBoard.orders.length}</Text><Text style={s.modeStatLabel}>{t("POSTED")}</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{boardComplete}</Text><Text style={s.modeStatLabel}>{t("COMPLETE")}</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{boardActive}</Text><Text style={s.modeStatLabel}>{t("ACTIVE")}</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{pendingBoardRewards.length}</Text><Text style={s.modeStatLabel}>{t("REWARDS")}</Text></View></View>
        <Text style={s.sub}>{t("Jobs track exact activities during the current UTC week. Hunt named monsters, fill profession orders, stabilize regions, and unlock mastery-based Threat Bounties.")}</Text>
        <Text style={s.contractHint}>{t("Resets")} {new Date(contractBoard.endsAtMs).toISOString().slice(0,10)}  {t("at 00:00 UTC.")}</Text>
      </Panel>
      {focusedOrderMissing?<ActionFeedback message="That focused weekly job expired or the board refreshed. Showing the current Contract Board instead." tone="info" compact reduceMotion={state.settings.reduceMotion}/>:null}
      <Panel>
        {focusedOrder?<Text style={s.focusContext}>{t("Opened from another gameplay screen · focused contract is promoted first.")}</Text>:null}
        <WeeklyOrderRows state={state} orders={contractBoard.orders} reduceMotion={state.settings.reduceMotion} focusedOrderId={focusedWeeklyOrderId} onOpenOrder={onOpenWeeklyOrder} onPinOrder={onPinWeeklyOrder} onQueueOrder={onQueueWeeklyOrder} onStopOrder={onStopWeeklyOrder}/>
        {contractBoard.completionClaimed?<Text style={s.claimed}>{t("✓ Full Contract Board completion reward queued")}</Text>:<Text style={s.contractHint}>{boardComplete}/{contractBoard.orders.length}  {t("weekly jobs complete · finish every posting for the board completion reward.")}</Text>}
      </Panel>
      {fallenKnightWeekly?<Panel><View style={s.contractHead}><Text style={s.seasonName}>Break the Last Oath</Text><View style={[s.rarity,{borderColor:fallenKnightWeekly.bountyAwarded?C.good:C.warning}]}><Text style={[s.rarityText,{color:fallenKnightWeekly.bountyAwarded?C.good:C.warning}]}>{t("WEEKLY BOSS")}</Text></View></View><Text style={s.sub}>{t("Defeat the Fallen Knight once after the story clear to complete the Oathglass Bounty. Up to three rewarded rematch victories are available each UTC week.")}</Text><StatBar reduceMotion={state.settings.reduceMotion} label={t("Fallen Knight weekly bounty")} current={Math.min(fallenKnightWeekly.rewardedClears,fallenKnightWeekly.bountyTarget)} max={fallenKnightWeekly.bountyTarget}/><Text style={fallenKnightWeekly.bountyAwarded?s.claimed:s.contractHint}>{fallenKnightWeekly.bountyAwarded?'✓ Oathglass Bounty secured':(fallenKnightWeekly.bountyTarget-fallenKnightWeekly.rewardedClears)+' victory'+(fallenKnightWeekly.bountyTarget-fallenKnightWeekly.rewardedClears===1?'':'ies')+' remaining · 1 Oathglass Fragment + 1 Tempering Core + 10 Gem Dust + 1 Regional Catalyst + bonus boss materials'}</Text><Text style={s.contractHint}>{t("Weekly boss rewards ·")} {fallenKnightWeekly.rewardedClears}/{fallenKnightWeekly.cap}  {t("clears ·")} {fallenKnightWeekly.remaining}  {t("remaining")}</Text><GameButton compact title={t("Open Fallen Knight")} tone="secondary" onPress={onOpenWeeklyBoss}/></Panel>:null}
    </>:null}
    {mode==='challenges'?<>
      <Panel accentColor={C.special}>
        <View style={s.modeHeroHead}><View style={s.flex}><Text style={s.modeEyebrow}>{t("PERSONAL OBJECTIVES")}</Text><Text style={s.title}>{challengeReadyCount>0?t("{count} ready",{count:challengeReadyCount}):nextChallenge?t("Next · {name}",{name:nextChallenge.name}):t("All current challenges claimed")}</Text></View>{challengeReadyCount>0?<StatusPill label={t("READY")} tone="good"/>:<StatusPill label={t("CLASS")} tone="special"/>}</View>
        <View style={s.modeStats}><View style={s.modeStat}><Text style={s.modeStatValue}>{allChallenges.length}</Text><Text style={s.modeStatLabel}>{t("TOTAL")}</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{challengeReadyCount}</Text><Text style={s.modeStatLabel}>{t("READY")}</Text></View><View style={s.modeStat}><Text style={s.modeStatValue}>{challengeClaimedCount}</Text><Text style={s.modeStatLabel}>{t("CLAIMED")}</Text></View></View>
        <Text style={s.sub}>{challengeReadyCount>0?t("Claim completed objectives, then continue the next cadence target."):nextChallenge?(Math.max(0,nextChallenge.required-nextChallenge.progress)+' progress remaining · '+QUEST_RARITIES[nextChallenge.rarity].cache):t("Class-aligned challenges refresh on daily, weekly and monthly cadences and award progressively stronger rarity caches.")}</Text>
      </Panel>
      <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.row,s.filterRail]} showsVerticalScrollIndicator={false}>{(['all','daily','weekly','monthly'] as const).map(value=><FilterChip key={value} label={(value==='all'?t("All"):p(value.charAt(0).toUpperCase()+value.slice(1)))+' · '+(value==='all'?allChallenges.length:value==='daily'?daily.length:value==='weekly'?weekly.length:monthly.length)} selected={challengePeriod===value} onPress={()=>setChallengePeriod(value)}/>)}</ScrollView>
      <Panel>
        {challengePeriod==='all'||challengePeriod==='daily'?<ContractRows state={state} label={'DAILY · '+(daily[0]?.className??'')} quests={daily} onClaim={claimContract}/>:null}
        {challengePeriod==='all'||challengePeriod==='weekly'?<ContractRows state={state} label={t("WEEKLY")} quests={weekly} onClaim={claimContract}/>:null}
        {challengePeriod==='all'||challengePeriod==='monthly'?<ContractRows state={state} label={t("MONTHLY")} quests={monthly} onClaim={claimContract}/>:null}
      </Panel>
    </>:null}
    {mode==='story'?<>
    {entries.length===0&&<View style={s.emptyBlock}><EmptyState title={t("No matching chapters")} message={filter==='current'&&claimed===QUESTS.length?t("You have completed this journal. View Completed to revisit it."):t("Try another search or view all chapters.")} icon="quests"/><GameButton compact title={t("Show all chapters")} tone="secondary" onPress={()=>{setQuery('');setFilter('all')}}/></View>}
    {entries.map(({def,quest,chapter,remaining,previous})=>{
      const destination=questDestination(def),presentation=questPresentationMeta(def,C),statusColor=quest.status==='complete'?C.good:quest.status==='claimed'?C.muted:undefined,statusSurface=quest.status==='complete'?C.goodSurface:quest.status==='claimed'?C.panel2:undefined;
      return <View key={def.id} style={[s.questCard,{borderColor:presentation.color,borderLeftWidth:4},quest.status==='locked'&&s.lockedCard]}>
        <View style={s.questMetaRow}><Text style={s.chapter}>{t("ACT")} {roman(def.act)}  {t("· CHAPTER")} {chapter}</Text><View style={[s.tierBadge,{borderColor:presentation.color,backgroundColor:presentation.surface}]}><Text style={[s.tierBadgeText,{color:presentation.color}]}>{presentation.label.toUpperCase()}</Text></View><View style={[s.statusBadge,statusColor&&{borderColor:statusColor},statusSurface&&{backgroundColor:statusSurface}]}><Text style={[s.statusBadgeText,statusColor&&{color:statusColor}]}>{quest.status==='complete'?t("REWARD READY"):quest.status==='claimed'?t("CLAIMED"):p(quest.status.toUpperCase())}</Text></View></View>
        <View style={s.locationRow}><Text accessibilityRole="header" style={s.title}>{def.name}</Text><Text style={s.location}>{def.location}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("STORY")+' · '+def.name} aria-expanded={!!expandedStories[def.id]} accessibilityState={{expanded:!!expandedStories[def.id]}} onPress={()=>setExpandedStories(value=>({...value,[def.id]:!value[def.id]}))} style={s.storyToggle}><UiIcon name="quests" size={18}/><Text style={s.storyToggleText}>{t("STORY")}</Text><Text style={s.storyToggleText}>{expandedStories[def.id]?'−':'+'}</Text></Pressable>
        {expandedStories[def.id]?<View style={s.storyBlock}><Text style={s.storyText}>{def.story}</Text></View>:null}
        <Text style={s.objectiveLabel}>{t("OBJECTIVE")}</Text><Text style={s.sub}>{def.description}</Text>
        {quest.status==='locked'?<Text style={s.hint}>{t("Claim “{chapter}” to unlock this objective. Progress is not tracked while locked.",{chapter:previous??t("the previous chapter")})}</Text>:<><StatBar reduceMotion={state.settings.reduceMotion} label={t("Objective progress")} current={Math.min(def.required,quest.progress)} max={def.required}/><Text style={s.hint}>{quest.status==='claimed'?t("Reward already collected"):quest.status==='complete'?t("Objective complete — claim your reward"):t("{count} remaining",{count:remaining})}</Text></>}
        <QuestReward gold={def.rewardGold} itemId={def.rewardItemId} quantity={def.rewardItemQty??1} label={quest.status==='claimed'?t("Rewards collected"):t("Chapter rewards")}/>
        {quest.status==='active'&&<><Text style={s.sub}>{destination.hint}</Text><GameButton title={p(destination.label)} tone="secondary" onPress={()=>onNavigate(destination)}/></>}
        {quest.status==='complete'&&<GameButton title={t("Claim chapter rewards")} onPress={()=>claim(def.id)}/>}
      </View>;
    })}
    </>:null}
  </ScrollView>;
}
function roman(act:QuestAct){return act===1?'I':act===2?'II':'III'}
function FilterChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.filterChip,selected&&s.filterChipSelected,pressed&&s.pressed]}><Text style={[s.filterText,selected&&s.filterTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}
function WeeklyOrderRows({state,orders,reduceMotion,focusedOrderId,onOpenOrder,onPinOrder,onQueueOrder,onStopOrder}:{state:GameState;orders:WeeklyOrder[];reduceMotion:boolean;focusedOrderId?:string;onOpenOrder:(order:WeeklyOrder)=>void;onPinOrder:(order:WeeklyOrder)=>void;onQueueOrder:(order:WeeklyOrder)=>void;onStopOrder:(order:WeeklyOrder)=>void}){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const kindLabel={hunt:t("HUNT ORDER"),profession:t("WORK ORDER"),regional:t("REGIONAL PROBLEM")} as const,queueFull=(state.character?.activityQueue?.length??0)>=activityQueueCapacity(state);
 const ordered=[...orders].sort((a,b)=>Number(b.id===focusedOrderId)-Number(a.id===focusedOrderId)||Number(a.progress>=a.target)-Number(b.progress>=b.target)||a.slot-b.slot);
 return <>{ordered.map(order=>{
  const region=WORLD_ZONES.find(zone=>zone.id===order.regionId),ready=order.progress>=order.target,remaining=Math.max(0,order.target-order.progress),destination=weeklyOrderDestination(order),queueable=weeklyOrderQueueActivity(order),pinned=(state.character?.progressionGoals??[]).some(goal=>goal.kind==='weekly_order'&&goal.orderId===order.id),stopRuleActive=state.character?.activeIdleRuleIdV40===weeklyOrderIdleRuleId(order),tone=order.kind==='regional'?C.warning:order.kind==='hunt'?C.bad:C.info;
  const fallback=order.kind==='regional'?('Resolve mounting trouble across '+(region?.name??order.source.label)+' through normal regional activity.'):order.kind==='hunt'?('Bring down '+order.source.label+' for the posted hunt.'):('Fulfil the posted '+(order.professionKind??'profession')+' order: '+order.source.label+'.');
  const focused=order.id===focusedOrderId,lockReason=weeklyOrderLockReason(state,order),locked=!!lockReason;
  return <View key={order.id} style={[s.seasonQuest,focused&&s.focusedContract,locked&&s.lockedCard]}><View style={s.contractHead}><Text style={s.seasonName}>{order.title}</Text>{focused?<View style={s.focusedPill}><Text style={s.focusedPillText}>{t("FOCUSED")}</Text></View>:null}<View style={[s.rarity,{borderColor:tone}]}><Text style={[s.rarityText,{color:tone}]}>{kindLabel[order.kind]}</Text></View></View><Text style={s.sub}>{order.brief??fallback}</Text><StatBar reduceMotion={reduceMotion} label={order.progress+'/'+order.target+' progress'} current={order.progress} max={order.target}/><Text style={order.claimed?s.claimed:s.contractHint}>{order.claimed?t("✓ Complete · reward queued"):ready?t("Complete · reward processing"):remaining+' remaining · '+order.reward.label}</Text>{!ready?<><Text style={locked?s.lockReason:s.contractActionHint}>{locked?`${t('LOCKED')} · ${p(lockReason!)}`:destination.detail}</Text><View style={s.contractActions}><View style={s.contractPrimary}><GameButton compact title={locked?t('LOCKED'):p(destination.button)} disabled={locked} onPress={()=>{if(!locked)onOpenOrder(order)}}/></View><View style={s.contractSecondary}><GameButton compact title={pinned?t("Pinned"):t("Pin")} selected={pinned} disabled={locked||pinned||(state.character?.progressionGoals?.length??0)>=3} tone="secondary" onPress={()=>onPinOrder(order)}/></View>{queueable?<><View style={s.contractSecondary}><GameButton compact title={queueFull?t("Queue full"):t("Queue")} disabled={locked||queueFull} tone="secondary" onPress={()=>{if(!locked)onQueueOrder(order)}}/></View><View style={s.contractSecondary}><GameButton compact title={stopRuleActive?t("Stop ✓"):t("Stop at done")} selected={stopRuleActive} disabled={locked} tone="secondary" onPress={()=>onStopOrder(order)}/></View></>:null}</View></>:null}</View>
 })}</>;
}
function ContractRows({state,label,quests,onClaim}:{state:GameState;label:string;quests:SeasonalQuest[];onClaim:(period:SeasonalPeriod,id:string)=>void}){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),claimedIds=new Set(state.account.seasonalContractClaimIds??[]),ordered=[...quests].sort((a,b)=>Number(claimedIds.has(a.id))-Number(claimedIds.has(b.id))||Number(b.progress>=b.required)-Number(a.progress>=a.required)||b.progress/Math.max(1,b.required)-a.progress/Math.max(1,a.required));return <><Text style={s.seasonLabel}>{label}</Text>{ordered.map(quest=>{const rarity=QUEST_RARITIES[quest.rarity],rarityTone=C.dark?rarity.color:({common:'#526174',uncommon:'#267047',rare:'#216896',epic:'#7542ad',legendary:'#96520d'}[quest.rarity]),claimed=(state.account.seasonalContractClaimIds??[]).includes(quest.id),ready=quest.progress>=quest.required,anticipation=contractAnticipation(quest.progress,quest.required),near=!claimed&&!ready&&anticipation.band!=='none';return <View key={quest.id} style={[s.seasonQuest,{borderColor:rarityTone,borderLeftWidth:4}]}><View style={s.contractHead}><Text style={s.seasonName}>{quest.name}</Text><View style={[s.rarity,{borderColor:rarityTone,backgroundColor:rarityTone+(C.dark?'20':'12'),paddingHorizontal:10,paddingVertical:5}]}><Text style={[s.rarityText,{color:rarityTone,fontSize:12,lineHeight:16,letterSpacing:.6}]}>{rarity.label.toUpperCase()}</Text></View></View><Text style={s.sub}>{quest.description}</Text><StatBar reduceMotion={state.settings.reduceMotion} label={`${quest.progress}/${quest.required} progress · ${quest.tag.toUpperCase()}`} current={quest.progress} max={quest.required}/><QuestReward gold={quest.rewardGold} xp={quest.rewardXp} itemId={quest.rewardItemId} quantity={quest.rewardItemQty} label={rarity.cache} rarityColor={rarityTone}/>{claimed?<Text style={s.claimed}>{t("✓ Cache claimed")}</Text>:ready?<GameButton compact title={`Claim ${rarity.label} cache`} onPress={()=>onClaim(quest.period,quest.id)}/>:<Text style={near?s.contractNear:s.contractHint}>{near?(anticipation.band==='next'?'NEXT PROGRESS COMPLETES IT · ':anticipation.band==='urgent'?'FINAL STRETCH · ':'ALMOST COMPLETE · '):''}{anticipation.remaining}  {t("progress remaining")}</Text>}</View>})}</>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({lockedCard:{opacity:.72,borderColor:C.line,backgroundColor:C.panel2},lockReason:{...typography.body,color:C.text,fontWeight:'600',lineHeight:20},root:{padding:spacing.lg,gap:spacing.md},scenicHeader:{minHeight:210,borderRadius:18,overflow:'hidden',justifyContent:'flex-end',backgroundColor:C.panel},scenicShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(4,10,8,.58)'},scenicCopy:{padding:20,gap:8},scenicEyebrow:{fontSize:11,lineHeight:16,letterSpacing:1.4,color:'#d4e6dc',fontWeight:'700'},scenicTitle:{fontSize:29,lineHeight:34,fontWeight:'700',letterSpacing:-.6,color:'#ffffff'},scenicSubtitle:{fontSize:13,lineHeight:19,color:'#e1e8e3'},questCard:{padding:16,gap:12,borderWidth:1,borderColor:C.line,borderRadius:16,backgroundColor:C.panel},storyToggle:{minHeight:44,flexDirection:'row',alignItems:'center',gap:9,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},storyToggleText:{fontSize:12,color:C.muted,fontWeight:'600'},claimMoment:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderLeftWidth:4,borderRadius:10,backgroundColor:C.goodSurface},claimMomentHead:{flexDirection:'row',alignItems:'center',gap:spacing.sm},claimMomentEyebrow:{...typography.caption,fontWeight:'900',letterSpacing:.9},claimMomentTitle:{...typography.title,color:C.text,fontWeight:'900'},claimMomentDetail:{...typography.caption,color:C.muted},journalHeading:{flexDirection:'row',alignItems:'center',gap:12},hubEyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},hubSubtitle:{...typography.caption,color:C.muted,lineHeight:16},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},modeHeroHead:{flexDirection:'row',alignItems:'flex-start',gap:8},modeEyebrow:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},modeStats:{flexDirection:'row',flexWrap:'wrap',gap:6},modeStat:{flexGrow:1,flexBasis:64,minWidth:64,alignItems:'center',paddingVertical:7,paddingHorizontal:5,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},modeStatValue:{...typography.bodyStrong,color:C.text,fontWeight:'900'},modeStatLabel:{fontSize:11,lineHeight:15,color:C.muted,fontWeight:'900',letterSpacing:.45,textAlign:'center'},focusContext:{...typography.caption,color:C.info,fontWeight:'800',lineHeight:16,paddingBottom:2},chapter:{...typography.caption,color:C.accent,fontWeight:'900'},questMetaRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6},tierBadge:{borderWidth:1,borderRadius:99,paddingHorizontal:8,paddingVertical:2},tierBadgeText:{fontSize:11,lineHeight:15,fontWeight:'900',letterSpacing:.5},statusBadge:{borderWidth:1,borderColor:C.line,borderRadius:99,paddingHorizontal:8,paddingVertical:2,backgroundColor:C.panel2},statusBadgeText:{fontSize:11,lineHeight:15,color:C.muted,fontWeight:'900',letterSpacing:.35},actEyebrow:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1},locationRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',justifyContent:'space-between',gap:spacing.sm},location:{...typography.caption,color:C.muted,fontWeight:'900'},storyBlock:{gap:4,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.panel2,borderRadius:6},storyLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},storyText:{...typography.body,color:C.text,lineHeight:20},objectiveLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.7},hint:{...typography.body,color:C.info},reward:{...typography.bodyStrong,color:C.accent},notice:{...typography.bodyStrong,color:C.good},error:{...typography.body,color:C.bad},disclosure:{minHeight:60,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},disclosureMark:{width:28,color:C.accent,fontSize:25,textAlign:'center'},flex:{flex:1,minWidth:0},filterRail:{padding:3,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2,gap:3},filterChip:{minHeight:44,paddingHorizontal:13,justifyContent:'center',borderRadius:8,backgroundColor:'transparent'},filterChipSelected:{backgroundColor:equipmentColors.selected,borderWidth:1,borderColor:equipmentColors.selectedLine},filterText:{fontSize:12,color:C.muted,fontWeight:'700'},filterTextSelected:{color:C.text,fontWeight:'900'},pressed:{opacity:.76},seasonLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1,marginTop:spacing.sm},seasonQuest:{gap:10,borderWidth:1,borderColor:C.line,padding:14,borderRadius:14,backgroundColor:C.panel2,marginBottom:10},seasonQuestNear:{borderLeftWidth:3,borderLeftColor:C.good,paddingLeft:spacing.sm,backgroundColor:C.goodSurface},focusedContract:{marginHorizontal:-6,paddingHorizontal:6,paddingBottom:6,borderLeftWidth:3,borderLeftColor:C.info,borderTopColor:C.info,backgroundColor:C.infoSurface,borderRadius:6},focusedPill:{paddingHorizontal:6,paddingVertical:2,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},focusedPillText:{fontSize:8,lineHeight:10,color:C.info,fontWeight:'900',letterSpacing:.55},contractHead:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},seasonName:{...typography.bodyStrong,color:C.text,flexGrow:1,flexBasis:180},rarity:{borderWidth:1,borderRadius:99,paddingHorizontal:spacing.sm,paddingVertical:2},rarityText:{fontSize:10,fontWeight:'900'},cache:{...typography.caption,fontWeight:'800'},claimed:{...typography.caption,color:C.good,fontWeight:'900'},contractHint:{...typography.caption,color:C.muted},contractNear:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.35},contractActionHint:{...typography.caption,color:C.info,lineHeight:16},contractActions:{flexDirection:'row',flexWrap:'wrap',alignItems:'stretch',gap:6},contractPrimary:{flexGrow:2,flexBasis:180},contractSecondary:{flexGrow:1,flexBasis:92},row:{flexDirection:'row',gap:spacing.sm},emptyBlock:{gap:spacing.sm},input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel,fontSize:16}});}

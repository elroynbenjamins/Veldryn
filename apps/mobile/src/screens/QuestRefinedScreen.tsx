import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {QUESTS,QUEST_ACTS,type QuestDef} from '../content/quests';
import {JOURNAL_TITLES_V42} from '../core/adventurers-journal-v42';
import {journalEntries,questDestination,type JournalFilter,type QuestDestination} from '../core/quest-journal';
import {recoveredStoryDiscoveries,storyActProgress,storyDiscoveryText,STORY_DISCOVERIES} from '../core/story-chronicle';
import {localizedQuestLockHint,localizedQuestDestinationText,localizedWeeklyOrderLockReason} from '../i18n/quest-unlock-copy';
import {seasonalQuestBoard,QUEST_RARITIES,type SeasonalPeriod,type SeasonalQuest} from '../core/seasonal-quests';
import {weeklyOrderBoardForState} from '../core/long-term-progression-runtime';
import type {WeeklyOrder} from '../core/weekly-orders-v41';
import {weeklyOrderDestination,weeklyOrderIdleRuleId,weeklyOrderQueueActivity} from '../core/weekly-order-integrations-v41';
import {weeklyOrderLockReason} from '../core/quest-availability';
import {activityQueueCapacity} from '../core/activity-queue';
import {fallenKnightWeeklyStatus} from '../core/weekly-boss';
import {WORLD_ZONES} from '../content/world-map';
import {MONSTERS} from '../content/monsters';
import {newlyConfirmedIds} from '../core/visual-feedback';
import {useGameTheme} from '../theme/ThemeContext';
import {type ThemeColors,spacing,touchTargetMin} from '../theme/theme';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,type ProgressionKey} from '../i18n/progression';
import {questJournalText} from '../i18n/quest-journal-ui';
import {weeklyOrderTitle,weeklyOrderBrief,weeklyOrderReward,weeklyOrderDestinationLabel} from '../i18n/weekly-order-copy';
import {seasonalChallengeName,seasonalChallengeDescription,seasonalChallengeText} from '../i18n/seasonal-challenge-copy';
import type {Language} from '../i18n/languages';
import {localizedQuestActText,localizedQuestStoryText,questMatchesLocalizedSearch} from '../i18n/quest-story-copy';
import {QuestModeSwitch,type QuestMode} from '../components/QuestModeSwitch';
import {GameButton} from '../components/GameButton';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {QuestReward} from '../components/QuestReward';
import {itemDef} from '../content/items';
import {QuestObjectiveArtwork} from '../components/QuestObjectiveArtwork';
import {MonsterPortraitFrame} from '../components/MonsterPortraitFrame';
import {ActivityArtwork} from '../components/ActivityArtwork';
import {ItemArtwork} from '../components/ItemArtwork';
import {SearchField} from '../components/SearchField';
import {JournalSkillPathsPanel} from '../components/JournalSkillPathsPanel';
import {StatusPill} from '../components/StatusPill';
import {ActionFeedback} from '../components/ActionFeedback';
import {EmptyState} from '../components/EmptyState';

export type {QuestMode} from '../components/QuestModeSwitch';
type Selection={kind:'story'|'contract'|'challenge';id:string};
type SheetStage='details'|'claiming'|'success';
type Status='ready'|'active'|'locked'|'claimed'|'processing';
type RewardMoment={id:string;source:'story'|'challenges';title:string;titleName?:string;gold:number;xp?:number;itemId?:string;quantity?:number;essence?:number;bondstones?:number;rarityColor?:string};

function ProgressLine({current,max,C}:{current:number;max:number;C:ThemeColors}){
 const percentage=Math.max(0,Math.min(100,Math.round(current/Math.max(1,max)*100)));
 return <View accessible={false} style={[styles.progressTrack,{backgroundColor:C.line}]}>
  <View style={[styles.progressFill,{width:(percentage+'%') as `${number}%`,backgroundColor:percentage===100?C.good:C.accent}]}/>
 </View>;
}
function storyRewardTitle(quest:QuestDef){return quest.rewardTitleId?JOURNAL_TITLES_V42.find(title=>title.id===quest.rewardTitleId)?.name:undefined;}
function statusTone(status:Status):'good'|'info'|'muted'|'warning'{
 return status==='ready'?'good':status==='active'?'info':status==='processing'?'warning':'muted';
}
function statusText(status:Status,language:Language){
 const key=status==='ready'?'REWARD READY':status==='active'?'ACTIVE':status==='locked'?'LOCKED':status==='claimed'?'CLAIMED':'PROCESSING';
 return questJournalText(language,key);
}

/** A single large touch target, rather than 2-3 tiny actions inside each posting. */
function CompactQuestRow({title,subtitle,eyebrow,status,current,max,art,reward,rarity,onPress,C,language}:{
 title:string;subtitle:string;eyebrow:string;status:Status;current:number;max:number;art:ReactNode;reward?:string;rarity?:string;onPress:()=>void;C:ThemeColors;language:Language;
}){
 return <Pressable accessibilityRole="button" accessibilityLabel={questJournalText(language,'{title}, {status}, {current} of {max}',{title,status:statusText(status,language),current,max})}
  onPress={onPress} style={({pressed})=>[styles.questRow,{backgroundColor:C.panelRaised,borderColor:status==='ready'?C.good:C.lineStrong},pressed&&styles.pressed,status==='locked'&&styles.locked]}>
  <View style={[styles.iconBox,{backgroundColor:C.panel2,borderColor:C.line}]}>{art}</View>
  <View style={styles.rowBody}>
   <View style={styles.rowMeta}><Text numberOfLines={1} style={[styles.eyebrow,{color:C.accent}]}>{eyebrow}</Text><StatusPill label={statusText(status,language)} tone={statusTone(status)}/></View>
   <Text numberOfLines={2} style={[styles.rowTitle,{color:C.text}]}>{title}</Text>
   <Text numberOfLines={1} style={[styles.rowSubtitle,{color:C.muted}]}>{subtitle}</Text>
   {status!=='locked'?<ProgressLine current={current} max={max} C={C}/>:null}
   {reward||rarity?<Text numberOfLines={1} style={[styles.rewardHint,{color:status==='ready'?C.good:C.accent}]}>{rarity?rarity.toLocaleUpperCase(language)+' · ':''}{reward??''}</Text>:null}
  </View>
  <Text accessible={false} style={[styles.chevron,{color:C.accent}]}>›</Text>
 </Pressable>;
}
function StoryArt({quest}:{quest:QuestDef}){return <QuestObjectiveArtwork quest={quest} size={42}/>;}
function OrderArt({order}:{order:WeeklyOrder}){
 const monster=order.kind==='hunt'?MONSTERS.find(row=>row.id===order.targetId):undefined;
 if(monster)return <MonsterPortraitFrame monster={monster} size={40} framed={false} reduceMotion/>;
 if(order.source.kind==='item')return <ItemArtwork itemId={order.source.id} size={38}/>;
 if(order.kind==='regional')return <View style={styles.orderZone}><ActivityArtwork id="exploration" size={38}/></View>;
 const destination=weeklyOrderDestination(order);
 return <ActivityArtwork id={destination.kind==='skills'?destination.skillId??'exploration':'smithing'} size={38}/>;
}
function ChallengeArt({quest}:{quest:SeasonalQuest}){
 return <ActivityArtwork id={quest.tag==='boss'?'combat':quest.tag==='event'?'exploration':quest.tag==='equipment'||quest.tag==='crafting'?'smithing':quest.tag==='gathering'?'woodcutting':quest.tag} size={38}/>;
}
function Rail({items,selected,onChange,C}:{items:{id:string;label:string}[];selected:string;onChange:(value:any)=>void;C:ThemeColors}){
 return <ScrollView horizontal accessibilityRole="tablist" showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.rail}>
  {items.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:item.id===selected}} onPress={()=>onChange(item.id)}
   style={({pressed})=>[styles.railChip,{borderColor:item.id===selected?C.selectionLine:C.line,backgroundColor:item.id===selected?C.selection:C.panel2},pressed&&styles.pressed]}>
   <Text style={[styles.railText,{color:item.id===selected?C.text:C.muted}]}>{item.label}</Text>
  </Pressable>)}
 </ScrollView>;
}

export function QuestRefinedScreen({state,mode,onModeChange,focusedWeeklyOrderId,onClaim,onClaimContract,onNavigate,onOpenWeeklyBoss,onOpenWeeklyOrder,onQueueWeeklyOrder,onStopWeeklyOrder}:{
 state:GameState;mode:QuestMode;onModeChange:(mode:QuestMode)=>void;focusedWeeklyOrderId?:string;
 onClaim:(id:string)=>void|boolean|Promise<void|boolean>;onClaimContract:(period:SeasonalPeriod,id:string,choiceId?:string)=>void|boolean|Promise<void|boolean>;
 onNavigate:(destination:QuestDestination)=>void;onOpenWeeklyBoss:()=>void;
 onOpenWeeklyOrder:(order:WeeklyOrder)=>void;onQueueWeeklyOrder:(order:WeeklyOrder)=>void;onStopWeeklyOrder:(order:WeeklyOrder)=>void;
}){
 const C=useGameTheme(),contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
 const p=(value:string)=>questJournalText(language,value),t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
 const [filter,setFilter]=useState<JournalFilter>('current'),[query,setQuery]=useState('');
 const [challengePeriod,setChallengePeriod]=useState<'all'|'daily'|'weekly'|'monthly'>('all');
 const [selected,setSelected]=useState<Selection|null>(null),[sheetStage,setSheetStage]=useState<SheetStage>('details');
 const [storyExpanded,setStoryExpanded]=useState(false),[chronicleExpanded,setChronicleExpanded]=useState(false),[notice,setNotice]=useState('');
 const [moment,setMoment]=useState<RewardMoment|null>(null);
 const [rewardChoiceByQuest,setRewardChoiceByQuest]=useState<Record<string,string>>({});
 const pendingClaim=useRef<{kind:'story'|'challenge';id:string}|null>(null);
 // The confirmed success receipt stays visible until the player closes it.
 useEffect(()=>{
  if(!moment||(sheetStage==='success'&&selected?.id===moment.id))return;
  const timeout=setTimeout(()=>setMoment(null),3000);
  return ()=>clearTimeout(timeout);
 },[moment,sheetStage,selected?.id]);
 // The active quest tab can also change from navigation outside this screen.
 useEffect(()=>{setMoment(null);},[mode]);
 const previous=useRef({characterId:state.character?.id,story:state.quests.filter(q=>q.status==='claimed').map(q=>q.questId),challenges:state.account.seasonalContractClaimIds??[]});
 const daily=seasonalQuestBoard(state,'daily'),weekly=seasonalQuestBoard(state,'weekly'),monthly=seasonalQuestBoard(state,'monthly');
 const allChallenges=[...daily,...weekly,...monthly];
 const challengeClaimed=new Set(state.character?.personalSeasonal?.claimIds??state.account.seasonalContractClaimIds??[]);
  const currentChallengeClaimedCount=allChallenges.filter(q=>challengeClaimed.has(q.id)).length;
 const challengeReady=allChallenges.filter(q=>q.progress>=q.required&&!challengeClaimed.has(q.id));
 const board=weeklyOrderBoardForState(state);
 const boardCompleted=board.orders.filter(q=>q.progress>=q.target).length;
 const nextOrder=board.orders.find(q=>q.id===focusedWeeklyOrderId)??board.orders.filter(q=>q.progress<q.target&&!weeklyOrderLockReason(state,q)).sort((a,b)=>Number(b.regionId===state.currentRegionId)-Number(a.regionId===state.currentRegionId)||b.progress/Math.max(1,b.target)-a.progress/Math.max(1,a.target))[0];
 const storyClaimed=state.quests.filter(q=>q.status==='claimed').length;
 const storyReady=state.quests.filter(q=>q.status==='complete').length;
 const nextChapter=QUESTS.find(def=>state.quests.some(q=>q.questId===def.id&&q.status!=='claimed'))??QUESTS[QUESTS.length-1];
 const chapterProgress=state.quests.find(q=>q.questId===nextChapter.id);
 const act=QUEST_ACTS[nextChapter.act];
  const actRows=storyActProgress(state),currentActProgress=actRows.find(row=>row.act===act.act)!;
  const recoveredPages=recoveredStoryDiscoveries(state,language);
  const latestPage=recoveredPages[recoveredPages.length-1];
  const campaignFinished=storyClaimed===QUESTS.length;
 const storyRows=journalEntries(state,filter,'').filter(({def})=>questMatchesLocalizedSearch(language,def,query));
 const currentSelection=selected?.kind==='story'?QUESTS.find(q=>q.id===selected.id):selected?.kind==='contract'?board.orders.find(q=>q.id===selected.id):selected?.kind==='challenge'?allChallenges.find(q=>q.id===selected.id):undefined;
 const chosenStory=selected?.kind==='story'?currentSelection as QuestDef|undefined:undefined;
 const chosenOrder=selected?.kind==='contract'?currentSelection as WeeklyOrder|undefined:undefined;
 const chosenChallenge=selected?.kind==='challenge'?currentSelection as SeasonalQuest|undefined:undefined;
 const sheetOpen=!!(selected&&currentSelection);
 const selectedProgress=chosenStory?state.quests.find(q=>q.questId===chosenStory.id):undefined;
 const selectedLocked=chosenOrder?weeklyOrderLockReason(state,chosenOrder):undefined;
 const selectedStatus:Status=chosenStory?(selectedProgress?.status==='complete'?'ready':selectedProgress?.status==='claimed'?'claimed':selectedProgress?.status==='active'?'active':'locked'):chosenOrder?(selectedLocked?'locked':chosenOrder.claimed?'claimed':chosenOrder.progress>=chosenOrder.target?'processing':'active'):chosenChallenge?(challengeClaimed.has(chosenChallenge.id)?'claimed':chosenChallenge.progress>=chosenChallenge.required?'ready':'active'):'locked';
 const closeSheet=useCallback(()=>{
  pendingClaim.current=null;
  if(sheetStage==='success')setMoment(null);
  setSelected(null);setSheetStage('details');setStoryExpanded(false);
 },[sheetStage]);
 function open(kind:Selection['kind'],id:string){setSelected({kind,id});setSheetStage('details');setStoryExpanded(false);setMoment(null);setNotice('');}
 function changeMode(next:QuestMode){closeSheet();setMoment(null);setNotice('');onModeChange(next);}
 useEffect(()=>{
  if(focusedWeeklyOrderId&&mode==='contracts'&&board.orders.some(q=>q.id===focusedWeeklyOrderId)){setSelected({kind:'contract',id:focusedWeeklyOrderId});setSheetStage('details');}
 },[focusedWeeklyOrderId,mode]);
 // The local success state is only shown after the authoritative game state confirms a claim.
 useEffect(()=>{
  const next={characterId:state.character?.id,story:state.quests.filter(q=>q.status==='claimed').map(q=>q.questId),challenges:state.account.seasonalContractClaimIds??[]};
  const prior=previous.current;previous.current=next;
  if(next.characterId!==prior.characterId){closeSheet();setMoment(null);return;}
  const newStory=newlyConfirmedIds(prior.story,next.story),newChallenge=newlyConfirmedIds(prior.challenges,next.challenges);
  if(newStory.length){
   const def=QUESTS.find(q=>q.id===newStory[newStory.length-1]);
   if(def){
    setMoment({id:def.id,source:'story',title:localizedQuestStoryText(language,def,'name'),titleName:storyRewardTitle(def),gold:def.rewardGold,itemId:def.rewardItemId,quantity:def.rewardItemQty??1});
    if((selected?.kind==='story'&&selected.id===def.id)||(pendingClaim.current?.kind==='story'&&pendingClaim.current.id===def.id)){pendingClaim.current=null;setSheetStage('success');}
   }
  }else if(newChallenge.length){
   const def=allChallenges.find(q=>q.id===newChallenge[newChallenge.length-1]);
   if(def){
    const choice=def.rewardOptions.find(option=>option.id===(state.character?.personalSeasonal?.rewardChoices??state.account.seasonalContractRewardChoices)?.[def.id])??def.rewardOptions[0];
     setMoment({id:def.id,source:'challenges',title:seasonalChallengeName(language,def),gold:def.rewardGold,xp:def.rewardXp,itemId:choice.rewardItemId,quantity:choice.rewardItemQty,essence:choice.rewardCompanionEssence,bondstones:choice.rewardBondstones,rarityColor:QUEST_RARITIES[def.rarity].color});
    if((selected?.kind==='challenge'&&selected.id===def.id)||(pendingClaim.current?.kind==='challenge'&&pendingClaim.current.id===def.id)){pendingClaim.current=null;setSheetStage('success');}
   }
  }
 },[state.quests,state.account.seasonalContractClaimIds,state.character?.id]);
 // One click claims the reward. Only server-confirmed state can show the receipt.
 async function submitClaimFor(kind:'story'|'challenge',id:string){
  if(pendingClaim.current)return;
  const chosenStory=kind==='story'?QUESTS.find(q=>q.id===id):undefined;
  const chosenChallenge=kind==='challenge'?allChallenges.find(q=>q.id===id):undefined;
  const isReady=chosenStory?state.quests.some(q=>q.questId===id&&q.status==='complete'):chosenChallenge?!challengeClaimed.has(id)&&chosenChallenge.progress>=chosenChallenge.required:false;
  if(!isReady)return;
  pendingClaim.current={kind,id};
  setSelected({kind,id});setSheetStage('claiming');setStoryExpanded(false);setMoment(null);setNotice('');
  try{
   const confirmed=chosenStory?await onClaim(chosenStory.id):chosenChallenge?await onClaimContract(chosenChallenge.period,chosenChallenge.id,rewardChoiceByQuest[id]??chosenChallenge.rewardOptions[0].id):false;
   if(confirmed===false)throw new Error(p('Could not claim reward. Please try again.'));
   // Waiting ends when the authoritative character state confirms the claim.
  }catch(err){
   if(pendingClaim.current?.kind===kind&&pendingClaim.current.id===id){
    pendingClaim.current=null;setSheetStage('details');
    setNotice(err instanceof Error?err.message:p('Could not claim reward. Please try again.'));
   }
  }
 }
 function submitClaim(){
  if(selectedStatus!=='ready'||sheetStage!=='details'||!selected||selected.kind==='contract')return;
  return submitClaimFor(selected.kind,selected.id);
 }
 const summaries={story:{title:p('Quest Journal'),subtitle:p('Your next chapter, story progress and rewards.')},contracts:{title:p('Weekly Contracts'),subtitle:p('Weekly assignments and automatic reward processing.')},challenges:{title:p('Class Challenges'),subtitle:p('Your daily, weekly and monthly class objectives.')}};
 const summary=summaries[mode];
 const completeChallengeCount=allChallenges.filter(q=>q.progress>=q.required).length;
 const nextReward=challengeReady[0];
 const fallenKnight=state.defeatedBossIds.includes('FALLEN_KNIGHT')?fallenKnightWeeklyStatus(state,Date.now()):undefined;
 const selectedGoal=chosenStory?chosenStory.required:chosenOrder?chosenOrder.target:chosenChallenge?.required??1;
 const selectedValue=chosenStory?Math.min(selectedGoal,selectedProgress?.progress??0):chosenOrder?Math.min(selectedGoal,chosenOrder.progress):chosenChallenge?Math.min(selectedGoal,chosenChallenge.progress):0;
 const selectedTitle=chosenStory?localizedQuestStoryText(language,chosenStory,'name'):chosenChallenge?seasonalChallengeName(language,chosenChallenge):chosenOrder?weeklyOrderTitle(language,chosenOrder):'';
 const chosenDestination=chosenOrder?weeklyOrderDestination(chosenOrder):undefined;
 const chosenQueueable=chosenOrder?weeklyOrderQueueActivity(chosenOrder):undefined;
 const queueFull=(state.character?.activityQueue?.length??0)>=activityQueueCapacity(state);
 const stopActive=chosenOrder?state.character?.activeIdleRuleIdV40===weeklyOrderIdleRuleId(chosenOrder):false;
 const chosenReward=chosenChallenge?.rewardOptions.find(choice=>choice.id===(selectedStatus==='claimed'?(state.character?.personalSeasonal?.rewardChoices??state.account.seasonalContractRewardChoices)?.[chosenChallenge.id]:rewardChoiceByQuest[chosenChallenge.id]))??chosenChallenge?.rewardOptions[0];
 const selectedRewards=chosenStory?{gold:chosenStory.rewardGold,titleName:storyRewardTitle(chosenStory),itemId:chosenStory.rewardItemId,quantity:chosenStory.rewardItemQty??1,essence:0,bondstones:0}:chosenChallenge?{gold:chosenChallenge.rewardGold,xp:chosenChallenge.rewardXp,itemId:chosenReward?.rewardItemId,quantity:chosenReward?.rewardItemQty,essence:chosenReward?.rewardCompanionEssence??0,bondstones:chosenReward?.rewardBondstones??0,color:QUEST_RARITIES[chosenChallenge.rarity].color}:undefined;
 const hasClaim=selectedStatus==='ready'&&(!!chosenStory||!!chosenChallenge);
 return <View style={styles.screen}>
  <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={styles.heading}><Text style={[styles.eyebrow,{color:C.accent}]}>{p('QUESTS & OBJECTIVES')}</Text>
    <Text accessibilityRole="header" style={[styles.headTitle,{color:C.text}]}>{summary.title}</Text>
    <Text style={[styles.subtitle,{color:C.muted}]}>{summary.subtitle}</Text>
   </View>
   <QuestModeSwitch mode={mode} onChange={changeMode} storyMeta={storyReady?t('{count} ready',{count:storyReady}):t('{current}/{total} claimed',{current:storyClaimed,total:QUESTS.length})}
    contractMeta={t('{current}/{total} complete',{current:boardCompleted,total:board.orders.length})}
    challengeMeta={challengeReady.length?t('{count} ready',{count:challengeReady.length}):t('{current}/{total} claimed',{current:currentChallengeClaimedCount,total:allChallenges.length})}
    storyAttention={storyReady} challengeAttention={challengeReady.length}/>
   {notice?<ActionFeedback compact tone="error" message={notice} reduceMotion={state.settings.reduceMotion} actionLabel={p('Dismiss')} onAction={()=>setNotice('')}/>:null}
   {moment?.source===mode&&!sheetOpen?<View style={[styles.moment,{borderColor:C.good,backgroundColor:C.goodSurface}]}><View style={styles.rowMeta}><Text style={[styles.eyebrow,{color:C.good}]}>{p('REWARDS SECURED')}</Text><StatusPill label={p('CLAIMED')} tone="good"/></View><Text style={[styles.rowTitle,{color:C.text}]}>{moment.title}</Text><QuestReward gold={moment.gold} xp={moment.xp} itemId={moment.itemId} quantity={moment.quantity} titleName={moment.titleName} essence={moment.essence} bondstones={moment.bondstones} rarityColor={moment.rarityColor} label={p('Rewards collected')}/></View>:null}
   {mode==='story'?<>
    <View style={[styles.hero,{backgroundColor:C.panelRaised,borderColor:C.lineStrong}]}>
     <View style={styles.rowMeta}><Text style={[styles.eyebrow,{color:C.accent}]}>{p('ACT')+' '+(act.act===1?'I':act.act===2?'II':'III')+' · '+localizedQuestActText(language,act,'name').toLocaleUpperCase(language)}</Text><Text style={[styles.mini,{color:C.muted}]}>{storyClaimed}/{QUESTS.length}</Text></View>
     <Text style={[styles.heroTitle,{color:C.text}]}>{campaignFinished?p('The Asterfall chronicle is complete'):p('The story continues')}</Text>
     <Text style={[styles.subtitle,{color:C.muted}]}>{campaignFinished?p('The road leads onward to Sunscar.'):localizedQuestActText(language,act,'subtitle')}</Text>
     <View style={styles.rowMeta}><Text style={[styles.mini,{color:C.muted}]}>{p('ACT PROGRESS')}</Text><Text style={[styles.mini,{color:C.text}]}>{currentActProgress.completed}/{currentActProgress.total}</Text></View>
     <ProgressLine current={currentActProgress.completed} max={currentActProgress.total} C={C}/>
     <View style={styles.rowMeta}><Text style={[styles.mini,{color:C.muted}]}>{p('STORY PROGRESS')}</Text><Text style={[styles.mini,{color:C.text}]}>{storyClaimed}/{QUESTS.length}</Text></View>
     <ProgressLine current={storyClaimed} max={QUESTS.length} C={C}/>
    </View>
    {chapterProgress?.status!=='claimed'?<View style={[styles.featured,{backgroundColor:C.goodSurface,borderColor:C.good}]}>
      <View style={styles.rowMeta}><Text style={[styles.eyebrow,{color:C.good}]}>{chapterProgress?.status==='complete'?p('REWARD READY'):p('CURRENT OBJECTIVE')}</Text><StatusPill label={chapterProgress?.status==='complete'?p('READY'):p('ACTIVE')} tone={chapterProgress?.status==='complete'?'good':'info'}/></View>
      <Text style={[styles.featuredTitle,{color:C.text}]}>{localizedQuestStoryText(language,nextChapter,'name')}</Text>
      <Text style={[styles.subtitle,{color:C.muted}]}>{localizedQuestStoryText(language,nextChapter,'description')}</Text>
      <ProgressLine current={Math.min(nextChapter.required,chapterProgress?.progress??0)} max={nextChapter.required} C={C}/>
      <Text style={[styles.rewardHint,{color:C.accent}]}>{nextChapter.rewardGold} {t('Gold')}{nextChapter.rewardItemId?' · '+(nextChapter.rewardItemQty??1)+'× '+nextChapter.rewardItemId.replace(/_/g,' '):''}{nextChapter.rewardTitleId?' · '+(storyRewardTitle(nextChapter)??''):''}</Text>
      <GameButton title={chapterProgress?.status==='complete'?p('Claim rewards'):p('View objective')} onPress={()=>chapterProgress?.status==='complete'?submitClaimFor('story',nextChapter.id):open('story',nextChapter.id)}/>
     </View>:null}
    <View style={[styles.chronicleCard,{backgroundColor:C.panel,borderColor:C.lineStrong}]}>
     <View style={styles.rowMeta}><Text style={[styles.eyebrow,{color:C.accent}]}>{p('THE CHRONICLE')}</Text><Text style={[styles.mini,{color:C.muted}]}>{p('Recovered clues')} · {recoveredPages.length}/{STORY_DISCOVERIES.length}</Text></View>
     <Text style={[styles.rowTitle,{color:C.text}]}>{latestPage?.title??localizedQuestStoryText(language,QUESTS[0],'name')}</Text>
     <Text style={[styles.detailText,{color:C.muted}]}>{latestPage?.text??localizedQuestStoryText(language,QUESTS[0],'story')}</Text>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:chronicleExpanded}} onPress={()=>setChronicleExpanded(value=>!value)}
      style={[styles.chronicleToggle,{borderColor:C.line,backgroundColor:C.panel2}]}>
      <Text style={[styles.mini,{color:C.accent}]}>{chronicleExpanded?p('Hide recovered pages'):p('Read recovered pages')}</Text>
      <Text style={[styles.chevron,{color:C.accent}]}>{chronicleExpanded?'−':'+'}</Text>
     </Pressable>
     {chronicleExpanded?<View style={styles.chronicleSections}>{actRows.map(row=><View key={row.act} style={styles.chronicleSection}>
      <View style={styles.rowMeta}><Text style={[styles.mini,{color:C.text}]}>{p('ACT')} {row.act===1?'I':row.act===2?'II':'III'} · {localizedQuestActText(language,QUEST_ACTS[row.act],'name')}</Text><Text style={[styles.mini,{color:C.muted}]}>{row.completed}/{row.total}</Text></View>
      {recoveredPages.filter(page=>page.act===row.act).map(page=><View key={page.questId} style={[styles.chroniclePage,{borderColor:C.line,backgroundColor:C.panel2}]}>
       <Text style={[styles.eyebrow,{color:C.accent}]}>{p('CHAPTER')} {page.chapter} · {page.title}</Text>
       <Text style={[styles.detailText,{color:C.text}]}>{page.text}</Text>
      </View>)}
     </View>)}
      {recoveredPages.length===0?<Text style={[styles.footnote,{color:C.muted}]}>{p('No clues recovered yet. Claim story rewards to uncover the old oath.')}</Text>:null}
     </View>:null}
    </View>
    {campaignFinished?<View style={[styles.featured,{backgroundColor:C.infoSurface,borderColor:C.info}]}>
     <Text style={[styles.eyebrow,{color:C.accent}]}>{p('NEXT FRONTIER')}</Text>
     <Text style={[styles.featuredTitle,{color:C.text}]}>{p('Follow the oathglass signal into Sunscar.')}</Text>
     <Text style={[styles.subtitle,{color:C.muted}]}>{p('Regional story leads continue in the World.')}</Text>
     <GameButton compact title={p('Open Sunscar')} onPress={()=>onNavigate({tab:'World',zoneId:'SUNSCAR',label:'Visit Sunscar',hint:'Follow the regional story leads beyond Asterfall.'})}/>
    </View>:null}
    <JournalSkillPathsPanel state={state} onNavigate={onNavigate}/>
    <View style={styles.sectionHead}><Text style={[styles.sectionTitle,{color:C.accent}]}>{p('STORY CHAPTERS')}</Text><Text style={[styles.mini,{color:C.muted}]}>{QUESTS.length} {p('total')}</Text></View>
    <Rail C={C} selected={filter} onChange={setFilter} items={[{id:'current',label:p('Current')+' · '+journalEntries(state,'current','').length},{id:'all',label:p('All')},{id:'claimed',label:p('Completed')},{id:'locked',label:p('Locked')} ]}/>
    <SearchField accessibilityLabel={t('Search quests')} placeholder={p('Search chapters…')} placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    {storyRows.length?storyRows.map(({def,quest,chapter})=><CompactQuestRow key={def.id} C={C} title={localizedQuestStoryText(language,def,'name')} subtitle={def.location} eyebrow={p('CHAPTER')+' '+chapter} status={quest.status==='complete'?'ready':quest.status==='claimed'?'claimed':quest.status==='locked'?'locked':'active'} language={language} current={Math.min(def.required,quest.progress)} max={def.required} art={<StoryArt quest={def}/>} reward={def.rewardGold+' '+t('Gold')} onPress={()=>open('story',def.id)}/>):<View style={styles.empty}><EmptyState title={p('No matching chapters')} message={p('Change the filter or search to see more chapters.')} icon="quests"/><GameButton compact tone="secondary" title={p('Show all chapters')} onPress={()=>{setFilter('all');setQuery('')}}/></View>}
   </>:null}
   {mode==='contracts'?<>
    <View style={[styles.hero,{backgroundColor:C.panelRaised,borderColor:C.lineStrong}]}>
     <View style={styles.rowMeta}><Text style={[styles.eyebrow,{color:C.accent}]}>{p('WEEKLY CONTRACT BOARD')}</Text><StatusPill label={p('WEEKLY')} tone="info"/></View>
     <View style={styles.boardCount}><Text style={[styles.bigNumber,{color:C.text}]}>{boardCompleted}<Text style={[styles.counterTotal,{color:C.muted}]}>/{board.orders.length}</Text></Text><View style={styles.flex}><Text style={[styles.rowTitle,{color:C.text}]}>{p('Assignments complete')}</Text><Text style={[styles.subtitle,{color:C.muted}]}>{board.orders.length-boardCompleted} {p('still active')} · {p('Resets')} {new Date(board.endsAtMs).toISOString().slice(0,10)} UTC</Text></View></View>
     <ProgressLine current={boardCompleted} max={board.orders.length} C={C}/>
    </View>
    {focusedWeeklyOrderId&&!board.orders.some(q=>q.id===focusedWeeklyOrderId)?<ActionFeedback compact tone="info" message={p('Your focused weekly job expired. Showing the latest board.')} reduceMotion={state.settings.reduceMotion}/>:null}
    {nextOrder?<Pressable accessibilityRole="button" onPress={()=>open('contract',nextOrder.id)} style={({pressed})=>[styles.featured,{backgroundColor:C.infoSurface,borderColor:C.info},pressed&&styles.pressed]}>
      <Text style={[styles.eyebrow,{color:C.info}]}>{p('RECOMMENDED NEXT')}</Text>
      <View style={styles.rowMeta}><Text style={[styles.featuredTitle,{color:C.text,flex:1}]}>{weeklyOrderTitle(language,nextOrder)}</Text><Text style={[styles.openHint,{color:C.info}]}>{p('View job')} ›</Text></View>
      <Text style={[styles.subtitle,{color:C.muted}]}>{nextOrder.progress}/{nextOrder.target} · {weeklyOrderDestinationLabel(language,nextOrder,'detail')}</Text>
     </Pressable>:null}
    <View style={styles.sectionHead}><Text style={[styles.sectionTitle,{color:C.accent}]}>{p('WEEKLY ASSIGNMENTS')}</Text><Text style={[styles.mini,{color:C.muted}]}>{p('Automatic rewards')}</Text></View>
    {[...board.orders].sort((a,b)=>Number(b.id===focusedWeeklyOrderId)-Number(a.id===focusedWeeklyOrderId)||Number(a.progress>=a.target)-Number(b.progress>=b.target)||a.slot-b.slot).map(order=>{
     const locked=weeklyOrderLockReason(state,order),status:Status=locked?'locked':order.claimed?'claimed':order.progress>=order.target?'processing':'active';
     const zone=WORLD_ZONES.find(z=>z.id===order.regionId);
     return <CompactQuestRow key={order.id} C={C} language={language} title={weeklyOrderTitle(language,order)} subtitle={p(zone?.name??order.source.label)} eyebrow={p(order.kind==='hunt'?'HUNT ORDER':order.kind==='regional'?'REGIONAL PROBLEM':'WORK ORDER')} status={status} current={Math.min(order.progress,order.target)} max={order.target} art={<OrderArt order={order}/>} reward={weeklyOrderReward(language,order)} onPress={()=>open('contract',order.id)}/>;
    })}
    <Text style={[styles.footnote,{color:C.muted}]}>{p('Finish every posting for the full weekly board completion reward. Contract rewards are processed automatically.')}</Text>
    {fallenKnight?<View style={[styles.featured,{backgroundColor:C.panel,borderColor:C.line}]}>
     <View style={styles.rowMeta}><Text style={[styles.eyebrow,{color:C.accent}]}>{p('WEEKLY BOSS')}</Text><StatusPill label={fallenKnight.bountyAwarded?p('COMPLETE'):p('ACTIVE')} tone={fallenKnight.bountyAwarded?'good':'info'}/></View>
     <Text style={[styles.featuredTitle,{color:C.text}]}>{p('Break the Last Oath')}</Text>
     <Text style={[styles.subtitle,{color:C.muted}]}>{p('Fallen Knight weekly bounty')} · {fallenKnight.rewardedClears}/{fallenKnight.bountyTarget}</Text>
     <ProgressLine current={fallenKnight.rewardedClears} max={fallenKnight.bountyTarget} C={C}/>
     <Text style={[styles.footnote,{color:C.muted}]}>{p('Up to three rewarded rematch victories per UTC week. Earn Oathglass and bonus boss materials.')}</Text>
     <GameButton compact title={p('Open Fallen Knight')} tone="secondary" onPress={onOpenWeeklyBoss}/>
    </View>:null}
   </>:null}
   {mode==='challenges'?<>
    <View style={[styles.hero,{backgroundColor:C.panelRaised,borderColor:C.lineStrong}]}>
     <View style={styles.rowMeta}><Text style={[styles.eyebrow,{color:C.accent}]}>{p('CLASS OBJECTIVES')}</Text><StatusPill label={p('CLASS')} tone="special"/></View>
     <View style={styles.statRow}>
      {[{label:p('READY'),value:challengeReady.length},{label:p('CLAIMED'),value:currentChallengeClaimedCount},{label:p('TOTAL'),value:allChallenges.length}].map(item=><View key={item.label} style={[styles.stat,{backgroundColor:C.panel2,borderColor:C.line}]}><Text style={[styles.statNumber,{color:item.label===p('READY')&&challengeReady.length?C.good:C.text}]}>{item.value}</Text><Text style={[styles.eyebrow,{color:C.muted}]}>{item.label}</Text></View>)}
     </View>
     <ProgressLine current={completeChallengeCount} max={allChallenges.length} C={C}/>
    </View>
    {nextReward?<View style={[styles.featured,{backgroundColor:C.goodSurface,borderColor:C.good}]}>
     <View style={styles.rowMeta}><Text style={[styles.eyebrow,{color:C.good}]}>{p('REWARD READY')}</Text><StatusPill label={seasonalChallengeText(language,QUEST_RARITIES[nextReward.rarity].label).toLocaleUpperCase(language)} tone="special"/></View>
     <Text style={[styles.featuredTitle,{color:C.text}]}>{seasonalChallengeName(language,nextReward)}</Text>
     <Text style={[styles.subtitle,{color:C.muted}]}>{nextReward.period.toUpperCase()} · {seasonalChallengeText(language,QUEST_RARITIES[nextReward.rarity].cache)}</Text>
     <GameButton title={p('Claim')+' '+seasonalChallengeText(language,QUEST_RARITIES[nextReward.rarity].cache)} onPress={()=>open('challenge',nextReward.id)}/>
    </View>:null}
    <View style={styles.sectionHead}><Text style={[styles.sectionTitle,{color:C.accent}]}>{p('CHALLENGE LIST')}</Text><Text style={[styles.mini,{color:C.muted}]}>{daily.length} {p('daily')} · {weekly.length} {p('weekly')} · {monthly.length} {p('monthly')}</Text></View>
    <Rail C={C} selected={challengePeriod} onChange={setChallengePeriod} items={[{id:'all',label:p('All')},{id:'daily',label:p('Daily')},{id:'weekly',label:p('Weekly')},{id:'monthly',label:p('Monthly')}]}/>
    {(['daily','weekly','monthly'] as const).filter(period=>challengePeriod==='all'||challengePeriod===period).map(period=>{
     const rows=(period==='daily'?daily:period==='weekly'?weekly:monthly).slice().sort((a,b)=>Number(challengeClaimed.has(a.id))-Number(challengeClaimed.has(b.id))||Number(b.progress>=b.required)-Number(a.progress>=a.required));
     return <View key={period} style={styles.challengeGroup}>
      {challengePeriod==='all'?<Text style={[styles.eyebrow,{color:C.accent}]}>{p(period.toUpperCase())}</Text>:null}
      {rows.map(q=><CompactQuestRow key={q.id} C={C} language={language} title={seasonalChallengeName(language,q)} subtitle={seasonalChallengeDescription(language,q)} eyebrow={seasonalChallengeText(language,q.tag.toUpperCase())+' · '+p(period.toUpperCase())} status={challengeClaimed.has(q.id)?'claimed':q.progress>=q.required?'ready':'active'} current={Math.min(q.progress,q.required)} max={q.required} art={<ChallengeArt quest={q}/>} rarity={seasonalChallengeText(language,QUEST_RARITIES[q.rarity].label)} reward={seasonalChallengeText(language,QUEST_RARITIES[q.rarity].cache)} onPress={()=>open('challenge',q.id)}/>)}
     </View>;
    })}
   </>:null}
  </ScrollView>
  <GameModalSurface visible={sheetOpen} onClose={closeSheet} reduceMotion={state.settings.reduceMotion} surfaceStyle={styles.sheetSurface}>
   <GameModalHeader eyebrow={sheetStage==='success'?p('REWARDS COLLECTED'):selected?.kind==='story'?p('STORY CHAPTER'):selected?.kind==='contract'?p('WEEKLY CONTRACT'):p('CLASS CHALLENGE')} title={selectedTitle} onClose={closeSheet}/>
   <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    {sheetStage==='success'&&moment!==null&&moment.id===selected?.id?<View style={[styles.success,{backgroundColor:C.goodSurface,borderColor:C.good}]}>
     <Text style={[styles.successMark,{color:C.good}]}>✦ ✓</Text><Text style={[styles.featuredTitle,{color:C.text}]}>{p('Rewards secured')}</Text>
     <Text style={[styles.subtitle,{color:C.muted}]}>{p('Reward collected · the next objective is ready when unlocked.')}</Text>
     <QuestReward gold={moment.gold} xp={moment.xp} itemId={moment.itemId} quantity={moment.quantity} titleName={moment.titleName} essence={moment.essence} bondstones={moment.bondstones} rarityColor={moment.rarityColor} label={p('Rewards collected')}/>
     {moment.source==='story'&&storyDiscoveryText(language,moment.id)?<View style={[styles.storyText,{backgroundColor:C.panel2,borderColor:C.info}]}>
      <Text style={[styles.eyebrow,{color:C.accent}]}>{p('NEW DISCOVERY')}</Text>
      <Text style={[styles.detailText,{color:C.text}]}>{storyDiscoveryText(language,moment.id)}</Text>
     </View>:null}
    </View>:sheetStage==='claiming'?<View style={[styles.featured,{backgroundColor:C.panelRaised,borderColor:C.lineStrong}]}>
     <Text style={[styles.rowTitle,{color:C.text}]}>{selectedTitle}</Text>
     <Text style={[styles.subtitle,{color:C.muted}]}>{p('The server will verify your progress before granting this reward.')}</Text>
     {selectedRewards?<QuestReward gold={selectedRewards.gold} xp={'xp' in selectedRewards?selectedRewards.xp:undefined} itemId={selectedRewards.itemId} quantity={selectedRewards.quantity} titleName={'titleName' in selectedRewards?selectedRewards.titleName:undefined} essence={selectedRewards.essence} bondstones={selectedRewards.bondstones} rarityColor={'color' in selectedRewards?selectedRewards.color:undefined} label={p('Rewards')}/>:null}
     {sheetStage==='claiming'?<Text accessibilityLiveRegion="polite" style={[styles.footnote,{color:C.info}]}>{p('Claim submitted · waiting for confirmation…')}</Text>:null}
    </View>:<>
     <View style={[styles.detailIdentity,{backgroundColor:C.panelRaised,borderColor:C.line}]}>
      <View style={[styles.detailArt,{backgroundColor:C.panel2,borderColor:C.line}]}>{chosenStory?<StoryArt quest={chosenStory}/>:chosenOrder?<OrderArt order={chosenOrder}/>:chosenChallenge?<ChallengeArt quest={chosenChallenge}/>:null}</View>
      <View style={styles.flex}><Text style={[styles.rowSubtitle,{color:C.muted}]}>{chosenStory?p(chosenStory.location):chosenOrder?p(chosenOrder.source.label):chosenChallenge?p(chosenChallenge.period.toUpperCase()):''}</Text><StatusPill label={statusText(selectedStatus,language)} tone={statusTone(selectedStatus)}/></View>
     </View>
     <View style={[styles.detailBlock,{backgroundColor:C.panel,borderColor:C.line}]}>
      <Text style={[styles.eyebrow,{color:C.accent}]}>{p('OBJECTIVE')}</Text>
      <Text style={[styles.detailText,{color:C.text}]}>{chosenStory?localizedQuestStoryText(language,chosenStory,'description'):chosenOrder?(weeklyOrderBrief(language,chosenOrder)??weeklyOrderDestinationLabel(language,chosenOrder,'detail')):chosenChallenge?seasonalChallengeDescription(language,chosenChallenge):''}</Text>
      {selectedStatus==='locked'?<Text style={[styles.footnote,{color:C.warning}]}>{chosenOrder?(localizedWeeklyOrderLockReason(language,state,chosenOrder)??selectedLocked??''):chosenStory?localizedQuestLockHint(language,state,chosenStory):''}</Text>:<><View style={styles.rowMeta}><Text style={[styles.mini,{color:C.muted}]}>{p('Progress')}</Text><Text style={[styles.mini,{color:C.text}]}>{selectedValue}/{selectedGoal}</Text></View><ProgressLine current={selectedValue} max={selectedGoal} C={C}/></>}
     </View>
     {chosenStory?<View style={styles.storyDisclosure}>
      {selectedStatus==='locked'?<Text style={[styles.footnote,{color:C.muted}]}>{p('Complete earlier chapters to read this story page.')}</Text>:<>
       <Pressable accessibilityRole="button" accessibilityState={{expanded:storyExpanded}} onPress={()=>setStoryExpanded(v=>!v)} style={[styles.disclosure,{borderColor:C.line}]}>
        <Text style={[styles.detailText,{color:C.text}]}>{p('Read chapter story')}</Text><Text style={[styles.chevron,{color:C.accent}]}>{storyExpanded?'−':'+'}</Text>
       </Pressable>
       {storyExpanded?<View style={[styles.storyText,{backgroundColor:C.panel2,borderColor:C.info}]}>
        <Text style={[styles.detailText,{color:C.text}]}>{localizedQuestStoryText(language,chosenStory,'story')}</Text>
        {selectedStatus==='claimed'&&storyDiscoveryText(language,chosenStory.id)?<View style={styles.discoveryDetail}>
         <Text style={[styles.eyebrow,{color:C.accent}]}>{p('NEW DISCOVERY')}</Text>
         <Text style={[styles.detailText,{color:C.text}]}>{storyDiscoveryText(language,chosenStory.id)}</Text>
        </View>:null}
       </View>:null}
      </>}
     </View>:null}
     <View style={[styles.detailBlock,{backgroundColor:C.panel,borderColor:C.line}]}>
      <Text style={[styles.eyebrow,{color:C.accent}]}>{p('REWARDS')}</Text>
      {chosenChallenge&&selectedStatus==='ready'&&chosenChallenge.rewardOptions.length>1?<View style={{gap:8}}>
       <Text style={[styles.eyebrow,{color:C.accent}]}>{p('CHOOSE ONE REWARD')}</Text>
       {chosenChallenge.rewardOptions.map(choice=>{
        const active=choice.id===chosenReward?.id;
        const name=choice.rewardItemId?p(itemDef(choice.rewardItemId).name):choice.rewardBondstones?p('Bondstones'):p('Companion Essence');
        const amount=choice.rewardItemQty??choice.rewardBondstones??choice.rewardCompanionEssence??0;
        return <Pressable key={choice.id} accessibilityRole="radio" accessibilityState={{checked:active}} accessibilityLabel={amount+' '+name}
         onPress={()=>setRewardChoiceByQuest(previous=>({...previous,[chosenChallenge.id]:choice.id}))}
         style={{minHeight:44,borderRadius:9,borderWidth:1,borderColor:active?C.accent:C.line,backgroundColor:active?C.panel2:C.panelRaised,padding:10,justifyContent:'center'}}>
         <Text style={[styles.detailText,{color:active?C.accent:C.text,fontWeight:active?'800':'600'}]}>{active?'✓ ':''}{amount}× {name}</Text>
        </Pressable>;
       })}
      </View>:null}
      {chosenOrder?<><Text style={[styles.detailText,{color:C.text}]}>{weeklyOrderReward(language,chosenOrder)}</Text><Text style={[styles.footnote,{color:C.muted}]}>{p('Rewards process automatically once the server confirms completion; no claim button is needed.')}</Text></>:selectedRewards?<QuestReward gold={selectedRewards.gold} xp={'xp' in selectedRewards?selectedRewards.xp:undefined} itemId={selectedRewards.itemId} quantity={selectedRewards.quantity} titleName={'titleName' in selectedRewards?selectedRewards.titleName:undefined} essence={selectedRewards.essence} bondstones={selectedRewards.bondstones} rarityColor={'color' in selectedRewards?selectedRewards.color:undefined} label={p('Reward preview')}/>:null}
     </View>
     {selectedStatus==='claimed'?<Text style={[styles.footnote,{color:C.good}]}>{p('✓ Reward already collected')}</Text>:null}
     {selectedStatus==='processing'?<Text style={[styles.footnote,{color:C.good}]}>{p('✓ Objective complete · reward processing automatically')}</Text>:null}
     {chosenOrder&&selectedStatus==='active'?<Text style={[styles.footnote,{color:C.info}]}>{weeklyOrderDestinationLabel(language,chosenOrder,'detail')}</Text>:null}
    </>}
   </ScrollView>
   <View style={[styles.sheetFooter,{borderColor:C.line}]}>
    {sheetStage==='success'?<GameButton title={p('Continue')} onPress={closeSheet}/>:sheetStage==='claiming'?<GameButton title={p('Waiting for server confirmation…')} loading disabled onPress={()=>{}}/>:hasClaim?<GameButton title={p('Claim rewards')} onPress={submitClaim}/>:chosenStory&&selectedStatus==='active'?<GameButton title={localizedQuestDestinationText(language,chosenStory,'label')} onPress={()=>{const target=questDestination(chosenStory);closeSheet();onNavigate(target)}}/>:chosenOrder&&selectedStatus==='active'?<>
     <GameButton title={weeklyOrderDestinationLabel(language,chosenOrder,'button')} onPress={()=>{closeSheet();onOpenWeeklyOrder(chosenOrder)}}/>
     {chosenQueueable?<View style={styles.actionPair}>
      <View style={styles.flex}><GameButton compact tone="secondary" title={queueFull?p('Queue full'):p('Queue')} disabled={queueFull} onPress={()=>{onQueueWeeklyOrder(chosenOrder);closeSheet()}}/></View>
      <View style={styles.flex}><GameButton compact tone="secondary" selected={stopActive} title={stopActive?p('Stop ✓'):p('Stop at done')} onPress={()=>{onStopWeeklyOrder(chosenOrder);closeSheet()}}/></View>
     </View>:null}
    </>:<GameButton title={p('Close')} tone="secondary" onPress={closeSheet}/>}
   </View>
  </GameModalSurface>
 </View>;
}
const styles=StyleSheet.create({
 screen:{flex:1},root:{paddingHorizontal:spacing.md,paddingTop:spacing.sm,paddingBottom:spacing.xl,gap:spacing.sm},
 heading:{gap:3,paddingVertical:spacing.sm},headTitle:{fontSize:25,lineHeight:30,fontWeight:'900',letterSpacing:-.6},subtitle:{fontSize:12,lineHeight:18},
 eyebrow:{fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:.6},mini:{fontSize:11,lineHeight:16,fontWeight:'700'},
 hero:{padding:spacing.md,gap:spacing.sm,borderWidth:1,borderRadius:12},heroTitle:{fontSize:16,lineHeight:21,fontWeight:'900'},
 featured:{padding:spacing.md,gap:spacing.sm,borderWidth:1,borderRadius:12},featuredTitle:{fontSize:16,lineHeight:22,fontWeight:'900'},
 rowMeta:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,minWidth:0},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:spacing.sm},
 sectionTitle:{fontSize:11,lineHeight:15,fontWeight:'900',letterSpacing:.7},progressTrack:{height:5,width:'100%',borderRadius:99,overflow:'hidden'},progressFill:{height:'100%',borderRadius:99},
 rail:{flexDirection:'row',gap:6,paddingVertical:2,paddingRight:spacing.md},railChip:{minHeight:touchTargetMin,paddingHorizontal:14,justifyContent:'center',borderWidth:1,borderRadius:9},railText:{fontSize:12,lineHeight:16,fontWeight:'700'},
 questRow:{minHeight:76,paddingHorizontal:10,paddingVertical:10,gap:9,borderWidth:1,borderRadius:10,flexDirection:'row',alignItems:'center'},
 iconBox:{width:46,height:46,borderWidth:1,borderRadius:9,justifyContent:'center',alignItems:'center',overflow:'hidden'},
 rowBody:{flex:1,minWidth:0,gap:4},rowTitle:{fontSize:14,lineHeight:19,fontWeight:'800'},rowSubtitle:{fontSize:11,lineHeight:16,fontWeight:'600'},
 rewardHint:{fontSize:11,lineHeight:15,fontWeight:'700'},chevron:{fontSize:23,lineHeight:28,fontWeight:'600',alignSelf:'center'},
 locked:{opacity:.72},pressed:{opacity:.8},flex:{flex:1,minWidth:0},orderZone:{width:40,height:40,overflow:'hidden',alignItems:'center',justifyContent:'center'},
 boardCount:{flexDirection:'row',gap:14,alignItems:'center'},bigNumber:{fontSize:32,lineHeight:38,fontWeight:'900',minWidth:62},counterTotal:{fontSize:16,fontWeight:'700'},
 openHint:{fontSize:11,lineHeight:16,fontWeight:'800'},footnote:{fontSize:11,lineHeight:17,fontWeight:'600'},
 statRow:{flexDirection:'row',gap:6},stat:{flex:1,minHeight:67,borderWidth:1,borderRadius:8,alignItems:'center',justifyContent:'center',gap:3},
 statNumber:{fontSize:22,lineHeight:27,fontWeight:'900'},challengeGroup:{gap:spacing.sm},
 empty:{gap:spacing.sm,paddingVertical:spacing.md},moment:{padding:spacing.md,borderRadius:12,borderWidth:1,gap:spacing.sm},
 sheetSurface:{paddingHorizontal:spacing.md},sheetScroll:{flexShrink:1,minHeight:0},sheetContent:{gap:spacing.md,paddingVertical:spacing.sm,paddingBottom:spacing.md},
 detailIdentity:{padding:spacing.sm,borderWidth:1,borderRadius:10,flexDirection:'row',gap:12,alignItems:'center'},
 detailArt:{width:54,height:54,borderWidth:1,borderRadius:9,justifyContent:'center',alignItems:'center'},
 detailBlock:{padding:spacing.md,borderWidth:1,borderRadius:10,gap:spacing.sm},
 detailText:{fontSize:13,lineHeight:19},storyDisclosure:{gap:8},disclosure:{minHeight:touchTargetMin,borderBottomWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:spacing.sm},
 storyText:{padding:spacing.md,borderLeftWidth:3,borderRadius:8,gap:8},discoveryDetail:{gap:6,paddingTop:8,borderTopWidth:1,borderTopColor:'#46515b'},
 chronicleCard:{padding:spacing.md,borderWidth:1,borderRadius:12,gap:8},
 chronicleToggle:{minHeight:touchTargetMin,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderRadius:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 chronicleSections:{gap:12,paddingTop:3},chronicleSection:{gap:8},chroniclePage:{borderWidth:1,borderRadius:9,padding:10,gap:6},
 sheetFooter:{borderTopWidth:1,paddingTop:spacing.sm,paddingBottom:spacing.sm,gap:8},
 actionPair:{flexDirection:'row',gap:8},success:{padding:spacing.md,borderWidth:1,borderRadius:12,gap:spacing.md},
 successMark:{textAlign:'center',fontSize:29,lineHeight:35,fontWeight:'900'},
});

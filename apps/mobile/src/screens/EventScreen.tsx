import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,ImageBackground,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameCommand} from '../core/game-commands';
import type {GameState} from '../core/types';
import {playerFacingGameplayError} from '../core/feature-unlocks';
import {ActionFeedback,type FeedbackTone} from '../components/ActionFeedback';
import {AnnualEventCalendarPanel} from '../components/AnnualEventCalendarPanel';
import {GameButton} from '../components/GameButton';
import {BoardTabs} from '../components/BoardTabs';
import {EventShopCatalogue} from '../components/EventShopCatalogue';
import {EventActivityBoard} from '../components/EventActivityBoard';
import {Panel} from '../components/Panel';
import {claimAllEventMilestones,claimEventCommunityMilestone,claimEventDailyGift,claimEventDiscovery,claimEventRepeatCache,claimEventReward,claimEventWeeklyObjective,consumeEventCandy,eventCurrencyBalance,eventCurrencyBonusBps,eventDailyGift,eventLifecycle,eventPrestigeBalance,eventReadyClaimCount,eventShopOffers,purchaseEventOffer} from '../core/live-events';
import {onlineConfigured} from '../online/supabase';
import {fetchActiveEventRuntime} from '../online/live-events';
import type {EventCandyKind,LiveEventDef} from '../content/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {GameThemeScope,useGameTheme} from '../theme/ThemeContext';
import {eventTheme} from '../theme/event-palette';
import {radii,spacing,typography} from '../theme/theme';
import {EventRewardTrail} from '../components/EventRewardTrail';
import {EventOverview} from '../components/EventOverview';
import {eventRewardText} from '../i18n/event-rewards';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {guildPveBoard} from '../online/social';
import type {GuildPveEncounter} from '../core/guild-pve-encounters';
import type {EventActivitySource} from '../content/live-events';
import {EventAdditionalRewards} from '../components/EventAdditionalRewards';

type Props={state:GameState;onChange:(state:GameState)=>void|Promise<unknown>;onCommand?:(command:GameCommand)=>Promise<boolean>;onOpenSeasonalExpedition?:(liveEventId:string)=>void;onOpenGuildEventBoss?:()=>void;onOpenEventActivity?:(source:Exclude<EventActivitySource,'boss'>)=>void;authoritativeGuildPve?:boolean};
type Tab='Overview'|'Activities'|'Shop'|'Rewards';
function CurrencyBalance({amount,name,source}:{amount:number;name:string;source?:number}){
 return <View style={s.balanceEntry}>{source?<Image source={source} resizeMode="contain" style={s.currencyIcon}/>:null}<Text style={[s.balanceText,{color:useGameTheme().text}]}>{amount.toLocaleString()} {name}</Text></View>;
}
function EventHero({definition,endsAtMs,compact=false,section}:{definition:LiveEventDef;endsAtMs:number;compact?:boolean;section?:Tab}){
 const C=useGameTheme(),language=useGameLanguage(),visuals=liveEventVisuals(definition.visualKey),remaining=Math.max(0,Math.ceil((endsAtMs-Date.now())/36e5));
 return <ImageBackground source={visuals.showcaseBackground??visuals.heroBackground} imageStyle={s.heroImage} style={[s.hero,compact&&s.heroCompact]}><View style={s.heroShade}/><View style={[s.heroContent,compact&&s.heroContentCompact]}><Text style={[s.kicker,{color:C.accent}]}>{section&&section!=='Overview'?section==='Shop'?'EVENT SHOP':section==='Activities'?'WEEKLY ACTIVITIES':'REWARD TRAIL':definition.signature.label}</Text><Text style={[s.heroTitle,compact&&s.heroTitleCompact]}>{definition.name}</Text>{compact?null:<Text style={s.heroCopy}>{definition.summary}</Text>}<Text style={s.heroTime}>{remaining>0?remaining>=24?`${Math.floor(remaining/24)}d${remaining%24?` ${remaining%24}h`:''} remaining`:`${remaining}h remaining`:eventRewardText(language,'Claim window')}</Text></View></ImageBackground>;
}
export function EventScreen(props:Props){
 const base=useGameTheme(),[now,setNow]=useState(Date.now());
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30_000);return()=>clearInterval(id);},[]);
 const event=eventLifecycle(props.state,now),colors=useMemo(()=>eventTheme(base,event?.definition),[base,event?.definition.accent,event?.definition.visualKey]);
 return <GameThemeScope colors={colors}><EventContent {...props} now={now}/></GameThemeScope>;
}
function EventContent({state,onChange,onCommand,onOpenSeasonalExpedition,onOpenGuildEventBoss,onOpenEventActivity,authoritativeGuildPve=false,now}:Props&{now:number}){
 const language=useGameLanguage();
 const C=useGameTheme(),[tab,setTab]=useState<Tab>('Overview'),[notice,setNotice]=useState(''),[pendingAction,setPendingAction]=useState<string|null>(null),[tone,setTone]=useState<FeedbackTone>('success'),[guildBoss,setGuildBoss]=useState<GuildPveEncounter|null>(),[guildBossLoading,setGuildBossLoading]=useState(false),[guildBossError,setGuildBossError]=useState(false),busy=useRef(false);
 const event=eventLifecycle(state,now);
 useEffect(()=>{if(onCommand||!onlineConfigured)return;let live=true;void fetchActiveEventRuntime().then(runtime=>{if(live&&JSON.stringify(runtime)!==JSON.stringify(state.account.liveEvent))onChange({...state,account:{...state.account,liveEvent:runtime}});}).catch(()=>undefined);return()=>{live=false;};},[onCommand,onChange,state]);
 useEffect(()=>{
  if(!authoritativeGuildPve||tab!=='Overview'||event?.phase!=='active'||!event.definition.objectives.some(row=>row.source==='boss')){setGuildBoss(undefined);setGuildBossLoading(false);setGuildBossError(false);return;}
  let live=true;setGuildBossLoading(true);setGuildBossError(false);
  void guildPveBoard().then(rows=>{if(live)setGuildBoss(rows.find(row=>row.kind==='event'&&row.eventId===event.definition.id)??null)}).catch(()=>{if(live){setGuildBoss(null);setGuildBossError(true)}}).finally(()=>{if(live)setGuildBossLoading(false)});
  return()=>{live=false};
 },[authoritativeGuildPve,event?.definition.id,event?.phase,tab]);
 const act=async(message:string,local:()=>GameState,command:GameCommand,pendingId:string=command.type)=>{if(busy.current)return;busy.current=true;setPendingAction(pendingId);setNotice('');try{if(onCommand){if(!await onCommand(command))throw new Error(command.type==='event_reward'?eventRewardText(language,'Reward could not be confirmed. Please retry.'):'Action could not be confirmed. Please retry.');}else await onChange(local());setTone('success');setNotice(message);}catch(error){setTone('error');setNotice(playerFacingGameplayError(error instanceof Error?error.message:'Action could not be completed.'));}finally{busy.current=false;setPendingAction(null);}};
 if(!event)return <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><Text style={[s.heading,{color:C.text}]}>Events</Text><Text style={[s.muted,{color:C.muted}]}>No event is active right now.</Text><AnnualEventCalendarPanel state={state}/></ScrollView>;
 if(event.phase==='upcoming')return <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><EventHero definition={event.definition} endsAtMs={event.runtime.startsAtMs}/><Panel><Text style={[s.heading,{color:C.text}]}>Coming soon</Text><Text style={[s.muted,{color:C.muted}]}>This event opens when its live window begins.</Text></Panel><AnnualEventCalendarPanel state={state} highlightEventId={event.definition.id}/></ScrollView>;
 const definition=event.definition,currency=eventCurrencyBalance(state,definition.id),prestige=eventPrestigeBalance(state,definition.id),daily=eventDailyGift(state,now),offers=eventShopOffers(state,now),readyClaims=eventReadyClaimCount(state,now);
 const visuals=liveEventVisuals(definition.visualKey);
 const currencyBonus=eventCurrencyBonusBps(state,definition.id,now);
 return <><ScrollView contentContainerStyle={[s.page,tab!=='Overview'&&s.compactPage]} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><EventHero definition={definition} endsAtMs={event.runtime.endsAtMs} compact={tab!=='Overview'} section={tab}/><View style={[s.balance,{backgroundColor:C.accentSurface}]}><CurrencyBalance amount={currency} name={definition.currencyName} source={visuals.commonCurrencyIcon}/><CurrencyBalance amount={prestige} name={definition.prestigeCurrencyName} source={visuals.prestigeCurrencyIcon}/></View><BoardTabs label="Event sections" items={(['Overview','Activities','Shop','Rewards'] as Tab[]).map(id=>({id,label:id==='Rewards'&&readyClaims?`Rewards (${readyClaims})`:id}))} value={tab} onChange={setTab}/>{notice?<ActionFeedback tone={tone} message={notice}/>:null}
 {currencyBonus>0?<Panel accentColor={C.good} accentSurface={C.goodSurface}><Text style={{color:C.good,fontWeight:'800',fontSize:15}}>{eventRewardText(language,'+{percent}% {currency}',{percent:currencyBonus/100,currency:definition.currencyName})}</Text><Text style={{color:C.text,fontSize:12,lineHeight:18}}>{eventRewardText(language,'Event currency bonus details')}</Text></Panel>:null}
 {tab==='Overview'&&<EventOverview state={state} now={now} guildBoss={guildBoss} guildBossLoading={guildBossLoading} guildBossError={guildBossError} guildBossChecked={authoritativeGuildPve&&guildBoss!==undefined} dailyDay={daily?.eventDay} dailyReward={daily?.gift.rewardCurrency} dailyClaimed={daily?.claimed} dailyPending={pendingAction==='event_daily'} onClaimDaily={()=>act('Festival gift claimed.',()=>claimEventDailyGift(state,now),{type:'event_daily'})} candyPendingKind={pendingAction?.startsWith('event_candy:')?pendingAction.slice('event_candy:'.length) as EventCandyKind:undefined} onUseCandy={(kind,companionId)=>act('Event candy used.',()=>consumeEventCandy(state,now,kind,companionId),{type:'event_candy',args:{kind,...(companionId?{companionId}:{})}},`event_candy:${kind}`)} onOpenActivity={onOpenEventActivity} onOpenActivities={()=>setTab('Activities')} onOpenRewards={()=>setTab('Rewards')} onOpenSeasonalExpedition={onOpenSeasonalExpedition} onOpenGuildEventBoss={onOpenGuildEventBoss}/>}
 {tab==='Activities'&&<EventActivityBoard state={state} now={now} currencyName={definition.currencyName} prestigeName={definition.prestigeCurrencyName} busy={pendingAction!==null} pendingId={pendingAction} onClaim={id=>act('Weekly activity reward claimed.',()=>claimEventWeeklyObjective(state,id,now),{type:'event_weekly',args:{id}},id)} onOpen={onOpenEventActivity} onBoss={onOpenGuildEventBoss}/>}
 {tab==='Shop'&&<EventShopCatalogue key={definition.id} state={state} definition={definition} offers={offers} currency={currency} prestige={prestige} busy={pendingAction!==null} pendingId={pendingAction} onBuy={offer=>act(offer.reward.name+' purchased.',()=>purchaseEventOffer(state,offer.id,now),{type:'event_purchase',args:{id:offer.id}},offer.id)}/>}
 {tab==='Rewards'&&<><EventAdditionalRewards state={state} now={now} busy={pendingAction!==null} pendingId={pendingAction} onClaimDiscovery={id=>act('Discovery reward claimed.',()=>claimEventDiscovery(state,id,now),{type:'event_discovery',args:{id}},`discovery:${id}`)} onClaimCache={()=>act('All bonus caches claimed.',()=>claimEventRepeatCache(state,now),{type:'event_cache'},'cache')} onClaimCommunity={percent=>act('Community reward claimed.',()=>claimEventCommunityMilestone(state,percent,now),{type:'event_community',args:{percent}},`community:${percent}`)}/><EventRewardTrail state={state} now={now} busy={pendingAction!==null} pendingRewardId={pendingAction} onClaimAll={()=>act('All milestone rewards claimed.',()=>claimAllEventMilestones(state,now),{type:'event_milestones'},'milestones')} onClaim={id=>{const reward=definition.milestones(state.character!.classId).find(entry=>entry.reward.id===id)?.reward;return act(eventRewardText(language,'{reward} claimed.',{reward:reward?.name??id}),()=>claimEventReward(state,id,now),{type:'event_reward',args:{id}},id)}}/></>}
 </ScrollView></>;
}
const s=StyleSheet.create({
 page:{padding:spacing.md,gap:spacing.md,paddingBottom:48},compactPage:{gap:10},heroCompact:{minHeight:92},heroContentCompact:{padding:12,gap:2},heroTitleCompact:{fontSize:23,lineHeight:29},hero:{minHeight:185,borderRadius:radii.md,overflow:'hidden',justifyContent:'flex-end'},heroImage:{opacity:.78,width:'100%',height:'100%'},heroShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(10,7,20,.58)'},heroContent:{padding:spacing.lg,gap:5},kicker:{fontSize:11,lineHeight:16,fontWeight:'700',letterSpacing:1},heroTitle:{color:'#fff',fontSize:28,lineHeight:34,fontWeight:'700'},heroCopy:{color:'#f1ecff',fontSize:13,lineHeight:19},heroTime:{color:'#fff',fontSize:12,lineHeight:17,fontWeight:'600',marginTop:3},heading:{...typography.title},muted:{...typography.body},balance:{flexDirection:'row',justifyContent:'space-between',gap:8,borderRadius:radii.sm,paddingVertical:9,paddingHorizontal:6},balanceEntry:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},currencyIcon:{width:24,height:24},balanceText:{fontSize:12,lineHeight:17,fontWeight:'600',textAlign:'center',flexShrink:1}
});

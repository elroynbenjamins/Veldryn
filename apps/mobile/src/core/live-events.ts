import {liveEventDef,eventCandy,eventCandies,eventDailyFestivalBlessing as defineDailyFestivalBlessing,type EventActivitySource,type EventCandyKind,type EventMilestone,type EventObjectiveDef,type EventReward} from '../content/live-events';
import {random01} from './rng';
import type {GameState,LiveEventRuntime,RewardBundle} from './types';
import {unlockCombatCompanion} from './combat-companions';
import {awardCompanionCandyXp} from './companion-runtime';

export type EventPhase='upcoming'|'active'|'claiming';
export function eventLifecycle(state:GameState,nowMs=Date.now()){const runtime=state.account.liveEvent;if(!runtime?.enabled)return null;const definition=liveEventDef(runtime.eventId);if(!definition)return null;const claimEndsAtMs=runtime.graceEndsAtMs??runtime.endsAtMs+definition.claimGraceDays*86400_000;if(nowMs<runtime.startsAtMs)return {runtime,definition,phase:'upcoming' as const,claimEndsAtMs};if(nowMs<runtime.endsAtMs)return {runtime,definition,phase:'active' as const,claimEndsAtMs};if(nowMs<claimEndsAtMs)return {runtime,definition,phase:'claiming' as const,claimEndsAtMs};return null;}
export function activeLiveEvent(state:GameState,nowMs=Date.now()){const event=eventLifecycle(state,nowMs);return event?.phase==='active'?event:null;}
export function claimableLiveEvent(state:GameState,nowMs=Date.now()){const event=eventLifecycle(state,nowMs);return event?.phase==='active'||event?.phase==='claiming'?event:null;}
function eventBoardTime(state:GameState,nowMs:number){const event=eventLifecycle(state,nowMs);return event?.phase==='claiming'?event.runtime.endsAtMs-1:nowMs;}
export function eventProgress(state:GameState,eventId:string){return Math.max(0,Math.floor(state.account.eventProgressById?.[eventId]??0));}
export function eventCurrencyBalance(state:GameState,eventId:string){return Math.max(0,Math.floor(state.account.eventCurrencyBalanceById?.[eventId]??0));}
export function eventPrestigeBalance(state:GameState,eventId:string){return Math.max(0,Math.floor(state.account.eventPrestigeBalanceById?.[eventId]??0));}
export const EVENT_COMMUNITY_MIN_CONTRIBUTION=100;
/** Prestige is reserved for optional/high-difficulty event work. */
export function eventPrestigeReward(source:EventActivitySource,reward:number){return source==='boss'?Math.max(0,Math.floor(reward)):0;}
/** The earned interval is retained after expiry so offline settlement can split it. */
export function eventCandyWindow(state:GameState,kind:EventCandyKind='skill'){
 const runtime=state.account.liveEvent,definition=runtime?.enabled?liveEventDef(runtime.eventId):undefined;
 const candy=definition?eventCandies(definition).find(entry=>entry.kind===kind):undefined;
 const raw=state.character?.activeEventCandies?.[kind]??(kind==='skill'?state.character?.activeEventCandy:undefined);
 if(!runtime||!definition||!candy||!raw||raw.eventId!==definition.id||raw.itemId!==candy.id||!Number.isFinite(raw.remainingSeconds)||!Number.isFinite(raw.lastUpdatedAtMs))return undefined;
 const startsAtMs=Math.max(runtime.startsAtMs,raw.lastUpdatedAtMs),endsAtMs=Math.min(runtime.endsAtMs,raw.lastUpdatedAtMs+Math.max(0,Math.min(candy.maxSeconds,raw.remainingSeconds))*1000);
 return endsAtMs>startsAtMs?{startsAtMs,endsAtMs,candy}:undefined;
}
export function eventCandyStatus(state:GameState,nowMs=Date.now(),kind:EventCandyKind='skill'){
 const window=eventCandyWindow(state,kind),remaining=window&&nowMs>=window.startsAtMs?Math.max(0,(window.endsAtMs-nowMs)/1000):0;
 const active=activeLiveEvent(state,nowMs),candy=window?.candy??(active?eventCandies(active.definition).find(row=>row.kind===kind):undefined);
 return {active:remaining>0,remainingSeconds:remaining,candy};
}
export function eventCandyUtilityMultiplier(state:GameState,nowMs=Date.now(),kind:EventCandyKind='skill'){return eventCandyStatus(state,nowMs,kind).active?1.1:1;}
export function consumeEventCandy(state:GameState,nowMs=Date.now(),kind:EventCandyKind='skill'):GameState{
  const active=activeLiveEvent(state,nowMs);if(!active||!state.character)throw new Error('This event is not active.');
  const candy=eventCandies(active.definition).find(entry=>entry.kind===kind);if(!candy)throw new Error('Unknown event candy.');
  const charges=state.account.eventCandyChargesById?.[candy.id]??0;if(charges<1)throw new Error('Earn candy from festival gifts or the event guild boss first.');
  state={...state,account:{...state.account,eventCandyChargesById:{...(state.account.eventCandyChargesById??{}),[candy.id]:charges-1}}};
  if(!state.character)throw new Error('Character required.');
  if(kind==='companion'){
    const equipped=state.character.equippedCombatCompanionId;if(!equipped)throw new Error('Equip a combat companion first.');
    const materialKey=`${active.definition.id}:candy:companion_material`,materialUses=state.account.eventShopPurchaseCounts?.[materialKey]??0;
    if(materialUses>=5)throw new Error('This event candy has reached its five-material cap. Companion XP remains available from normal companion activities.');
    const awarded=awardCompanionCandyXp(state,equipped,75,nowMs),materials={...(awarded.account.companionMaterials??{})};materials.EVENT_BONDBLOOM=(materials.EVENT_BONDBLOOM??0)+1;
    return {...awarded,account:{...awarded.account,companionMaterials:materials,eventShopPurchaseCounts:{...(awarded.account.eventShopPurchaseCounts??{}),[materialKey]:materialUses+1}}};
  }
  const current=eventCandyStatus(state,nowMs,kind);if(current.active&&current.remainingSeconds>=candy.maxSeconds)throw new Error('Event candy duration is already full.');
  const next=Math.min(candy.maxSeconds,current.remainingSeconds+candy.secondsPerUse);
  const timers={...(state.character.activeEventCandies??{}),[kind]:{eventId:active.definition.id,itemId:candy.id,remainingSeconds:next,lastUpdatedAtMs:nowMs}};
  return {...state,character:{...state.character,activeEventCandies:timers,...(kind==='skill'?{activeEventCandy:timers.skill}: {})}};
}
export function eventMilestones(state:GameState,nowMs=Date.now()):EventMilestone[]{const event=claimableLiveEvent(state,nowMs);return event&&state.character?event.definition.milestones(state.character.classId):[];}
export function eventRewardClaimed(state:GameState,eventId:string,rewardId:string){return (state.account.eventRewardClaimIds??[]).includes(`${eventId}:${rewardId}`);}

export function eventProjectChoice(state:GameState,eventId:string){const event=liveEventDef(eventId),choiceId=state.account.eventChoiceById?.[eventId];return event?.choices.find(choice=>choice.id===choiceId);}
export function eventDailyFestivalBlessing(state:GameState,nowMs=Date.now()){const event=activeLiveEvent(state,nowMs);if(!event)return undefined;const startDay=Date.parse(new Date(event.runtime.startsAtMs).toISOString().slice(0,10)+'T00:00:00.000Z'),today=Date.parse(utcDayKey(nowMs)+'T00:00:00.000Z'),eventDay=Math.max(1,Math.floor((today-startDay)/86400_000)+1);return defineDailyFestivalBlessing(event.definition,eventDay);}
export function eventEffectiveDropRate(state:GameState,eventId:string,source:EventActivitySource,nowMs=Date.now()){const event=liveEventDef(eventId);if(!event)return 0;const blessing=eventDailyFestivalBlessing(state,nowMs),blessingMultiplier=blessing?.source===source?1+blessing.bonusBps/10000:1;return event.dropRates[source]*(eventProjectChoice(state,eventId)?.dropMultipliers?.[source]??1)*blessingMultiplier;}
export function eventContributionValue(state:GameState,eventId:string,spent:number){const multiplier=eventProjectChoice(state,eventId)?.contributionMultiplier??1;return Math.max(0,Math.floor(spent*multiplier));}
function eventDropQuantity(state:GameState,source:EventActivitySource,units:number,nowMs:number){const event=activeLiveEvent(state,nowMs);if(!event||units<=0)return 0;const expected=units*eventEffectiveDropRate(state,event.definition.id,source,nowMs),whole=Math.floor(expected),fraction=expected-whole;return whole+(random01(`${state.character?.id}:${event.definition.id}:${source}:${nowMs}`,0)<fraction?1:0);}
/** Credit completed units at their earned time, including when returning after an event ends.
 * Group by UTC day so blessings and daily/weekly meters use the earning period. */
export function timedEventRewards(state:GameState,source:EventActivitySource,completedAtMs:readonly number[]):Pick<RewardBundle,'eventDrops'|'eventDiscoveries'>{
 const runtime=state.account.liveEvent;
 if(!runtime?.enabled||!liveEventDef(runtime.eventId))return {eventDrops:[],eventDiscoveries:[]};
 const days=new Map<string,{units:number;at:number}>();
 for(const at of completedAtMs){
  if(!Number.isFinite(at)||at<runtime.startsAtMs||at>=runtime.endsAtMs)continue;
  const key=utcDayKey(at),prior=days.get(key);days.set(key,{units:(prior?.units??0)+1,at:Math.max(prior?.at??at,at)});
 }
 const definition=liveEventDef(runtime.eventId)!,eventDrops:NonNullable<RewardBundle['eventDrops']>=[],discoveries=new Map<string,NonNullable<RewardBundle['eventDiscoveries']>[number]>();
 for(const {units,at} of days.values()){
  eventDrops.push({eventId:definition.id,currencyId:definition.currencyId,name:definition.currencyName,quantity:eventDropQuantity(state,source,units,at),source,units,recordedAtMs:at});
  for(const find of activityEventDiscoveries(state,source,units,at)){const prior=discoveries.get(find.discoveryId);discoveries.set(find.discoveryId,{...find,quantity:(prior?.quantity??0)+find.quantity});}
 }
 return {eventDrops,eventDiscoveries:[...discoveries.values()]};
}
export function gatheringEventRewards(state:GameState,elapsedSeconds:number):Pick<RewardBundle,'eventDrops'|'eventDiscoveries'>{
 const activity=state.activity,runtime=state.account.liveEvent;
 if(!activity||!runtime?.enabled)return {eventDrops:[],eventDiscoveries:[]};
 // Minute ticks are anchored to eligible activity start, so repeated short claims
 // preserve progress and time before the event starts cannot earn currency.
 const anchor=Math.max(activity.startedAtMs,runtime.startsAtMs),end=activity.lastClaimAtMs+elapsedSeconds*1000;
 const first=Math.max(1,Math.floor((activity.lastClaimAtMs-anchor)/60000)+1),last=Math.floor((Math.min(end,runtime.endsAtMs)-anchor)/60000);
 const times=Array.from({length:Math.max(0,last-first+1)},(_,index)=>anchor+(first+index)*60000-1);
 return timedEventRewards(state,'gathering',times);
}
export function activityEventDiscoveries(state:GameState,source:EventActivitySource,units:number,nowMs:number){const event=activeLiveEvent(state,nowMs);if(!event||units<=0)return [];return event.definition.discoveries.filter(discovery=>discovery.source===source).map(discovery=>{const expected=units*discovery.chance,whole=Math.floor(expected),fraction=expected-whole,quantity=whole+(random01(`${state.character?.id}:${event.definition.id}:discovery:${discovery.id}:${nowMs}`,0)<fraction?1:0);return {eventId:event.definition.id,discoveryId:discovery.id,name:discovery.name,quantity};}).filter(entry=>entry.quantity>0);}
export function applyEventDrops(state:GameState,drops:NonNullable<RewardBundle['eventDrops']>):GameState{
  if(!drops.length)return state;
  const progress={...(state.account.eventProgressById??{})},currency={...(state.account.eventCurrencyBalanceById??{})},activity={...(state.account.eventActivityById??{})},periods={...(state.account.eventPeriodActivityById??{})};
  for(const drop of drops){progress[drop.eventId]=(progress[drop.eventId]??0)+drop.quantity;currency[drop.eventId]=(currency[drop.eventId]??0)+drop.quantity;if(drop.source){const units=drop.units??1,prior={...(activity[drop.eventId]??{})};prior[drop.source]=(prior[drop.source]??0)+units;activity[drop.eventId]=prior;for(const key of [`${drop.eventId}:day:${utcDayKey(drop.recordedAtMs??Date.now())}`,`${drop.eventId}:week:${utcWeekKey(drop.recordedAtMs??Date.now())}`]){const bucket={...(periods[key]??{})};bucket[drop.source]=(bucket[drop.source]??0)+units;periods[key]=bucket;}}}
  return {...state,account:{...state.account,eventProgressById:Object.fromEntries(Object.entries(progress).slice(-12)),eventCurrencyBalanceById:Object.fromEntries(Object.entries(currency).slice(-12)),eventActivityById:Object.fromEntries(Object.entries(activity).slice(-12)),eventPeriodActivityById:Object.fromEntries(Object.entries(periods).slice(-90))}};
}
export function applyEventDiscoveries(state:GameState,finds:NonNullable<RewardBundle['eventDiscoveries']>){if(!finds.length)return state;const counts={...(state.account.eventDiscoveryCounts??{})};for(const find of finds){const discovery=liveEventDef(find.eventId)?.discoveries.find(entry=>entry.id===find.discoveryId),key=`${find.eventId}:${find.discoveryId}`;if(discovery)counts[key]=Math.min(discovery.required,(counts[key]??0)+Math.max(0,Math.floor(find.quantity)));}return {...state,account:{...state.account,eventDiscoveryCounts:Object.fromEntries(Object.entries(counts).slice(-120))}};}
export function eventDiscoveryBoard(state:GameState,nowMs=Date.now()){const event=claimableLiveEvent(state,nowMs);if(!event)return [];return event.definition.discoveries.map(discovery=>{const id=`${event.definition.id}:${discovery.id}`,count=Math.max(0,state.account.eventDiscoveryCounts?.[id]??0);return {id,discovery,count,ready:count>=discovery.required,claimed:(state.account.eventDiscoveryClaimIds??[]).includes(id)};});}
export function claimEventDiscovery(state:GameState,discoveryId:string,nowMs=Date.now()){const event=claimableLiveEvent(state,nowMs);if(!event)throw new Error('Event rewards are no longer available.');const entry=eventDiscoveryBoard(state,nowMs).find(item=>item.discovery.id===discoveryId);if(!entry)throw new Error('Unknown folklore discovery.');if(entry.claimed)throw new Error('This discovery reward was already claimed.');if(!entry.ready)throw new Error('Complete this discovery collection first.');const rewarded=addReward(state,entry.discovery.reward,nowMs);return {...rewarded,account:{...rewarded.account,eventDiscoveryClaimIds:[...(rewarded.account.eventDiscoveryClaimIds??[]),entry.id].slice(-120)}};}
export function grantEventActivity(state:GameState,source:'crafting'|'boss',nowMs=Date.now(),units=1){const event=activeLiveEvent(state,nowMs),count=Math.max(0,Math.floor(units));if(!event||count<=0)return state;const quantity=eventDropQuantity(state,source,count,nowMs),withDrops=applyEventDrops(state,[{eventId:event.definition.id,currencyId:event.definition.currencyId,name:event.definition.currencyName,quantity,source,units:count,recordedAtMs:nowMs}]);return applyEventDiscoveries(withDrops,activityEventDiscoveries(state,source,count,nowMs));}

function addReward(state:GameState,reward:EventReward,nowMs=Date.now()):GameState{
  const account={...state.account};
  let character=state.character;
  if(reward.kind==='companion'){
    const alreadyOwned=(state.account.unlockedCombatCompanionIds??[]).includes(reward.id);
    if(alreadyOwned){
      const high=reward.rarity==='mythic'||reward.rarity==='legendary',essence=high?300:180,bondbloom=high?3:2;
      return {...state,account:{...state.account,companionEssence:(state.account.companionEssence??0)+essence,companionMaterials:{...(state.account.companionMaterials??{}),EVENT_BONDBLOOM:(state.account.companionMaterials?.EVENT_BONDBLOOM??0)+bondbloom},longTermMetrics:{...(state.account.longTermMetrics??{}),'companions.event_duplicates_converted':(state.account.longTermMetrics?.['companions.event_duplicates_converted']??0)+1,'companions.event_duplicate_essence':(state.account.longTermMetrics?.['companions.event_duplicate_essence']??0)+essence}}};
    }
    const unlocked=unlockCombatCompanion(state,reward.id,nowMs);
    const materials={...(unlocked.account.companionMaterials??{})};materials.EVENT_BONDBLOOM=(materials.EVENT_BONDBLOOM??0)+(reward.rarity==='mythic'||reward.rarity==='legendary'?8:6);
    return {...unlocked,account:{...unlocked.account,companionMaterials:materials}};
  }
  if(reward.kind==='candy'){
    account.eventCandyChargesById={...(account.eventCandyChargesById??{}),[reward.id]:(account.eventCandyChargesById?.[reward.id]??0)+Math.max(1,Math.floor(reward.quantity??1))};
  }
  else if(reward.kind==='guild_name_color'||reward.kind==='guild_frame'||reward.kind==='guild_banner'){
    account.unlockedGuildCosmeticIds=[...new Set([...(account.unlockedGuildCosmeticIds??[]),reward.id])];
  }
  else if(reward.kind==='profile_icon')account.unlockedProfileIconIds=[...new Set([...(account.unlockedProfileIconIds??[]),reward.id])];
  else if(reward.kind==='pet'){
    account.unlockedCosmeticPetIds=[...new Set([...(account.unlockedCosmeticPetIds??[]),reward.id])];
    if(character){
      character={...character,ownedPetIds:[...new Set([...(character.ownedPetIds??[]),reward.id])]};
    }
  }
  else if(reward.kind==='background')account.unlockedProfileBackgroundIds=[...new Set([...(account.unlockedProfileBackgroundIds??[]),reward.id])];
  else if(reward.kind==='border')account.unlockedProfileBorderIds=[...new Set([...(account.unlockedProfileBorderIds??[]),reward.id])];
  else if(reward.kind==='emote')account.unlockedEmoteIds=[...new Set([...(account.unlockedEmoteIds??[]),reward.id])];
  else account.unlockedTitleIds=[...new Set([...(account.unlockedTitleIds??[]),reward.id])];
  return character===state.character?{...state,account}:{...state,account,character};
}
function grantEventCurrencies(state:GameState,eventId:string,common:number,prestige:number){return {...state,account:{...state.account,eventProgressById:{...(state.account.eventProgressById??{}),[eventId]:eventProgress(state,eventId)+common},eventCurrencyBalanceById:{...(state.account.eventCurrencyBalanceById??{}),[eventId]:eventCurrencyBalance(state,eventId)+common},eventPrestigeBalanceById:{...(state.account.eventPrestigeBalanceById??{}),[eventId]:eventPrestigeBalance(state,eventId)+prestige}}};}
export function eventRewardOwned(state:GameState,reward:EventReward){if(reward.kind==='candy')return (state.account.eventCandyChargesById?.[reward.id]??0)>0;const ids=reward.kind==='companion'?state.account.unlockedCombatCompanionIds:reward.kind==='profile_icon'?state.account.unlockedProfileIconIds:reward.kind==='pet'?state.account.unlockedCosmeticPetIds:reward.kind==='background'?state.account.unlockedProfileBackgroundIds:reward.kind==='border'?state.account.unlockedProfileBorderIds:reward.kind==='emote'?state.account.unlockedEmoteIds:reward.kind==='guild_name_color'||reward.kind==='guild_frame'||reward.kind==='guild_banner'?state.account.unlockedGuildCosmeticIds:state.account.unlockedTitleIds;return ids?.includes(reward.id)??false;}
export function eventCollectionJournal(state:GameState,nowMs=Date.now()){const event=claimableLiveEvent(state,nowMs);if(!event||!state.character)return [];const community=event.definition.communityEnabled===true?event.definition.communityMilestones.filter(entry=>entry.reward).map(entry=>({source:`Community ${entry.percent}%`,reward:entry.reward!})):[];const entries=[...event.definition.milestones(state.character.classId).map(entry=>({source:`${entry.points.toLocaleString()} reputation`,reward:entry.reward})),...event.definition.shop.map(entry=>({source:entry.currency==='common'?'Event Shop':'Prestige Shop',reward:entry.reward})),...community,...event.definition.discoveries.map(entry=>({source:`${entry.name} discovery`,reward:entry.reward}))];return entries.map(entry=>({...entry,owned:eventRewardOwned(state,entry.reward)}));}
export function claimEventReward(state:GameState,rewardId:string,nowMs=Date.now()):GameState{const event=claimableLiveEvent(state,nowMs);if(!event||!state.character)throw new Error('Event rewards are no longer available.');const milestone=event.definition.milestones(state.character.classId).find(entry=>entry.reward.id===rewardId);if(!milestone)throw new Error('Unknown event reward.');if(eventProgress(state,event.definition.id)<milestone.points)throw new Error('This milestone is not complete.');if(eventRewardClaimed(state,event.definition.id,rewardId))throw new Error('This reward was already claimed.');const rewarded=addReward(state,milestone.reward,nowMs),claimId=`${event.definition.id}:${rewardId}`;return {...rewarded,account:{...rewarded.account,eventRewardClaimIds:[...(rewarded.account.eventRewardClaimIds??[]),claimId].slice(-160)}};}
export function claimAllEventMilestones(state:GameState,nowMs=Date.now()):GameState{const event=claimableLiveEvent(state,nowMs);if(!event||!state.character)throw new Error('Event rewards are no longer available.');const available=event.definition.milestones(state.character.classId).filter(entry=>entry.points<=eventProgress(state,event.definition.id)&&!eventRewardClaimed(state,event.definition.id,entry.reward.id));if(!available.length)throw new Error('No milestone rewards are ready.');return available.reduce((next,entry)=>claimEventReward(next,entry.reward.id,nowMs),state);}

export function availableEventRepeatCaches(state:GameState,eventId:string){const event=liveEventDef(eventId);if(!event)return 0;const earned=Math.floor(Math.max(0,eventProgress(state,eventId)-event.maxProgress)/1000),claimed=state.account.eventRepeatCacheClaimsById?.[eventId]??0;return Math.max(0,earned-claimed);}
export function claimEventRepeatCache(state:GameState,nowMs=Date.now()):GameState{const event=claimableLiveEvent(state,nowMs);if(!event)throw new Error('Event rewards are no longer available.');if(!availableEventRepeatCaches(state,event.definition.id))throw new Error('Earn 1,000 reputation beyond the final milestone first.');const id=event.definition.id;return {...state,account:{...state.account,eventPrestigeBalanceById:{...(state.account.eventPrestigeBalanceById??{}),[id]:eventPrestigeBalance(state,id)+1},eventRepeatCacheClaimsById:{...(state.account.eventRepeatCacheClaimsById??{}),[id]:(state.account.eventRepeatCacheClaimsById?.[id]??0)+1}}};}

function utcDayKey(nowMs:number){return new Date(nowMs).toISOString().slice(0,10);}
function utcWeekKey(nowMs:number){const date=new Date(nowMs),daysSinceMonday=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-daysSinceMonday);return date.toISOString().slice(0,10);}
function nextUtcDayMs(nowMs:number){const date=new Date(nowMs);return Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()+1);}
export function eventDailyGift(state:GameState,nowMs=Date.now()){const event=activeLiveEvent(state,nowMs);if(!event)return null;const startDay=Date.parse(new Date(event.runtime.startsAtMs).toISOString().slice(0,10)+'T00:00:00.000Z'),today=Date.parse(utcDayKey(nowMs)+'T00:00:00.000Z'),eventDay=Math.max(1,Math.floor((today-startDay)/86400_000)+1),giftDay=(eventDay-1)%event.definition.dailyGifts.length+1,gift=event.definition.dailyGifts.find(entry=>entry.day===giftDay)!;const id=`${event.definition.id}:${utcDayKey(nowMs)}`;return {id,eventDay,giftDay,gift,claimed:(state.account.eventDailyGiftClaimIds??[]).includes(id),nextAtMs:nextUtcDayMs(nowMs)};}
export function claimEventDailyGift(state:GameState,nowMs=Date.now()){const event=activeLiveEvent(state,nowMs),status=eventDailyGift(state,nowMs);if(!event||!status)throw new Error('This event is not active.');if(status.claimed)throw new Error("Today's festival gift was already claimed.");const rewarded=grantEventCurrencies(state,event.definition.id,status.gift.rewardCurrency,status.gift.rewardPrestige);return {...rewarded,account:{...rewarded.account,eventCandyChargesById:{...(rewarded.account.eventCandyChargesById??{}),...Object.fromEntries(eventCandies(event.definition).map(candy=>[candy.id,(rewarded.account.eventCandyChargesById?.[candy.id]??0)+1]))},eventDailyGiftClaimIds:[...(rewarded.account.eventDailyGiftClaimIds??[]),status.id].slice(-180)}};}
function contractId(eventId:string,objectiveId:string,nowMs:number){return `${eventId}:${utcDayKey(nowMs)}:${objectiveId}`;}
export function eventContractBoard(state:GameState,nowMs=Date.now()){
  const event=claimableLiveEvent(state,nowMs);if(!event)return [];const boardTime=eventBoardTime(state,nowMs);
  const seed=[...`${event.definition.id}:${utcDayKey(boardTime)}`].reduce((sum,char)=>sum+char.charCodeAt(0),0),pool:EventObjectiveDef[]=event.definition.objectives,offset=seed%pool.length;
  const selected:EventObjectiveDef[]=Array.from({length:Math.min(3,pool.length)}).map((_,index)=>pool[(offset+index)%pool.length]);
  return selected.map((objective:EventObjectiveDef)=>{const id=contractId(event.definition.id,objective.id,boardTime),accepted=(state.account.eventAcceptedContractIds??[]).includes(id),claimed=(state.account.eventObjectiveClaimIds??[]).includes(id),total=Math.max(0,Math.floor(state.account.eventActivityById?.[event.definition.id]?.[objective.source]??0)),baseline=state.account.eventContractBaselines?.[id]??total;return {id,objective:{...objective,rewardPrestige:eventPrestigeReward(objective.source,objective.rewardPrestige)},accepted,claimed,progress:accepted?Math.max(0,total-baseline):0};});
}
export function acceptEventContract(state:GameState,objectiveId:string,nowMs=Date.now()):GameState{
  const event=activeLiveEvent(state,nowMs);if(!event)throw new Error('This event is not active.');const board=eventContractBoard(state,nowMs),contract=board.find(entry=>entry.objective.id===objectiveId);if(!contract)throw new Error('This contract is not offered today.');if(contract.accepted)return state;
  const acceptedToday=board.filter(entry=>entry.accepted).length;if(acceptedToday>=2)throw new Error('You may accept two event contracts per day.');const total=Math.max(0,Math.floor(state.account.eventActivityById?.[event.definition.id]?.[contract.objective.source]??0));
  return {...state,account:{...state.account,eventAcceptedContractIds:[...(state.account.eventAcceptedContractIds??[]),contract.id].slice(-240),eventContractBaselines:{...(state.account.eventContractBaselines??{}),[contract.id]:total}}};
}
export function eventObjectiveProgress(state:GameState,eventId:string,objectiveId:string,nowMs=Date.now()){if(claimableLiveEvent(state,nowMs)?.definition.id!==eventId)return 0;return eventContractBoard(state,nowMs).find(entry=>entry.objective.id===objectiveId)?.progress??0;}
export function eventObjectiveClaimed(state:GameState,eventId:string,objectiveId:string,nowMs=Date.now()){if(claimableLiveEvent(state,nowMs)?.definition.id!==eventId)return false;return eventContractBoard(state,nowMs).find(entry=>entry.objective.id===objectiveId)?.claimed??false;}
export function claimEventObjective(state:GameState,objectiveId:string,nowMs=Date.now()):GameState{
  const event=claimableLiveEvent(state,nowMs);if(!event)throw new Error('Event rewards are no longer available.');const contract=eventContractBoard(state,nowMs).find(entry=>entry.objective.id===objectiveId);if(!contract)throw new Error('This contract is not available.');if(!contract.accepted)throw new Error('Accept this contract before making progress.');if(contract.claimed)throw new Error('This contract was already claimed.');if(contract.progress<contract.objective.required)throw new Error('Complete the contract first.');const objective=contract.objective;
  const id=event.definition.id,progress={...(state.account.eventProgressById??{})},currency={...(state.account.eventCurrencyBalanceById??{})},prestige={...(state.account.eventPrestigeBalanceById??{})};progress[id]=(progress[id]??0)+objective.rewardCurrency;currency[id]=(currency[id]??0)+objective.rewardCurrency;prestige[id]=(prestige[id]??0)+eventPrestigeReward(objective.source,objective.rewardPrestige);
  return {...state,account:{...state.account,eventProgressById:progress,eventCurrencyBalanceById:currency,eventPrestigeBalanceById:prestige,eventObjectiveClaimIds:[...(state.account.eventObjectiveClaimIds??[]),contract.id].slice(-240)}};
}

export function eventWeeklyBoard(state:GameState,nowMs=Date.now()){const event=claimableLiveEvent(state,nowMs);if(!event)return [];const week=utcWeekKey(eventBoardTime(state,nowMs)),bucket=state.account.eventPeriodActivityById?.[`${event.definition.id}:week:${week}`]??{};return event.definition.weeklyObjectives.map(objective=>({id:`${event.definition.id}:${week}:${objective.id}`,objective:{...objective,rewardPrestige:eventPrestigeReward(objective.source,objective.rewardPrestige)},progress:Math.max(0,Math.floor(bucket[objective.source]??0)),claimed:(state.account.eventWeeklyClaimIds??[]).includes(`${event.definition.id}:${week}:${objective.id}`)}));}
export function claimEventWeeklyObjective(state:GameState,objectiveId:string,nowMs=Date.now()):GameState{const event=claimableLiveEvent(state,nowMs);if(!event)throw new Error('Event rewards are no longer available.');const challenge=eventWeeklyBoard(state,nowMs).find(entry=>entry.objective.id===objectiveId);if(!challenge)throw new Error('Unknown weekly challenge.');if(challenge.claimed)throw new Error('This weekly challenge was already claimed.');if(challenge.progress<challenge.objective.required)throw new Error('Complete the weekly challenge first.');const id=event.definition.id,progress={...(state.account.eventProgressById??{})},currency={...(state.account.eventCurrencyBalanceById??{})},prestige={...(state.account.eventPrestigeBalanceById??{})};progress[id]=(progress[id]??0)+challenge.objective.rewardCurrency;currency[id]=(currency[id]??0)+challenge.objective.rewardCurrency;prestige[id]=(prestige[id]??0)+challenge.objective.rewardPrestige;return {...state,account:{...state.account,eventProgressById:progress,eventCurrencyBalanceById:currency,eventPrestigeBalanceById:prestige,eventWeeklyClaimIds:[...(state.account.eventWeeklyClaimIds??[]),challenge.id].slice(-160)}};}

export function eventOfferPurchaseCount(state:GameState,eventId:string,offerId:string){return Math.max(0,Math.floor(state.account.eventShopPurchaseCounts?.[`${eventId}:${offerId}`]??0));}
export function eventShopOffers(state:GameState,nowMs=Date.now()){const event=claimableLiveEvent(state,nowMs);if(!event)return [];const common=event.definition.shop.filter(offer=>offer.currency==='common'),prestige=event.definition.shop.filter(offer=>offer.currency==='prestige'),offset=[...utcDayKey(eventBoardTime(state,nowMs))].reduce((sum,char)=>sum+char.charCodeAt(0),0)%Math.max(1,common.length);return [...Array.from({length:Math.min(2,common.length)},(_,index)=>common[(offset+index)%common.length]),...prestige];}
/** @deprecated Compatibility alias for older tests/callers. Player-facing UI uses Event Shop; this is not the retired player Market. */
export const eventMarketOffers=eventShopOffers;
export function purchaseEventOffer(state:GameState,offerId:string,nowMs=Date.now()):GameState{
  const event=claimableLiveEvent(state,nowMs);if(!event)throw new Error('The event shop is closed.');const offer=eventShopOffers(state,nowMs).find(entry=>entry.id===offerId);if(!offer)throw new Error('This event-shop offer is not currently available.');const count=eventOfferPurchaseCount(state,event.definition.id,offerId);if(count>=offer.limit)throw new Error('Purchase limit reached.');
  const common={...(state.account.eventCurrencyBalanceById??{})},prestige={...(state.account.eventPrestigeBalanceById??{})},balance=offer.currency==='common'?(common[event.definition.id]??0):(prestige[event.definition.id]??0);if(balance<offer.cost)throw new Error(`Requires ${offer.cost} ${offer.currency==='common'?event.definition.currencyName:event.definition.prestigeCurrencyName}.`);if(offer.currency==='common')common[event.definition.id]=balance-offer.cost;else prestige[event.definition.id]=balance-offer.cost;
  const rewarded=addReward(state,offer.reward,nowMs),key=`${event.definition.id}:${offer.id}`;return {...rewarded,account:{...rewarded.account,eventCurrencyBalanceById:common,eventPrestigeBalanceById:prestige,eventShopPurchaseCounts:{...(rewarded.account.eventShopPurchaseCounts??{}),[key]:count+1}}};
}

export function chooseEventProject(state:GameState,choiceId:string,nowMs=Date.now()):GameState{const event=activeLiveEvent(state,nowMs);if(!event)throw new Error('This event is not active.');if(!event.definition.choices.some(choice=>choice.id===choiceId))throw new Error('Unknown event project.');const existing=state.account.eventChoiceById?.[event.definition.id];if(existing&&existing!==choiceId)throw new Error('Your event project is already locked for this event.');return {...state,account:{...state.account,eventChoiceById:{...(state.account.eventChoiceById??{}),[event.definition.id]:choiceId}}};}
export function contributeEventCurrency(state:GameState,quantity:number,nowMs=Date.now()):GameState{const event=activeLiveEvent(state,nowMs);if(!event)throw new Error('This event is not active.');if(event.definition.communityEnabled!==true)throw new Error('Community event contributions are not enabled.');if(!state.account.eventChoiceById?.[event.definition.id])throw new Error('Choose an event project first.');const amount=Math.max(0,Math.floor(quantity)),credited=eventContributionValue(state,event.definition.id,amount),balance=eventCurrencyBalance(state,event.definition.id);if(!amount||balance<amount)throw new Error('Not enough event currency.');return {...state,account:{...state.account,eventCurrencyBalanceById:{...(state.account.eventCurrencyBalanceById??{}),[event.definition.id]:balance-amount},eventContributionById:{...(state.account.eventContributionById??{}),[event.definition.id]:(state.account.eventContributionById?.[event.definition.id]??0)+credited}}};}
export function eventCommunityStage(state:GameState,nowMs=Date.now()){const event=claimableLiveEvent(state,nowMs);if(!event||event.definition.communityEnabled!==true)return 0;if(state.account.eventCommunityProgressById)return Math.min(100,Math.max(0,state.account.eventCommunityProgressById[event.definition.id]??0));const contribution=Math.max(0,state.account.eventContributionById?.[event.definition.id]??0);return Math.min(100,Math.floor(contribution*100/Math.max(1,event.definition.communityGoal)));}
export function eventCommunityMilestones(state:GameState,nowMs=Date.now()){const event=claimableLiveEvent(state,nowMs);if(!event||event.definition.communityEnabled!==true)return [];const stage=eventCommunityStage(state,nowMs),contribution=Math.max(0,state.account.eventContributionById?.[event.definition.id]??0),eligible=contribution>=EVENT_COMMUNITY_MIN_CONTRIBUTION;return event.definition.communityMilestones.map(milestone=>({milestone,ready:stage>=milestone.percent,eligible,claimed:(state.account.eventCommunityClaimIds??[]).includes(`${event.definition.id}:${milestone.percent}`)}));}
export function claimEventCommunityMilestone(state:GameState,percent:number,nowMs=Date.now()){const event=claimableLiveEvent(state,nowMs);if(!event||event.definition.communityEnabled!==true)throw new Error('Community event rewards are not enabled.');const status=eventCommunityMilestones(state,nowMs).find(entry=>entry.milestone.percent===percent);if(!status)throw new Error('Unknown community milestone.');if(status.claimed)throw new Error('This community reward was already claimed.');if(!status.eligible)throw new Error(`Contribute at least ${EVENT_COMMUNITY_MIN_CONTRIBUTION} event currency to qualify for community rewards.`);if(!status.ready)throw new Error('The community has not reached this milestone.');let rewarded:GameState=grantEventCurrencies(state,event.definition.id,status.milestone.rewardCurrency,status.milestone.rewardPrestige);if(status.milestone.reward)rewarded=addReward(rewarded,status.milestone.reward,nowMs);return {...rewarded,account:{...rewarded.account,eventCommunityClaimIds:[...(rewarded.account.eventCommunityClaimIds??[]),`${event.definition.id}:${percent}`].slice(-80)}};}

/** Development-only local runtime switch. Production uses the Supabase event row. */
export function setLocalEventEnabled(state:GameState,enabled:boolean,nowMs=Date.now()):GameState{const runtime:LiveEventRuntime|undefined=enabled?{eventId:'EVT_ANNUAL_009_2026',enabled:true,startsAtMs:nowMs-60_000,endsAtMs:nowMs+21*86400_000}:undefined;return {...state,account:{...state.account,liveEvent:runtime}};}

export function eventReadyClaimCount(state:GameState,nowMs=Date.now()){
 const event=claimableLiveEvent(state,nowMs);if(!event)return 0;const id=event.definition.id;
 const daily=eventDailyGift(state,nowMs),readyDaily=daily&&!daily.claimed?1:0;
 const readyContracts=eventContractBoard(state,nowMs).filter(row=>row.accepted&&!row.claimed&&row.progress>=row.objective.required).length;
 const readyWeeklies=eventWeeklyBoard(state,nowMs).filter(row=>!row.claimed&&row.progress>=row.objective.required).length;
 const readyDiscoveries=eventDiscoveryBoard(state,nowMs).filter(row=>row.ready&&!row.claimed).length;
 const readyMilestones=eventMilestones(state,nowMs).filter(row=>row.points<=eventProgress(state,id)&&!eventRewardClaimed(state,id,row.reward.id)).length;
 const readyCommunity=event.definition.communityEnabled===true?eventCommunityMilestones(state,nowMs).filter(row=>row.ready&&!row.claimed).length:0;
 return readyDaily+readyContracts+readyWeeklies+readyDiscoveries+readyMilestones+readyCommunity+availableEventRepeatCaches(state,id);
}

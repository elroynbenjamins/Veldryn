import {VEILBREAK_EVENT} from './veilbreak-event';
import type {ClassId} from '../core/types';
import type {LiveEventUiCopy} from './live-event-ui';
import type {LiveEventVisualKey} from './live-event-visual-keys';

export type EventRewardKind='profile_icon'|'pet'|'companion'|'background'|'border'|'emote'|'title'|'candy'|'guild_name_color'|'guild_frame'|'guild_banner'|'gold'|'companion_essence';
export type EventActivitySource='combat'|'gathering'|'crafting'|'boss';
export type EventRewardRarity='common'|'uncommon'|'rare'|'epic'|'mythic'|'legendary';
export interface EventReward{kind:EventRewardKind;id:string;name:string;rarity:EventRewardRarity;quantity?:number;}
export interface EventMilestone{points:number;reward:EventReward;}
export interface EventObjectiveDef{id:string;name:string;description:string;source:EventActivitySource;required:number;rewardCurrency:number;rewardPrestige:number;}
export interface EventShopOffer{id:string;reward:EventReward;currency:'common'|'prestige';cost:number;limit:number;minLevel?:number;legacy?:boolean;}
export interface EventChoice{id:string;name:string;description:string;bonusLabel:string;dropMultipliers?:Partial<Record<EventActivitySource,number>>;contributionMultiplier?:number;}
export interface EventDailyGift{day:number;rewardCurrency:number;rewardPrestige:number;}
export interface EventCommunityMilestone{percent:number;rewardCurrency:number;rewardPrestige:number;reward?:EventReward;}
export type EventCandyKind='skill'|'combat'|'companion';
export interface EventCandyDef{kind:EventCandyKind;id:string;name:string;description:string;visualKey:LiveEventVisualKey;bonusBps:number;secondsPerUse:number;maxSeconds:number;}
export type EventBlessingSource=EventActivitySource;
export interface EventBlessingDef{day:number;source:EventBlessingSource;name:string;description:string;bonusBps:number;}
export interface EventDiscovery{id:string;name:string;description:string;source:EventActivitySource;chance:number;required:number;reward:EventReward;}
export type EventSignatureKind='community'|'expedition'|'competition'|'opportunity'|'ritual'|'trade'|'celebration';
export interface EventSignature{kind:EventSignatureKind;label:string;title:string;description:string;highlights:string[];}
export interface LiveEventDef{
  id:string;name:string;summary:string;currencyId:string;currencyName:string;prestigeCurrencyId:string;prestigeCurrencyName:string;accent:string;progressionName:string;maxProgress:number;claimGraceDays:number;visualKey:LiveEventVisualKey;ui?:Partial<LiveEventUiCopy>;signature:EventSignature;
  dropRates:Record<EventActivitySource,number>;milestones:(classId:ClassId)=>EventMilestone[];objectives:EventObjectiveDef[];weeklyObjectives:EventObjectiveDef[];shop:EventShopOffer[];choices:EventChoice[];dailyGifts:EventDailyGift[];communityEnabled?:boolean;communityGoal:number;communityMilestones:EventCommunityMilestone[];discoveries:EventDiscovery[];
}

/** Shared event utility consumable. Names and visuals vary per event; balance does not. */
export function eventCandies(definition:Pick<LiveEventDef,'id'|'name'|'visualKey'>):EventCandyDef[]{
  const names:Partial<Record<LiveEventVisualKey,string>>={harvestwake:'Harvest Taffy',veilbreak:'Gloam Candy',frostfall:'Frostmint',turning_of_the_age:'Chronicle Chew',heartbond:'Heartberry Drop',bloomwake:'Bloom Sugar',suncrest:'Sunflare Toffee',starfall:'Starshine Candy',merchant_guild:'Guild Caramel'};
  const base=names[definition.visualKey]??`${definition.name} Candy`;
  return [
    {kind:'skill',id:`${definition.id}:candy:skill`,name:base,description:'Grants +10% gathering speed and +10% non-combat skill XP.',visualKey:definition.visualKey,bonusBps:1000,secondsPerUse:2*60*60,maxSeconds:10*60*60},
    {kind:'combat',id:`${definition.id}:candy:combat`,name:`${base} · Battle`,description:'Grants +10% combat XP and +10% damage against ordinary regional PvE enemies only. No PvP, guild, dungeon, or expedition effect.',visualKey:definition.visualKey,bonusBps:1000,secondsPerUse:2*60*60,maxSeconds:10*60*60},
    {kind:'companion',id:`${definition.id}:candy:companion`,name:`${base} · Bond`,description:'Awards 75 Companion XP to your selected owned combat companion, equipped or not. It does not increase combat power directly.',visualKey:definition.visualKey,bonusBps:0,secondsPerUse:1,maxSeconds:1},
  ];
}
export function eventCandy(definition:Pick<LiveEventDef,'id'|'name'|'visualKey'>){return eventCandies(definition)[0];}

/** Automatic, optional daily focus. It changes with the UTC event day and never requires a task or streak. */
export function eventDailyFestivalBlessing(definition:Pick<LiveEventDef,'name'>,eventDay:number):EventBlessingDef{
  const sources:EventBlessingSource[]=['gathering','combat','crafting','boss'];
  const source=sources[Math.max(0,eventDay-1)%sources.length];
  const labels:Record<EventBlessingSource,string>={gathering:'Skilling',combat:'Combat',crafting:'Crafting',boss:'Bosses'};
  return {day:Math.max(1,eventDay),source,name:`${labels[source]} Festival Blessing`,description:`+10% ${definition.name} currency from ${labels[source].toLowerCase()}.`,bonusBps:1000};
}

export interface EventRewardPlan{
  meterPet:EventMilestone;
  shopPet:EventShopOffer;
  milestoneCompanions:EventMilestone[];
  shopCompanions:EventShopOffer[];
  finalCompanion:EventMilestone;
}

/** Canonical collectible structure shared by every annual event. */
export function eventRewardPlan(definition:LiveEventDef,classId:ClassId):EventRewardPlan|undefined{
  const milestones=definition.milestones(classId);
  const meterPet=milestones.find(entry=>entry.reward.kind==='pet');
  const shopPet=definition.shop.find(entry=>entry.reward.kind==='pet');
  const milestoneCompanions=milestones.filter(entry=>entry.reward.kind==='companion');
  const shopCompanions=definition.shop.filter(entry=>entry.reward.kind==='companion');
  const finalCompanion=milestoneCompanions[milestoneCompanions.length-1];
  return meterPet&&shopPet&&finalCompanion?{meterPet,shopPet,milestoneCompanions,shopCompanions,finalCompanion}:undefined;
}

/** Permanent catalog of officially released events, starting with Veilbreak.
 * Keep prior released definitions here after their window closes so unlocked
 * cosmetics retain their identity and locked rewards remain discoverable.
 * Future authored events are added explicitly at release; the server controls
 * earning/claim windows independently of this catalog. */
export const LIVE_EVENT_CATALOG:LiveEventDef[]=[VEILBREAK_EVENT];

export function annualEventSeriesId(id:string){const match=id.match(/^(EVT_ANNUAL_\d{3})_(\d{4})$/);return match?.[1];}

/**
 * Resolve a seasonal runtime ID against the production event template catalog.
 * Runtime IDs stay year-specific so progress, balances, claims and purchase limits
 * never leak between annual runs, while content can reuse the same template until
 * a future season intentionally ships different rewards or balance.
 */
export function liveEventDef(id:string){
  const exact=LIVE_EVENT_CATALOG.find(event=>event.id===id);
  if(exact)return exact;
  const series=annualEventSeriesId(id);
  if(!series)return undefined;
  const template=LIVE_EVENT_CATALOG.find(event=>annualEventSeriesId(event.id)===series);
  return template?{...template,id}:undefined;
}

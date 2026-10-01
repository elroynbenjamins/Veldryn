import type {ClassId} from '../core/types';
import type {LiveEventUiCopy} from './live-event-ui';
import type {LiveEventVisualKey} from './live-event-visual-keys';

export type EventRewardKind='profile_icon'|'pet'|'companion'|'background'|'border'|'emote'|'title'|'candy'|'guild_name_color'|'guild_frame'|'guild_banner';
export type EventActivitySource='combat'|'gathering'|'crafting'|'boss';
export type EventRewardRarity='common'|'uncommon'|'rare'|'epic'|'mythic'|'legendary';
export interface EventReward{kind:EventRewardKind;id:string;name:string;rarity:EventRewardRarity;quantity?:number;}
export interface EventMilestone{points:number;reward:EventReward;}
export interface EventObjectiveDef{id:string;name:string;description:string;source:EventActivitySource;required:number;rewardCurrency:number;rewardPrestige:number;}
export interface EventShopOffer{id:string;reward:EventReward;currency:'common'|'prestige';cost:number;limit:number;legacy?:boolean;}
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
    {kind:'companion',id:`${definition.id}:candy:companion`,name:`${base} · Bond`,description:'Awards 75 Companion XP to your equipped combat companion. It does not increase combat power directly.',visualKey:definition.visualKey,bonusBps:0,secondsPerUse:1,maxSeconds:1},
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
  finalCompanion:EventMilestone;
}

/** Canonical collectible structure shared by every annual event. */
export function eventRewardPlan(definition:LiveEventDef,classId:ClassId):EventRewardPlan|undefined{
  const milestones=definition.milestones(classId);
  const meterPet=milestones.find(entry=>entry.reward.kind==='pet');
  const shopPet=definition.shop.find(entry=>entry.reward.kind==='pet');
  const finalCompanion=milestones.find(entry=>entry.reward.kind==='companion');
  return meterPet&&shopPet&&finalCompanion?{meterPet,shopPet,finalCompanion}:undefined;
}

/** First production-shaped event sourced from the annual event design workbook. */
export const LIVE_EVENT_CATALOG:LiveEventDef[]=[{
  id:'EVT_ANNUAL_009_2026',name:'Harvestwake',summary:"The year's harvest awakens old field spirits. Gather, craft, and prepare Asterfall for winter.",currencyId:'HARVEST_MARK',currencyName:'Harvest Marks',prestigeCurrencyId:'AMBER_SEED',prestigeCurrencyName:'Amber Seeds',accent:'#d9953f',progressionName:'Harvest Reputation',maxProgress:10000,claimGraceDays:7,
  visualKey:'harvestwake',
  signature:{kind:'community',label:'SIGNATURE · GRAND STOREHOUSE',title:'Prepare Asterfall for winter together',description:'Harvestwake is the community-first annual festival. Choose a winter project, earn Harvest Marks through normal play, then decide how much to keep for the shop and how much to invest in the shared Grand Storehouse.',highlights:['Shared Storehouse milestones','Project choice changes contribution value','No seasonal dungeon — the communal preparation is the centerpiece']},
  ui:{prepareTitle:'Prepare for the festival',dailyGiftTitle:'Today’s Harvest Gift',cacheName:'Harvest Cache',communityName:'Grand Storehouse',projectTitle:'Winter preparation',projectNoun:'winter project',contractsTitle:'DAILY HARVEST CONTRACTS',shopTitle:'HARVEST SHOP',collectionTitle:'Harvestwake collection',closedTitle:'Harvest activities are closed',closedBody:'No new reputation, daily gifts, contracts, or contributions can be earned. Completed contracts, milestones, Storehouse stages, caches, and shop purchases remain claimable.'},
  // Average currency per unit. Combat uses kills; gathering uses active minutes.
  dropRates:{combat:.18,gathering:1.1,crafting:30,boss:250},
  milestones:classId=>[
    {points:400,reward:{kind:'emote',id:'emote_harvest_cheer',name:'Harvest Cheer',rarity:'rare'}},
    {points:1000,reward:{kind:'title',id:'title_feast_friend',name:'Friend of the Feast',rarity:'rare'}},
    {points:4000,reward:{kind:'pet',id:'EVT_PET_011',name:'Pumpkin Piglet',rarity:'common'}},
    {points:4000,reward:{kind:'background',id:'bg_grand_storehouse',name:'Grand Storehouse',rarity:'legendary'}},
    {points:6500,reward:{kind:'border',id:'frame_amber_vine',name:'Amber Vine',rarity:'epic'}},
    {points:8000,reward:{kind:'profile_icon',id:'event:spirit-lantern',name:'Spirit Lantern',rarity:'epic'}},
    {points:10000,reward:{kind:'companion',id:'EVT_UNIT_006',name:'Harvest Guardian',rarity:'epic'}},
  ],
  objectives:[
    {id:'field_work',name:'Field Work',description:'Spend 180 active minutes gathering.',source:'gathering',required:180,rewardCurrency:250,rewardPrestige:1},
    {id:'hearth_orders',name:'Hearth Orders',description:'Complete 12 crafting recipes.',source:'crafting',required:12,rewardCurrency:350,rewardPrestige:1},
    {id:'spirit_defense',name:'Spirit Defense',description:'Defeat 300 ordinary enemies.',source:'combat',required:300,rewardCurrency:300,rewardPrestige:1},
    {id:'folklore_guardian',name:'Folklore Guardian',description:'Defeat an eligible event boss.',source:'boss',required:1,rewardCurrency:500,rewardPrestige:2},
  ],
  weeklyObjectives:[
    {id:'weekly_supplier',name:'Master Supplier',description:'Spend 900 active minutes gathering this week.',source:'gathering',required:900,rewardCurrency:900,rewardPrestige:2},
    {id:'weekly_artisan',name:'Festival Artisan',description:'Complete 50 crafting recipes this week.',source:'crafting',required:50,rewardCurrency:1100,rewardPrestige:2},
    {id:'weekly_watch',name:'Spirit Watch',description:'Defeat 1,800 ordinary enemies this week.',source:'combat',required:1800,rewardCurrency:1000,rewardPrestige:2},
  ],
  shop:[
    {id:'market_golden_fields',reward:{kind:'background',id:'bg_harvestwake',name:'Golden Fields',rarity:'rare'},currency:'common',cost:900,limit:1},
    {id:'market_wheat_crown',reward:{kind:'border',id:'frame_wheat_crown',name:'Wheat Crown',rarity:'epic'},currency:'common',cost:1800,limit:1},
    {id:'market_golden_sheafling',reward:{kind:'pet',id:'EVT_PET_012',name:'Golden Sheafling',rarity:'epic'},currency:'prestige',cost:10,limit:1},
  ],
  choices:[
    {id:'preserved_supplies',name:'Preserved Supplies',description:'Prioritize food, cooking, and the communal feast.',bonusLabel:'+20% marks from gathering',dropMultipliers:{gathering:1.2}},
    {id:'reinforced_workshop',name:'Reinforced Workshop',description:'Prioritize crafting orders and repaired tools.',bonusLabel:'+20% marks from crafting',dropMultipliers:{crafting:1.2}},
    {id:'travelers_stock',name:"Traveler's Stock",description:'Prepare provisions for regional deliveries.',bonusLabel:'+15% combat marks · +10% boss marks',dropMultipliers:{combat:1.15,boss:1.1}},
    {id:'guild_pantry',name:'Guild Pantry',description:'Direct your effort toward guild-wide preparation.',bonusLabel:'+20% boss marks · +25% contribution value',dropMultipliers:{boss:1.2},contributionMultiplier:1.25},
  ],
  dailyGifts:[
    {day:1,rewardCurrency:100,rewardPrestige:0},{day:2,rewardCurrency:150,rewardPrestige:0},{day:3,rewardCurrency:200,rewardPrestige:0},{day:4,rewardCurrency:250,rewardPrestige:0},{day:5,rewardCurrency:300,rewardPrestige:0},{day:6,rewardCurrency:400,rewardPrestige:0},{day:7,rewardCurrency:500,rewardPrestige:1},
  ],
  communityEnabled:true,
  communityGoal:100000,
  communityMilestones:[
    {percent:25,rewardCurrency:200,rewardPrestige:0},
    {percent:50,rewardCurrency:350,rewardPrestige:1},
    {percent:75,rewardCurrency:500,rewardPrestige:1},
    {percent:100,rewardCurrency:750,rewardPrestige:2,reward:{kind:'title',id:'title_storehouse_builder',name:'Storehouse Builder',rarity:'epic'}},
  ],
  discoveries:[
    {id:'whispering_husk',name:'Whispering Husk',description:'A field-spirit shell found after ordinary battles.',source:'combat',chance:.003,required:5,reward:{kind:'emote',id:'emote_scarecrow_salute',name:'Scarecrow Salute',rarity:'rare'}},
    {id:'golden_field_feather',name:'Golden Field Feather',description:'A warm feather hidden among gathered harvests.',source:'gathering',chance:.015,required:5,reward:{kind:'title',id:'title_golden_field',name:'Golden Field Keeper',rarity:'rare'}},
    {id:'amber_artisan_seal',name:'Amber Artisan Seal',description:'A maker’s mark that occasionally appears after crafting.',source:'crafting',chance:.06,required:3,reward:{kind:'title',id:'title_amber_artisan',name:'Amber Artisan',rarity:'rare'}},
    {id:'guardian_lantern',name:'Guardian Lantern',description:'A lantern fragment carried by eligible event bosses.',source:'boss',chance:.25,required:1,reward:{kind:'background',id:'bg_spirit_storehouse',name:'Spirit Storehouse',rarity:'legendary'}},
  ],
}];

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

import type {ClassId} from '../core/types';

export type EventRewardKind='skin'|'pet'|'background'|'border'|'emote'|'title';
export type EventActivitySource='combat'|'gathering'|'crafting'|'boss';
export interface EventReward{kind:EventRewardKind;id:string;name:string;rarity:'rare'|'epic'|'legendary';}
export interface EventMilestone{points:number;reward:EventReward;}
export interface EventObjectiveDef{id:string;name:string;description:string;source:EventActivitySource;required:number;rewardCurrency:number;rewardPrestige:number;}
export interface EventShopOffer{id:string;reward:EventReward;currency:'common'|'prestige';cost:number;limit:number;legacy?:boolean;}
export interface EventChoice{id:string;name:string;description:string;bonusLabel:string;dropMultipliers?:Partial<Record<EventActivitySource,number>>;contributionMultiplier?:number;}
export interface EventDailyGift{day:number;rewardCurrency:number;rewardPrestige:number;}
export interface EventCommunityMilestone{percent:number;rewardCurrency:number;rewardPrestige:number;reward?:EventReward;}
export interface EventDiscovery{id:string;name:string;description:string;source:EventActivitySource;chance:number;required:number;reward:EventReward;}
export interface LiveEventDef{
  id:string;name:string;summary:string;currencyId:string;currencyName:string;prestigeCurrencyId:string;prestigeCurrencyName:string;accent:string;progressionName:string;maxProgress:number;claimGraceDays:number;
  dropRates:Record<EventActivitySource,number>;milestones:(classId:ClassId)=>EventMilestone[];objectives:EventObjectiveDef[];weeklyObjectives:EventObjectiveDef[];shop:EventShopOffer[];choices:EventChoice[];dailyGifts:EventDailyGift[];communityEnabled?:boolean;communityGoal:number;communityMilestones:EventCommunityMilestone[];discoveries:EventDiscovery[];
}

const harvestSkins:Record<ClassId,string>={
  IRONWARDEN:'Harvest Defender',BASTION:'Granary Bastion',DREADGUARD:'Autumn Warden',DAWNKEEPER:'Hearthkeeper',WAYFINDER:'Field Ranger',RAVAGER:"Reaper's Guard",HEXWEAVER:'Amber Brewer',KNIFE_DANCER:'Harvest Blade',STONECALLER:'Granary Keeper',
};

/** First production-shaped event sourced from the annual event design workbook. */
export const LIVE_EVENT_CATALOG:LiveEventDef[]=[{
  id:'EVT_ANNUAL_009_2026',name:'Harvestwake',summary:"The year's harvest awakens old field spirits. Gather, craft, and prepare Asterfall for winter.",currencyId:'HARVEST_MARK',currencyName:'Harvest Marks',prestigeCurrencyId:'AMBER_SEED',prestigeCurrencyName:'Amber Seeds',accent:'#d9953f',progressionName:'Harvest Reputation',maxProgress:10000,claimGraceDays:7,
  // Average currency per unit. Combat uses kills; gathering uses active minutes.
  dropRates:{combat:.18,gathering:1.1,crafting:30,boss:250},
  milestones:classId=>[
    {points:400,reward:{kind:'emote',id:'emote_harvest_cheer',name:'Harvest Cheer',rarity:'rare'}},
    {points:1000,reward:{kind:'title',id:'title_feast_friend',name:'Friend of the Feast',rarity:'rare'}},
    {points:2250,reward:{kind:'pet',id:'EVT_PET_011',name:'Pumpkin Piglet',rarity:'epic'}},
    {points:4000,reward:{kind:'background',id:'bg_grand_storehouse',name:'Grand Storehouse',rarity:'legendary'}},
    {points:6500,reward:{kind:'border',id:'frame_amber_vine',name:'Amber Vine',rarity:'epic'}},
    {points:10000,reward:{kind:'skin',id:`skin_harvestwake_${classId.toLowerCase()}`,name:harvestSkins[classId],rarity:classId==='IRONWARDEN'||classId==='HEXWEAVER'?'legendary':'epic'}},
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
    {id:'market_golden_sheafling',reward:{kind:'pet',id:'EVT_PET_012',name:'Golden Sheafling',rarity:'epic'},currency:'common',cost:2400,limit:1},
    {id:'pantry_pumpkin_piglet',reward:{kind:'pet',id:'EVT_PET_011',name:'Pumpkin Piglet',rarity:'legendary'},currency:'prestige',cost:4,limit:1},
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
  communityEnabled:false,
  communityGoal:100000,
  communityMilestones:[
    {percent:25,rewardCurrency:200,rewardPrestige:0},
    {percent:50,rewardCurrency:350,rewardPrestige:1},
    {percent:75,rewardCurrency:500,rewardPrestige:1},
    {percent:100,rewardCurrency:750,rewardPrestige:2,reward:{kind:'title',id:'title_storehouse_builder',name:'Storehouse Builder',rarity:'epic'}},
  ],
  discoveries:[
    {id:'whispering_husk',name:'Whispering Husk',description:'A field-spirit shell found after ordinary battles.',source:'combat',chance:.003,required:5,reward:{kind:'emote',id:'emote_scarecrow_salute',name:'Scarecrow Salute',rarity:'rare'}},
    {id:'golden_field_feather',name:'Golden Field Feather',description:'A warm feather hidden among gathered harvests.',source:'gathering',chance:.015,required:5,reward:{kind:'pet',id:'EVT_PET_012',name:'Golden Sheafling',rarity:'epic'}},
    {id:'amber_artisan_seal',name:'Amber Artisan Seal',description:'A maker’s mark that occasionally appears after crafting.',source:'crafting',chance:.06,required:3,reward:{kind:'title',id:'title_amber_artisan',name:'Amber Artisan',rarity:'rare'}},
    {id:'guardian_lantern',name:'Guardian Lantern',description:'A lantern fragment carried by eligible event bosses.',source:'boss',chance:.25,required:1,reward:{kind:'background',id:'bg_spirit_storehouse',name:'Spirit Storehouse',rarity:'legendary'}},
  ],
}];

export function liveEventDef(id:string){return LIVE_EVENT_CATALOG.find(event=>event.id===id);}

import type {LiveEventDef,EventMilestone} from './live-events';
import type {ClassId} from '../core/types';
import {EVENT_COMPANIONS} from './event-companions-v2';

/** Stable IDs preserve prior claims; ownership supports full Trial/Expedition role coverage. */
export function veilbreakCompanionMilestones(_classId:ClassId):EventMilestone[]{
 // Lantern Keeper is the fixed shop goal. The other two companions remain
 // earnable by every class; normal-combat equip rules are enforced separately.
 return ['EVT_UNIT_008','EVT_UNIT_007']
  .map(id=>EVENT_COMPANIONS.find(companion=>companion.id===id)!)
  .map((companion,index)=>({points:index===0?16000:20000,reward:{kind:'companion',id:companion.id,name:companion.name,rarity:'epic' as const}}));
}

const gifts:LiveEventDef['dailyGifts']=[
  {day:1,rewardCurrency:100,rewardPrestige:0},
  {day:2,rewardCurrency:150,rewardPrestige:0},
  {day:3,rewardCurrency:200,rewardPrestige:0},
  {day:4,rewardCurrency:250,rewardPrestige:0},
  {day:5,rewardCurrency:300,rewardPrestige:0},
  {day:6,rewardCurrency:400,rewardPrestige:0},
  {day:7,rewardCurrency:500,rewardPrestige:1},
];

export const VEILBREAK_EVENT:LiveEventDef={
  id:'EVT_ANNUAL_010_2026',
  name:'The Veilbreak',
  summary:'The boundary between Asterfall and the Gloam thins. Reinforce lantern wards, hunt escaped shades, and recover what crossed the veil.',
  currencyId:'VEIL_SHARD',
  currencyName:'Veil Shards',
  prestigeCurrencyId:'LANTERN_EMBER',
  prestigeCurrencyName:'Lantern Embers',
  accent:'#f47a36',
  progressionName:'Veil Reputation',
  maxProgress:20000,
  claimGraceDays:7,
  visualKey:'veilbreak',
  signature:{kind:'ritual',label:'SIGNATURE · BREACH WATCH',title:'Hold the veil together while hunting what slips through',description:'Veilbreak is the darkest annual event. Normal activities reinforce the ward effort, discoveries represent objects crossing the veil, and Gloam Breach is the season’s persistent expedition.',highlights:['Ward-focused seasonal projects','Gloam-touched discovery chase','Gloam Breach seasonal expedition']},
  ui:{
    prepareTitle:'Prepare the lantern wards',
    dailyGiftTitle:'Today’s Lantern Gift',
    cacheName:'Veil Cache',
    communityName:'Lantern Ward',
    projectTitle:'Ward preparation',
    projectNoun:'ward focus',
    contractsTitle:'WEEKLY VEIL ACTIVITIES',
    shopTitle:'VEILBREAK SHOP',
    collectionTitle:'Veilbreak collection',
    closedTitle:'The veil is sealing',
    closedBody:'No new Veil Reputation, daily gifts, contracts, or activity drops can be earned. Completed rewards and shop purchases remain claimable during the grace period.',
  },
  dropRates:{combat:.20,gathering:1.0,crafting:28,boss:260},
  milestones:(classId)=>[
    {points:250,reward:{kind:'candy',id:'EVT_ANNUAL_010_2026:candy:skill',name:'Gloam Candy',rarity:'common',quantity:2}},
    {points:400,reward:{kind:'title',id:'title_veil_watcher',name:'Veil Watcher',rarity:'rare'}},
    {points:750,reward:{kind:'candy',id:'EVT_ANNUAL_010_2026:candy:combat',name:'Gloam Candy · Battle',rarity:'common',quantity:2}},
    {points:1000,reward:{kind:'emote',id:'emote_lantern_watch',name:'Lantern Watch',rarity:'rare'}},
    {points:1500,reward:{kind:'candy',id:'EVT_ANNUAL_010_2026:candy:companion',name:'Gloam Candy · Bond',rarity:'common',quantity:2}},
    {points:2500,reward:{kind:'guild_name_color',id:'name_halloween_orange',name:'Halloworange',rarity:'epic'}},
    {points:4000,reward:{kind:'pet',id:'EVT_PET_013',name:'Gloomkin',rarity:'rare'}},
    {points:5500,reward:{kind:'guild_frame',id:'border_halloween_veil',name:'Veil Masquerade',rarity:'epic'}},
    {points:6500,reward:{kind:'title',id:'title_veilbound',name:'Veilbound',rarity:'epic'}},
    {points:7000,reward:{kind:'profile_icon',id:'event:veilbreak-2026-lantern-warden',name:'2026 Lantern Warden',rarity:'epic'}},
    {points:7000,reward:{kind:'guild_banner',id:'halloween_pumpkin_lantern',name:'Pumpkin Lantern Flag',rarity:'rare'}},
    {points:8000,reward:{kind:'profile_icon',id:'event:veilbreak-2026-pumpkin-moon',name:'2026 Pumpkin Moon',rarity:'epic'}},
    {points:8500,reward:{kind:'guild_banner',id:'halloween_bat_moon',name:'Bat Moon Flag',rarity:'epic'}},
    ...veilbreakCompanionMilestones(classId),
  ].map(milestone=>milestone.reward.kind==='companion'?milestone:{...milestone,points:milestone.points*2}).sort((a,b)=>a.points-b.points) as EventMilestone[],
  objectives:[
    {id:'veil_hunt',name:'Veil Hunt',description:'Defeat 350 ordinary enemies while the veil is thin.',source:'combat',required:350,rewardCurrency:320,rewardPrestige:1},
    {id:'ward_supplies',name:'Ward Supplies',description:'Spend 180 active minutes gathering ward materials.',source:'gathering',required:180,rewardCurrency:250,rewardPrestige:1},
    {id:'lantern_craft',name:'Lantern Craft',description:'Complete 12 crafting recipes for the ward effort.',source:'crafting',required:12,rewardCurrency:340,rewardPrestige:1},
    {id:'breach_guardian',name:'Breach Guardian',description:'Defeat an eligible event boss.',source:'boss',required:1,rewardCurrency:520,rewardPrestige:2},
  ],
  weeklyObjectives:[
    {id:'weekly_veil_hunt',name:'Night Watch',description:'Defeat 1,900 ordinary enemies this week.',source:'combat',required:1900,rewardCurrency:1050,rewardPrestige:2},
    {id:'weekly_ward_supply',name:'Ward Quartermaster',description:'Spend 900 active minutes gathering this week.',source:'gathering',required:900,rewardCurrency:900,rewardPrestige:2},
    {id:'weekly_lantern_craft',name:'Master Lanternwright',description:'Complete 50 crafting recipes this week.',source:'crafting',required:50,rewardCurrency:1100,rewardPrestige:2},
  ],
  shop:[
    // One fixed, long-term companion goal keeps the event shop legible. The other
    // two Veilbreak companions are earned from class-aware reputation milestones.
    ...EVENT_COMPANIONS.filter(companion=>companion.id==='EVT_UNIT_011').map(companion=>({id:`veil_trial_${companion.id.toLowerCase()}`,reward:{kind:'companion' as const,id:companion.id,name:companion.name,rarity:'epic' as const},currency:'common' as const,cost:20000,limit:1,alwaysAvailable:true})),
    {id:'laughing_crow',reward:{kind:'emote',id:'emote_laughing_crow',name:'Laughing Crow',rarity:'rare'},currency:'common',cost:900,limit:1},
    // Stable IDs retain existing purchases while the rewards now read as useful chat reactions.
    {id:'veil_salute',reward:{kind:'emote',id:'emote_veil_salute',name:'Pumpkin Panic',rarity:'rare'},currency:'common',cost:1100,limit:1,minLevel:8},
    {id:'candle_circle',reward:{kind:'emote',id:'emote_candle_circle',name:'Gloam Facepalm',rarity:'rare'},currency:'common',cost:1250,limit:1,minLevel:12},
    {id:'gloamward_frame',reward:{kind:'border',id:'frame_gloamward',name:'Gloamward Frame',rarity:'epic'},currency:'common',cost:2200,limit:1,minLevel:10},
    {id:'veilbreak_background',reward:{kind:'background',id:'bg_veilbreak',name:'Veilbreak Gothic Moonruins',rarity:'epic'},currency:'common',cost:1800,limit:1},
    {id:'gloam_candy_skill',reward:{kind:'candy',id:'EVT_ANNUAL_010_2026:candy:skill',name:'Gloam Candy',rarity:'common',quantity:1},currency:'common',cost:250,limit:5},
    {id:'gloam_candy_battle',reward:{kind:'candy',id:'EVT_ANNUAL_010_2026:candy:combat',name:'Gloam Candy · Battle',rarity:'common',quantity:1},currency:'common',cost:300,limit:5,minLevel:8},
    {id:'gloam_candy_bond',reward:{kind:'candy',id:'EVT_ANNUAL_010_2026:candy:companion',name:'Gloam Candy · Bond',rarity:'common',quantity:1},currency:'common',cost:350,limit:5,minLevel:12},
    {id:'companion_essence_cache',reward:{kind:'companion_essence',id:'companion_essence_100',name:'Companion Essence Cache',rarity:'uncommon',quantity:100},currency:'common',cost:750,limit:3,minLevel:10},
    {id:'lantern_coin_purse',reward:{kind:'gold',id:'gold_2500',name:'Lantern Coin Purse',rarity:'common',quantity:2500},currency:'common',cost:450,limit:5,minLevel:5},
    {id:'warden_treasury',reward:{kind:'gold',id:'gold_10000',name:'Warden Treasury',rarity:'uncommon',quantity:10000},currency:'common',cost:1600,limit:2,minLevel:20},
    {id:'candlewarden_title',reward:{kind:'title',id:'title_candlewarden',name:'Candlewarden',rarity:'epic'},currency:'common',cost:1800,limit:1},
    {id:'night_patrol_title',reward:{kind:'title',id:'title_night_patrol',name:'Night Patrol',rarity:'rare'},currency:'common',cost:1200,limit:1},
    {id:'veil_lantern_mimic',reward:{kind:'pet',id:'EVT_PET_014',name:'Lantern Mimic',rarity:'epic'},currency:'prestige',cost:10,limit:1},
  ],
  choices:[
    {id:'lantern_patrols',name:'Lantern Patrols',description:'Walk the roads and hunt creatures drawn through the veil.',bonusLabel:'+20% Veil Shards from combat',dropMultipliers:{combat:1.2}},
    {id:'ward_gathering',name:'Ward Gathering',description:'Gather resin, herbs, ore, and fuel for the ward lanterns.',bonusLabel:'+20% Veil Shards from gathering',dropMultipliers:{gathering:1.2}},
    {id:'sigil_workshop',name:'Sigil Workshop',description:'Craft replacement wards and binding seals.',bonusLabel:'+20% Veil Shards from crafting',dropMultipliers:{crafting:1.2}},
    {id:'breach_hunters',name:'Breach Hunters',description:'Prioritize the strongest creatures crossing through.',bonusLabel:'+20% boss Veil Shards',dropMultipliers:{boss:1.2}},
  ],
  dailyGifts:[...gifts],
  communityEnabled:false,
  communityGoal:100000,
  communityMilestones:[],
  discoveries:[
    {id:'gloam_cinder',name:'Gloam Cinder',description:'A cold ember sometimes left behind after ordinary combat.',source:'combat',chance:.003,required:5,reward:{kind:'title',id:'title_gloam_touched',name:'Gloam-Touched',rarity:'rare'}},
    {id:'waxen_sigil',name:'Waxen Sigil',description:'A binding mark occasionally left after crafting.',source:'crafting',chance:.06,required:3,reward:{kind:'emote',id:'emote_sleeping_scarecrow',name:'Sleeping Scarecrow',rarity:'rare'}},
    {id:'breach_fragment',name:'Breach Fragment',description:'A shard of condensed veil carried by eligible bosses.',source:'boss',chance:.25,required:1,reward:{kind:'title',id:'title_breach_sealer',name:'Breach Sealer',rarity:'epic'}},
  ],
};

export const FROSTFALL_EVENT:LiveEventDef={
  id:'EVT_ANNUAL_012_2026',
  name:'Frostfall Festival',
  summary:'Winter bells ring across Asterfall. Gather provisions, light the roads, and earn gifts beneath the aurora.',
  currencyId:'FROSTBELL_TOKEN',
  currencyName:'Frostbell Tokens',
  prestigeCurrencyId:'AURORA_CHIME',
  prestigeCurrencyName:'Aurora Chimes',
  accent:'#9be7ff',
  progressionName:'Frostfall Reputation',
  maxProgress:10000,
  claimGraceDays:7,
  visualKey:'frostfall',
  signature:{kind:'community',label:'SIGNATURE · WINTER HEARTH',title:'Build the winter celebration together',description:'Frostfall combines a personal gift-and-collection chase with a shared Winter Hearth. Spend Frostbell Tokens on your own collection or contribute them to unlock communal festival milestones.',highlights:['Shared Winter Hearth milestones','Gift-and-aurora collectible chase','Aurora Hollow seasonal expedition']},
  ui:{
    prepareTitle:'Prepare for Frostfall',
    dailyGiftTitle:'Today’s Frostfall Gift',
    cacheName:'Frostfall Cache',
    communityName:'Winter Hearth',
    projectTitle:'Festival preparation',
    projectNoun:'festival focus',
    contractsTitle:'DAILY FROSTFALL CONTRACTS',
    shopTitle:'FROSTFALL SHOP',
    collectionTitle:'Frostfall collection',
    closedTitle:'Frostfall festivities are ending',
    closedBody:'No new Frostfall Reputation, daily gifts, contracts, or activity drops can be earned. Completed rewards and shop purchases remain claimable during the grace period.',
  },
  dropRates:{combat:.17,gathering:1.2,crafting:30,boss:250},
  milestones:()=>[
    {points:400,reward:{kind:'title',id:'title_frostfall_guest',name:'Frostfall Guest',rarity:'common'}},
    {points:1000,reward:{kind:'emote',id:'emote_snowbell_ring',name:'Snowbell Ring',rarity:'rare'}},
    {points:4000,reward:{kind:'pet',id:'EVT_PET_015',name:'Snowbell Pup',rarity:'common'}},
    {points:6500,reward:{kind:'title',id:'title_winter_light',name:'Winter Light',rarity:'epic'}},
    {points:10000,reward:{kind:'companion',id:'EVT_UNIT_009',name:'Frostbell Herald',rarity:'epic'}},
  ],
  objectives:[
    {id:'winter_watch',name:'Winter Watch',description:'Defeat 300 ordinary enemies along the winter roads.',source:'combat',required:300,rewardCurrency:300,rewardPrestige:1},
    {id:'winter_provisions',name:'Winter Provisions',description:'Spend 180 active minutes gathering festival supplies.',source:'gathering',required:180,rewardCurrency:280,rewardPrestige:1},
    {id:'gift_orders',name:'Gift Orders',description:'Complete 12 crafting recipes for Frostfall.',source:'crafting',required:12,rewardCurrency:350,rewardPrestige:1},
    {id:'winter_guardian',name:'Winter Guardian',description:'Defeat an eligible event boss.',source:'boss',required:1,rewardCurrency:500,rewardPrestige:2},
  ],
  weeklyObjectives:[
    {id:'weekly_winter_watch',name:'Roadkeeper',description:'Defeat 1,800 ordinary enemies this week.',source:'combat',required:1800,rewardCurrency:1000,rewardPrestige:2},
    {id:'weekly_provisions',name:'Festival Supplier',description:'Spend 900 active minutes gathering this week.',source:'gathering',required:900,rewardCurrency:950,rewardPrestige:2},
    {id:'weekly_gifts',name:'Master Giftmaker',description:'Complete 50 crafting recipes this week.',source:'crafting',required:50,rewardCurrency:1150,rewardPrestige:2},
  ],
  shop:[
    {id:'frostfall_wave',reward:{kind:'emote',id:'emote_frostfall_wave',name:'Frostfall Wave',rarity:'rare'},currency:'common',cost:900,limit:1},
    {id:'hearth_guest_title',reward:{kind:'title',id:'title_hearth_guest',name:'Hearth Guest',rarity:'rare'},currency:'common',cost:1200,limit:1},
    {id:'bellringer_title',reward:{kind:'title',id:'title_bellringer',name:'Bellringer',rarity:'epic'},currency:'common',cost:1800,limit:1},
    {id:'aurora_walker_title',reward:{kind:'title',id:'title_aurora_walker',name:'Aurora Walker',rarity:'epic'},currency:'prestige',cost:4,limit:1},
    {id:'frostfall_aurora_fox',reward:{kind:'pet',id:'EVT_PET_017',name:'Aurora Fox',rarity:'mythic'},currency:'prestige',cost:12,limit:1},
  ],
  choices:[
    {id:'snow_patrols',name:'Snow Patrols',description:'Keep roads clear and defend travelers during the festival.',bonusLabel:'+20% Frostbell Tokens from combat',dropMultipliers:{combat:1.2}},
    {id:'hearth_supplies',name:'Hearth Supplies',description:'Gather fuel, fish, herbs, and provisions for winter feasts.',bonusLabel:'+20% Frostbell Tokens from gathering',dropMultipliers:{gathering:1.2}},
    {id:'gift_workshop',name:'Gift Workshop',description:'Craft decorations, gifts, and supplies for the festival.',bonusLabel:'+20% Frostbell Tokens from crafting',dropMultipliers:{crafting:1.2}},
    {id:'winter_champions',name:'Winter Champions',description:'Challenge powerful threats before they reach the celebrations.',bonusLabel:'+20% boss Frostbell Tokens',dropMultipliers:{boss:1.2}},
  ],
  dailyGifts:[...gifts],
  communityEnabled:true,
  communityGoal:100000,
  communityMilestones:[
    {percent:25,rewardCurrency:200,rewardPrestige:0},
    {percent:50,rewardCurrency:350,rewardPrestige:1},
    {percent:75,rewardCurrency:500,rewardPrestige:1},
    {percent:100,rewardCurrency:750,rewardPrestige:2,reward:{kind:'title',id:'title_hearth_builder',name:'Hearth Builder',rarity:'epic'}},
  ],
  discoveries:[
    {id:'snowbell_fragment',name:'Snowbell Fragment',description:'A tiny frozen bell-clapper found after ordinary combat.',source:'combat',chance:.003,required:5,reward:{kind:'title',id:'title_snowbell_seeker',name:'Snowbell Seeker',rarity:'rare'}},
    {id:'gift_ribbon_scrap',name:'Enchanted Ribbon Scrap',description:'A festive ribbon hidden among gathered supplies.',source:'gathering',chance:.015,required:5,reward:{kind:'title',id:'title_ribbon_finder',name:'Ribbon Finder',rarity:'rare'}},
    {id:'aurora_bell_shard',name:'Aurora Bell Shard',description:'A resonant shard carried by eligible event bosses.',source:'boss',chance:.25,required:1,reward:{kind:'emote',id:'emote_aurora_chime',name:'Aurora Chime',rarity:'epic'}},
  ],
};

import type {RegionalAchievementV21,RegionalActivityV21,RegionalBossMasteryV21,RegionalCollectionBookV21,RegionalContractTemplateV21,RegionalSideQuestV21,RegionalWeatherRuleV21} from './region-gameplay-v21';

export const SUNSCAR_SIDE_QUESTS_V21:readonly RegionalSideQuestV21[]=[
  {id:'SUNSQ_001',regionId:'REG_002',zoneId:'ZONE_006',level:26,name:'Ledger of Lost Water',summary:'Recover caravan water ledgers and identify where the route is being sabotaged.',objectiveTags:['combat','exploration','spice_thief'],rewardHooks:['gold','SUNRES_005','regional_material_cache'],repeatable:false},
  {id:'SUNSQ_002',regionId:'REG_002',zoneId:'ZONE_006',level:28,name:'Wings in the Grain',summary:'Cull a Glasswing Locust bloom without destroying the caravan stores.',objectiveTags:['combat','precision','glasswing_locust'],rewardHooks:['glass_chitin','sunscar_food_cache'],repeatable:false},
  {id:'SUNSQ_003',regionId:'REG_002',zoneId:'ZONE_007',level:31,name:'Shade for the Road',summary:'Gather Charbark and establish heat shelters along the Scorchwind route.',objectiveTags:['woodcutting','gathering','charbark'],rewardHooks:['SUNRES_006','guild_project_material_hook'],repeatable:false},
  {id:'SUNSQ_004',regionId:'REG_002',zoneId:'ZONE_007',level:34,name:'Venom in Glass',summary:'Study Sunspine venom and defeat a marked scorpion without taking its telegraphed sting.',objectiveTags:['combat','avoid_telegraph','sunspine_scorpion'],rewardHooks:['SUNRES_009','alchemy_recipe_hook'],repeatable:false},
  {id:'SUNSQ_005',regionId:'REG_002',zoneId:'ZONE_008',level:35,name:'The Honest Reflection',summary:'Identify real oasis markers among mirage copies and recover a memory fragment.',objectiveTags:['exploration','echo','mirage_basin'],rewardHooks:['mirage_essence','PET_020_progress'],repeatable:false},
  {id:'SUNSQ_006',regionId:'REG_002',zoneId:'ZONE_009',level:39,name:'Calibrate the Stars',summary:'Restore three observatory lenses while avoiding deterministic Starfall zones.',objectiveTags:['exploration','interrupt','astral_script'],rewardHooks:['SUNRES_011','relic_pity_REL_015'],repeatable:false},
  {id:'SUNSQ_007',regionId:'REG_002',zoneId:'ZONE_010',level:43,name:'Shells of the Old Crown',summary:'Break Royal Guard links and recover intact chitin from Crown Guard Scarabs.',objectiveTags:['combat','guardian_break','royal_chitin'],rewardHooks:['SUNRES_010','cosmetic_token'],repeatable:false},
  {id:'SUNSQ_008',regionId:'REG_002',zoneId:'ZONE_006',level:45,name:'Stores for the North',summary:'Prepare a mixed shipment of food, timber and Tyrant Seals for the Frostmarch expedition.',objectiveTags:['mixed','fishing','woodcutting','combat'],rewardHooks:['frostmarch_supply_cache','account_xp'],repeatable:false},
] as const;

export const SUNSCAR_ACTIVITIES_V21:readonly RegionalActivityV21[]=[
  {id:'SUNACT_001',regionId:'REG_002',zoneId:'ZONE_007',kind:'gathering',level:28,name:'Sunstone Vein',expectedMinutes:8,difficulty:'routine',inputs:[],outputs:['SUNRES_001'],contributionEligible:true,notes:'Standard mining loop; White Sun can raise risk and yield through the existing weather/echo router.'},
  {id:'SUNACT_002',regionId:'REG_002',zoneId:'ZONE_007',kind:'gathering',level:33,name:'Charbark Stand',expectedMinutes:9,difficulty:'routine',inputs:[],outputs:['SUNRES_006'],contributionEligible:true,notes:'Woodcutting loop with heat-pressure flavour; no mandatory consumable.'},
  {id:'SUNACT_003',regionId:'REG_002',zoneId:'ZONE_008',kind:'fishing',level:37,name:'Glassfin Pool',expectedMinutes:10,difficulty:'challenging',inputs:[],outputs:['SUNRES_007','SUNRES_008'],contributionEligible:true,notes:'Rare Glassfin chance is server-owned and can react to weather without client authority.'},
  {id:'SUNACT_004',regionId:'REG_002',zoneId:'ZONE_009',kind:'exploration',level:39,name:'Astral Survey',expectedMinutes:12,difficulty:'challenging',inputs:[],outputs:['SUNRES_011','observatory_discovery_progress'],contributionEligible:true,notes:'Exploration loop that rewards correctly resolving lens/Starfall prompts.'},
  {id:'SUNACT_005',regionId:'REG_002',zoneId:'ZONE_010',kind:'combat',level:43,name:'Royal Scarab Hunt',expectedMinutes:11,difficulty:'hard',inputs:[],outputs:['SUNRES_010','SUNRES_012_chance'],contributionEligible:true,notes:'Elite-capable combat hunt; standardized social contribution uses authoritative settlement time/difficulty.'},
] as const;

export const SUNSCAR_ACHIEVEMENTS_V21:readonly RegionalAchievementV21[]=[
  {id:'SUNACH_001',regionId:'REG_002',name:'Across the Burning Road',category:'exploration',requirement:'Discover and clear the exploration objective in all five Sunscar zones.',rewardHooks:['sunscar_profile_border'],accountWide:true},
  {id:'SUNACH_002',regionId:'REG_002',name:'No False Step',category:'echo',requirement:'Resolve each of the four Sunscar Echo conditions at least once.',rewardHooks:['PET_022_unlock_progress'],accountWide:true},
  {id:'SUNACH_003',regionId:'REG_002',name:'Caravan Veteran',category:'dungeon',requirement:'Complete each Sunscar co-op dungeon 5 times with participation eligibility.',rewardHooks:['sunscar_dungeon_title'],accountWide:true},
  {id:'SUNACH_004',regionId:'REG_002',name:'The Crown Breaks',category:'combat',requirement:'Defeat the Sand Tyrant and complete mastery tiers 1–3.',rewardHooks:['tyrant_cosmetic_token'],accountWide:true},
  {id:'SUNACH_005',regionId:'REG_002',name:'Desert Naturalist',category:'collection',requirement:'Complete the Sunscar Monsters collection book.',rewardHooks:['sunscar_collection_background'],accountWide:true},
  {id:'SUNACH_006',regionId:'REG_002',name:'Sunscar Complete',category:'meta',requirement:'Complete the regional story, collection, Echo and co-op meta requirements.',rewardHooks:['UNIT_016','sunscar_meta_badge'],accountWide:true},
] as const;

export const SUNSCAR_COLLECTION_BOOKS_V21:readonly RegionalCollectionBookV21[]=[
  {id:'SUNBOOK_001',regionId:'REG_002',name:'Sunscar Monsters',entryIds:Array.from({length:16},(_,i)=>`SUNMON_${String(i+1).padStart(3,'0')}`),completionRewardHooks:['sunscar_cosmetic_token','sunscar_profile_border_progress']},
] as const;

export const SUNSCAR_WEATHER_RULES_V21:readonly RegionalWeatherRuleV21[]=[
  {id:'SUNWEA_001',regionId:'REG_002',weatherKey:'Clear Heat',zones:['ZONE_006','ZONE_007'],effects:{enemyFirePowerAdditive:0.03,gatheringCycleTimeMultiplier:0.98},playerFacingSummary:'Heat slightly empowers fire pressure but makes exposed gathering nodes faster to work.',safetyRule:'No mandatory consumable or equipment requirement; weather modifies efficiency, not access.'},
  {id:'SUNWEA_002',regionId:'REG_002',weatherKey:'Glasswind',zones:['ZONE_007','ZONE_009'],effects:{accuracyAdditive:-0.02,rareMaterialRelativeMultiplier:1.05},playerFacingSummary:'Glasswind makes precision harder while exposing rare deposits.',safetyRule:'No mandatory consumable or equipment requirement; penalties stay modest and readable.'},
  {id:'SUNWEA_003',regionId:'REG_002',weatherKey:'Sandstorm',zones:['ZONE_006','ZONE_007','ZONE_010'],effects:{eliteChanceAdditive:0.03,evasionAdditive:0.02},playerFacingSummary:'Visibility drops and elite activity increases.',safetyRule:'No mandatory consumable or equipment requirement; boss access never depends on weather.'},
] as const;

export const SUNSCAR_CONTRACTS_V21:readonly RegionalContractTemplateV21[]=[
  {id:'SUNCON_001',regionId:'REG_002',category:'combat',name:'Scorchwind Suppression',minLevel:30,objectiveTags:['sunscar','combat','elite'],targetStandardizedMinutes:70,rewardHooks:['gold','SUNRES_009','regional_material_cache'],exactQuestDependency:false},
  {id:'SUNCON_002',regionId:'REG_002',category:'skilling',name:'Oasis Stores',minLevel:32,objectiveTags:['sunscar','fishing','herbalism','woodcutting'],targetStandardizedMinutes:70,rewardHooks:['gold','SUNRES_004','regional_material_cache'],exactQuestDependency:false},
  {id:'SUNCON_003',regionId:'REG_002',category:'mixed',name:'Observatory Resupply',minLevel:37,objectiveTags:['sunscar','combat','exploration','gathering'],targetStandardizedMinutes:80,rewardHooks:['gold','SUNRES_011','relic_pity_small'],exactQuestDependency:false},
] as const;

export const SUNSCAR_BOSS_MASTERY_V21:readonly RegionalBossMasteryV21[]=[
  {id:'SUNMASTER_001',regionId:'REG_002',bossId:'BOSS_002',tier:1,requirement:'Defeat the Sand Tyrant.',rewardHooks:['boss_mastery_badge_1'],powerReward:false},
  {id:'SUNMASTER_002',regionId:'REG_002',bossId:'BOSS_002',tier:2,requirement:'Defeat the Sand Tyrant without being hit by Sandstorm Collapse.',rewardHooks:['boss_mastery_badge_2','cosmetic_token'],powerReward:false},
  {id:'SUNMASTER_003',regionId:'REG_002',bossId:'BOSS_002',tier:3,requirement:'Complete all three phase-specific mastery checks in one eligible kill.',rewardHooks:['boss_mastery_title'],powerReward:false},
  {id:'SUNMASTER_004',regionId:'REG_002',bossId:'BOSS_002',tier:4,requirement:'Complete the regional prestige challenge after the account has unlocked Frostmarch.',rewardHooks:['PET_023_prestige_progress','profile_trophy'],powerReward:false},
] as const;

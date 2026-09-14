import type { CombatStatsV20, DamagePacketPolicyV20 } from './combat-stat-contract-v20';
import { mechanicDamagePolicyV20, validateCombatStatsV20 } from './combat-stat-contract-v20';

export type SunscarZoneId='ZONE_006'|'ZONE_007'|'ZONE_008'|'ZONE_009'|'ZONE_010';
export type SunscarDamageType='physical'|'fire'|'poison'|'arcane'|'shadow'|'nature';
export type SunscarEnemyRole='striker'|'skirmisher'|'swarm'|'bruiser'|'assassin'|'tank'|'hunter'|'caster'|'support'|'disruptor'|'artillery'|'guardian';

export interface SunscarZoneV20 {
  id:SunscarZoneId;
  name:string;
  levelMin:number;
  levelMax:number;
  unlockQuestId:string;
  identity:string;
  hazards:readonly string[];
  gathering:readonly string[];
}

export interface SunscarEnemyV20 {
  id:string;
  name:string;
  level:number;
  zoneId:SunscarZoneId;
  role:SunscarEnemyRole;
  damageType:SunscarDamageType;
  stats:CombatStatsV20;
  signatureMechanic:string;
  mechanicPolicy:DamagePacketPolicyV20;
  drops:readonly string[];
}

export interface SunscarBossPhaseV20 {
  id:string;
  startsAtHpFraction:number;
  name:string;
  mechanics:readonly string[];
}

export interface SunscarBossV20 {
  id:string;
  name:string;
  level:number;
  zoneId:SunscarZoneId;
  role:'boss';
  damageTypes:readonly SunscarDamageType[];
  stats:CombatStatsV20;
  phases:readonly SunscarBossPhaseV20[];
  telegraphedMechanics:readonly string[];
  rewardHooks:readonly string[];
  equipmentRewardsFinalized:false;
}

export interface SunscarResourceV20 {id:string;name:string;source:string;skill:string;requiredLevel:number;rarity:'common'|'uncommon'|'rare'|'epic';sinks:readonly string[];}
export interface SunscarQuestV20 {id:string;order:number;name:string;zoneId:SunscarZoneId;level:number;objective:string;unlocks:readonly string[];}
export interface SunscarEchoConditionV20 {id:string;name:string;zoneIds:readonly SunscarZoneId[];effects:Readonly<Record<string,number|boolean|string>>;positiveTradeoff:string;}
export interface SunscarRelicHookV20 {id:string;name:string;profileFit:string;mechanic:string;source:string;pity:number;tuningStatus:'mechanic_hook_needs_final_numeric_tuning';}
export interface SunscarCollectibleUnlockV20 {id:string;kind:'pet'|'companion';name:string;rarity:'common'|'rare'|'epic'|'mythic';source:string;identity:string;roleHint?:'damage'|'tank'|'support';tuningStatus:'source_hook_only';}

export const SUNSCAR_ZONES_V20:readonly SunscarZoneV20[]=[
  {id:'ZONE_006',name:'Saffron Gate',levelMin:25,levelMax:29,unlockQuestId:'SUNQ_001',identity:'Caravan gate, spice roads and the first desert settlements.',hazards:['sand gusts','smoke ambushes'],gathering:['Dunewood']},
  {id:'ZONE_007',name:'Scorchwind Flats',levelMin:30,levelMax:35,unlockQuestId:'SUNQ_003',identity:'Open glass-sand flats where exposure and heat alter fights.',hazards:['heat pressure','glasswind lanes'],gathering:['Sunstone Ore','Charbark']},
  {id:'ZONE_008',name:'Mirage Basin',levelMin:32,levelMax:38,unlockQuestId:'SUNQ_005',identity:'Oasis basin where false targets and reflected memories distort combat.',hazards:['illusion copies','accuracy distortion'],gathering:['Saffron Reed','Mirage Bloom','Oasis Carp','Glassfin']},
  {id:'ZONE_009',name:'Buried Observatory',levelMin:37,levelMax:43,unlockQuestId:'SUNQ_006',identity:'Ancient star machinery beneath the desert, rich in lenses and astral script.',hazards:['rotating beams','starfall zones'],gathering:['Amberglass']},
  {id:'ZONE_010',name:"Tyrant's Crown",levelMin:42,levelMax:45,unlockQuestId:'SUNQ_008',identity:'Royal ruins and sand-pillars surrounding the Sand Tyrant.',hazards:['royal heat','sand pillars','burrow tremors'],gathering:['Royal Chitin','Tyrant Seal']},
] as const;

const stats=(v:CombatStatsV20):CombatStatsV20=>{const errors=validateCombatStatsV20(v);if(errors.length)throw new Error(`invalid_sunscar_stats:${errors.join(',')}`);return v;};
const mech=mechanicDamagePolicyV20;

export const SUNSCAR_ENEMIES_V20:readonly SunscarEnemyV20[]=[
  {id:'SUNMON_001',name:'Dune Jackal',level:25,zoneId:'ZONE_006',role:'striker',damageType:'physical',stats:stats({maxHp:565,power:52,accuracy:82,armor:34,ward:18,evasion:20,critChance:.08,critDamage:1.5,haste:.04,tenacity:.08,healingPower:0,shieldingPower:0}),signatureMechanic:'Pack Hunt: gains modest accuracy when another Jackal is present.',mechanicPolicy:mech({telegraphed:false,avoidable:false,basicAttack:true}),drops:['jackal_leather','dune_fang']},
  {id:'SUNMON_002',name:'Spice Thief',level:27,zoneId:'ZONE_006',role:'skirmisher',damageType:'physical',stats:stats({maxHp:590,power:54,accuracy:88,armor:30,ward:24,evasion:28,critChance:.09,critDamage:1.55,haste:.07,tenacity:.10,healingPower:0,shieldingPower:0}),signatureMechanic:'Smoke Step: brief accuracy penalty, then a repositioning strike.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['saffron_cloth','thief_coins']},
  {id:'SUNMON_003',name:'Glasswing Locust',level:29,zoneId:'ZONE_006',role:'swarm',damageType:'physical',stats:stats({maxHp:520,power:51,accuracy:86,armor:28,ward:20,evasion:34,critChance:.06,critDamage:1.45,haste:.14,tenacity:.06,healingPower:0,shieldingPower:0}),signatureMechanic:'Wingstorm: rapid low-damage multi-hit sequence.',mechanicPolicy:mech({telegraphed:true,avoidable:false}),drops:['glass_chitin']},
  {id:'SUNMON_004',name:'Scorchscale Lizard',level:30,zoneId:'ZONE_007',role:'bruiser',damageType:'fire',stats:stats({maxHp:760,power:60,accuracy:84,armor:46,ward:35,evasion:16,critChance:.06,critDamage:1.5,haste:.02,tenacity:.14,healingPower:0,shieldingPower:0}),signatureMechanic:'Heat Scale: repeated hits build a short fire-pressure stack.',mechanicPolicy:mech({telegraphed:false,avoidable:false,basicAttack:true}),drops:['scorchscale','desert_meat']},
  {id:'SUNMON_005',name:'Sunspine Scorpion',level:32,zoneId:'ZONE_007',role:'assassin',damageType:'poison',stats:stats({maxHp:690,power:64,accuracy:94,armor:38,ward:30,evasion:26,critChance:.12,critDamage:1.6,haste:.08,tenacity:.12,healingPower:0,shieldingPower:0}),signatureMechanic:'Sunspine Sting: clear telegraph; failure applies poison pressure.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['SUNRES_009','scorpion_carapace']},
  {id:'SUNMON_006',name:'Dune Strider',level:34,zoneId:'ZONE_007',role:'tank',damageType:'physical',stats:stats({maxHp:1040,power:62,accuracy:82,armor:72,ward:42,evasion:10,critChance:.04,critDamage:1.45,haste:-.02,tenacity:.24,healingPower:0,shieldingPower:16}),signatureMechanic:'Shell Brace: short high-armor state that rewards timing rather than raw DPS.',mechanicPolicy:mech({telegraphed:true,avoidable:false}),drops:['strider_hide','sunstone_fragment']},
  {id:'SUNMON_007',name:'Ash Vulture',level:35,zoneId:'ZONE_007',role:'hunter',damageType:'physical',stats:stats({maxHp:740,power:69,accuracy:96,armor:34,ward:32,evasion:32,critChance:.13,critDamage:1.55,haste:.09,tenacity:.10,healingPower:0,shieldingPower:0}),signatureMechanic:'Carrion Focus: prioritizes wounded targets but exposes itself during the dive.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['ash_feather','vulture_talon']},
  {id:'SUNMON_008',name:'Mirage Eel',level:32,zoneId:'ZONE_008',role:'caster',damageType:'arcane',stats:stats({maxHp:650,power:66,accuracy:91,armor:26,ward:54,evasion:30,critChance:.08,critDamage:1.55,haste:.08,tenacity:.14,healingPower:0,shieldingPower:0}),signatureMechanic:'False Current: creates an illusion copy; the true cast has a subtle tell.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['mirage_essence','oasis_fish']},
  {id:'SUNMON_009',name:'Oasis Keeper',level:35,zoneId:'ZONE_008',role:'support',damageType:'nature',stats:stats({maxHp:830,power:56,accuracy:84,armor:40,ward:60,evasion:16,critChance:.04,critDamage:1.4,haste:.05,tenacity:.20,healingPower:46,shieldingPower:18}),signatureMechanic:'Keeper Bloom: heals nearby monsters unless interrupted or pressured.',mechanicPolicy:mech({telegraphed:true,avoidable:false}),drops:['oasis_herb','water_pearl']},
  {id:'SUNMON_010',name:'Shimmer Wraith',level:38,zoneId:'ZONE_008',role:'disruptor',damageType:'arcane',stats:stats({maxHp:800,power:74,accuracy:98,armor:28,ward:68,evasion:38,critChance:.09,critDamage:1.55,haste:.10,tenacity:.24,healingPower:0,shieldingPower:0}),signatureMechanic:'Refraction: applies a temporary accuracy debuff and shifts position.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['mirage_essence']},
  {id:'SUNMON_011',name:'Star-Scribed Scarab',level:37,zoneId:'ZONE_009',role:'tank',damageType:'arcane',stats:stats({maxHp:1200,power:68,accuracy:88,armor:80,ward:72,evasion:8,critChance:.04,critDamage:1.45,haste:-.03,tenacity:.30,healingPower:0,shieldingPower:30}),signatureMechanic:'Runic Shell: alternates Armor- and Ward-favored protection.',mechanicPolicy:mech({telegraphed:true,avoidable:false}),drops:['star_glass','scarab_plate']},
  {id:'SUNMON_012',name:'Dustbound Astronomer',level:39,zoneId:'ZONE_009',role:'caster',damageType:'arcane',stats:stats({maxHp:900,power:82,accuracy:101,armor:34,ward:74,evasion:20,critChance:.08,critDamage:1.6,haste:.06,tenacity:.22,healingPower:0,shieldingPower:0}),signatureMechanic:'Starfall Script: interruptible cast placing deterministic impact zones.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['SUNRES_011','relic_script']},
  {id:'SUNMON_013',name:'Solar Construct',level:41,zoneId:'ZONE_009',role:'artillery',damageType:'fire',stats:stats({maxHp:1120,power:87,accuracy:104,armor:68,ward:58,evasion:12,critChance:.05,critDamage:1.5,haste:.01,tenacity:.28,healingPower:0,shieldingPower:0}),signatureMechanic:'Solar Beam: fixed line telegraph; the beam itself cannot crit.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['sun_core','amberglass_shard']},
  {id:'SUNMON_014',name:'Void Lens',level:43,zoneId:'ZONE_009',role:'disruptor',damageType:'shadow',stats:stats({maxHp:1050,power:92,accuracy:108,armor:46,ward:82,evasion:24,critChance:.07,critDamage:1.6,haste:.08,tenacity:.32,healingPower:0,shieldingPower:22}),signatureMechanic:'Reflection Window: attacking into the obvious reflect state is punished.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['void_lens_shard','SUNRES_011']},
  {id:'SUNMON_015',name:'Crown Guard Scarab',level:43,zoneId:'ZONE_010',role:'guardian',damageType:'physical',stats:stats({maxHp:1420,power:88,accuracy:96,armor:96,ward:66,evasion:8,critChance:.04,critDamage:1.45,haste:0,tenacity:.38,healingPower:0,shieldingPower:40}),signatureMechanic:'Royal Guard: redirects part of an ally\'s incoming damage until broken.',mechanicPolicy:mech({telegraphed:true,avoidable:false}),drops:['SUNRES_010','royal_shell']},
  {id:'SUNMON_016',name:'Tyrant Herald',level:45,zoneId:'ZONE_010',role:'caster',damageType:'fire',stats:stats({maxHp:1240,power:101,accuracy:110,armor:52,ward:86,evasion:18,critChance:.09,critDamage:1.6,haste:.08,tenacity:.36,healingPower:18,shieldingPower:20}),signatureMechanic:'Sand Pillar: summons a clearly marked pillar that must be repositioned around.',mechanicPolicy:mech({telegraphed:true,avoidable:true}),drops:['SUNRES_012','tyrant_seal_fragment']},
] as const;

export const SUNSCAR_BOSSES_V20:readonly SunscarBossV20[]=[
  {id:'SUNBOSS_DUN_001',name:'The Shardback Colossus',level:30,zoneId:'ZONE_007',role:'boss',damageTypes:['physical','fire'],stats:stats({maxHp:6900,power:83,accuracy:98,armor:92,ward:58,evasion:4,critChance:.06,critDamage:1.5,haste:0,tenacity:.48,healingPower:0,shieldingPower:40}),phases:[{id:'plate',startsAtHpFraction:1,name:'Armored Crossing',mechanics:['exposed crystal plates','caravan aggro routing']},{id:'glasswind',startsAtHpFraction:.60,name:'Glasswind',mechanics:['alternating haste/slow wind lanes','party split pressure']},{id:'fracture',startsAtHpFraction:.25,name:'Fracture Run',mechanics:['rapid plate break','caravan final stand']}],telegraphedMechanics:['Shard Charge','Glasswind Wall','Crystal Slam'],rewardHooks:['sunstone','cosmetic_cache','generic_equipment_reward_hook'],equipmentRewardsFinalized:false},
  {id:'SUNBOSS_DUN_002',name:'The Thirsting Reflection',level:36,zoneId:'ZONE_008',role:'boss',damageTypes:['arcane','nature'],stats:stats({maxHp:9100,power:96,accuracy:108,armor:62,ward:102,evasion:18,critChance:.07,critDamage:1.55,haste:.05,tenacity:.52,healingPower:48,shieldingPower:30}),phases:[{id:'mirrors',startsAtHpFraction:1,name:'Mirrored Surface',mechanics:['identify true target','false heal bait']},{id:'drain',startsAtHpFraction:.65,name:'Dry Basin',mechanics:['resource-drain channels','oasis anchors']},{id:'many_faces',startsAtHpFraction:.30,name:'Many Faces',mechanics:['three illusion lanes','shared reveal mechanic']}],telegraphedMechanics:['Mirror Burst','Thirst Wave','False Bloom'],rewardHooks:['mirage_materials','REL_013_chance','generic_equipment_reward_hook'],equipmentRewardsFinalized:false},
  {id:'SUNBOSS_DUN_003',name:'The Starwheel Custodian',level:40,zoneId:'ZONE_009',role:'boss',damageTypes:['arcane','fire'],stats:stats({maxHp:11800,power:108,accuracy:114,armor:88,ward:112,evasion:8,critChance:.06,critDamage:1.55,haste:.04,tenacity:.58,healingPower:0,shieldingPower:55}),phases:[{id:'alignment',startsAtHpFraction:1,name:'Alignment',mechanics:['rotating lens','interrupt order']},{id:'starfall',startsAtHpFraction:.60,name:'Falling Stars',mechanics:['safe quadrants','charged lenses']},{id:'overclock',startsAtHpFraction:.25,name:'Overclock',mechanics:['lens rotation accelerates','burnout windows']}],telegraphedMechanics:['Lens Sweep','Starfall Array','Solar Overload'],rewardHooks:['astral_materials','REL_015_chance','generic_equipment_reward_hook'],equipmentRewardsFinalized:false},
  {id:'BOSS_002',name:'The Sand Tyrant',level:45,zoneId:'ZONE_010',role:'boss',damageTypes:['physical','fire'],stats:stats({maxHp:16800,power:124,accuracy:120,armor:118,ward:94,evasion:10,critChance:.08,critDamage:1.6,haste:.03,tenacity:.65,healingPower:0,shieldingPower:70}),phases:[{id:'burrow',startsAtHpFraction:1,name:'Buried King',mechanics:['burrow tremors','add routing']},{id:'pillars',startsAtHpFraction:.66,name:'Crown of Pillars',mechanics:['solar pillars','royal scarabs']},{id:'sandstorm',startsAtHpFraction:.33,name:'Tyrant Sandstorm',mechanics:['moving safe lanes','final seal break']}],telegraphedMechanics:['Tyrant Charge','Solar Pillar','Sandstorm Collapse'],rewardHooks:['SUNRES_012','sunscar_regional_chest','frostmarch_unlock','generic_equipment_reward_hook'],equipmentRewardsFinalized:false},
] as const;

export const SUNSCAR_RESOURCES_V20:readonly SunscarResourceV20[]=[
  {id:'SUNRES_001',name:'Sunstone Ore',source:'Scorchwind Flats',skill:'Mining',requiredLevel:28,rarity:'common',sinks:['Smithing','upgrades','Guild Projects']},
  {id:'SUNRES_002',name:'Amberglass',source:'Buried Observatory',skill:'Mining',requiredLevel:36,rarity:'uncommon',sinks:['future equipment','Enchanting','relic fallback']},
  {id:'SUNRES_003',name:'Saffron Reed',source:'Mirage Basin',skill:'Herbalism',requiredLevel:32,rarity:'common',sinks:['Alchemy','Cooking','buffs']},
  {id:'SUNRES_004',name:'Mirage Bloom',source:'Mirage Basin',skill:'Herbalism',requiredLevel:36,rarity:'rare',sinks:['Accuracy consumables','Echo consumables','relic crafting']},
  {id:'SUNRES_005',name:'Dunewood',source:'Saffron Gate',skill:'Woodcutting',requiredLevel:26,rarity:'common',sinks:['future equipment','Guild Projects']},
  {id:'SUNRES_006',name:'Charbark',source:'Scorchwind Flats',skill:'Woodcutting',requiredLevel:33,rarity:'uncommon',sinks:['resistance consumables','Cooking fuel','upgrades']},
  {id:'SUNRES_007',name:'Oasis Carp',source:'Mirage Basin',skill:'Fishing',requiredLevel:32,rarity:'common',sinks:['Cooking','food buffs','Pet path']},
  {id:'SUNRES_008',name:'Glassfin',source:'Mirage Basin',skill:'Fishing',requiredLevel:37,rarity:'rare',sinks:['high-tier food','Alchemy','Collection']},
  {id:'SUNRES_009',name:'Scorpion Venom',source:'Sunspine Scorpion',skill:'Hunting',requiredLevel:32,rarity:'uncommon',sinks:['Alchemy','Effect Gems','poison consumables']},
  {id:'SUNRES_010',name:'Royal Chitin',source:"Tyrant's Crown",skill:'Combat',requiredLevel:43,rarity:'rare',sinks:['future equipment','Guild Bosses','Guild Projects']},
  {id:'SUNRES_011',name:'Astral Script',source:'Buried Observatory',skill:'Combat',requiredLevel:39,rarity:'rare',sinks:['Enchanting','Relics','quests']},
  {id:'SUNRES_012',name:'Tyrant Seal',source:'Tyrant Herald / Sand Tyrant',skill:'Combat',requiredLevel:45,rarity:'epic',sinks:['regional progression','Frostmarch preparation','cosmetics']},
] as const;

export const SUNSCAR_QUESTLINE_V20:readonly SunscarQuestV20[]=[
  {id:'SUNQ_001',order:1,name:'Through Saffron Gate',zoneId:'ZONE_006',level:25,objective:'Protect the entering caravan from Dune Jackals.',unlocks:['Sunscar core activities','ZONE_006']},
  {id:'SUNQ_002',order:2,name:'Price of Water',zoneId:'ZONE_006',level:27,objective:'Track Spice Thieves sabotaging the water route.',unlocks:['regional contracts']},
  {id:'SUNQ_003',order:3,name:'Scorchwind',zoneId:'ZONE_007',level:30,objective:'Survive the flats and hunt Scorchscale Lizards.',unlocks:['heat-preparation loop','COP_004']},
  {id:'SUNQ_004',order:4,name:'The Sting Below',zoneId:'ZONE_007',level:32,objective:'Defeat the Sunspine elite and investigate its migration.',unlocks:['UNIT_013 progression']},
  {id:'SUNQ_005',order:5,name:'A Lake That Lies',zoneId:'ZONE_008',level:34,objective:'Resolve the repeating Mirage Echo.',unlocks:['Mirage Echoes','COP_005']},
  {id:'SUNQ_006',order:6,name:'Stars Under Sand',zoneId:'ZONE_009',level:37,objective:'Clear the first Observatory route.',unlocks:['COP_006','Observatory exploration']},
  {id:'SUNQ_007',order:7,name:'The Broken Lens',zoneId:'ZONE_009',level:40,objective:'Interrupt the Astronomer and break the Void Lens.',unlocks:['Sunscar relic hunt']},
  {id:'SUNQ_008',order:8,name:'Crown of Sand',zoneId:'ZONE_010',level:42,objective:'Break three royal seals around the Crown.',unlocks:['BOSS_002 access']},
  {id:'SUNQ_009',order:9,name:'The Sand Tyrant',zoneId:'ZONE_010',level:45,objective:'Defeat The Sand Tyrant.',unlocks:['combat/skill cap raise','Frostmarch access']},
  {id:'SUNQ_010',order:10,name:'Northbound Embers',zoneId:'ZONE_006',level:45,objective:'Complete the departure preparations for the northern expedition.',unlocks:['Frostmarch transition']},
] as const;


export const SUNSCAR_ECHO_CONDITIONS_V20:readonly SunscarEchoConditionV20[]=[
  {id:'SECHO_001',name:'White Sun',zoneIds:['ZONE_007'],effects:{enemyDamageMultiplier:1.08,materialYieldMultiplier:1.06},positiveTradeoff:'Harder fights, richer gathering.'},
  {id:'SECHO_002',name:'False Oasis',zoneIds:['ZONE_008'],effects:{illusionCopySpawns:true,masteryXpMultiplier:1.08},positiveTradeoff:'More targets, mastery boost.'},
  {id:'SECHO_003',name:'Falling Stars',zoneIds:['ZONE_009'],effects:{periodicTelegraphedImpacts:true,rareDropRelativeMultiplier:1.05},positiveTradeoff:'Movement pressure with a modest rare-drop lift.'},
  {id:'SECHO_004',name:'Royal Heat',zoneIds:['ZONE_010'],effects:{eliteChanceAdditive:0.05,enemyHasteAdditive:0.05},positiveTradeoff:'More elite hunting opportunities at higher combat pressure.'},
] as const;

export const SUNSCAR_RELIC_HOOKS_V20:readonly SunscarRelicHookV20[]=[
  {id:'REL_013',name:'Mirage Compass',profileFit:'Wayfinder / mobility',mechanic:'First target swap every 15s grants brief Accuracy + Haste.',source:'Mirage Basin Echo',pity:40,tuningStatus:'mechanic_hook_needs_final_numeric_tuning'},
  {id:'REL_014',name:'Sun-Eaten Prayerbead',profileFit:'Dawnkeeper / sustain',mechanic:'Excess shield converts a small capped portion into resource.',source:'Sunscar co-op',pity:35,tuningStatus:'mechanic_hook_needs_final_numeric_tuning'},
  {id:'REL_015',name:'Astral Splinter',profileFit:'Hexweaver / timing',mechanic:'Interrupting a cast shortens the next non-ultimate cooldown.',source:'Buried Observatory',pity:40,tuningStatus:'mechanic_hook_needs_final_numeric_tuning'},
  {id:'REL_016',name:"Tyrant's Broken Signet",profileFit:'Any / boss preparation',mechanic:'After avoiding a telegraphed boss hit, gain short mitigation with an internal cooldown.',source:'Sand Tyrant',pity:50,tuningStatus:'mechanic_hook_needs_final_numeric_tuning'},
] as const;

export const SUNSCAR_COLLECTIBLE_UNLOCKS_V20:readonly SunscarCollectibleUnlockV20[]=[
  {id:'PET_019',kind:'pet',name:'Duneling',rarity:'common',source:'Scorchwind gathering milestone',identity:'Gathering utility collectible.',tuningStatus:'source_hook_only'},
  {id:'PET_020',kind:'pet',name:'Mirage Minnow',rarity:'rare',source:'Rare Mirage Basin fishing',identity:'Fishing utility collectible.',tuningStatus:'source_hook_only'},
  {id:'PET_021',kind:'pet',name:'Sunscarab',rarity:'rare',source:'Star-Scribed Scarab mastery',identity:'Crafting utility collectible.',tuningStatus:'source_hook_only'},
  {id:'PET_022',kind:'pet',name:'Tiny Sphinx',rarity:'epic',source:'Sunscar achievement meta',identity:'Exploration utility collectible.',tuningStatus:'source_hook_only'},
  {id:'PET_023',kind:'pet',name:'Tyrant Larva',rarity:'mythic',source:'Sand Tyrant prestige drop',identity:'Lore/prestige utility collectible.',tuningStatus:'source_hook_only'},
  {id:'UNIT_013',kind:'companion',name:'Dune Stalker',rarity:'rare',source:'Sunspine Scorpion mastery 20',identity:'Assassin / poison-pressure companion.',roleHint:'damage',tuningStatus:'source_hook_only'},
  {id:'UNIT_014',kind:'companion',name:'Oasis Djinnling',rarity:'epic',source:'Mirage Basin Echo achievement',identity:'Resource-utility companion.',roleHint:'support',tuningStatus:'source_hook_only'},
  {id:'UNIT_015',kind:'companion',name:'Solar Scarab',rarity:'epic',source:'Buried Observatory 20 clears',identity:'Guardian / reflect-timing companion.',roleHint:'tank',tuningStatus:'source_hook_only'},
  {id:'UNIT_016',kind:'companion',name:"Tyrant's Heir",rarity:'mythic',source:'Sunscar meta achievement',identity:'Prestige champion sidegrade; final role/power tuning belongs to the companion system.',tuningStatus:'source_hook_only'},
] as const;

export const SUNSCAR_EQUIPMENT_POLICY_V20={
  equipmentSetsAuthored:false,
  regionalWeaponsAuthored:false,
  regionalArmorAuthored:false,
  existingSpreadsheetSunscarGearStatus:'draft_do_not_implement',
  reason:'Equipment will be reworked after the expanded character/boss stat model is finalized. Sunscar content uses materials/reward hooks only.',
} as const;

for(const enemy of SUNSCAR_ENEMIES_V20){if(validateCombatStatsV20(enemy.stats).length) throw new Error(`invalid_enemy:${enemy.id}`);}
for(const boss of SUNSCAR_BOSSES_V20){if(validateCombatStatsV20(boss.stats).length) throw new Error(`invalid_boss:${boss.id}`);}

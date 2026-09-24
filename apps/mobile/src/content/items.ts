import { ClassId,GatheringSkillId,GearSlot,GemEffectId,GemSocketKind,GemStat } from '../core/types';
import {ItemRarity} from '../core/item-rarity';
import {NOVICE_ITEMS} from './novice-sets';
import {TOOL_ITEMS} from './gathering-tools';
import {HERB_ITEMS} from './herbalism';
import {POTION_ITEMS} from './alchemy';
import {EQUIPMENT_ITEMS_V33} from './equipment-items-v33';
import {GEM_ITEMS_V1,RAW_GEM_ITEMS_V1,type MobileGemGradeV1} from './gems-v1';
export interface ItemDef {
  id:string; name:string; type:'material'|'gear'|'quest'|'food'|'tool'|'gem'|'potion'; slot?:GearSlot;
  attack?:number; defense?:number; hp?:number; heal?:number; readiness?:number;
  toolSkillId?:GatheringSkillId;toolTier?:number;actionTimeMultiplier?:number;
  rarity?:ItemRarity; passive?:string;
  value:number; salvage?:{itemId:string;quantity:number};
  classRestriction?:ClassId; requiredLevel?:number; noviceSetId?:string; equipmentSetId?:string; rawGemFamilyId?:string; rawGemGrade?:MobileGemGradeV1;
  gemStat?:GemStat; gemPercent?:number; gemTier?:MobileGemGradeV1; gemKind?:GemSocketKind; gemEffect?:GemEffectId; gemEffectValue?:number;
  /** Canonical five-grade gem identity. Legacy shards/sigils omit these fields and remain migration-compatible. */
  gemFamilyId?:string; gemGrade?:MobileGemGradeV1;
}

const BASE_ITEMS:ItemDef[]=[
...NOVICE_ITEMS,
{id:'HOLY_WATER',name:'Holy Water',type:'material',value:0,rarity:'uncommon'},
...TOOL_ITEMS,
...HERB_ITEMS,
...POTION_ITEMS,
// Enhancement economy. Gems are intentionally scarce drops; tempering materials are universal.
{id:'GEM_DUST',name:'Gem Dust',type:'material',value:18,rarity:'uncommon'},
{id:'REGIONAL_CATALYST',name:'Regional Catalyst',type:'material',value:650,rarity:'epic'},
{id:'RADIANT_CATALYST',name:'Radiant Catalyst',type:'material',value:2400,rarity:'mythic'},
...RAW_GEM_ITEMS_V1,
...GEM_ITEMS_V1,
{id:'TEMPERING_DUST',name:'Tempering Dust',type:'material',value:22,rarity:'uncommon'},
{id:'TEMPERING_CORE',name:'Tempering Core',type:'material',value:180,rarity:'rare'},
{id:'EMBER_SHARD',name:'Ember Shard',type:'gem',gemStat:'attack',gemPercent:.02,gemTier:1,value:320,rarity:'rare'},
{id:'EMBERHEART_GEM',name:'Emberheart Gem',type:'gem',gemStat:'attack',gemPercent:.05,gemTier:2,value:1900,rarity:'legendary'},
{id:'WARD_SHARD',name:'Ward Shard',type:'gem',gemStat:'defense',gemPercent:.02,gemTier:1,value:320,rarity:'rare'},
{id:'WARDHEART_GEM',name:'Wardheart Gem',type:'gem',gemStat:'defense',gemPercent:.05,gemTier:2,value:1900,rarity:'legendary'},
{id:'VITALITY_SHARD',name:'Vitality Shard',type:'gem',gemStat:'hp',gemPercent:.02,gemTier:1,value:320,rarity:'rare'},
{id:'VITALITY_HEART_GEM',name:'Vitality Heart Gem',type:'gem',gemStat:'hp',gemPercent:.05,gemTier:2,value:1900,rarity:'legendary'},
// Effect Gems occupy the dedicated Effect socket. They modify combat behavior rather than primary stats.
{id:'SWIFT_SIGIL',name:'Swift Sigil',type:'gem',gemKind:'effect',gemEffect:'combat_speed',gemEffectValue:.02,gemTier:1,value:520,rarity:'rare',passive:'+2% combat speed while equipped'},
{id:'BOSSBANE_SIGIL',name:'Bossbane Sigil',type:'gem',gemKind:'effect',gemEffect:'boss_power',gemEffectValue:.03,gemTier:1,value:620,rarity:'rare',passive:'+3% combat power against bosses'},
{id:'BULWARK_SIGIL',name:'Bulwark Sigil',type:'gem',gemKind:'effect',gemEffect:'damage_reduction',gemEffectValue:.02,gemTier:1,value:620,rarity:'rare',passive:'-2% incoming combat damage'},
{id:'RENEWAL_SIGIL',name:'Renewal Sigil',type:'gem',gemKind:'effect',gemEffect:'recovery',gemEffectValue:.10,gemTier:1,value:560,rarity:'rare',passive:'+10% between-kill recovery'},
// Runtime pack weapon identities; numeric budgets retained from the prior primary weapons.
{id:'basic_sword',name:'Basic Sword',type:'gear',slot:'weapon',attack:4,readiness:1,value:10},
{id:'basic_tower_shield',name:'Basic Tower Shield',type:'gear',slot:'weapon',attack:3,defense:1,readiness:1,value:10},
{id:'basic_chained_weapon',name:'Basic Chained Weapon',type:'gear',slot:'weapon',attack:5,readiness:1,value:10},
{id:'basic_mace',name:'Basic Mace',type:'gear',slot:'weapon',attack:3,defense:1,readiness:1,value:10},
{id:'basic_bow',name:'Basic Bow',type:'gear',slot:'weapon',attack:5,readiness:1,value:10},
{id:'basic_two_handed_weapon',name:'Basic Two-Handed Weapon',type:'gear',slot:'weapon',attack:6,defense:-1,readiness:1,value:10},
{id:'basic_wand',name:'Basic Wand',type:'gear',slot:'weapon',attack:4,readiness:1,value:10},
{id:'basic_main_hand_blade',name:'Basic Main-Hand Blade',type:'gear',slot:'weapon',attack:4,readiness:1,value:10},
{id:'basic_staff',name:'Basic Staff',type:'gear',slot:'weapon',attack:4,hp:5,readiness:1,value:10},

{id:'TRAVEL_RATION',name:'Travel Ration',type:'food',heal:18,readiness:1,value:5},
{id:'COOKED_MEADOW_PERCH',name:'Cooked Meadow Perch',type:'food',heal:24,readiness:2,value:10},
{id:'COOKED_SILVERFIN',name:'Cooked Silverfin',type:'food',heal:30,readiness:3,value:15},
{id:'ROASTED_ROOTSTREAM_TROUT',name:'Roasted Rootstream Trout',type:'food',heal:40,readiness:4,value:25},
{id:'SEARED_RIVER_EEL',name:'Seared River Eel',type:'food',heal:52,readiness:5,value:34},
{id:'IRONWOOD_STEW',name:'Ironwood Hunter Stew',type:'food',heal:90,readiness:7,value:62},

{id:'COPPER_ORE',name:'Copper Ore',type:'material',value:5},

{id:'OATHSTONE_ORE',name:'Oathstone Ore',type:'material',value:32},
{id:'CROWNWOOD_LOG',name:'Crownwood Log',type:'material',value:30},
{id:'OATHSCALE_PIKE',name:'Oathscale Pike',type:'material',value:32},
{id:'COPPER_INGOT',name:'Copper Ingot',type:'material',value:28},
{id:'ASTER_IRON_INGOT',name:'Aster-Iron Ingot',type:'material',value:64},
{id:'OATHSTONE_INGOT',name:'Oathstone Ingot',type:'material',value:145},
{id:'REINFORCED_FITTING',name:'Reinforced Fitting',type:'material',value:155},
{id:'BAKED_CAVE_LOACH',name:'Baked Cave Loach',type:'food',heal:65,readiness:6,value:58},
{id:'ROASTED_CROWN_CARP',name:'Roasted Crown Carp',type:'food',heal:82,readiness:8,value:82},
{id:'ROASTED_OATHSCALE',name:'Roasted Oathscale Pike',type:'food',heal:95,readiness:8,value:90},


{id:'ASTER_IRON_ORE',name:'Aster-Iron Ore',type:'material',value:14},
{id:'SUNSTONE_ORE',name:'Sunstone Ore',type:'material',value:65},
{id:'AMBERGLASS',name:'Amberglass',type:'material',value:180,rarity:'uncommon'},
{id:'ASTRAL_SCRIPT',name:'Astral Script',type:'material',value:420,rarity:'rare'},
{id:'FROSTIRON',name:'Frostiron',type:'material',value:150},
{id:'BLACKGLASS_ORE',name:'Blackglass Ore',type:'material',value:240,rarity:'rare'},
{id:'RIMEGLASS',name:'Rimeglass',type:'material',value:430,rarity:'rare'},
{id:'CHOIR_BLOOM',name:'Choir Bloom',type:'material',value:480,rarity:'rare'},
// V33 regional resource identities. Source/drop wiring is authoritative on the backend.
{id:'SAFFRON_REED',name:'Saffron Reed',type:'material',value:95,rarity:'uncommon'},
{id:'MIRAGE_BLOOM',name:'Mirage Bloom',type:'material',value:160,rarity:'uncommon'},
{id:'DUNEWOOD',name:'Dunewood',type:'material',value:85,rarity:'uncommon'},
{id:'CHARBARK',name:'Charbark',type:'material',value:140,rarity:'uncommon'},
{id:'CINDERWOOD_LOG',name:'Cinderwood Log',type:'material',value:210,rarity:'rare'},
{id:'BLACKGLASS_INGOT',name:'Blackglass Ingot',type:'material',value:720,rarity:'epic'},
{id:'SUNSTONE_INGOT',name:'Sunstone Ingot',type:'material',value:260,rarity:'rare'},
{id:'FROSTIRON_INGOT',name:'Frostiron Ingot',type:'material',value:480,rarity:'rare'},
{id:'GRILLED_OASIS_CARP',name:'Grilled Oasis Carp',type:'food',heal:130,readiness:10,value:145,rarity:'uncommon'},
{id:'GLASSFIN_FEAST',name:'Amberglass Glassfin Feast',type:'food',heal:190,readiness:12,value:230,rarity:'rare'},
{id:'FROSTED_ICEFIN',name:'Frosted Icefin',type:'food',heal:250,readiness:14,value:340,rarity:'rare'},
{id:'CHARRED_EMBERFIN',name:'Charred Emberfin',type:'food',heal:330,readiness:16,value:455,rarity:'rare'},
{id:'ASHLANDS_EMBER_STEW',name:'Ashlands Ember Stew',type:'food',heal:390,readiness:17,value:520,rarity:'epic'},
{id:'OASIS_CARP',name:'Oasis Carp',type:'material',value:100,rarity:'uncommon'},
{id:'GLASSFIN',name:'Glassfin',type:'material',value:170,rarity:'rare'},
{id:'SCORPION_VENOM',name:'Scorpion Venom',type:'material',value:130,rarity:'uncommon'},
{id:'ROYAL_CHITIN',name:'Royal Chitin',type:'material',value:300,rarity:'rare'},
{id:'TYRANT_SEAL',name:'Tyrant Seal',type:'material',value:620,rarity:'rare'},
{id:'WHITEPINE_LOG',name:'Whitepine Log',type:'material',value:120,rarity:'uncommon'},
{id:'RIME_RESIN',name:'Rime Resin',type:'material',value:190,rarity:'uncommon'},
{id:'WINTERMINT',name:'Wintermint',type:'material',value:170,rarity:'uncommon'},
{id:'ICEFIN',name:'Icefin',type:'material',value:180,rarity:'rare'},
{id:'BELLFIN_SCALE',name:'Bellfin Scale',type:'material',value:260,rarity:'rare'},
{id:'WYRMSCALE',name:'Wyrm Scale',type:'material',value:520,rarity:'rare'},
{id:'FROZEN_HEART',name:'Frozen Heart',type:'material',value:900,rarity:'legendary'},
{id:'GREENWOOD_LOG',name:'Greenwood Log',type:'material',value:4},
{id:'IRONWOOD_LOG',name:'Ironwood Log',type:'material',value:13},
{id:'MEADOW_PERCH',name:'Meadow Perch',type:'material',value:4},
{id:'ROOTSTREAM_TROUT',name:'Rootstream Trout',type:'material',value:11},
{id:'CAVE_LOACH',name:'Cave Loach',type:'material',value:24},
{id:'CROWN_CARP',name:'Crown Carp',type:'material',value:40},
{id:'EMBERFIN',name:'Emberfin',type:'material',value:250,rarity:'rare'},
{id:'SILVERFIN',name:'Silverfin',type:'material',value:6},
{id:'RIVER_EEL',name:'River Eel',type:'material',value:15},


{id:'MOSS_FIBER',name:'Moss Fiber',type:'material',value:3},
{id:'WISP_DUST',name:'Wisp Dust',type:'material',value:7},
{id:'BOAR_HIDE',name:'Boar Hide',type:'material',value:8},
{id:'WOLF_PELT',name:'Wolf Pelt',type:'material',value:13},
{id:'IRONWOOD_FANG',name:'Ironwood Fang',type:'material',value:28},
{id:'THORN_SAP',name:'Thorn Sap',type:'material',value:20},
{id:'TROLL_HIDE',name:'Troll Hide',type:'material',value:42},
{id:'OATHGLASS_SHARD',name:'Oathglass Shard',type:'material',value:85},
{id:'ECHO_TOUCHED_PELT',name:'Echo-Touched Pelt',type:'material',value:140},
{id:'TORN_OATHCLOTH',name:'Torn Oathcloth',type:'material',value:95},
{id:'LANTERNSTEEL_SHARD',name:'Lanternsteel Shard',type:'material',value:125},
{id:'BANNER_ASH',name:'Banner Ash',type:'material',value:75},
{id:'BLACKGLASS_CORE',name:'Blackglass Core',type:'material',value:260,rarity:'rare'},
{id:'CINDER_HEART',name:'Cinder Heart',type:'material',value:420,rarity:'rare'},
{id:'REGENT_SIGIL',name:'Regent Sigil',type:'material',value:850,rarity:'legendary'},
{id:'FALLEN_RIVET',name:'Fallen Rivet',type:'material',value:90},
{id:'ECHO_QUARTZ',name:'Echo Quartz',type:'material',value:85},
{id:'OATHGLASS_FRAGMENT',name:'Oathglass Fragment',type:'material',value:130},
{id:'GLOAM_DUST',name:'Gloam Dust',type:'material',value:105},
{id:'EVENT_BONDBLOOM',name:'Event Bondbloom',type:'material',value:175},
{id:'RUNEBOUND_CORE',name:'Runebound Core',type:'material',value:150},
{id:'ECHO_BAT_WING',name:'Echo Bat Wing',type:'material',value:80},
{id:'FALLEN_KNIGHT_SIGIL',name:'Fallen Knight Sigil',type:'quest',value:0},

];
export const ITEMS:ItemDef[]=[...BASE_ITEMS,...EQUIPMENT_ITEMS_V33];
export function itemDef(id:string){const x=ITEMS.find(i=>i.id===id); if(!x) throw new Error(`Unknown item ${id}`); return x;}

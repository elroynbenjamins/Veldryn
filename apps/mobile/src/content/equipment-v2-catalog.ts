import type {ClassId,GearSlot} from '../core/types';
import type {EquipmentV2Tier,EquipmentV2Profile,EquipmentV2Affix} from '../core/equipment-crafting-v2-foundation';
import {EQUIPMENT_V2_PROFILES} from '../core/equipment-crafting-v2-foundation';

/** HIDDEN Equipment 2.0 catalogue. Stable EQ2_* IDs never alias a live V33 ID.
 * No item is spawned, equipped, traded, rendered in public lists or rolled by this module.
 * Role is a build recommendation, NOT a new class equip lock.
 */
export type EquipmentV2Role='tank'|'damage'|'support';
export type EquipmentV2Material='steel'|'mail'|'leather'|'cloth'|'jewelry';
export interface EquipmentV2Bonus{pieces:number;affix:EquipmentV2Affix;percent:number}
export interface EquipmentV2SetPiece{id:string;slot:GearSlot;profile:EquipmentV2Profile}
export interface EquipmentV2Set{id:string;tier:EquipmentV2Tier;name:string;role:EquipmentV2Role;material:EquipmentV2Material;pieces:readonly EquipmentV2SetPiece[];bonuses:readonly EquipmentV2Bonus[]}
export interface EquipmentV2Standalone{id:string;tier:EquipmentV2Tier;name:string;role:EquipmentV2Role;material:EquipmentV2Material;slot:GearSlot;profile:EquipmentV2Profile}
export interface EquipmentV2ClassWeapon{classId:ClassId;name:string;weaponKind:string;profile:EquipmentV2Profile;hands:'one'|'two'|'dual'}
export const EQUIPMENT_V2_SETS:readonly EquipmentV2Set[]=[
  {
    "id": "EQ2_SET_FIELDBORN_GUARD",
    "tier": 1,
    "name": "Fieldborn Guard",
    "role": "tank",
    "material": "steel",
    "pieces": [
      {
        "id": "EQ2_FIELDBORN_GUARD_HELMET",
        "slot": "helmet",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_FIELDBORN_GUARD_CHEST",
        "slot": "chest",
        "profile": "defense"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "armor",
        "percent": 1
      }
    ]
  },
  {
    "id": "EQ2_SET_FIELDBORN_TRAIL",
    "tier": 1,
    "name": "Fieldborn Trail",
    "role": "damage",
    "material": "leather",
    "pieces": [
      {
        "id": "EQ2_FIELDBORN_TRAIL_GLOVES",
        "slot": "gloves",
        "profile": "attack"
      },
      {
        "id": "EQ2_FIELDBORN_TRAIL_BOOTS",
        "slot": "boots",
        "profile": "attack_health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "accuracy",
        "percent": 0.6
      }
    ]
  },
  {
    "id": "EQ2_SET_FIELDBORN_ACOLYTE",
    "tier": 1,
    "name": "Fieldborn Acolyte",
    "role": "support",
    "material": "cloth",
    "pieces": [
      {
        "id": "EQ2_FIELDBORN_ACOLYTE_CAPE",
        "slot": "cape",
        "profile": "health"
      },
      {
        "id": "EQ2_FIELDBORN_ACOLYTE_AMULET",
        "slot": "amulet",
        "profile": "attack_health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "potency",
        "percent": 1
      }
    ]
  },
  {
    "id": "EQ2_SET_IRONWOOD_SENTINEL",
    "tier": 2,
    "name": "Ironwood Sentinel",
    "role": "tank",
    "material": "steel",
    "pieces": [
      {
        "id": "EQ2_IRONWOOD_SENTINEL_CHEST",
        "slot": "chest",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_IRONWOOD_SENTINEL_LEGS",
        "slot": "legs",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_IRONWOOD_SENTINEL_BOOTS",
        "slot": "boots",
        "profile": "defense"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "armor",
        "percent": 1.5
      },
      {
        "pieces": 3,
        "affix": "maxHp",
        "percent": 1.5
      }
    ]
  },
  {
    "id": "EQ2_SET_IRONWOOD_STALKER",
    "tier": 2,
    "name": "Ironwood Stalker",
    "role": "damage",
    "material": "leather",
    "pieces": [
      {
        "id": "EQ2_IRONWOOD_STALKER_HELMET",
        "slot": "helmet",
        "profile": "health"
      },
      {
        "id": "EQ2_IRONWOOD_STALKER_GLOVES",
        "slot": "gloves",
        "profile": "attack"
      },
      {
        "id": "EQ2_IRONWOOD_STALKER_CAPE",
        "slot": "cape",
        "profile": "attack_health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "critRate",
        "percent": 0.6
      },
      {
        "pieces": 3,
        "affix": "accuracy",
        "percent": 1
      }
    ]
  },
  {
    "id": "EQ2_SET_IRONWOOD_MENDER",
    "tier": 2,
    "name": "Ironwood Mender",
    "role": "support",
    "material": "cloth",
    "pieces": [
      {
        "id": "EQ2_IRONWOOD_MENDER_HELMET",
        "slot": "helmet",
        "profile": "health"
      },
      {
        "id": "EQ2_IRONWOOD_MENDER_GLOVES",
        "slot": "gloves",
        "profile": "attack_defense"
      },
      {
        "id": "EQ2_IRONWOOD_MENDER_AMULET",
        "slot": "amulet",
        "profile": "health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "potency",
        "percent": 1.5
      },
      {
        "pieces": 3,
        "affix": "ward",
        "percent": 1
      }
    ]
  },
  {
    "id": "EQ2_SET_SUNSCAR_THORNHIDE",
    "tier": 3,
    "name": "Sunscar Thornhide",
    "role": "tank",
    "material": "leather",
    "pieces": [
      {
        "id": "EQ2_SUNSCAR_THORNHIDE_CHEST",
        "slot": "chest",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_SUNSCAR_THORNHIDE_GLOVES",
        "slot": "gloves",
        "profile": "attack_defense"
      },
      {
        "id": "EQ2_SUNSCAR_THORNHIDE_CAPE",
        "slot": "cape",
        "profile": "health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "maxHp",
        "percent": 2
      },
      {
        "pieces": 3,
        "affix": "tenacity",
        "percent": 1.5
      }
    ]
  },
  {
    "id": "EQ2_SET_SUNSCAR_BREAKSTEEL",
    "tier": 3,
    "name": "Sunscar Breaksteel",
    "role": "damage",
    "material": "steel",
    "pieces": [
      {
        "id": "EQ2_SUNSCAR_BREAKSTEEL_CHEST",
        "slot": "chest",
        "profile": "defense"
      },
      {
        "id": "EQ2_SUNSCAR_BREAKSTEEL_LEGS",
        "slot": "legs",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_SUNSCAR_BREAKSTEEL_GLOVES",
        "slot": "gloves",
        "profile": "attack"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "penetration",
        "percent": 1.5
      },
      {
        "pieces": 3,
        "affix": "abilityDamage",
        "percent": 1.5
      }
    ]
  },
  {
    "id": "EQ2_SET_SUNSCAR_WILDROOT",
    "tier": 3,
    "name": "Sunscar Wildroot",
    "role": "support",
    "material": "leather",
    "pieces": [
      {
        "id": "EQ2_SUNSCAR_WILDROOT_HELMET",
        "slot": "helmet",
        "profile": "health"
      },
      {
        "id": "EQ2_SUNSCAR_WILDROOT_BOOTS",
        "slot": "boots",
        "profile": "attack_health"
      },
      {
        "id": "EQ2_SUNSCAR_WILDROOT_CAPE",
        "slot": "cape",
        "profile": "attack_health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "haste",
        "percent": 1
      },
      {
        "pieces": 3,
        "affix": "potency",
        "percent": 2
      }
    ]
  },
  {
    "id": "EQ2_SET_GLASSBOUND_BULWARK",
    "tier": 4,
    "name": "Glassbound Bulwark",
    "role": "tank",
    "material": "steel",
    "pieces": [
      {
        "id": "EQ2_GLASSBOUND_BULWARK_HELMET",
        "slot": "helmet",
        "profile": "defense"
      },
      {
        "id": "EQ2_GLASSBOUND_BULWARK_CHEST",
        "slot": "chest",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_GLASSBOUND_BULWARK_LEGS",
        "slot": "legs",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_GLASSBOUND_BULWARK_BOOTS",
        "slot": "boots",
        "profile": "defense"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "armor",
        "percent": 2.5
      },
      {
        "pieces": 4,
        "affix": "ward",
        "percent": 2
      }
    ]
  },
  {
    "id": "EQ2_SET_GLASSBOUND_RETALIATOR",
    "tier": 4,
    "name": "Glassbound Retaliator",
    "role": "tank",
    "material": "mail",
    "pieces": [
      {
        "id": "EQ2_GLASSBOUND_RETALIATOR_GLOVES",
        "slot": "gloves",
        "profile": "attack_defense"
      },
      {
        "id": "EQ2_GLASSBOUND_RETALIATOR_CAPE",
        "slot": "cape",
        "profile": "defense_health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "tenacity",
        "percent": 1.5
      }
    ]
  },
  {
    "id": "EQ2_SET_GLASSBOUND_SHADOWSTEP",
    "tier": 4,
    "name": "Glassbound Shadowstep",
    "role": "damage",
    "material": "leather",
    "pieces": [
      {
        "id": "EQ2_GLASSBOUND_SHADOWSTEP_HELMET",
        "slot": "helmet",
        "profile": "health"
      },
      {
        "id": "EQ2_GLASSBOUND_SHADOWSTEP_CHEST",
        "slot": "chest",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_GLASSBOUND_SHADOWSTEP_GLOVES",
        "slot": "gloves",
        "profile": "attack"
      },
      {
        "id": "EQ2_GLASSBOUND_SHADOWSTEP_BOOTS",
        "slot": "boots",
        "profile": "attack_health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "haste",
        "percent": 1.2
      },
      {
        "pieces": 4,
        "affix": "critDamage",
        "percent": 2.5
      }
    ]
  },
  {
    "id": "EQ2_SET_GLASSBOUND_SPELLWEAVE",
    "tier": 4,
    "name": "Glassbound Spellweave",
    "role": "damage",
    "material": "cloth",
    "pieces": [
      {
        "id": "EQ2_GLASSBOUND_SPELLWEAVE_CAPE",
        "slot": "cape",
        "profile": "attack_health"
      },
      {
        "id": "EQ2_GLASSBOUND_SPELLWEAVE_AMULET",
        "slot": "amulet",
        "profile": "attack"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "abilityDamage",
        "percent": 2
      }
    ]
  },
  {
    "id": "EQ2_SET_GLASSBOUND_LIFEWOVEN",
    "tier": 4,
    "name": "Glassbound Lifewoven",
    "role": "support",
    "material": "cloth",
    "pieces": [
      {
        "id": "EQ2_GLASSBOUND_LIFEWOVEN_HELMET",
        "slot": "helmet",
        "profile": "health"
      },
      {
        "id": "EQ2_GLASSBOUND_LIFEWOVEN_CHEST",
        "slot": "chest",
        "profile": "health"
      },
      {
        "id": "EQ2_GLASSBOUND_LIFEWOVEN_LEGS",
        "slot": "legs",
        "profile": "defense_health"
      },
      {
        "id": "EQ2_GLASSBOUND_LIFEWOVEN_BOOTS",
        "slot": "boots",
        "profile": "defense_health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "potency",
        "percent": 2.5
      },
      {
        "pieces": 4,
        "affix": "healingPower",
        "percent": 2
      }
    ]
  },
  {
    "id": "EQ2_SET_GLASSBOUND_DAWNSHIELD",
    "tier": 4,
    "name": "Glassbound Dawnshield",
    "role": "support",
    "material": "steel",
    "pieces": [
      {
        "id": "EQ2_GLASSBOUND_DAWNSHIELD_GLOVES",
        "slot": "gloves",
        "profile": "attack_defense"
      },
      {
        "id": "EQ2_GLASSBOUND_DAWNSHIELD_CAPE",
        "slot": "cape",
        "profile": "defense_health"
      }
    ],
    "bonuses": [
      {
        "pieces": 2,
        "affix": "maxHp",
        "percent": 2
      }
    ]
  }
];
export const EQUIPMENT_V2_STANDALONE:readonly EquipmentV2Standalone[]=[
  {
    "id": "EQ2_SOLO_FIELDBORN_STEEL_GREAVES",
    "tier": 1,
    "name": "Fieldborn Steel Greaves",
    "role": "tank",
    "material": "steel",
    "slot": "legs",
    "profile": "defense"
  },
  {
    "id": "EQ2_SOLO_FIELDBORN_GUARD_SIGNET",
    "tier": 1,
    "name": "Fieldborn Guard Signet",
    "role": "tank",
    "material": "jewelry",
    "slot": "ring",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_FIELDBORN_HUNTER_VEST",
    "tier": 1,
    "name": "Fieldborn Hunter Vest",
    "role": "damage",
    "material": "leather",
    "slot": "chest",
    "profile": "defense_health"
  },
  {
    "id": "EQ2_SOLO_FIELDBORN_LONGSTRIDE_CAPE",
    "tier": 1,
    "name": "Fieldborn Longstride Cape",
    "role": "damage",
    "material": "leather",
    "slot": "cape",
    "profile": "attack_health"
  },
  {
    "id": "EQ2_SOLO_FIELDBORN_PRAYER_HOOD",
    "tier": 1,
    "name": "Fieldborn Prayer Hood",
    "role": "support",
    "material": "cloth",
    "slot": "helmet",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_FIELDBORN_MEND_GLOVES",
    "tier": 1,
    "name": "Fieldborn Mend Gloves",
    "role": "support",
    "material": "cloth",
    "slot": "gloves",
    "profile": "attack_defense"
  },
  {
    "id": "EQ2_SOLO_IRONWOOD_IRONCAP",
    "tier": 2,
    "name": "Ironwood Ironcap",
    "role": "tank",
    "material": "steel",
    "slot": "helmet",
    "profile": "defense"
  },
  {
    "id": "EQ2_SOLO_IRONWOOD_BASTION_CAPE",
    "tier": 2,
    "name": "Ironwood Bastion Cape",
    "role": "tank",
    "material": "mail",
    "slot": "cape",
    "profile": "defense_health"
  },
  {
    "id": "EQ2_SOLO_IRONWOOD_DUELIST_VEST",
    "tier": 2,
    "name": "Ironwood Duelist Vest",
    "role": "damage",
    "material": "leather",
    "slot": "chest",
    "profile": "defense_health"
  },
  {
    "id": "EQ2_SOLO_IRONWOOD_AIMSTONE_RING",
    "tier": 2,
    "name": "Ironwood Aimstone Ring",
    "role": "damage",
    "material": "jewelry",
    "slot": "ring",
    "profile": "attack"
  },
  {
    "id": "EQ2_SOLO_IRONWOOD_VERDANT_ROBES",
    "tier": 2,
    "name": "Ironwood Verdant Robes",
    "role": "support",
    "material": "cloth",
    "slot": "chest",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_IRONWOOD_CARETAKER_BOOTS",
    "tier": 2,
    "name": "Ironwood Caretaker Boots",
    "role": "support",
    "material": "cloth",
    "slot": "boots",
    "profile": "defense_health"
  },
  {
    "id": "EQ2_SOLO_SUNSCAR_GATEHELM",
    "tier": 3,
    "name": "Sunscar Gatehelm",
    "role": "tank",
    "material": "steel",
    "slot": "helmet",
    "profile": "defense"
  },
  {
    "id": "EQ2_SOLO_SUNSCAR_GUARDIAN_RING",
    "tier": 3,
    "name": "Sunscar Guardian Ring",
    "role": "tank",
    "material": "jewelry",
    "slot": "ring",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_SUNSCAR_DUELIST_BOOTS",
    "tier": 3,
    "name": "Sunscar Duelist Boots",
    "role": "damage",
    "material": "leather",
    "slot": "boots",
    "profile": "attack_health"
  },
  {
    "id": "EQ2_SOLO_SUNSCAR_SPELLTHREAD_HOOD",
    "tier": 3,
    "name": "Sunscar Spellthread Hood",
    "role": "damage",
    "material": "cloth",
    "slot": "helmet",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_SUNSCAR_RUNESILK_VEST",
    "tier": 3,
    "name": "Sunscar Runesilk Vest",
    "role": "support",
    "material": "cloth",
    "slot": "chest",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_SUNSCAR_WELLSPRING_AMULET",
    "tier": 3,
    "name": "Sunscar Wellspring Amulet",
    "role": "support",
    "material": "jewelry",
    "slot": "amulet",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_GLASSBOUND_WARD_GLOVES",
    "tier": 4,
    "name": "Glassbound Ward Gloves",
    "role": "tank",
    "material": "steel",
    "slot": "gloves",
    "profile": "attack_defense"
  },
  {
    "id": "EQ2_SOLO_GLASSBOUND_FORTRESS_AMULET",
    "tier": 4,
    "name": "Glassbound Fortress Amulet",
    "role": "tank",
    "material": "jewelry",
    "slot": "amulet",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_GLASSBOUND_SWIFTGUARD_CAPE",
    "tier": 4,
    "name": "Glassbound Swiftguard Cape",
    "role": "damage",
    "material": "leather",
    "slot": "cape",
    "profile": "attack_health"
  },
  {
    "id": "EQ2_SOLO_GLASSBOUND_EMBER_RING",
    "tier": 4,
    "name": "Glassbound Ember Ring",
    "role": "damage",
    "material": "jewelry",
    "slot": "ring",
    "profile": "attack"
  },
  {
    "id": "EQ2_SOLO_GLASSBOUND_DEVOTION_CAPE",
    "tier": 4,
    "name": "Glassbound Devotion Cape",
    "role": "support",
    "material": "cloth",
    "slot": "cape",
    "profile": "health"
  },
  {
    "id": "EQ2_SOLO_GLASSBOUND_CLARITY_RING",
    "tier": 4,
    "name": "Glassbound Clarity Ring",
    "role": "support",
    "material": "jewelry",
    "slot": "ring",
    "profile": "health"
  }
];
export const EQUIPMENT_V2_CLASS_WEAPONS:readonly EquipmentV2ClassWeapon[]=[
  {
    "classId": "IRONWARDEN",
    "name": "Oathbound Sword",
    "weaponKind": "sword",
    "profile": "attack_defense",
    "hands": "one"
  },
  {
    "classId": "BASTION",
    "name": "Citadel Shieldblade",
    "weaponKind": "shieldblade",
    "profile": "attack_defense",
    "hands": "one"
  },
  {
    "classId": "DREADGUARD",
    "name": "Chained Scourge",
    "weaponKind": "chain",
    "profile": "attack_health",
    "hands": "two"
  },
  {
    "classId": "WAYFINDER",
    "name": "Wayfinder Bow",
    "weaponKind": "bow",
    "profile": "attack",
    "hands": "two"
  },
  {
    "classId": "RAVAGER",
    "name": "Ravager Greatblade",
    "weaponKind": "greatblade",
    "profile": "attack",
    "hands": "two"
  },
  {
    "classId": "HEXWEAVER",
    "name": "Hexweaver Wand",
    "weaponKind": "wand",
    "profile": "attack_health",
    "hands": "one"
  },
  {
    "classId": "KNIFE_DANCER",
    "name": "Knife Dancer Blades",
    "weaponKind": "blades",
    "profile": "attack",
    "hands": "dual"
  },
  {
    "classId": "DAWNKEEPER",
    "name": "Dawnkeeper Mace",
    "weaponKind": "mace",
    "profile": "attack_defense",
    "hands": "one"
  },
  {
    "classId": "STONECALLER",
    "name": "Stonecaller Staff",
    "weaponKind": "staff",
    "profile": "attack_health",
    "hands": "two"
  }
];
export interface EquipmentV2PieceDescriptor{
 id:string;name:string;setId?:string;slot:GearSlot;profile:EquipmentV2Profile;tier:EquipmentV2Tier;role:EquipmentV2Role;material:EquipmentV2Material;
}
export const EQUIPMENT_V2_PIECES:readonly EquipmentV2PieceDescriptor[]=[
 ...EQUIPMENT_V2_SETS.flatMap(set=>set.pieces.map(piece=>({
   ...piece,name:set.name+' '+piece.slot[0].toUpperCase()+piece.slot.slice(1),
   setId:set.id,tier:set.tier,role:set.role,material:set.material,
 }))),
 ...EQUIPMENT_V2_STANDALONE.map(piece=>({...piece})),
];
export function equipmentV2Piece(id:string){return EQUIPMENT_V2_PIECES.find(piece=>piece.id===id);}
export function equipmentV2Set(id:string){return EQUIPMENT_V2_SETS.find(set=>set.id===id);}
export function equipmentV2SetProgress(setId:string,equippedPieceIds:readonly string[]){
 const set=equipmentV2Set(setId);
 if(!set)throw new Error('Unknown Equipment V2 set');
 const unique=new Set(equippedPieceIds);
 const owned=set.pieces.filter(piece=>unique.has(piece.id)).length;
 return {setId,owned,total:set.pieces.length,
  bonuses:set.bonuses.map(bonus=>({...bonus,active:owned>=bonus.pieces})),
 };
}
export function equipmentV2CatalogAudit(){
 const ids=EQUIPMENT_V2_PIECES.map(piece=>piece.id),setIds=EQUIPMENT_V2_SETS.map(set=>set.id);
 const invalidProfiles=EQUIPMENT_V2_PIECES.filter(piece=>!EQUIPMENT_V2_PROFILES[piece.slot]?.includes(piece.profile));
 const badSets=EQUIPMENT_V2_SETS.filter(set=>{
  const slots=new Set(set.pieces.map(piece=>piece.slot));
  return slots.size!==set.pieces.length||!set.pieces.length
    ||set.bonuses.some(bonus=>bonus.pieces<2||bonus.pieces>set.pieces.length||bonus.percent<=0);
 });
 return {setCount:EQUIPMENT_V2_SETS.length,setPieceCount:EQUIPMENT_V2_SETS.reduce((n,set)=>n+set.pieces.length,0),
  standaloneCount:EQUIPMENT_V2_STANDALONE.length,weaponArchetypes:EQUIPMENT_V2_CLASS_WEAPONS.length,
  uniqueIds:ids.length===new Set(ids).size&&setIds.length===new Set(setIds).size,
  invalidProfiles:invalidProfiles.map(piece=>piece.id),badSets:badSets.map(set=>set.id)};
}

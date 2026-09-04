import { ClassId,GearSlot } from '../core/types';
import {NOVICE_ITEMS} from './novice-sets';
export interface ItemDef {
  id:string; name:string; type:'material'|'gear'|'quest'|'food'; slot?:GearSlot;
  attack?:number; defense?:number; hp?:number; heal?:number; readiness?:number;
  value:number; salvage?:{itemId:string;quantity:number};
  classRestriction?:ClassId; noviceSetId?:string;
}
export const ITEMS:ItemDef[]=[
...NOVICE_ITEMS,
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
{id:'START_IRON_SWORD',name:'Recruit Sword',type:'gear',slot:'weapon',attack:4,readiness:1,value:10},
{id:'START_KITE_SHIELD',name:'Recruit Kite Shield',type:'gear',slot:'offhand',defense:3,hp:8,readiness:1,value:10},
{id:'START_BASTION_MACE',name:'Recruit Mace',type:'gear',slot:'weapon',attack:3,defense:1,readiness:1,value:10},
{id:'START_TOWER_SHIELD',name:'Recruit Tower Shield',type:'gear',slot:'offhand',defense:4,hp:10,readiness:1,value:10},
{id:'START_DREAD_AXE',name:'Dread Iron Axe',type:'gear',slot:'weapon',attack:5,readiness:1,value:10},
{id:'START_SPIKED_SHIELD',name:'Spiked Recruit Shield',type:'gear',slot:'offhand',attack:1,defense:2,hp:6,readiness:1,value:10},
{id:'START_DAWN_MACE',name:'Dawn Acolyte Mace',type:'gear',slot:'weapon',attack:3,defense:1,readiness:1,value:10},
{id:'START_HOLY_FOCUS',name:'Acolyte Sun Focus',type:'gear',slot:'offhand',hp:10,readiness:1,value:10},
{id:'START_SHORTBOW',name:'Greenwood Shortbow',type:'gear',slot:'weapon',attack:5,readiness:1,value:10},
{id:'START_RAVAGER_AXE',name:'Rough Two-Handed Axe',type:'gear',slot:'weapon',attack:6,defense:-1,readiness:1,value:10},
{id:'START_HEX_WAND',name:'Apprentice Hex Wand',type:'gear',slot:'weapon',attack:4,readiness:1,value:10},
{id:'START_HEX_TOME',name:'Faded Hex Tome',type:'gear',slot:'offhand',attack:1,hp:5,readiness:1,value:10},
{id:'START_DAGGER',name:'Practice Dagger',type:'gear',slot:'weapon',attack:4,readiness:1,value:10},
{id:'START_OFF_DAGGER',name:'Practice Off-Dagger',type:'gear',slot:'offhand',attack:2,readiness:1,value:10},
{id:'START_STONE_STAFF',name:'Carved Stone Staff',type:'gear',slot:'weapon',attack:4,hp:5,readiness:1,value:10},
{id:'START_STONE_TOTEM',name:'Pebble Totem',type:'gear',slot:'offhand',attack:1,defense:1,readiness:1,value:10},

{id:'TRAVEL_RATION',name:'Travel Ration',type:'food',heal:35,readiness:1,value:5},
{id:'COOKED_SILVERFIN',name:'Cooked Silverfin',type:'food',heal:55,readiness:3,value:15},
{id:'SEARED_RIVER_EEL',name:'Seared River Eel',type:'food',heal:95,readiness:5,value:34},
{id:'IRONWOOD_STEW',name:'Ironwood Hunter Stew',type:'food',heal:145,readiness:7,value:62},

{id:'COPPER_ORE',name:'Copper Ore',type:'material',value:5},

{id:'OATHSTONE_ORE',name:'Oathstone Ore',type:'material',value:32},
{id:'CROWNWOOD_LOG',name:'Crownwood Log',type:'material',value:30},
{id:'OATHSCALE_PIKE',name:'Oathscale Pike',type:'material',value:32},
{id:'COPPER_INGOT',name:'Copper Ingot',type:'material',value:28},
{id:'ASTER_IRON_INGOT',name:'Aster-Iron Ingot',type:'material',value:64},
{id:'OATHSTONE_INGOT',name:'Oathstone Ingot',type:'material',value:145},
{id:'REINFORCED_FITTING',name:'Reinforced Fitting',type:'material',value:155},
{id:'ROASTED_OATHSCALE',name:'Roasted Oathscale Pike',type:'food',heal:175,readiness:8,value:90},
{id:'OATHSTONE_WARDPLATE',name:'Oathstone Wardplate',type:'gear',slot:'chest',defense:15,hp:105,readiness:12,value:680},

{id:'ASTER_IRON_ORE',name:'Aster-Iron Ore',type:'material',value:14},
{id:'GREENWOOD_LOG',name:'Greenwood Log',type:'material',value:4},
{id:'IRONWOOD_LOG',name:'Ironwood Log',type:'material',value:13},
{id:'SILVERFIN',name:'Silverfin',type:'material',value:6},
{id:'RIVER_EEL',name:'River Eel',type:'material',value:15},

{id:'COPPER_BLADE',name:'Copper Blade',type:'gear',slot:'weapon',attack:7,readiness:4,value:75},
{id:'ASTER_IRON_BLADE',name:'Aster-Iron Blade',type:'gear',slot:'weapon',attack:13,readiness:8,value:220},
{id:'ASTER_IRON_HELM',name:'Aster-Iron Helm',type:'gear',slot:'helmet',defense:7,hp:38,readiness:6,value:195},
{id:'ASTER_IRON_CHEST',name:'Aster-Iron Cuirass',type:'gear',slot:'chest',defense:11,hp:72,readiness:9,value:310},
{id:'ASTER_IRON_LEGS',name:'Aster-Iron Legguards',type:'gear',slot:'legs',defense:8,hp:48,readiness:7,value:245},
{id:'IRONWOOD_GUARD',name:'Ironwood Guard',type:'gear',slot:'offhand',defense:7,hp:34,readiness:6,value:185},
{id:'IRONWOOD_LONGBOW',name:'Ironwood Longbow',type:'gear',slot:'weapon',attack:12,readiness:8,value:220},
{id:'IRONWOOD_STAFF',name:'Ironwood Runestaff',type:'gear',slot:'weapon',attack:10,hp:28,readiness:8,value:220},
{id:'IRONWOOD_DAGGERS',name:'Ironwood Twin Daggers',type:'gear',slot:'weapon',attack:12,readiness:8,value:220},
{id:'IRONWOOD_GREATAXE',name:'Ironwood Great-Axe',type:'gear',slot:'weapon',attack:14,defense:-1,readiness:8,value:220},

{id:'MOSS_FIBER',name:'Moss Fiber',type:'material',value:3},
{id:'WISP_DUST',name:'Wisp Dust',type:'material',value:7},
{id:'BOAR_HIDE',name:'Boar Hide',type:'material',value:8},
{id:'WOLF_PELT',name:'Wolf Pelt',type:'material',value:13},
{id:'IRONWOOD_FANG',name:'Ironwood Fang',type:'material',value:28},
{id:'THORN_SAP',name:'Thorn Sap',type:'material',value:20},
{id:'TROLL_HIDE',name:'Troll Hide',type:'material',value:42},
{id:'OATHGLASS_SHARD',name:'Oathglass Shard',type:'material',value:85},
{id:'FALLEN_KNIGHT_SIGIL',name:'Fallen Knight Sigil',type:'quest',value:0},

{id:'WORN_BLADE',name:'Worn Blade',type:'gear',slot:'weapon',attack:4,readiness:2,value:35,salvage:{itemId:'MOSS_FIBER',quantity:2}},
{id:'MOSSWRAP_GLOVES',name:'Mosswrap Gloves',type:'gear',slot:'gloves',defense:2,hp:8,readiness:3,value:55,salvage:{itemId:'MOSS_FIBER',quantity:3}},
{id:'WISP_CHARM',name:'Wisp Charm',type:'gear',slot:'amulet',attack:2,hp:12,readiness:3,value:80,salvage:{itemId:'WISP_DUST',quantity:2}},
{id:'BOARHIDE_BOOTS',name:'Boarhide Boots',type:'gear',slot:'boots',defense:3,hp:15,readiness:4,value:95,salvage:{itemId:'BOAR_HIDE',quantity:3}},
{id:'IRONWOOD_BLADE',name:'Ironwood Blade',type:'gear',slot:'weapon',attack:9,readiness:5,value:120,salvage:{itemId:'IRONWOOD_FANG',quantity:1}},
{id:'HIDE_VEST',name:'Hide Vest',type:'gear',slot:'chest',defense:5,hp:28,readiness:4,value:90,salvage:{itemId:'BOAR_HIDE',quantity:4}},
{id:'THORN_RING',name:'Thorn Ring',type:'gear',slot:'ring',attack:4,defense:1,readiness:5,value:155,salvage:{itemId:'THORN_SAP',quantity:3}},
{id:'TROLLGUARD_HELM',name:'Trollguard Helm',type:'gear',slot:'helmet',defense:8,hp:55,readiness:7,value:260,salvage:{itemId:'TROLL_HIDE',quantity:2}},
{id:'OATHGLASS_CAPE',name:'Oathglass Cape',type:'gear',slot:'cape',attack:5,defense:5,hp:35,readiness:8,value:420,salvage:{itemId:'OATHGLASS_SHARD',quantity:2}},
];
export function itemDef(id:string){const x=ITEMS.find(i=>i.id===id); if(!x) throw new Error(`Unknown item ${id}`); return x;}

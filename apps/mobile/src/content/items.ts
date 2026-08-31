import { GearSlot } from '../core/types';
export interface ItemDef { id:string; name:string; type:'material'|'gear'|'quest'; slot?:GearSlot; attack?:number; defense?:number; hp?:number; value:number; salvage?:{itemId:string;quantity:number}; }
export const ITEMS:ItemDef[]=[
{id:'COPPER_ORE',name:'Copper Ore',type:'material',value:5},{id:'ASTER_IRON_ORE',name:'Aster-Iron Ore',type:'material',value:14},{id:'GREENWOOD_LOG',name:'Greenwood Log',type:'material',value:4},{id:'IRONWOOD_LOG',name:'Ironwood Log',type:'material',value:13},{id:'SILVERFIN',name:'Silverfin',type:'material',value:6},{id:'RIVER_EEL',name:'River Eel',type:'material',value:15},{id:'COOKED_SILVERFIN',name:'Cooked Silverfin',type:'material',value:15},{id:'SEARED_RIVER_EEL',name:'Seared River Eel',type:'material',value:34},{id:'COPPER_BLADE',name:'Copper Blade',type:'gear',slot:'weapon',attack:7,value:75},{id:'ASTER_IRON_BLADE',name:'Aster-Iron Blade',type:'gear',slot:'weapon',attack:13,value:220},
{id:'MOSS_FIBER',name:'Moss Fiber',type:'material',value:3},{id:'WISP_DUST',name:'Wisp Dust',type:'material',value:7},{id:'BOAR_HIDE',name:'Boar Hide',type:'material',value:8},{id:'WOLF_PELT',name:'Wolf Pelt',type:'material',value:13},{id:'IRONWOOD_FANG',name:'Ironwood Fang',type:'material',value:28},{id:'THORN_SAP',name:'Thorn Sap',type:'material',value:20},{id:'TROLL_HIDE',name:'Troll Hide',type:'material',value:42},{id:'OATHGLASS_SHARD',name:'Oathglass Shard',type:'material',value:85},{id:'FALLEN_KNIGHT_SIGIL',name:'Fallen Knight Sigil',type:'quest',value:0},
{id:'WORN_BLADE',name:'Worn Blade',type:'gear',slot:'weapon',attack:4,value:35,salvage:{itemId:'MOSS_FIBER',quantity:2}},
{id:'MOSSWRAP_GLOVES',name:'Mosswrap Gloves',type:'gear',slot:'gloves',defense:2,hp:8,value:55,salvage:{itemId:'MOSS_FIBER',quantity:3}},
{id:'WISP_CHARM',name:'Wisp Charm',type:'gear',slot:'amulet',attack:2,hp:12,value:80,salvage:{itemId:'WISP_DUST',quantity:2}},
{id:'BOARHIDE_BOOTS',name:'Boarhide Boots',type:'gear',slot:'boots',defense:3,hp:15,value:95,salvage:{itemId:'BOAR_HIDE',quantity:3}},
{id:'IRONWOOD_BLADE',name:'Ironwood Blade',type:'gear',slot:'weapon',attack:9,value:120,salvage:{itemId:'IRONWOOD_FANG',quantity:1}},
{id:'HIDE_VEST',name:'Hide Vest',type:'gear',slot:'chest',defense:5,hp:28,value:90,salvage:{itemId:'BOAR_HIDE',quantity:4}},
{id:'THORN_RING',name:'Thorn Ring',type:'gear',slot:'ring',attack:4,defense:1,value:155,salvage:{itemId:'THORN_SAP',quantity:3}},
{id:'TROLLGUARD_HELM',name:'Trollguard Helm',type:'gear',slot:'helmet',defense:8,hp:55,value:260,salvage:{itemId:'TROLL_HIDE',quantity:2}},
{id:'OATHGLASS_CAPE',name:'Oathglass Cape',type:'gear',slot:'cape',attack:5,defense:5,hp:35,value:420,salvage:{itemId:'OATHGLASS_SHARD',quantity:2}},
];
export function itemDef(id:string){const x=ITEMS.find(i=>i.id===id); if(!x) throw new Error(`Unknown item ${id}`); return x;}

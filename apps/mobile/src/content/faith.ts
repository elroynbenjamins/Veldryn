export const HOLY_WATER_ID='HOLY_WATER';
export const FAITH_TIERS=[
 {id:'FAITH_QUIET',name:'Quiet prayer',level:1,water:1,xp:120,seconds:30},
 {id:'FAITH_CANDLE',name:'Candle vigil',level:10,water:2,xp:260,seconds:30},
 {id:'FAITH_LITANY',name:'Sacred litany',level:25,water:4,xp:560,seconds:30},
 {id:'FAITH_DEVOTION',name:'Devotion',level:40,water:8,xp:1200,seconds:30},
 {id:'FAITH_COMMUNION',name:'Communion',level:60,water:16,xp:2560,seconds:30},
 {id:'FAITH_ASCENDANT',name:'Ascendant prayer',level:80,water:32,xp:5440,seconds:30},
] as const;
export type FaithFamily='attack'|'defense'|'hp';
export interface FaithBlessing{id:string;name:string;level:number;family:FaithFamily;bonus:number;}
export const FAITH_BLESSINGS:FaithBlessing[]=[
 {id:'EMBER_VOW',name:'Ember Vow',level:1,family:'attack',bonus:.02},
 {id:'WARD_OF_STONE',name:'Ward of Stone',level:10,family:'defense',bonus:.03},
 {id:'WELLSPRING',name:'Wellspring',level:15,family:'hp',bonus:.04},
 {id:'SUNFIRE_VOW',name:'Sunfire Vow',level:40,family:'attack',bonus:.04},
 {id:'IRON_SANCTUARY',name:'Iron Sanctuary',level:45,family:'defense',bonus:.06},
 {id:'LIVING_GRACE',name:'Living Grace',level:50,family:'hp',bonus:.08},
 {id:'DAWN_COVENANT',name:'Dawn Covenant',level:80,family:'attack',bonus:.06},
 {id:'ETERNAL_BASTION',name:'Eternal Bastion',level:85,family:'defense',bonus:.09},
 {id:'UNDYING_LIGHT',name:'Undying Light',level:90,family:'hp',bonus:.12},
];
export const HOLY_WATER_SOURCES=[
 {monsterId:'FIELD_WISP',chance:.20,min:1,max:2},
 {monsterId:'DROWNED_PILGRIM',chance:.40,min:2,max:4},
 {monsterId:'OATHBOUND_SQUIRE',chance:.35,min:2,max:4},
 {monsterId:'DUNE_ORACLE',chance:.50,min:3,max:5},
 {monsterId:'BELLWRAITH',chance:.60,min:4,max:6},
 {monsterId:'ASHEN_REVENANT',chance:.75,min:6,max:10},
] as const;
export const faithBlessingDef=(id?:string)=>FAITH_BLESSINGS.find(b=>b.id===id);

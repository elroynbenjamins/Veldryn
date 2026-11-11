export const HOLY_WATER_ID='HOLY_WATER';
/** Faith practice XP was reduced by 20%; ritual costs, duration and blessings remain unchanged. */
export const FAITH_TIERS=[
 {id:'FAITH_QUIET',name:'Quiet prayer',level:1,water:1,xp:96,seconds:30},
 {id:'FAITH_CANDLE',name:'Candle vigil',level:10,water:2,xp:208,seconds:30},
 {id:'FAITH_LITANY',name:'Sacred litany',level:25,water:4,xp:448,seconds:30},
 {id:'FAITH_DEVOTION',name:'Devotion',level:40,water:8,xp:960,seconds:30},
 {id:'FAITH_COMMUNION',name:'Communion',level:60,water:16,xp:2048,seconds:30},
 {id:'FAITH_ASCENDANT',name:'Ascendant prayer',level:80,water:32,xp:4352,seconds:30},
] as const;
export type FaithFamily='attack'|'defense'|'hp'|'gathering'|'production'|'xp';
export type FaithBlessingGroup='combat'|'gathering'|'production'|'experience';
export interface FaithBlessing{id:string;name:string;level:number;family:FaithFamily;bonus:number;}
/** Preserve existing combat blessing IDs for saved selections and favorites. */
export const FAITH_BLESSINGS:FaithBlessing[]=[
 {id:'EMBER_VOW',name:"Ember Vow",level:1,family:'attack',bonus:2/100},
 {id:'VERDANT_WHISPER',name:"Verdant Whisper",level:5,family:'gathering',bonus:2/100},
 {id:'WARD_OF_STONE',name:"Ward of Stone",level:10,family:'defense',bonus:3/100},
 {id:'ARTISANS_PRAYER',name:"Artisan's Prayer",level:12,family:'production',bonus:2/100},
 {id:'WELLSPRING',name:"Wellspring",level:15,family:'hp',bonus:4/100},
 {id:'LANTERN_OF_WISDOM',name:"Lantern of Wisdom",level:20,family:'xp',bonus:2/100},
 {id:'NATURES_COVENANT',name:"Nature's Covenant",level:35,family:'gathering',bonus:4/100},
 {id:'SUNFIRE_VOW',name:"Sunfire Vow",level:40,family:'attack',bonus:4/100},
 {id:'IRON_SANCTUARY',name:"Iron Sanctuary",level:45,family:'defense',bonus:6/100},
 {id:'FORGES_FAVOR',name:"Forge's Favor",level:48,family:'production',bonus:4/100},
 {id:'LIVING_GRACE',name:"Living Grace",level:50,family:'hp',bonus:8/100},
 {id:'SCHOLARS_DEVOTION',name:"Scholar's Devotion",level:55,family:'xp',bonus:4/100},
 {id:'HARVESTS_GRACE',name:"Harvest's Grace",level:70,family:'gathering',bonus:6/100},
 {id:'MASTERS_BENEDICTION',name:"Master's Benediction",level:75,family:'production',bonus:6/100},
 {id:'DAWN_COVENANT',name:"Dawn Covenant",level:80,family:'attack',bonus:6/100},
 {id:'ETERNAL_BASTION',name:"Eternal Bastion",level:85,family:'defense',bonus:9/100},
 {id:'UNDYING_LIGHT',name:"Undying Light",level:90,family:'hp',bonus:12/100},
 {id:'ETERNAL_ENLIGHTENMENT',name:"Eternal Enlightenment",level:95,family:'xp',bonus:6/100},
];
export const FAITH_BLESSING_GROUPS:readonly {id:FaithBlessingGroup;label:string;families:readonly FaithFamily[]}[]=[
 {id:'combat',label:'Combat',families:['attack','defense','hp']},
 {id:'gathering',label:'Gathering',families:['gathering']},
 {id:'production',label:'Production',families:['production']},
 {id:'experience',label:'Experience',families:['xp']},
];
export function faithBlessingEffectLabel(blessing:FaithBlessing){
 const percent=Math.round(blessing.bonus*100);
 switch(blessing.family){
  case 'attack':return `+${percent}% Damage`;
  case 'defense':return `${percent}% Damage reduction`;
  case 'hp':return `+${percent}% Maximum HP`;
  case 'gathering':return `+${percent}% Gathering speed`;
  case 'production':return `+${percent}% Production speed`;
  case 'xp':return `+${percent}% Combat & skill XP`;
 }
}
/** Final Holy Water drop rates. Original authored chances already received
 * a universal 5% relative drop reduction; lower those effective rates by an
 * additional 15% and floor to the nearest whole percentage point:
 * floor(originalChance * .95 * .85 * 100) / 100.
 * These are FINAL odds and are not multiplied by .95 again in MONSTERS. */
export const HOLY_WATER_SOURCES=[
 {monsterId:'FIELD_WISP',chance:.16,min:1,max:2},
 {monsterId:'DROWNED_PILGRIM',chance:.32,min:2,max:4},
 {monsterId:'OATHBOUND_SQUIRE',chance:.28,min:2,max:4},
 {monsterId:'DUNE_ORACLE',chance:.40,min:3,max:5},
 {monsterId:'BELLWRAITH',chance:.48,min:4,max:6},
 {monsterId:'ASHEN_REVENANT',chance:.60,min:6,max:10},
] as const;
export const faithBlessingDef=(id?:string)=>FAITH_BLESSINGS.find(b=>b.id===id);

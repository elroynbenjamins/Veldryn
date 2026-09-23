import type {GatherDef} from './skills';
import type {ItemDef} from './items';

export type HerbalismMethodId='balanced'|'quick'|'careful'|'bountiful';
export interface HerbalismMethodDef{id:HerbalismMethodId;name:string;unlockLevel:number;description:string;actionTimeMultiplier:number;yieldMultiplier:number;xpMultiplier:number;rareFindMultiplier:number;}
export const HERBALISM_METHODS:readonly HerbalismMethodDef[]=[
  {id:'balanced',name:'Balanced Picking',unlockLevel:1,description:'Standard pace, yield, XP and rare-find chance.',actionTimeMultiplier:1,yieldMultiplier:1,xpMultiplier:1,rareFindMultiplier:1},
  {id:'quick',name:'Quick Harvest',unlockLevel:20,description:'Harvest faster, but sacrifice some normal yield and rare-find chance.',actionTimeMultiplier:.85,yieldMultiplier:.90,xpMultiplier:.95,rareFindMultiplier:.75},
  {id:'careful',name:'Careful Harvest',unlockLevel:45,description:'Slower hand-picking with better XP and a much higher rare botanical chance.',actionTimeMultiplier:1.18,yieldMultiplier:1,xpMultiplier:1.05,rareFindMultiplier:1.5},
  {id:'bountiful',name:'Bountiful Harvest',unlockLevel:70,description:'Take extra time to maximize ordinary herb yield.',actionTimeMultiplier:1.12,yieldMultiplier:1.20,xpMultiplier:.90,rareFindMultiplier:1},
] as const;
export function herbalismMethod(id:unknown,level=1){const row=HERBALISM_METHODS.find(method=>method.id===id&&level>=method.unlockLevel);return row??HERBALISM_METHODS[0];}
export function herbalismMethodUnlocked(id:HerbalismMethodId,level:number){return level>=(HERBALISM_METHODS.find(row=>row.id===id)?.unlockLevel??999);}
export function herbalismInsightMultiplier(level:number){return level>=100?1.5:level>=75?1.35:level>=50?1.2:level>=25?1.1:1;}

export const HERBALISM_ESSENCE_BY_ZONE:Readonly<Record<string,{itemId:string;baseChance:number}>>={
  GREENFIELDS:{itemId:'ASTERFALL_BOTANICAL_ESSENCE',baseChance:.010},SILVERBROOK:{itemId:'ASTERFALL_BOTANICAL_ESSENCE',baseChance:.010},IRONWOOD:{itemId:'ASTERFALL_BOTANICAL_ESSENCE',baseChance:.010},OLD_MINES:{itemId:'ASTERFALL_BOTANICAL_ESSENCE',baseChance:.010},KINGS_ROAD:{itemId:'ASTERFALL_BOTANICAL_ESSENCE',baseChance:.0125},
  SUNSCAR:{itemId:'SUNSCAR_BOTANICAL_ESSENCE',baseChance:.015},FROSTMARCH:{itemId:'FROSTMARCH_BOTANICAL_ESSENCE',baseChance:.0175},ASHLANDS:{itemId:'ASHLANDS_BOTANICAL_ESSENCE',baseChance:.020},
};

/** Regional nodes continue the same hand-picking activity lane beyond Asterfall. */
export const HERB_NODES:GatherDef[]=[
  {id:'DEWLEAF_PATCH',name:'Dewleaf Patch',itemId:'DEWLEAF',zoneId:'GREENFIELDS',unlockLevel:1,seconds:30,xp:9},
  {id:'RIVER_MINT_BED',name:'River Mint Bed',itemId:'RIVER_MINT',zoneId:'SILVERBROOK',unlockLevel:8,seconds:40,xp:20},
  {id:'IRONBLOOM_THICKET',name:'Ironbloom Thicket',itemId:'IRONBLOOM',zoneId:'IRONWOOD',unlockLevel:18,seconds:50,xp:38},
  {id:'CAVELICHEN_COLONY',name:'Cavelichen Colony',itemId:'CAVELICHEN',zoneId:'OLD_MINES',unlockLevel:30,seconds:60,xp:68},
  {id:'CROWN_SAGE_GROVE',name:'Crown Sage Grove',itemId:'CROWN_SAGE',zoneId:'KINGS_ROAD',unlockLevel:45,seconds:70,xp:110},
  {id:'OATHBLOSSOM_PATCH',name:'Oathblossom Patch',itemId:'OATHBLOSSOM',zoneId:'KINGS_ROAD',unlockLevel:60,seconds:80,xp:170},
  {id:'SUNSCALE_BLOOM',name:'Sunscale Bloom',itemId:'SUNSCALE',zoneId:'SUNSCAR',unlockLevel:26,seconds:92,xp:215},
  {id:'FROSTBELL_FLOWER',name:'Frostbell Flower',itemId:'FROSTBLOOM',zoneId:'FROSTMARCH',unlockLevel:46,seconds:118,xp:310},
  {id:'ASHEN_MYRRH_GROVE',name:'Ashen Myrrh Grove',itemId:'ASHEN_MYRRH',zoneId:'ASHLANDS',unlockLevel:71,seconds:145,xp:440},
].map(node=>({...node,skillId:'herbalism',min:1,max:1,difficultyMultiplier:1,recommendedToolTier:0}));

export const HERB_ITEMS:ItemDef[]=[
  {id:'DEWLEAF',name:'Dewleaf',type:'material',value:2,rarity:'common'},
  {id:'RIVER_MINT',name:'River Mint',type:'material',value:4,rarity:'common'},
  {id:'IRONBLOOM',name:'Ironbloom',type:'material',value:8,rarity:'uncommon'},
  {id:'CAVELICHEN',name:'Cavelichen',type:'material',value:14,rarity:'uncommon'},
  {id:'CROWN_SAGE',name:'Crown Sage',type:'material',value:22,rarity:'rare'},
  {id:'OATHBLOSSOM',name:'Oathblossom',type:'material',value:32,rarity:'rare'},
  {id:'SUNSCALE',name:'Sunscale Bloom',type:'material',value:48,rarity:'rare'},
  {id:'FROSTBLOOM',name:'Frostbell Flower',type:'material',value:72,rarity:'rare'},
  {id:'ASHEN_MYRRH',name:'Ashen Myrrh',type:'material',value:105,rarity:'epic'},
  {id:'ASTERFALL_BOTANICAL_ESSENCE',name:'Asterfall Botanical Essence',type:'material',value:55,rarity:'rare',passive:'A rare concentrated botanical reagent from Asterfall harvesting.'},
  {id:'SUNSCAR_BOTANICAL_ESSENCE',name:'Sunscar Botanical Essence',type:'material',value:110,rarity:'rare',passive:'A rare concentrated botanical reagent from Sunscar harvesting.'},
  {id:'FROSTMARCH_BOTANICAL_ESSENCE',name:'Frostmarch Botanical Essence',type:'material',value:180,rarity:'epic',passive:'A rare concentrated botanical reagent from Frostmarch harvesting.'},
  {id:'ASHLANDS_BOTANICAL_ESSENCE',name:'Ashlands Botanical Essence',type:'material',value:300,rarity:'epic',passive:'A rare concentrated botanical reagent from Ashlands harvesting.'},
];

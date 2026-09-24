import type {ClassId} from '../core/types';
import {NOVICE_RECIPES} from './novice-sets';
import {TOOL_RECIPES} from './gathering-tools';
import {ALCHEMY_RECIPES} from './alchemy';
import {V33_EQUIPMENT_RECIPES} from './equipment-recipes-v33';
export interface GatherDef{id:string;skillId:'mining'|'woodcutting'|'fishing'|'herbalism';name:string;unlockLevel:number;seconds:number;xp:number;itemId:string;min:number;max:number;zoneId:string;difficultyMultiplier:number;recommendedToolTier:number;}
export const GATHERING:GatherDef[]=([
{id:'COPPER_VEIN',skillId:'mining',name:'Copper Vein',unlockLevel:1,seconds:15,xp:9,itemId:'COPPER_ORE',min:1,max:2,zoneId:'OLD_MINES'},
{id:'ASTER_IRON_VEIN',skillId:'mining',name:'Aster-Iron Vein',unlockLevel:8,seconds:24,xp:18,itemId:'ASTER_IRON_ORE',min:1,max:2,zoneId:'OLD_MINES'},
{id:'OATHSTONE_SEAM',skillId:'mining',name:'Oathstone Seam',unlockLevel:16,seconds:36,xp:29,itemId:'OATHSTONE_ORE',min:1,max:1,zoneId:'OLD_MINES'},
{id:'ECHO_QUARTZ_GEODE',skillId:'mining',name:'Echo Quartz Geode',unlockLevel:20,seconds:38,xp:42,itemId:'ECHO_QUARTZ',min:1,max:1,zoneId:'OLD_MINES'},
{id:'BLACKGLASS_VEIN',skillId:'mining',name:'Blackglass Vein',unlockLevel:68,seconds:78,xp:310,itemId:'BLACKGLASS_ORE',min:1,max:1,zoneId:'ASHLANDS'},

{id:'GREENWOOD_TREE',skillId:'woodcutting',name:'Greenwood Tree',unlockLevel:1,seconds:14,xp:8,itemId:'GREENWOOD_LOG',min:1,max:2,zoneId:'GREENFIELDS'},
{id:'IRONWOOD_TREE',skillId:'woodcutting',name:'Ironwood Tree',unlockLevel:7,seconds:24,xp:17,itemId:'IRONWOOD_LOG',min:1,max:2,zoneId:'IRONWOOD'},
{id:'CROWNWOOD_TREE',skillId:'woodcutting',name:'Crownwood Tree',unlockLevel:15,seconds:36,xp:27,itemId:'CROWNWOOD_LOG',min:1,max:1,zoneId:'IRONWOOD'},

{id:'SILVERBROOK_SHOAL',skillId:'fishing',name:'Silverbrook Shoal',unlockLevel:1,seconds:17,xp:9,itemId:'SILVERFIN',min:1,max:2,zoneId:'SILVERBROOK'},
{id:'RIVER_EEL_POOL',skillId:'fishing',name:'River Eel Pool',unlockLevel:8,seconds:29,xp:18,itemId:'RIVER_EEL',min:1,max:1,zoneId:'SILVERBROOK'},
{id:'OATHSCALE_POOL',skillId:'fishing',name:'Oathscale Pool',unlockLevel:16,seconds:41,xp:28,itemId:'OATHSCALE_PIKE',min:1,max:1,zoneId:'SILVERBROOK'},
// The 24-hour AFK window is generous; each gathering cycle is therefore
// stretched by a noticeable amount to avoid rapid early skill acceleration.
] as Omit<GatherDef,'difficultyMultiplier'|'recommendedToolTier'>[]).map(activity=>{
  const difficultyMultiplier=activity.unlockLevel>=15?1.5:activity.unlockLevel>=7?1.2:1;
  const recommendedToolTier=activity.unlockLevel>=15?3:activity.unlockLevel>=7?2:1;
  const xpMultiplier=activity.unlockLevel>=15?1.45:activity.unlockLevel>=7?1.35:1;
  return {...activity,seconds:Math.ceil(activity.seconds*2),xp:Math.round(activity.xp*xpMultiplier),difficultyMultiplier,recommendedToolTier};
});

export interface Recipe{id:string;name:string;skillId:'smithing'|'cooking'|'alchemy'|'tailoring'|'enchanting';level:number;xp:number;gold:number;seconds:number;repeatableTraining?:boolean;inputs:{itemId:string;quantity:number}[];output:{itemId:string;quantity:number};classId?:ClassId;noviceSetId?:string;characterLevel?:number;requiresCraftedItemId?:string;v33EquipmentTier?:string;v33Region?:string;v33SetId?:string;v33Path?:string;}
export const RECIPES:Recipe[]=[
...ALCHEMY_RECIPES as Recipe[],
...NOVICE_RECIPES,
...(V33_EQUIPMENT_RECIPES as Recipe[]),
...(TOOL_RECIPES as Recipe[]),
{id:'SMELT_COPPER_INGOT',name:'Smelt Copper Batch',skillId:'smithing',level:1,xp:80,gold:30,seconds:36,repeatableTraining:true,inputs:[{itemId:'COPPER_ORE',quantity:10}],output:{itemId:'COPPER_INGOT',quantity:5}},
{id:'SMELT_ASTER_IRON_INGOT',name:'Smelt Aster-Iron Batch',skillId:'smithing',level:8,xp:140,gold:50,seconds:42,repeatableTraining:true,inputs:[{itemId:'ASTER_IRON_ORE',quantity:8}],output:{itemId:'ASTER_IRON_INGOT',quantity:4}},
{id:'FORGE_REINFORCED_FITTING',name:'Forge Reinforced Fitting',skillId:'smithing',level:12,xp:180,gold:50,seconds:48,repeatableTraining:true,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:2},{itemId:'IRONWOOD_LOG',quantity:2}],output:{itemId:'REINFORCED_FITTING',quantity:1}},
{id:'SMELT_OATHSTONE_INGOT',name:'Smelt Oathstone Batch',skillId:'smithing',level:16,xp:230,gold:80,seconds:54,repeatableTraining:true,inputs:[{itemId:'OATHSTONE_ORE',quantity:6}],output:{itemId:'OATHSTONE_INGOT',quantity:3}},


{id:'ENCHANT_REGIONAL_CATALYST',name:'Synthesize Regional Catalyst',skillId:'enchanting',level:70,xp:2400,gold:12000,seconds:1800,repeatableTraining:true,inputs:[{itemId:'GEM_DUST',quantity:25},{itemId:'FROSTMARCH_BOTANICAL_ESSENCE',quantity:2}],output:{itemId:'REGIONAL_CATALYST',quantity:1}},
{id:'ENCHANT_RADIANT_CATALYST',name:'Synthesize Radiant Catalyst',skillId:'enchanting',level:90,xp:5600,gold:50000,seconds:5400,repeatableTraining:true,inputs:[{itemId:'REGIONAL_CATALYST',quantity:3},{itemId:'GEM_DUST',quantity:80},{itemId:'ASHLANDS_BOTANICAL_ESSENCE',quantity:2}],output:{itemId:'RADIANT_CATALYST',quantity:1}},

{id:'COOK_SILVERFIN',name:'Cook Silverfin Batch',skillId:'cooking',level:1,xp:100,gold:50,seconds:36,repeatableTraining:true,inputs:[{itemId:'SILVERFIN',quantity:5}],output:{itemId:'COOKED_SILVERFIN',quantity:5}},
{id:'COOK_RIVER_EEL',name:'Sear River Eel Batch',skillId:'cooking',level:8,xp:180,gold:80,seconds:44,repeatableTraining:true,inputs:[{itemId:'RIVER_EEL',quantity:4}],output:{itemId:'SEARED_RIVER_EEL',quantity:4}},
{id:'COOK_OATHSCALE',name:'Roast Oathscale Batch',skillId:'cooking',level:16,xp:260,gold:130,seconds:54,repeatableTraining:true,inputs:[{itemId:'OATHSCALE_PIKE',quantity:3}],output:{itemId:'ROASTED_OATHSCALE',quantity:3}},
{id:'COOK_IRONWOOD_STEW',name:'Ironwood Hunter Stew',skillId:'cooking',level:15,xp:105,gold:140,seconds:66,inputs:[{itemId:'RIVER_EEL',quantity:2},{itemId:'THORN_SAP',quantity:1}],output:{itemId:'IRONWOOD_STEW',quantity:1}},
];

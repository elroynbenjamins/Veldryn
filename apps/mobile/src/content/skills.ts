import type {ClassId} from '../core/types';
import {NOVICE_RECIPES} from './novice-sets';
export interface GatherDef{id:string;skillId:'mining'|'woodcutting'|'fishing';name:string;unlockLevel:number;seconds:number;xp:number;itemId:string;min:number;max:number;}
export const GATHERING:GatherDef[]=[
{id:'COPPER_VEIN',skillId:'mining',name:'Copper Vein',unlockLevel:1,seconds:15,xp:9,itemId:'COPPER_ORE',min:1,max:2},
{id:'ASTER_IRON_VEIN',skillId:'mining',name:'Aster-Iron Vein',unlockLevel:8,seconds:24,xp:18,itemId:'ASTER_IRON_ORE',min:1,max:2},
{id:'OATHSTONE_SEAM',skillId:'mining',name:'Oathstone Seam',unlockLevel:16,seconds:36,xp:29,itemId:'OATHSTONE_ORE',min:1,max:1},

{id:'GREENWOOD_TREE',skillId:'woodcutting',name:'Greenwood Tree',unlockLevel:1,seconds:14,xp:8,itemId:'GREENWOOD_LOG',min:1,max:2},
{id:'IRONWOOD_TREE',skillId:'woodcutting',name:'Ironwood Tree',unlockLevel:7,seconds:24,xp:17,itemId:'IRONWOOD_LOG',min:1,max:2},
{id:'CROWNWOOD_TREE',skillId:'woodcutting',name:'Crownwood Tree',unlockLevel:15,seconds:36,xp:27,itemId:'CROWNWOOD_LOG',min:1,max:1},

{id:'SILVERBROOK_SHOAL',skillId:'fishing',name:'Silverbrook Shoal',unlockLevel:1,seconds:17,xp:9,itemId:'SILVERFIN',min:1,max:2},
{id:'RIVER_EEL_POOL',skillId:'fishing',name:'River Eel Pool',unlockLevel:8,seconds:29,xp:18,itemId:'RIVER_EEL',min:1,max:1},
{id:'OATHSCALE_POOL',skillId:'fishing',name:'Oathscale Pool',unlockLevel:16,seconds:41,xp:28,itemId:'OATHSCALE_PIKE',min:1,max:1},
];

export interface Recipe{id:string;name:string;skillId:'smithing'|'cooking';level:number;xp:number;gold:number;seconds:number;repeatableTraining?:boolean;inputs:{itemId:string;quantity:number}[];output:{itemId:string;quantity:number};classId?:ClassId;noviceSetId?:string;characterLevel?:number;requiresCraftedItemId?:string;}
export const RECIPES:Recipe[]=[
...NOVICE_RECIPES,
{id:'SMELT_COPPER_INGOT',name:'Smelt Copper Batch',skillId:'smithing',level:1,xp:80,gold:30,seconds:36,repeatableTraining:true,inputs:[{itemId:'COPPER_ORE',quantity:10}],output:{itemId:'COPPER_INGOT',quantity:5}},
{id:'SMELT_ASTER_IRON_INGOT',name:'Smelt Aster-Iron Batch',skillId:'smithing',level:8,xp:140,gold:50,seconds:42,repeatableTraining:true,inputs:[{itemId:'ASTER_IRON_ORE',quantity:8}],output:{itemId:'ASTER_IRON_INGOT',quantity:4}},
{id:'FORGE_REINFORCED_FITTING',name:'Forge Reinforced Fitting',skillId:'smithing',level:12,xp:180,gold:50,seconds:48,repeatableTraining:true,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:2},{itemId:'IRONWOOD_LOG',quantity:2}],output:{itemId:'REINFORCED_FITTING',quantity:1}},
{id:'SMELT_OATHSTONE_INGOT',name:'Smelt Oathstone Batch',skillId:'smithing',level:16,xp:230,gold:80,seconds:54,repeatableTraining:true,inputs:[{itemId:'OATHSTONE_ORE',quantity:6}],output:{itemId:'OATHSTONE_INGOT',quantity:3}},

{id:'SMITH_COPPER_BLADE',name:'Copper Blade',skillId:'smithing',level:3,xp:120,gold:180,seconds:84,inputs:[{itemId:'COPPER_INGOT',quantity:22},{itemId:'GREENWOOD_LOG',quantity:45}],output:{itemId:'COPPER_BLADE',quantity:1}},
{id:'SMITH_ASTER_IRON_BLADE',name:'Aster-Iron Blade',skillId:'smithing',level:9,xp:260,gold:550,seconds:126,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:45},{itemId:'IRONWOOD_LOG',quantity:90},{itemId:'REINFORCED_FITTING',quantity:4}],output:{itemId:'ASTER_IRON_BLADE',quantity:1}},
{id:'SMITH_ASTER_IRON_HELM',name:'Aster-Iron Helm',skillId:'smithing',level:10,xp:300,gold:620,seconds:132,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:55},{itemId:'IRONWOOD_LOG',quantity:70},{itemId:'REINFORCED_FITTING',quantity:5}],output:{itemId:'ASTER_IRON_HELM',quantity:1}},
{id:'SMITH_IRONWOOD_GUARD',name:'Ironwood Guard',skillId:'smithing',level:11,xp:320,gold:660,seconds:138,inputs:[{itemId:'IRONWOOD_LOG',quantity:140},{itemId:'ASTER_IRON_INGOT',quantity:35},{itemId:'REINFORCED_FITTING',quantity:5}],output:{itemId:'IRONWOOD_GUARD',quantity:1}},
{id:'SMITH_IRONWOOD_LONGBOW',name:'Ironwood Longbow',skillId:'smithing',level:12,xp:340,gold:700,seconds:144,inputs:[{itemId:'IRONWOOD_LOG',quantity:165},{itemId:'ASTER_IRON_INGOT',quantity:28},{itemId:'REINFORCED_FITTING',quantity:4}],output:{itemId:'IRONWOOD_LONGBOW',quantity:1}},
{id:'SMITH_IRONWOOD_STAFF',name:'Ironwood Runestaff',skillId:'smithing',level:12,xp:340,gold:700,seconds:144,inputs:[{itemId:'IRONWOOD_LOG',quantity:150},{itemId:'WISP_DUST',quantity:35},{itemId:'REINFORCED_FITTING',quantity:4}],output:{itemId:'IRONWOOD_STAFF',quantity:1}},
{id:'SMITH_IRONWOOD_DAGGERS',name:'Ironwood Twin Daggers',skillId:'smithing',level:12,xp:340,gold:700,seconds:144,inputs:[{itemId:'IRONWOOD_LOG',quantity:110},{itemId:'ASTER_IRON_INGOT',quantity:38},{itemId:'REINFORCED_FITTING',quantity:5}],output:{itemId:'IRONWOOD_DAGGERS',quantity:1}},
{id:'SMITH_IRONWOOD_GREATAXE',name:'Ironwood Great-Axe',skillId:'smithing',level:12,xp:340,gold:700,seconds:144,inputs:[{itemId:'IRONWOOD_LOG',quantity:105},{itemId:'ASTER_IRON_INGOT',quantity:50},{itemId:'REINFORCED_FITTING',quantity:5}],output:{itemId:'IRONWOOD_GREATAXE',quantity:1}},
{id:'SMITH_ASTER_IRON_LEGS',name:'Aster-Iron Legguards',skillId:'smithing',level:13,xp:420,gold:950,seconds:174,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:72},{itemId:'IRONWOOD_LOG',quantity:105},{itemId:'REINFORCED_FITTING',quantity:7}],output:{itemId:'ASTER_IRON_LEGS',quantity:1}},
{id:'SMITH_ASTER_IRON_CHEST',name:'Aster-Iron Cuirass',skillId:'smithing',level:15,xp:520,gold:1250,seconds:216,inputs:[{itemId:'ASTER_IRON_INGOT',quantity:95},{itemId:'IRONWOOD_LOG',quantity:145},{itemId:'REINFORCED_FITTING',quantity:10}],output:{itemId:'ASTER_IRON_CHEST',quantity:1}},
{id:'SMITH_OATHSTONE_WARD',name:'Oathstone Wardplate',skillId:'smithing',level:18,xp:700,gold:1850,seconds:288,inputs:[{itemId:'OATHSTONE_INGOT',quantity:40},{itemId:'ASTER_IRON_INGOT',quantity:45},{itemId:'CROWNWOOD_LOG',quantity:70},{itemId:'OATHGLASS_SHARD',quantity:12}],output:{itemId:'OATHSTONE_WARDPLATE',quantity:1}},

{id:'COOK_SILVERFIN',name:'Cook Silverfin Batch',skillId:'cooking',level:1,xp:100,gold:50,seconds:36,repeatableTraining:true,inputs:[{itemId:'SILVERFIN',quantity:5}],output:{itemId:'COOKED_SILVERFIN',quantity:5}},
{id:'COOK_RIVER_EEL',name:'Sear River Eel Batch',skillId:'cooking',level:8,xp:180,gold:80,seconds:44,repeatableTraining:true,inputs:[{itemId:'RIVER_EEL',quantity:4}],output:{itemId:'SEARED_RIVER_EEL',quantity:4}},
{id:'COOK_OATHSCALE',name:'Roast Oathscale Batch',skillId:'cooking',level:16,xp:260,gold:130,seconds:54,repeatableTraining:true,inputs:[{itemId:'OATHSCALE_PIKE',quantity:3}],output:{itemId:'ROASTED_OATHSCALE',quantity:3}},
{id:'COOK_IRONWOOD_STEW',name:'Ironwood Hunter Stew',skillId:'cooking',level:15,xp:105,gold:140,seconds:66,inputs:[{itemId:'RIVER_EEL',quantity:2},{itemId:'THORN_SAP',quantity:1}],output:{itemId:'IRONWOOD_STEW',quantity:1}},
];

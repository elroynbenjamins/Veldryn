import {SkillId} from '../core/types';
export interface GatherDef{id:string;skillId:'mining'|'woodcutting'|'fishing';name:string;unlockLevel:number;seconds:number;xp:number;itemId:string;min:number;max:number;}
export const GATHERING:GatherDef[]=[
{id:'COPPER_VEIN',skillId:'mining',name:'Copper Vein',unlockLevel:1,seconds:8,xp:12,itemId:'COPPER_ORE',min:1,max:2},
{id:'ASTER_IRON_VEIN',skillId:'mining',name:'Aster Iron Vein',unlockLevel:5,seconds:12,xp:24,itemId:'ASTER_IRON_ORE',min:1,max:2},
{id:'GREENWOOD_TREE',skillId:'woodcutting',name:'Greenwood Tree',unlockLevel:1,seconds:7,xp:11,itemId:'GREENWOOD_LOG',min:1,max:2},
{id:'IRONWOOD_TREE',skillId:'woodcutting',name:'Ironwood Tree',unlockLevel:5,seconds:12,xp:25,itemId:'IRONWOOD_LOG',min:1,max:2},
{id:'SILVERBROOK_SHOAL',skillId:'fishing',name:'Silverbrook Shoal',unlockLevel:1,seconds:9,xp:13,itemId:'SILVERFIN',min:1,max:2},
{id:'RIVER_EEL_POOL',skillId:'fishing',name:'River Eel Pool',unlockLevel:5,seconds:13,xp:27,itemId:'RIVER_EEL',min:1,max:1},];
export interface Recipe{id:string;name:string;skillId:'smithing'|'cooking';level:number;xp:number;gold:number;inputs:{itemId:string;quantity:number}[];output:{itemId:string;quantity:number};}
export const RECIPES:Recipe[]=[
{id:'SMITH_COPPER_BLADE',name:'Copper Blade',skillId:'smithing',level:1,xp:24,gold:12,inputs:[{itemId:'COPPER_ORE',quantity:5},{itemId:'GREENWOOD_LOG',quantity:2}],output:{itemId:'COPPER_BLADE',quantity:1}},
{id:'SMITH_ASTER_IRON_BLADE',name:'Aster-Iron Blade',skillId:'smithing',level:5,xp:55,gold:30,inputs:[{itemId:'ASTER_IRON_ORE',quantity:6},{itemId:'IRONWOOD_LOG',quantity:3}],output:{itemId:'ASTER_IRON_BLADE',quantity:1}},
{id:'COOK_SILVERFIN',name:'Cooked Silverfin',skillId:'cooking',level:1,xp:18,gold:4,inputs:[{itemId:'SILVERFIN',quantity:2}],output:{itemId:'COOKED_SILVERFIN',quantity:1}},
{id:'COOK_RIVER_EEL',name:'Seared River Eel',skillId:'cooking',level:5,xp:42,gold:10,inputs:[{itemId:'RIVER_EEL',quantity:2}],output:{itemId:'SEARED_RIVER_EEL',quantity:1}},];

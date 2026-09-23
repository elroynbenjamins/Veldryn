import type {ClassId,GearSlot} from '../core/types';
import catalog from './equipment_catalog_t1_t9_v33.json';

export interface V33EquipmentRecipeDef{
  id:string;
  name:string;
  skillId:'smithing'|'tailoring';
  level:number;
  xp:number;
  gold:number;
  seconds:number;
  inputs:{itemId:string;quantity:number}[];
  output:{itemId:string;quantity:number};
  classId:ClassId;
  characterLevel:number;
  v33EquipmentTier:string;
  v33Region:string;
  v33SetId:string;
  v33Path:string;
}

const classIdByName:Record<string,ClassId>={
  Ironwarden:'IRONWARDEN',Bastion:'BASTION',Dreadguard:'DREADGUARD',Dawnkeeper:'DAWNKEEPER',
  Wayfinder:'WAYFINDER',Ravager:'RAVAGER',Hexweaver:'HEXWEAVER','Knife Dancer':'KNIFE_DANCER',Stonecaller:'STONECALLER',
};
const slotByName:Record<string,GearSlot>={
  Helmet:'helmet',Chest:'chest',Gloves:'gloves',Legs:'legs',Boots:'boots',Weapon:'weapon','Off-hand':'offhand',Cape:'cape',Amulet:'amulet',Ring:'ring',
};
const slotMultiplier:Record<GearSlot,number>={
  helmet:.85,chest:1.2,gloves:.7,legs:1,boots:.75,weapon:1.35,offhand:1.15,cape:.85,amulet:.65,ring:.55,
};
const timerRange:Record<string,{base:number;min:number;max:number}>={
  T1:{base:120,min:60,max:180},T2:{base:240,min:180,max:360},T3:{base:420,min:300,max:600},
  T4:{base:660,min:480,max:900},T5:{base:900,min:720,max:1200},T6:{base:1200,min:900,max:1500},
  T7:{base:1500,min:1200,max:1800},T8:{base:1950,min:1500,max:2400},T9:{base:2250,min:1800,max:2700},
};
const tierGold:Record<string,number>={T1:120,T2:420,T3:900,T4:1800,T5:3500,T6:6000,T7:9000,T8:14000,T9:20000};
const tierXp:Record<string,number>={T1:120,T2:250,T3:450,T4:700,T5:1100,T6:1600,T7:2200,T8:2900,T9:3800};
export const TIER_CHARACTER_LEVEL_FLOOR:Record<string,number>={T1:2,T2:6,T3:13,T4:19,T5:26,T6:36,T7:46,T8:58,T9:65};
export const TIER_CRAFTING_LEVEL_FLOOR:Record<string,number>={T1:1,T2:3,T3:10,T4:16,T5:23,T6:33,T7:43,T8:55,T9:62};
export const EQUIPMENT_CRAFT_SKILL_BY_CLASS:Record<ClassId,'smithing'|'tailoring'>={
  IRONWARDEN:'smithing',BASTION:'smithing',DREADGUARD:'smithing',RAVAGER:'smithing',
  WAYFINDER:'tailoring',HEXWEAVER:'tailoring',KNIFE_DANCER:'tailoring',DAWNKEEPER:'tailoring',STONECALLER:'tailoring',
};


const smithingPathMaterial:Record<string,Record<string,string>>={
  T1:{Foundation:'MOSS_FIBER',Specialist:'WISP_DUST',Alternate:'BOAR_HIDE'},
  T2:{Foundation:'WOLF_PELT',Specialist:'THORN_SAP',Alternate:'IRONWOOD_FANG'},
  T3:{Foundation:'TROLL_HIDE',Specialist:'THORN_SAP',Alternate:'WOLF_PELT'},
  T4:{Foundation:'TORN_OATHCLOTH',Specialist:'LANTERNSTEEL_SHARD',Alternate:'ECHO_QUARTZ'},
};
const tailoringPathMaterial:Record<string,Record<string,string>>={
  T1:{Foundation:'MOSS_FIBER',Specialist:'WISP_DUST',Alternate:'BOAR_HIDE'},
  T2:{Foundation:'WOLF_PELT',Specialist:'THORN_SAP',Alternate:'BOAR_HIDE'},
  T3:{Foundation:'TROLL_HIDE',Specialist:'THORN_SAP',Alternate:'WOLF_PELT'},
  T4:{Foundation:'TORN_OATHCLOTH',Specialist:'ECHO_QUARTZ',Alternate:'ECHO_TOUCHED_PELT'},
};

function q(base:number,multiplier:number){return Math.max(1,Math.round(base*multiplier));}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function smithingIngredients(tier:string,path:string,multiplier:number){
  const pathItem=smithingPathMaterial[tier]?.[path];
  switch(tier){
    case 'T1':return [{itemId:'GREENWOOD_LOG',quantity:q(28,multiplier)},{itemId:pathItem??'MOSS_FIBER',quantity:q(8,multiplier)}];
    case 'T2':return [{itemId:'IRONWOOD_LOG',quantity:q(34,multiplier)},{itemId:pathItem??'WOLF_PELT',quantity:q(10,multiplier)}];
    case 'T3':return [{itemId:'CROWNWOOD_LOG',quantity:q(32,multiplier)},{itemId:pathItem??'TROLL_HIDE',quantity:q(12,multiplier)},{itemId:'THORN_SAP',quantity:q(6,multiplier)}];
    case 'T4':return [{itemId:'OATHSTONE_INGOT',quantity:q(18,multiplier)},{itemId:'OATHGLASS_SHARD',quantity:q(7,multiplier)},{itemId:pathItem??'TORN_OATHCLOTH',quantity:q(5,multiplier)}];
    case 'T5':return [{itemId:'SUNSTONE_ORE',quantity:q(22,multiplier)},{itemId:'AMBERGLASS',quantity:q(7,multiplier)}];
    case 'T6':return [{itemId:'SUNSTONE_ORE',quantity:q(30,multiplier)},{itemId:'AMBERGLASS',quantity:q(10,multiplier)},{itemId:'ASTRAL_SCRIPT',quantity:q(1,multiplier)}];
    case 'T7':return [{itemId:'FROSTIRON',quantity:q(30,multiplier)},{itemId:'RIMEGLASS',quantity:q(8,multiplier)}];
    case 'T8':return [{itemId:'FROSTIRON',quantity:q(36,multiplier)},{itemId:'RIMEGLASS',quantity:q(11,multiplier)},{itemId:'CHOIR_BLOOM',quantity:q(1,multiplier)}];
    case 'T9':return [{itemId:'FROSTIRON',quantity:q(46,multiplier)},{itemId:'RIMEGLASS',quantity:q(16,multiplier)},{itemId:'CHOIR_BLOOM',quantity:q(3,multiplier)}];
    default:return [];
  }
}
function tailoringIngredients(tier:string,path:string,multiplier:number){
  const pathItem=tailoringPathMaterial[tier]?.[path];
  switch(tier){
    case 'T1':return [{itemId:'MOSS_FIBER',quantity:q(24,multiplier)},{itemId:pathItem??'MOSS_FIBER',quantity:q(7,multiplier)}];
    case 'T2':return [{itemId:'WOLF_PELT',quantity:q(24,multiplier)},{itemId:pathItem??'BOAR_HIDE',quantity:q(9,multiplier)}];
    case 'T3':return [{itemId:'TROLL_HIDE',quantity:q(20,multiplier)},{itemId:pathItem??'WOLF_PELT',quantity:q(11,multiplier)},{itemId:'THORN_SAP',quantity:q(6,multiplier)}];
    case 'T4':return [{itemId:'TORN_OATHCLOTH',quantity:q(20,multiplier)},{itemId:'ECHO_TOUCHED_PELT',quantity:q(8,multiplier)},{itemId:pathItem??'OATHGLASS_SHARD',quantity:q(5,multiplier)}];
    case 'T5':return [{itemId:'SUNSCALE',quantity:q(24,multiplier)},{itemId:'AMBERGLASS',quantity:q(8,multiplier)}];
    case 'T6':return [{itemId:'SUNSCALE',quantity:q(30,multiplier)},{itemId:'AMBERGLASS',quantity:q(10,multiplier)},{itemId:'ASTRAL_SCRIPT',quantity:q(1,multiplier)}];
    case 'T7':return [{itemId:'FROSTBLOOM',quantity:q(30,multiplier)},{itemId:'RIMEGLASS',quantity:q(8,multiplier)}];
    case 'T8':return [{itemId:'FROSTBLOOM',quantity:q(36,multiplier)},{itemId:'RIMEGLASS',quantity:q(11,multiplier)},{itemId:'CHOIR_BLOOM',quantity:q(1,multiplier)}];
    case 'T9':return [{itemId:'ASHEN_MYRRH',quantity:q(46,multiplier)},{itemId:'RIMEGLASS',quantity:q(16,multiplier)},{itemId:'CHOIR_BLOOM',quantity:q(3,multiplier)}];
    default:return [];
  }
}

const setById=new Map((catalog.sets as Array<Record<string,string|number>>).map(set=>[String(set['Set ID']),set]));

export const V33_EQUIPMENT_RECIPES:V33EquipmentRecipeDef[]=(catalog.pieces as Array<Record<string,string|number>>).map(piece=>{
  const setId=String(piece['Set ID']),set=setById.get(setId);
  if(!set)throw new Error(`Missing V33 set for ${setId}`);
  const tier=String(piece.Tier),slot=slotByName[String(piece.Slot)],multiplier=slotMultiplier[slot],catalogReqLevel=Math.max(1,Number(piece['Req Level']));
  const classId=classIdByName[String(piece.Class)],skillId=EQUIPMENT_CRAFT_SKILL_BY_CLASS[classId];
  const characterLevel=Math.max(catalogReqLevel,TIER_CHARACTER_LEVEL_FLOOR[tier]??1);
  const level=Math.max(1,characterLevel-3,TIER_CRAFTING_LEVEL_FLOOR[tier]??1);
  const range=timerRange[tier]??timerRange.T1;
  return {
    id:`CRAFT_V33_${String(piece['Piece ID'])}`,
    name:String(piece['Item Name']),
    skillId,
    level,
    xp:q(tierXp[tier]??120,multiplier),
    gold:q(tierGold[tier]??120,multiplier),
    seconds:clamp(Math.round(range.base*multiplier),range.min,range.max),
    inputs:(skillId==='tailoring'?tailoringIngredients:smithingIngredients)(tier,String(piece.Path),multiplier),
    output:{itemId:String(piece['Piece ID']),quantity:1},
    classId,
    characterLevel,
    v33EquipmentTier:tier,
    v33Region:String(set.Region),
    v33SetId:setId,
    v33Path:String(piece.Path),
  };
});

export function v33EquipmentRecipeForItem(itemId:string){return V33_EQUIPMENT_RECIPES.find(recipe=>recipe.output.itemId===itemId);}

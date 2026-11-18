import type {GearSlot} from '../core/types';
import type {EquipmentV2Tier} from '../core/equipment-crafting-v2-foundation';
import {equipmentV2DraftAssembly,EQUIPMENT_V2_COMPONENTS_BY_TIER} from '../core/equipment-crafting-v2-economy';
import {EQUIPMENT_V2_PIECES,type EquipmentV2PieceDescriptor} from './equipment-v2-catalog';
import {EQUIPMENT_V2_CRAFTABLE_ARMAMENTS} from './equipment-v2-armaments';

/** PREVIEW-ONLY recipes for Equipment/Crafting 2.0. These must not be added to
 * live RECIPES until server authority, item migration and release approval.
 * One material route does not grant better rarity, quality, XP or rolls.
 */
export type EquipmentV2Profession='smithing'|'tailoring';
export type EquipmentV2Route='foundation'|'alternate';
export interface EquipmentV2RecipeIngredient {itemId:string;quantity:number;kind:'gather'|'component'|'binder'}
export interface EquipmentV2Recipe {
 id:string;outputId:string;name:string;tier:EquipmentV2Tier;slot:GearSlot;
 profession:EquipmentV2Profession;route:EquipmentV2Route;inputs:readonly EquipmentV2RecipeIngredient[];
 gold:number;xp:number;seconds:number;characterLevel:number;professionLevel:number;
}
type MaterialDef={itemId:string;quantity:number};
interface TierResourceProfile {primary:MaterialDef;secondary:MaterialDef;accent?:MaterialDef}
const REGIONAL_RESOURCES:Readonly<Record<EquipmentV2Tier,Record<'smithing'|'tailoring',TierResourceProfile>>>={
 1:{
  smithing:{primary:{itemId:'GREENWOOD_LOG',quantity:99},secondary:{itemId:'MOSS_FIBER',quantity:29}},
  tailoring:{primary:{itemId:'MOSS_FIBER',quantity:77},secondary:{itemId:'BOAR_HIDE',quantity:25}},
 },
 2:{
  smithing:{primary:{itemId:'IRONWOOD_LOG',quantity:100},secondary:{itemId:'WOLF_PELT',quantity:30}},
  tailoring:{primary:{itemId:'WOLF_PELT',quantity:64},secondary:{itemId:'THORN_SAP',quantity:27}},
 },
 3:{
  smithing:{primary:{itemId:'DUNEWOOD',quantity:77},secondary:{itemId:'SUNSTONE_ORE',quantity:23},accent:{itemId:'AMBERGLASS',quantity:3}},
  tailoring:{primary:{itemId:'SUNSCALE',quantity:27},secondary:{itemId:'DUNEWOOD',quantity:38},accent:{itemId:'AMBERGLASS',quantity:3}},
 },
 4:{
  smithing:{primary:{itemId:'SUNSTONE_INGOT',quantity:14},secondary:{itemId:'DUNEWOOD',quantity:34},accent:{itemId:'ASTRAL_SCRIPT',quantity:4}},
  tailoring:{primary:{itemId:'SUNSCALE',quantity:32},secondary:{itemId:'DUNEWOOD',quantity:31},accent:{itemId:'AMBERGLASS',quantity:9}},
 },
};
const SLOT_COST_WEIGHT:Readonly<Record<GearSlot,number>>={
 helmet:.85,chest:1.2,gloves:.7,legs:1,boots:.75,weapon:1.35,
 offhand:1.15,cape:.85,amulet:.65,ring:.55,
};
const BASE_ASSEMBLY_SECONDS:Readonly<Record<EquipmentV2Tier,number>>={1:144,2:288,3:504,4:792};
const CRAFT_LEVEL_FLOORS:Readonly<Record<EquipmentV2Tier,number>>={1:1,2:8,3:20,4:34};
const CHARACTER_LEVEL_FLOORS:Readonly<Record<EquipmentV2Tier,number>>={1:2,2:12,3:26,4:40};
function isJewelry(piece:EquipmentV2PieceDescriptor){return piece.material==='jewelry';}
function firstProfession(piece:EquipmentV2PieceDescriptor):EquipmentV2Profession{
 return piece.material==='steel'||piece.material==='mail'||isJewelry(piece)?'smithing':'tailoring';
}
function recipeInputs(piece:EquipmentV2PieceDescriptor,profession:EquipmentV2Profession,route:EquipmentV2Route){
 const tier=piece.tier;
 const regional=REGIONAL_RESOURCES[tier][profession];
 const ratio=SLOT_COST_WEIGHT[piece.slot]/SLOT_COST_WEIGHT.chest;
 const qty=(n:number)=>Math.max(1,Math.round(n*ratio));
 const alt=route==='alternate';
 /** Alternate uses ~20% fewer primary resources and ~25% more secondary.
  * Choice changes material burden, never outcome probabilities.
  */
 const main=qty(regional.primary.quantity*(alt?0.8:1));
 const secondary=qty(regional.secondary.quantity*(alt?1.25:1));
 const cost:EquipmentV2RecipeIngredient[]=[
  {itemId:regional.primary.itemId,quantity:main,kind:'gather'},
  {itemId:regional.secondary.itemId,quantity:secondary,kind:'gather'},
 ];
 if(regional.accent)cost.push({itemId:regional.accent.itemId,quantity:qty(regional.accent.quantity),kind:'gather'});
 const requirements=EQUIPMENT_V2_COMPONENTS_BY_TIER[tier];
 cost.push({itemId:requirements[profession],quantity:requirements.count,kind:'component'});
 cost.push({itemId:requirements.binder,quantity:1,kind:'binder'});
 // If regional primary & secondary are identical in a future source table,
 // combine before displaying or debiting to avoid duplicate stack accounting.
 const combined=new Map<string,EquipmentV2RecipeIngredient>();
 for(const input of cost){
  const old=combined.get(input.itemId);
  combined.set(input.itemId,{...input,quantity:input.quantity+(old?.quantity??0)});
 }
 return [...combined.values()];
}
export function equipmentV2RecipeMethods(piece:EquipmentV2PieceDescriptor):readonly EquipmentV2Recipe[]{
 const main=firstProfession(piece);
 const other:EquipmentV2Profession=isJewelry(piece)?'tailoring':main;
 const draft=equipmentV2DraftAssembly(piece.tier,piece.slot,Boolean(piece.setId));
 return (['foundation','alternate'] as const).map((route,index)=>{
  const profession=index===1?other:main;
  return {
   id:piece.id+'_'+route.toUpperCase(),outputId:piece.id,name:piece.name,
   tier:piece.tier,slot:piece.slot,profession,route,
   gold:draft.gold,xp:draft.xp,
   seconds:Math.max(60,Math.round(BASE_ASSEMBLY_SECONDS[piece.tier]*SLOT_COST_WEIGHT[piece.slot]/1.2)),
   characterLevel:CHARACTER_LEVEL_FLOORS[piece.tier],professionLevel:CRAFT_LEVEL_FLOORS[piece.tier],
   inputs:recipeInputs(piece,profession,route),
  };
 });
}
/** 66 set/standalone pieces + 52 class armaments = 118 distinct new item IDs.
 * Every item has two market-neutral material methods, 236 drafts total.
 */
export const EQUIPMENT_V2_ALL_CRAFTABLE_PIECES:readonly EquipmentV2PieceDescriptor[]=[
 ...EQUIPMENT_V2_PIECES,...EQUIPMENT_V2_CRAFTABLE_ARMAMENTS,
];
export function equipmentV2CraftablePiece(id:string){return EQUIPMENT_V2_ALL_CRAFTABLE_PIECES.find(piece=>piece.id===id);}
export const EQUIPMENT_V2_RECIPES:readonly EquipmentV2Recipe[]=EQUIPMENT_V2_ALL_CRAFTABLE_PIECES.flatMap(piece=>equipmentV2RecipeMethods(piece));
export function equipmentV2RecipeById(id:string){return EQUIPMENT_V2_RECIPES.find(r=>r.id===id);}
export function equipmentV2RecipesForItem(itemId:string){return EQUIPMENT_V2_RECIPES.filter(recipe=>recipe.outputId===itemId);}

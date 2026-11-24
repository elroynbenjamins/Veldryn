import type {GearSlot} from './types';
import type {EquipmentV2Tier} from './equipment-crafting-v2-foundation';

/** Hidden V2 design economy. No changes to live recipes, prices, XP or inventory.
 * Final amounts must be validated server-side before any future release.
 */
export type EquipmentV2SourceStrategy='gather'|'market'|'hybrid';
export interface EquipmentV2MarketOffer {listingId:string;itemId:string;quantity:number;unitGold:number}
export interface EquipmentV2Ingredient {
 itemId:string;required:number;owned:number;kind?:'gather'|'component'|'binder';
 offers?:readonly EquipmentV2MarketOffer[];
}
export interface EquipmentV2IngredientPlan {
 itemId:string;required:number;owned:number;missing:number;
 bought:number;gatherOrProcess:number;marketGold:number;
 marketStatus:'not_requested'|'unavailable'|'none'|'partial'|'quoted';
}
const SLOT_SCALE:Readonly<Record<GearSlot,number>>={
 helmet:.85,chest:1.2,gloves:.7,legs:1,boots:.75,
 weapon:1.35,offhand:1.15,cape:.85,amulet:.65,ring:.55,
};
const CHEST_GOLD:Readonly<Record<EquipmentV2Tier,number>>={1:400,2:1500,3:6000,4:12000};
const CHEST_XP:Readonly<Record<EquipmentV2Tier,number>>={1:198,2:522,3:840,4:1290};
export const EQUIPMENT_V2_COMPONENTS_BY_TIER={
 1:{smithing:'CLOTH_BINDINGS',tailoring:'METAL_CLASPS',count:1,binder:'VERDANT_BINDING_RESIN'},
 2:{smithing:'PADDED_LININGS',tailoring:'REINFORCED_BUCKLES',count:1,binder:'IRONWOOD_BINDING_RESIN'},
 3:{smithing:'REINFORCED_STRAPS',tailoring:'ARMOR_RIVETS',count:2,binder:'SUNSCAR_DUNE_BINDER'},
 4:{smithing:'REINFORCED_STRAPS',tailoring:'ARMOR_RIVETS',count:3,binder:'GLASSBOUND_BINDER'},
} as const;
export const EQUIPMENT_V2_LEVEL_FLOORS={
 character:{1:2,2:12,3:26,4:40},profession:{1:1,2:8,3:20,4:34},
} as const;
export function equipmentV2DraftAssembly(tier:EquipmentV2Tier,slot:GearSlot,setPiece=false){
 if(![1,2,3,4].includes(tier))throw new Error('Unsupported V2 tier');
 const scale=SLOT_SCALE[slot]/SLOT_SCALE.chest;
 const gold=Math.max(100,Math.round(CHEST_GOLD[tier]*scale/100)*100);
 const xp=Math.max(1,Math.round(CHEST_XP[tier]*scale*(setPiece?1.05:1)));
 return {gold,xp};
}
function safeAmount(amount:number){return Number.isSafeInteger(amount)&&amount>=0;}
function selectedForMarket(strategy:EquipmentV2SourceStrategy,ingredient:EquipmentV2Ingredient){
 return strategy==='market'||strategy==='hybrid'&&ingredient.kind!=='gather';
}
/** No imagined market prices: only explicit, validated listing quantities can be quoted.
 * This function never spends Gold, reserves stock, or authorizes a purchase.
 */
export function equipmentV2SourcePlan(
 inputs:readonly EquipmentV2Ingredient[],strategy:EquipmentV2SourceStrategy,marketReleased=false,
){
 const plans:EquipmentV2IngredientPlan[]=[];
 for(const ingredient of inputs){
  const {itemId,required,owned}=ingredient;
  if(!itemId||!safeAmount(required)||!safeAmount(owned)||required<1)throw new Error('Invalid V2 ingredient');
  const missing=Math.max(0,required-owned);
  const requesting=missing>0&&selectedForMarket(strategy,ingredient);
  let bought=0,marketGold=0;
  let marketStatus:EquipmentV2IngredientPlan['marketStatus']='not_requested';
  if(requesting&&!marketReleased)marketStatus='unavailable';
  if(requesting&&marketReleased){
   const unique=new Set<string>();
   const offers=(ingredient.offers??[]).filter(offer=>{
    if(!offer.listingId||unique.has(offer.listingId)||offer.itemId!==itemId
      ||!Number.isSafeInteger(offer.quantity)||offer.quantity<1
      ||!Number.isSafeInteger(offer.unitGold)||offer.unitGold<1)return false;
    unique.add(offer.listingId);return true;
   }).sort((a,b)=>a.unitGold-b.unitGold||a.listingId.localeCompare(b.listingId));
   for(const offer of offers){
    const quantity=Math.min(offer.quantity,missing-bought);
    if(quantity<=0)break;
    bought+=quantity;marketGold+=quantity*offer.unitGold;
    if(!Number.isSafeInteger(marketGold))throw new Error('V2 market quote overflow');
   }
   marketStatus=bought===0?'none':bought===missing?'quoted':'partial';
  }
  plans.push({itemId,required,owned,missing,bought,gatherOrProcess:missing-bought,marketGold,marketStatus});
 }
 return {
  ingredients:plans,
  marketGold:plans.reduce((sum,row)=>sum+row.marketGold,0),
  selfSourceCount:plans.reduce((sum,row)=>sum+row.gatherOrProcess,0),
  fullySupplied:plans.every(row=>row.missing===0),
  marketFullyQuoted:marketReleased&&plans.every(row=>row.gatherOrProcess===0),
 };
}
export function equipmentV2CostSummary(args:{assemblyGold:number;processingGold:number;source:ReturnType<typeof equipmentV2SourcePlan>}){
 if(!safeAmount(args.assemblyGold)||!safeAmount(args.processingGold))throw new Error('Invalid V2 Gold cost');
 const knownGold=args.assemblyGold+args.processingGold+args.source.marketGold;
 if(!Number.isSafeInteger(knownGold))throw new Error('V2 Gold sum overflow');
 return {
  assemblyGold:args.assemblyGold,processingGold:args.processingGold,marketGold:args.source.marketGold,
  knownGold,remainingMaterials:args.source.selfSourceCount,
  /** A subtotal is NOT a complete quoted price while sourcing/processing remains. */
  complete:args.source.selfSourceCount===0,
 };
}

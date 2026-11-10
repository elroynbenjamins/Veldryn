import {itemDef} from '../../apps/mobile/src/content/items';
import {V33_EQUIPMENT_RECIPES} from '../../apps/mobile/src/content/equipment-recipes-v33';
import type {ItemRarity} from '../../apps/mobile/src/core/item-rarity';

/**
 * Hidden Market V10 price governance proposal. These bands are deliberately
 * NOT a permission to trade and are NOT sourced from vendor sell prices.
 * A future server release must approve the matching immutable, per-item
 * policies and recheck the final offer inside its own escrow transaction.
 */
export const MARKET_PRICE_BANDS_RELEASED_V10=false as const;
export type MarketPricedKindV10='resource'|'equipment';
export interface MarketGearPriceTraitsV10{
 rarity:ItemRarity;quality:number;enhancementRank:number;
}
export interface MarketPriceBandV10{
 itemId:string;assetKind:MarketPricedKindV10;unitMin:number;unitMax:number;
 suggestedUnitPrice:number;tick:number;modelVersion:10;approved:false;
}
const RESOURCE_SEEDS_V10:Record<string,readonly [number,number]>={
 COPPER_ORE:[4,24],GREENWOOD_LOG:[3,18],MOSS_FIBER:[3,18],
 BOAR_HIDE:[5,30],WISP_DUST:[7,42],MEADOW_PERCH:[3,18],
 IRONWOOD_LOG:[12,72],WOLF_PELT:[12,72],THORN_SAP:[18,108],
 IRONWOOD_FANG:[24,144],TROLL_HIDE:[34,204],ASTER_IRON_ORE:[13,78],
 COPPER_INGOT:[18,108],ASTER_IRON_INGOT:[45,270],
DUNEWOOD:[40,240],SUNSTONE_ORE:[40,240],
 SUNSTONE_INGOT:[180,1080],AMBERGLASS:[125,750],
 ASTRAL_SCRIPT:[230,1380],GLASSBOUND_CORE:[300,1800],
 FROSTIRON:[85,510],FROSTIRON_INGOT:[320,1920],
 RIMEGLASS:[260,1560],CHOIR_BLOOM:[290,1740],
 BLACKGLASS_ORE:[140,840],BLACKGLASS_INGOT:[420,2520],
 CINDERWOOD_LOG:[110,660],BLACKGLASS_CORE:[180,1080],
 CINDER_HEART:[280,1680],FROZEN_HEART:[650,3900],
 REGENT_SIGIL:[570,3420],GEM_DUST:[12,72],
 TEMPERING_DUST:[15,90],TEMPERING_CORE:[130,780],
 ASTERFALL_MINERAL_ESSENCE:[55,330],
};
const TIER_GEAR_BANDS_V10:Record<string,readonly [number,number]>={
 T1:[600,3600],T2:[1900,11400],T3:[5500,33000],
 T4:[10000,60000],T5:[22000,132000],T6:[45000,270000],
 T7:[85000,510000],T8:[150000,900000],T9:[250000,1500000],
};
const RARITY_MULTIPLIER_V10:Record<ItemRarity,number>={
 common:1,uncommon:1.25,rare:1.65,epic:2.5,legendary:4,mythic:6.5,
};
function validPrice(n:number){return Number.isSafeInteger(n)&&n>0&&n<=1000000000000;}
function priceTick(n:number){return n>=100000?100:n>=10000?10:1;}
function roundDown(n:number,tick:number){return Math.max(tick,Math.floor(n/tick)*tick);}
function roundUp(n:number,tick:number){return Math.ceil(n/tick)*tick;}

/** Explicitly curated starter resource anchors. Unknown or restricted items
 * are left UNPRICED, not silently derived from resale value or rarity.
 */
export function marketDraftResourceIdsV10(){return Object.keys(RESOURCE_SEEDS_V10);}
export function resourcePriceSeedV10(itemId:string){
 return RESOURCE_SEEDS_V10[itemId];
}
export function previewMarketPriceBandV10(itemId:string,kind:MarketPricedKindV10,
 traits?:MarketGearPriceTraitsV10):MarketPriceBandV10|undefined{
 let item:ReturnType<typeof itemDef>;
 try{item=itemDef(itemId);}catch{return undefined;}
 if(item.guildOnly||item.knowledgeUnlockId||item.value<=0)return undefined;
 let lower:number,upper:number;
 if(kind==='resource'){
  if(item.type!=='material')return undefined;
  const anchor=resourcePriceSeedV10(itemId);
  if(!anchor)return undefined;
  [lower,upper]=anchor;
 }else{
  if(item.type!=='gear'||!traits
   ||!Number.isInteger(traits.quality)||traits.quality<0||traits.quality>100
   ||!Number.isInteger(traits.enhancementRank)
   ||traits.enhancementRank<0||traits.enhancementRank>4
   ||!Object.prototype.hasOwnProperty.call(RARITY_MULTIPLIER_V10,traits.rarity)
  )return undefined;
  const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.output.itemId===itemId);
  if(!recipe)return undefined;
  const anchor=TIER_GEAR_BANDS_V10[recipe.v33EquipmentTier];
  if(!anchor)return undefined;
  // Item/slot adjustments can be curated after trusted sale history exists.
  const qualityMultiplier=.70+traits.quality*.006;
  const enhancementMultiplier=1+traits.enhancementRank*.12;
  const multiplier=RARITY_MULTIPLIER_V10[traits.rarity]*qualityMultiplier*enhancementMultiplier;
  [lower,upper]=[anchor[0]*multiplier,anchor[1]*multiplier];
 }
 const tick=priceTick(lower);
 const unitMin=roundDown(lower,tick),unitMax=roundUp(upper,tick);
 if(!validPrice(unitMin)||!validPrice(unitMax)||unitMin>unitMax)return undefined;
 const suggestedUnitPrice=roundDown((unitMin+unitMax)/2,tick);
 return {itemId,assetKind:kind,unitMin,unitMax,suggestedUnitPrice,tick,modelVersion:10,approved:false};
}
/** UI helper only. Server authorization must validate both unit price and
 * exact held item inside one transaction. Quantity cannot be a float.
 */
export function previewMarketListingPriceV10(band:MarketPriceBandV10,unitPrice:number,quantity:number){
 const valid=Number.isSafeInteger(unitPrice)&&unitPrice>=band.unitMin
  &&unitPrice<=band.unitMax&&unitPrice%band.tick===0
  &&Number.isSafeInteger(quantity)&&quantity>=1
  &&BigInt(unitPrice)*BigInt(quantity)<=1000000000000000n;
 return {valid,listingTotal:valid?unitPrice*quantity:null,canListNow:false as const};
}

import {itemDef} from '../../apps/mobile/src/content/items';
import {RECIPES,type Recipe} from '../../apps/mobile/src/content/skills';
import {V33_EQUIPMENT_RECIPES} from '../../apps/mobile/src/content/equipment-recipes-v33';
import type {ItemRarity} from '../../apps/mobile/src/core/item-rarity';
import {resourcePriceSeedV10,previewMarketPriceBandV10,type MarketGearPriceTraitsV10} from './market-price-bands-v10';
import {marketDraftResourceMinLotV11,MARKET_SALE_TAX_BASIS_POINTS_V11} from './market-economy-policy-v11';

/**
 * Hidden V14 economics preview. No DB prices, approval bits, trading gates,
 * ownership records or receipts are modified or trusted by this module.
 * Real trading must use server-owned, independently approved price policies.
 */
export const MARKET_RECIPE_AWARE_PRICING_RELEASED_V14=false as const;
export const MARKET_CRAFT_LABOR_PREMIUM_V14=.15;
export const MARKET_CRAFTED_CORRIDOR_MULTIPLIER_V14=4;
export const MARKET_MAX_PRICE_V14=1_000_000_000_000;

/** NEW candidate input anchors only. NOT approved tradability or live prices.
 * Raw resources already curated in V10 remain the default initial anchors.
 */
const EXTRA_RAW_INPUTS_V14:Readonly<Record<string,readonly [number,number,number]>>={
 DEWLEAF:[5,30,10],
 ASTERFALL_BOTANICAL_ESSENCE:[55,330,1],
 SUNSCALE:[50,300,5],
 WHITEPINE_LOG:[75,450,5],
 SCORPION_VENOM:[90,540,1],
 WINTERMINT:[90,540,5],
 RIME_RESIN:[110,660,1],
 FROSTBLOOM:[120,720,5],
 ASHEN_MYRRH:[180,1080,1],
 OATHSTONE_ORE:[25,150,5],
 CROWNWOOD_LOG:[24,144,5],
};
const RARITY_MULTIPLIER_V14:Readonly<Record<ItemRarity,number>>={
 common:1,uncommon:1.25,rare:1.65,epic:2.5,legendary:4,mythic:6.5,
};

export interface MarketRecipeCostV14{
 recipeId:string;
 outputQuantity:number;
 ingredientFloorGold:number;
 craftingGold:number;
 batchFloorGold:number;
 unitProductionCostGold:number;
}
export interface MarketPriceDraftV14{
 itemId:string;
 kind:'resource'|'equipment';
 unitMin:number;
 unitMax:number;
 tick:number;
 minimumLot:number;
 source:'raw_anchor'|'crafted_recipe'|'exact_gear_recipe';
 /** Rarity, quality and enchantment affect gear; not ordinary stack resources. */
 recipeCost?:MarketRecipeCostV14;
 modelVersion:14;
 approved:false;
 canListNow:false;
}
type MaterialQuote={unitMin:number;unitMax:number;source:'raw_anchor'|'crafted_recipe';minimumLot:number;recipeCost?:MarketRecipeCostV14};
const saneInteger=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const priceTick=(n:number)=>n>=100_000?100:n>=10_000?10:1;
const ceilTick=(n:number,tick:number)=>Math.ceil(n/tick)*tick;
const validMaterial=(id:string)=>{
 try{
  const item=itemDef(id);
  return item.type==='material'&&item.value>0&&!item.guildOnly&&!item.knowledgeUnlockId;
 }catch{return false;}
};
function validDraftPrice(min:number,max:number){
 return saneInteger(min)&&min>0&&saneInteger(max)&&max>=min&&max<=MARKET_MAX_PRICE_V14;
}
function inputAnchor(id:string):MaterialQuote|undefined{
 const legacy=resourcePriceSeedV10(id);
 if(legacy)return {unitMin:legacy[0],unitMax:legacy[1],source:'raw_anchor',
   minimumLot:marketDraftResourceMinLotV11(id)??1};
 const proposal=EXTRA_RAW_INPUTS_V14[id];
 if(proposal)return {unitMin:proposal[0],unitMax:proposal[1],source:'raw_anchor',minimumLot:proposal[2]};
 return undefined;
}
export function marketDraftAdditionalRawAnchorsV14(){
 return Object.entries(EXTRA_RAW_INPUTS_V14).map(([itemId,[min,max,minimumLot]])=>
  ({itemId,min,max,minimumLot,approved:false as const}));
}

/** A batch cannot have a trusted material cost when any input is missing an
 * anchored quote. Never replace unknown inputs with NPC vendor resale values.
 */
function recipeCost(recipe:Pick<Recipe,'id'|'inputs'|'gold'|'output'>,seen:Set<string>,depth:number):MarketRecipeCostV14|undefined{
 if(!saneInteger(recipe.gold)||!saneInteger(recipe.output.quantity)||recipe.output.quantity<1
   ||recipe.inputs.length<1)return undefined;
 let ingredients=0;
 for(const input of recipe.inputs){
  if(!saneInteger(input.quantity)||input.quantity<1)return undefined;
  const material=materialQuote(input.itemId,seen,depth+1);
  if(!material)return undefined;
  ingredients+=material.unitMin*input.quantity;
  if(!Number.isSafeInteger(ingredients)||ingredients>MARKET_MAX_PRICE_V14)return undefined;
 }
 const batch=ingredients+recipe.gold;
 const perUnit=batch/recipe.output.quantity;
 if(!Number.isSafeInteger(batch)||!Number.isFinite(perUnit)||perUnit<=0)return undefined;
 return {recipeId:recipe.id,outputQuantity:recipe.output.quantity,
  ingredientFloorGold:ingredients,craftingGold:recipe.gold,
  batchFloorGold:batch,unitProductionCostGold:perUnit};
}
/** Recursive pricing accounts for intermediary ingots/binders rather than
 * incorrectly treating their old V10 draft floor as production cost.
 * Alternative recipes compete on their cheapest COMPLETE input route.
 */
function materialQuote(id:string,seen:Set<string>,depth:number):MaterialQuote|undefined{
 if(depth>10||seen.has(id)||!validMaterial(id))return undefined;
 const producers=RECIPES.filter(r=>r.output.itemId===id
   &&r.output.quantity>0&&!r.requiredKnowledgeId
   &&(r.skillId==='smithing'||r.skillId==='alchemy'||r.skillId==='enchanting'));
 if(!producers.length)return inputAnchor(id);
 const next=new Set(seen);next.add(id);
 const costs=producers.map(r=>recipeCost(r,next,depth+1)).filter((row):row is MarketRecipeCostV14=>row!==undefined);
 if(!costs.length)return undefined;
 costs.sort((a,b)=>a.unitProductionCostGold-b.unitProductionCostGold||a.recipeId.localeCompare(b.recipeId));
 const cheapest=costs[0];
 // 15% crafter premium and 5% tax protection on the CHEAPEST complete recipe.
 const floorRaw=cheapest.unitProductionCostGold*(1+MARKET_CRAFT_LABOR_PREMIUM_V14)
    /(1-MARKET_SALE_TAX_BASIS_POINTS_V11/10_000);
 const tick=priceTick(floorRaw);
 const unitMin=ceilTick(floorRaw,tick);
 const oldCap=resourcePriceSeedV10(id)?.[1]??0;
 const unitMax=ceilTick(Math.max(unitMin*MARKET_CRAFTED_CORRIDOR_MULTIPLIER_V14,oldCap),tick);
 if(!validDraftPrice(unitMin,unitMax))return undefined;
 return {unitMin,unitMax,source:'crafted_recipe',
  minimumLot:marketDraftResourceMinLotV11(id)??1,recipeCost:cheapest};
}
export function previewMarketResourceBandV14(itemId:string):MarketPriceDraftV14|undefined{
 const q=materialQuote(itemId,new Set(),0);
 if(!q)return undefined;
 return {itemId,kind:'resource',unitMin:q.unitMin,unitMax:q.unitMax,
  tick:priceTick(q.unitMin),minimumLot:q.minimumLot,source:q.source,
  recipeCost:q.recipeCost,modelVersion:14,approved:false,canListNow:false};
}
export function previewMarketGearBandV14(itemId:string,traits:MarketGearPriceTraitsV10):MarketPriceDraftV14|undefined{
 if(!traits||!Number.isInteger(traits.quality)||traits.quality<0||traits.quality>100
   ||!Number.isInteger(traits.enhancementRank)||traits.enhancementRank<0||traits.enhancementRank>4
   ||!Object.prototype.hasOwnProperty.call(RARITY_MULTIPLIER_V14,traits.rarity))return undefined;
 try{
  const item=itemDef(itemId);
  if(item.type!=='gear'||item.value<=0||item.guildOnly||item.knowledgeUnlockId)return undefined;
 }catch{return undefined;}
 const recipe=V33_EQUIPMENT_RECIPES.find(r=>r.output.itemId===itemId);
 if(!recipe)return undefined;
 const baseline=previewMarketPriceBandV10(itemId,'equipment',{rarity:'common',quality:50,enhancementRank:0});
 const cost=recipeCost(recipe,new Set([itemId]),0);
 if(!baseline||!cost)return undefined;
 const minimumProfitable=cost.unitProductionCostGold*(1+MARKET_CRAFT_LABOR_PREMIUM_V14)
   /(1-MARKET_SALE_TAX_BASIS_POINTS_V11/10_000);
 const baseMin=Math.max(baseline.unitMin,minimumProfitable);
 const baseMax=Math.max(baseline.unitMax,baseMin*MARKET_CRAFTED_CORRIDOR_MULTIPLIER_V14);
 const multiplier=RARITY_MULTIPLIER_V14[traits.rarity]
   *(.70+traits.quality*.006)*(1+traits.enhancementRank*.12);
 const tick=priceTick(baseMin*multiplier);
 const unitMin=ceilTick(baseMin*multiplier,tick);
 const unitMax=ceilTick(baseMax*multiplier,tick);
 if(!validDraftPrice(unitMin,unitMax))return undefined;
 return {itemId,kind:'equipment',unitMin,unitMax,tick,minimumLot:1,
  source:'exact_gear_recipe',recipeCost:cost,modelVersion:14,approved:false,canListNow:false};
}
/** Client-supplied traits are advisory here. Live listing must bind the EXACT
 * escrow-held receipt (rarity, rolled quality, enhancement, sockets and owner)
 * and enforce a server-approved item-level policy under the same transaction.
 */
export function previewMarketPriceBandV14(
 itemId:string,kind:'resource'|'equipment',traits?:MarketGearPriceTraitsV10,
):MarketPriceDraftV14|undefined{
 return kind==='resource'?previewMarketResourceBandV14(itemId):
  traits?previewMarketGearBandV14(itemId,traits):undefined;
}

import {MONSTERS} from '../../apps/mobile/src/content/monsters';
import {V33_EQUIPMENT_RECIPES} from '../../apps/mobile/src/content/equipment-recipes-v33';
import {combatBaselineProjection} from '../../apps/mobile/src/core/balance-projection';
import {craftedGearQualityChanceAtLeast} from '../../apps/mobile/src/core/crafted-gear-instances';
import {craftedGearRarityOutcomes} from '../../apps/mobile/src/core/crafted-gear-rarity';
import {upgradeGoldCost,upgradeMaterialCosts} from '../../apps/mobile/src/core/equipment-enhancement';
import type {ClassId} from '../../apps/mobile/src/core/types';
import type {ItemRarity} from '../../apps/mobile/src/core/item-rarity';
import {previewMarketGearBandV14,previewMarketResourceBandV14} from './market-recipe-aware-price-v14';

/**
 * Hidden, read-only Player Market V15 economic evidence.
 *
 * Does not adjust, persist, approve or authorize ANY market price or offer.
 * Authored timed combat rates are reference benchmarks, NOT a projection of
 * modern damage-driven hunts, food costs, weather, party play or live balances.
 */
export const MARKET_AFFORDABILITY_RELEASED_V15=false as const;
export type EarlyMarketGearTierV15='T1'|'T2'|'T3'|'T4';
export type MarketBuyerEvidenceV15='authored_timed_combat_proxy';
const REFERENCE_HUNT_V15:Readonly<Record<EarlyMarketGearTierV15,string>>={
 T1:'MOSS_RAT',
 T2:'IRONWOOD_WOLF',
 T3:'SUNSCAR_SCORPION',
 T4:'GLASSBOUND_SENTINEL',
};
const RARITY_MANUAL_REVIEW=new Set<ItemRarity>(['legendary','mythic']);
function money(n:number){return Number.isFinite(n)&&n>=0&&Number.isSafeInteger(n)&&n<=1_000_000_000_000_000;}
function rounded(n:number){return Math.round(n*100)/100;}

export interface MarketTierAffordabilityV15{
 tier:EarlyMarketGearTierV15;
 classId:ClassId;
 path:'Foundation'|'Alternate';
 referenceMonsterId:string;
 referenceGoldPerHour:number;
 referenceKillsPerHour:number;
 referenceBasis:MarketBuyerEvidenceV15;
 itemCount:number;
 expectedSlots:number;
 missingPriceItemIds:string[];
 totalCommonQ50MinimumGold:number;
 totalCommonQ50MaximumGold:number;
 totalDirectForgeGold:number;
 estimatedHoursForFullBuyoutAtTimedReference:number|null;
 /** Comparative only, not a target Gold sink or a live character projection. */
 dataComplete:boolean;
 approved:false;
 canBuyNow:false;
}
export function previewTierAffordabilityV15(
 tier:EarlyMarketGearTierV15,
 classId:ClassId='IRONWARDEN',
 path:'Foundation'|'Alternate'='Foundation',
):MarketTierAffordabilityV15|undefined{
 const monster=MONSTERS.find(row=>row.id===REFERENCE_HUNT_V15[tier]);
 if(!monster||monster.gold<1||monster.boss)return undefined;
 const reference=combatBaselineProjection(monster);
 if(!Number.isFinite(reference.goldPerHour)||reference.goldPerHour<=0)return undefined;
 const recipes=V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier===tier&&row.classId===classId&&row.v33Path===path);
 if(recipes.length===0)return undefined;
 let minTotal=0,maxTotal=0,directGold=0;
 const missing:string[]=[];
 for(const recipe of recipes){
  const band=previewMarketGearBandV14(recipe.output.itemId,{rarity:'common',quality:50,enhancementRank:0});
  directGold+=recipe.gold;
  if(!band){missing.push(recipe.output.itemId);continue;}
  minTotal+=band.unitMin;maxTotal+=band.unitMax;
 }
 const complete=missing.length===0&&recipes.length===10;
 return {tier,classId,path,referenceMonsterId:monster.id,
  referenceGoldPerHour:rounded(reference.goldPerHour),
  referenceKillsPerHour:rounded(reference.killsPerHour),
  referenceBasis:'authored_timed_combat_proxy',
  itemCount:recipes.length,expectedSlots:10,missingPriceItemIds:missing,
  totalCommonQ50MinimumGold:minTotal,totalCommonQ50MaximumGold:maxTotal,
  totalDirectForgeGold:directGold,
  estimatedHoursForFullBuyoutAtTimedReference:complete?rounded(minTotal/reference.goldPerHour):null,
  dataComplete:complete,approved:false,canBuyNow:false};
}

export interface MarketTradeIncomeScenarioV15{
 tier:EarlyMarketGearTierV15;
 assumedSoldFraction:number;
 /** No active approved trade policies or verified player sales exist. */
 observedPlayerTradeData:false;
 referenceGoldPerHour:number;
 hypotheticalResourceGrossGoldPerHour:number;
 hypotheticalResourceNetGoldPerHour:number;
 combinedHypotheticalGoldPerHour:number;
 estimatedFullSetBuyoutHours:number|null;
 basis:'hypothetical_raw_drop_floor_sales_not_verified_income';
 representedResources:Array<{
  itemId:string;expectedUnitsPerHour:number;draftUnitFloor:number;
  grossGoldPerHour:number;minimumListingLot:number;
 }>;
 approved:false;
 canTradeNow:false;
}
/** Long-run illustrative drop income only. This calculation cannot assume
 * real demand, buyer Gold, offer fill rate, 24-hour lots or actual sale receipts.
 * 5% is a continuous approximation: live tax is rounded UP per sold listing.
 * Never use these values to authorize policy or automatic repricing.
 */
export function previewMarketTradeIncomeScenarioV15(
 tier:EarlyMarketGearTierV15,assumedSoldFraction:number,
):MarketTradeIncomeScenarioV15|undefined{
 if(!Number.isFinite(assumedSoldFraction)||assumedSoldFraction<0||assumedSoldFraction>1)return undefined;
 const audit=previewTierAffordabilityV15(tier,'IRONWARDEN','Foundation');
 const monster=MONSTERS.find(row=>row.id===REFERENCE_HUNT_V15[tier]);
 if(!audit||!monster)return undefined;
 const baseline=combatBaselineProjection(monster);
 const items=new Map<string,{itemId:string;expectedUnitsPerHour:number;draftUnitFloor:number;grossGoldPerHour:number;minimumListingLot:number}>();
 for(const drop of monster.drops){
  if(!(drop.chance>0&&drop.chance<=1)||drop.max<drop.min||drop.min<1)continue;
  const quote=previewMarketResourceBandV14(drop.itemId);
  if(!quote)continue;
  const units=baseline.killsPerHour*drop.chance*(drop.min+drop.max)/2;
  const gross=units*quote.unitMin;
  const previous=items.get(drop.itemId);
  items.set(drop.itemId,{itemId:drop.itemId,
   expectedUnitsPerHour:(previous?.expectedUnitsPerHour??0)+units,
   draftUnitFloor:quote.unitMin,
   grossGoldPerHour:(previous?.grossGoldPerHour??0)+gross,
   minimumListingLot:quote.minimumLot});
 }
 const representedResources=[...items.values()].sort((a,b)=>b.grossGoldPerHour-a.grossGoldPerHour||a.itemId.localeCompare(b.itemId))
  .map(row=>({...row,expectedUnitsPerHour:rounded(row.expectedUnitsPerHour),
   grossGoldPerHour:rounded(row.grossGoldPerHour)}));
 const hypotheticalResourceGrossGoldPerHour=[...items.values()].reduce((a,b)=>a+b.grossGoldPerHour,0);
 const net=hypotheticalResourceGrossGoldPerHour*assumedSoldFraction*.95;
 const combined=baseline.goldPerHour+net;
 return {tier,assumedSoldFraction,observedPlayerTradeData:false,
  referenceGoldPerHour:rounded(baseline.goldPerHour),
  hypotheticalResourceGrossGoldPerHour:rounded(hypotheticalResourceGrossGoldPerHour),
  hypotheticalResourceNetGoldPerHour:rounded(net),
  combinedHypotheticalGoldPerHour:rounded(combined),
  estimatedFullSetBuyoutHours:audit.dataComplete?rounded(audit.totalCommonQ50MinimumGold/combined):null,
  basis:'hypothetical_raw_drop_floor_sales_not_verified_income',
  representedResources,approved:false,canTradeNow:false};
}

export interface MarketEnhancementInvestmentV15{
 itemId:string;
 rarity:ItemRarity;
 rank:number;
 confirmedAttemptGold:number;
 minimumMaterialGold:number|null;
 unpricedMaterials:string[];
 /** Mandatory ranked-upgrading dust, cores and failed attempts are EXCLUDED. */
 excludedCosts:readonly ['tempering_dust','tempering_cores','failed_attempts'];
 v14Q50MinimumGold:number;
 v14Q50Rank0MinimumGold:number;
 incrementalMarketMinimumGold:number;
 draftPricingConcern:'unpriced_inputs'|'may_undervalue_upgrades'|'no_immediate_concern';
 requiresHumanReview:true;
 approved:false;
 canListNow:false;
}
export function previewEnhancementInvestmentV15(itemId:string,rarity:ItemRarity,rank:number):MarketEnhancementInvestmentV15|undefined{
 if(!Number.isInteger(rank)||rank<1||rank>4)return undefined;
 const unenchanted=previewMarketGearBandV14(itemId,{rarity,quality:50,enhancementRank:0});
 const enchanted=previewMarketGearBandV14(itemId,{rarity,quality:50,enhancementRank:rank});
 if(!unenchanted||!enchanted)return undefined;
 let requiredGold=0,materialFloor=0;
 const missing=new Set<string>();
 for(let target=1;target<=rank;target++){
  requiredGold+=upgradeGoldCost(itemId,target,rarity);
  for(const material of upgradeMaterialCosts(itemId,target)){
   const quote=previewMarketResourceBandV14(material.itemId);
   if(!quote)missing.add(material.itemId);
   else materialFloor+=quote.unitMin*material.quantity;
  }
 }
 if(!money(requiredGold)||!money(materialFloor))return undefined;
 const incremental=Math.max(0,enchanted.unitMin-unenchanted.unitMin);
 // The minimum benchmark is ONLY guaranteed upgrade Gold, excluding all
 // materials, dust, cores and failed attempts; a severe undervaluation signal.
 const concern=missing.size?'unpriced_inputs':incremental<requiredGold?
  'may_undervalue_upgrades':'no_immediate_concern';
 return {itemId,rarity,rank,confirmedAttemptGold:requiredGold,
  minimumMaterialGold:missing.size?null:materialFloor,
  unpricedMaterials:[...missing].sort(),
  excludedCosts:['tempering_dust','tempering_cores','failed_attempts'],
  v14Q50MinimumGold:enchanted.unitMin,
  v14Q50Rank0MinimumGold:unenchanted.unitMin,
  incrementalMarketMinimumGold:incremental,
  draftPricingConcern:concern,requiresHumanReview:true,
  approved:false,canListNow:false};
}

export interface MarketScarcityContextV15{
 itemId:string;rarity:ItemRarity;qualityThreshold:number;
 rarityChance:number;qualityChanceAtLeast:number;
 /** Assumes independent rarity/quality subrolls; not a market demand estimate. */
 modelJointChance:number;
 approxCraftsPerJointResult:number;
 automaticPriceMultiplier:false;
 humanReviewSuggested:boolean;
}
export function previewGearScarcityContextV15(itemId:string,rarity:ItemRarity,qualityThreshold:number):MarketScarcityContextV15|undefined{
 if(!Number.isInteger(qualityThreshold)||qualityThreshold<0||qualityThreshold>100)return undefined;
 let odds:ReturnType<typeof craftedGearRarityOutcomes>;
 try{odds=craftedGearRarityOutcomes(itemId);}catch{return undefined;}
 const rarityOutcome=odds.find(row=>row.rarity===rarity);
 if(!rarityOutcome)return undefined;
 const qualityChance=craftedGearQualityChanceAtLeast(qualityThreshold);
 const chance=rarityOutcome.chance*qualityChance;
 return {itemId,rarity,qualityThreshold,rarityChance:rarityOutcome.chance,
  qualityChanceAtLeast:qualityChance,
  modelJointChance:chance,
  approxCraftsPerJointResult:chance>0?rounded(1/chance):Infinity,
  automaticPriceMultiplier:false,
  humanReviewSuggested:RARITY_MANUAL_REVIEW.has(rarity)||qualityThreshold>=90};
}

/** Pricing models do not prove socket ownership or socket prices. Decline any
 * automatic valuation of exact gem rolls until locked receipt validation.
 */
export function previewMarketExactGearReviewV15(input:{
 itemId:string;rarity:ItemRarity;quality:number;enhancementRank:number;
 hasStatGem:boolean;hasEffectGem:boolean;
}){
 const quote=previewMarketGearBandV14(input.itemId,{rarity:input.rarity,quality:input.quality,enhancementRank:input.enhancementRank});
 if(!quote)return undefined;
 const blockers:string[]=[];
 if(RARITY_MANUAL_REVIEW.has(input.rarity))blockers.push('scarce_rarity_manual_review');
 if(input.quality>=90)blockers.push('high_quality_manual_review');
 if(input.enhancementRank>0)blockers.push('enhancement_cost_manual_review');
 if(input.hasStatGem||input.hasEffectGem)blockers.push('socket_gem_price_unverified');
 return {quote,reviewFlags:blockers,priceConfirmed:false as const,
  approved:false as const,canListNow:false as const};
}

import assert from 'node:assert/strict';
import {V33_EQUIPMENT_RECIPES} from '../../../apps/mobile/src/content/equipment-recipes-v33';
import {itemDef} from '../../../apps/mobile/src/content/items';
import {upgradeGoldCost} from '../../../apps/mobile/src/core/equipment-enhancement';
import {
 MARKET_AFFORDABILITY_RELEASED_V15,
 previewTierAffordabilityV15,previewMarketTradeIncomeScenarioV15,previewEnhancementInvestmentV15,
 previewGearScarcityContextV15,previewMarketExactGearReviewV15,
} from '../market-affordability-v15';

assert.equal(MARKET_AFFORDABILITY_RELEASED_V15,false);
const tiers=['T1','T2','T3','T4'] as const;
const matrix=[];
for(const tier of tiers){
 const quote=previewTierAffordabilityV15(tier,'IRONWARDEN','Foundation');
 assert(quote,'Expected a reference record for '+tier);
 assert.equal(quote.approved,false);
 assert.equal(quote.canBuyNow,false);
 assert.equal(quote.referenceBasis,'authored_timed_combat_proxy');
 assert(quote.referenceGoldPerHour>0&&quote.referenceKillsPerHour>0);
 assert(quote.itemCount>0&&quote.expectedSlots===10);
 assert(quote.totalDirectForgeGold>0);
 assert(quote.totalCommonQ50MinimumGold>=0);
 assert(quote.totalCommonQ50MaximumGold>=quote.totalCommonQ50MinimumGold);
 if(quote.dataComplete){
  assert.equal(quote.itemCount,10);
  assert.equal(quote.missingPriceItemIds.length,0);
  assert(quote.estimatedHoursForFullBuyoutAtTimedReference!==null&&
   quote.estimatedHoursForFullBuyoutAtTimedReference>0);
 }else{
  assert(quote.estimatedHoursForFullBuyoutAtTimedReference===null,
   'Partial price data must never imply a complete-set affordability figure');
 }
 matrix.push({tier,referenceMonsterId:quote.referenceMonsterId,
  referenceGoldPerHour:quote.referenceGoldPerHour,itemCount:quote.itemCount,
  minBuyoutGold:quote.totalCommonQ50MinimumGold,
  directForgeGold:quote.totalDirectForgeGold,
  hours:quote.estimatedHoursForFullBuyoutAtTimedReference,
  missing:quote.missingPriceItemIds.length});
}
const incomeScenarios=[];
for(const tier of tiers){
 const noSales=previewMarketTradeIncomeScenarioV15(tier,0);
 const quarter=previewMarketTradeIncomeScenarioV15(tier,.25);
 const all=previewMarketTradeIncomeScenarioV15(tier,1);
 assert(noSales&&quarter&&all);
 assert.equal(noSales.approved,false);
 assert.equal(noSales.canTradeNow,false);
 assert.equal(noSales.observedPlayerTradeData,false);
 assert.equal(noSales.hypotheticalResourceNetGoldPerHour,0);
 assert.equal(noSales.referenceGoldPerHour,noSales.combinedHypotheticalGoldPerHour);
 assert.equal(noSales.basis,'hypothetical_raw_drop_floor_sales_not_verified_income');
 assert.equal(noSales.estimatedFullSetBuyoutHours,previewTierAffordabilityV15(tier)!.estimatedHoursForFullBuyoutAtTimedReference);
 assert(quarter.combinedHypotheticalGoldPerHour>=noSales.combinedHypotheticalGoldPerHour);
 assert(all.combinedHypotheticalGoldPerHour>=quarter.combinedHypotheticalGoldPerHour);
 assert(all.estimatedFullSetBuyoutHours!<=quarter.estimatedFullSetBuyoutHours!);
 assert(all.representedResources.every(row=>row.expectedUnitsPerHour>0&&row.draftUnitFloor>0&&row.minimumListingLot>=1));
 incomeScenarios.push({tier,combatOnlyGoldPerHour:noSales.referenceGoldPerHour,
  grossPotentialMaterialGoldPerHour:all.hypotheticalResourceGrossGoldPerHour,
  quarterSoldNetGoldPerHour:quarter.hypotheticalResourceNetGoldPerHour,
  quarterSoldSetHours:quarter.estimatedFullSetBuyoutHours,
  hypotheticalAllSoldSetHours:all.estimatedFullSetBuyoutHours});
}
assert.equal(previewMarketTradeIncomeScenarioV15('T1',-1),undefined);
assert.equal(previewMarketTradeIncomeScenarioV15('T1',1.01),undefined);
assert.equal(previewMarketTradeIncomeScenarioV15('T1',Number.NaN),undefined);
console.log('V15_HYPOTHETICAL_DROP_SALE_SCENARIOS='+JSON.stringify(incomeScenarios));

const recipe=V33_EQUIPMENT_RECIPES.find(x=>x.v33EquipmentTier==='T1'&&x.classId==='IRONWARDEN'&&x.v33Path==='Foundation');
assert(recipe);
const itemId=recipe.output.itemId;
const enh=previewEnhancementInvestmentV15(itemId,'common',1);
assert(enh,'Need initial enhancement investment');
assert.equal(enh.approved,false);
assert.equal(enh.canListNow,false);
assert.equal(enh.requiresHumanReview,true);
assert.equal(enh.confirmedAttemptGold,upgradeGoldCost(itemId,1,'common'));
assert(enh.incrementalMarketMinimumGold>0);
assert(enh.v14Q50MinimumGold>enh.v14Q50Rank0MinimumGold);
assert.deepEqual(enh.excludedCosts,['tempering_dust','tempering_cores','failed_attempts']);
const maxRank=previewEnhancementInvestmentV15(itemId,'epic',4);
assert(maxRank&&maxRank.confirmedAttemptGold>enh.confirmedAttemptGold);
assert.equal(previewEnhancementInvestmentV15(itemId,'common',0),undefined);
assert.equal(previewEnhancementInvestmentV15(itemId,'common',5),undefined);
assert.equal(previewEnhancementInvestmentV15('basic_sword','common',1),undefined);

const normal=previewGearScarcityContextV15(itemId,'common',50);
const mythic=previewGearScarcityContextV15(itemId,'mythic',90);
const epic=previewGearScarcityContextV15(itemId,'epic',50);
assert(normal&&mythic&&epic);
assert.equal(mythic.rarityChance,.001);
assert.equal(epic.rarityChance,.006);
assert(mythic.qualityChanceAtLeast>.08&&mythic.qualityChanceAtLeast<.10);
assert(mythic.approxCraftsPerJointResult>10_000);
assert.equal(mythic.automaticPriceMultiplier,false);
assert.equal(mythic.humanReviewSuggested,true);
assert.equal(normal.humanReviewSuggested,false);
assert.equal(previewGearScarcityContextV15('basic_sword','common',101),undefined);
assert.equal(previewGearScarcityContextV15('INVALID','common',50),undefined);
const reviewed=previewMarketExactGearReviewV15({
 itemId,rarity:'mythic',quality:95,enhancementRank:2,
 hasStatGem:true,hasEffectGem:false,
});
assert(reviewed);
assert.equal(reviewed.approved,false);
assert.equal(reviewed.canListNow,false);
assert.equal(reviewed.priceConfirmed,false);
assert.deepEqual(reviewed.reviewFlags,[
 'scarce_rarity_manual_review','high_quality_manual_review',
 'enhancement_cost_manual_review','socket_gem_price_unverified',
]);
const priceSamples=tiers.flatMap(tier=>{
 const selected=V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier===tier
  &&row.classId==='IRONWARDEN'&&row.v33Path==='Foundation');
 return selected.filter(row=>['chest','ring'].includes(itemDef(row.output.itemId).slot??''))
  .sort((a,b)=>(itemDef(a.output.itemId).slot==='chest'?-1:1)-(itemDef(b.output.itemId).slot==='chest'?-1:1))
  .slice(0,2).map(row=>{
  const basic=previewMarketExactGearReviewV15({itemId:row.output.itemId,rarity:'common',
   quality:50,enhancementRank:0,hasStatGem:false,hasEffectGem:false})?.quote;
  const rare=previewMarketExactGearReviewV15({itemId:row.output.itemId,rarity:'rare',
   quality:50,enhancementRank:0,hasStatGem:false,hasEffectGem:false})?.quote;
  const mythic=previewMarketExactGearReviewV15({itemId:row.output.itemId,rarity:'mythic',
   quality:90,enhancementRank:0,hasStatGem:false,hasEffectGem:false})?.quote;
  return {tier,slotName:row.name,itemId:row.output.itemId,
   commonQ50:[basic?.unitMin,basic?.unitMax],
   rareQ50:[rare?.unitMin,rare?.unitMax],
   mythicQ90:[mythic?.unitMin,mythic?.unitMax]};
 });
});
console.log('V15_EQUIPMENT_PRICE_EXAMPLES='+JSON.stringify(priceSamples));
console.log('V15_SOURCE_REFERENCE_MATRIX='+JSON.stringify(matrix));
console.log('PASS: hidden V15 affordability proxies, sunk enhancement Gold, rarity odds and human-review security');

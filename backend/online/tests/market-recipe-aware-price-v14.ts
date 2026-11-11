import assert from 'node:assert/strict';
import {V33_EQUIPMENT_RECIPES} from '../../../apps/mobile/src/content/equipment-recipes-v33';
import {itemDef} from '../../../apps/mobile/src/content/items';
import {
 MARKET_RECIPE_AWARE_PRICING_RELEASED_V14,marketDraftAdditionalRawAnchorsV14,
 previewMarketPriceBandV14,previewMarketGearBandV14,previewMarketResourceBandV14,
} from '../market-recipe-aware-price-v14';
import {previewMarketPriceBandV10} from '../market-price-bands-v10';

assert.equal(MARKET_RECIPE_AWARE_PRICING_RELEASED_V14,false,'Market must remain hidden');
const extras=marketDraftAdditionalRawAnchorsV14();
assert(extras.length>=10&&new Set(extras.map(r=>r.itemId)).size===extras.length);
for(const anchor of extras){
 assert.equal(itemDef(anchor.itemId).type,'material',anchor.itemId);
 assert(anchor.min>=1&&anchor.max<=anchor.min*6);
 assert(anchor.minimumLot>=1);
 assert.equal(anchor.approved,false);
}
function resource(id:string){
 const result=previewMarketResourceBandV14(id);
 assert(result,'Expected complete draft resource cost for '+id);
 assert.equal(result.kind,'resource');
 assert.equal(result.approved,false);
 assert.equal(result.canListNow,false);
 return result;
}
for(const id of ['COPPER_INGOT','ASTER_IRON_INGOT','SUNSTONE_INGOT',
 'FROSTIRON_INGOT','BLACKGLASS_INGOT','VERDANT_BINDING_RESIN',
 'IRONWOOD_BINDING_RESIN','SUNSCAR_DUNE_BINDER','GLASSBOUND_BINDER',
 'SUNFUSED_FIXATIVE','RIMEWARD_DISTILLATE','CINDERHEART_ELIXIR']){
 const quote=resource(id);
 assert.equal(quote.source,'crafted_recipe',id+' must use its real recipe');
 assert(quote.recipeCost);
 const cost=quote.recipeCost!;
 assert(cost.ingredientFloorGold>0&&cost.craftingGold>0);
 const gross=quote.unitMin*quote.minimumLot;
 const sellerNet=gross-Math.ceil(gross*.05);
 assert(sellerNet>=cost.unitProductionCostGold*1.15*quote.minimumLot-1e-8,
  id+' should pay ingredients, crafting Gold, 15% labor and integer-rounded 5% tax');
 assert(quote.unitMax>=quote.unitMin*4);
}
const copper=resource('COPPER_INGOT');
assert.equal(copper.recipeCost?.unitProductionCostGold,82/5);
assert.equal(copper.unitMin,20);
assert.equal(copper.minimumLot,5,'Preserve existing minimum lots');
const aster=resource('ASTER_IRON_INGOT');
assert.equal(aster.recipeCost?.unitProductionCostGold,188/4);
assert.equal(aster.unitMin,58);
const sun=resource('SUNSTONE_INGOT');
assert.equal(sun.recipeCost?.unitProductionCostGold,736/3);
assert.equal(sun.unitMin,298);
const black=resource('BLACKGLASS_INGOT');
assert.equal(black.recipeCost?.unitProductionCostGold,3440/3);
assert.equal(black.unitMin,1389);
const resin=resource('IRONWOOD_BINDING_RESIN');
assert.equal(resin.recipeCost?.unitProductionCostGold,270);
assert.equal(resin.unitMin,328);
assert.equal(resource('SUNSCALE').source,'raw_anchor');
assert.equal(previewMarketResourceBandV14('HOLY_WATER'),undefined);
assert.equal(previewMarketResourceBandV14('FALLEN_KNIGHT_SIGIL'),undefined);
assert.equal(previewMarketResourceBandV14('basic_sword'),undefined);
assert.equal(previewMarketResourceBandV14('UNKNOWN'),undefined);
assert.equal(previewMarketPriceBandV14('COPPER_ORE','equipment',{rarity:'common',quality:50,enhancementRank:0}),undefined);

const tiers=[...new Set(V33_EQUIPMENT_RECIPES.map(r=>r.v33EquipmentTier))].sort();
assert.deepEqual(tiers,['T1','T2','T3','T4','T5','T6','T7','T8','T9']);
for(const tier of tiers){
 const recipe=V33_EQUIPMENT_RECIPES.find(r=>r.v33EquipmentTier===tier)!;
 const traits={rarity:'common' as const,quality:50,enhancementRank:0};
 const quote=previewMarketGearBandV14(recipe.output.itemId,traits);
 assert(quote,'Expected a complete priced gear recipe at '+tier);
 assert.equal(quote.source,'exact_gear_recipe');
 assert.equal(quote.minimumLot,1);
 assert.equal(quote.approved,false);
 assert.equal(quote.canListNow,false);
 const old=previewMarketPriceBandV10(recipe.output.itemId,'equipment',traits)!;
 assert(quote.unitMin>=old.unitMin,'Never undercut old starter anchor');
 assert(quote.unitMin-Math.ceil(quote.unitMin*.05)>=quote.recipeCost!.unitProductionCostGold*1.15-1e-8,
  tier+' must cover crafting Gold and a 15% premium after whole-Gold tax');
 const epic=previewMarketGearBandV14(recipe.output.itemId,{rarity:'epic',quality:50,enhancementRank:0})!;
 const highQuality=previewMarketGearBandV14(recipe.output.itemId,{rarity:'common',quality:100,enhancementRank:0})!;
 const enhanced=previewMarketGearBandV14(recipe.output.itemId,{rarity:'common',quality:50,enhancementRank:4})!;
 assert(epic.unitMin>quote.unitMin&&highQuality.unitMin>quote.unitMin
  &&enhanced.unitMin>quote.unitMin,'Rarity / quality / enchant should matter');
}
const t1=V33_EQUIPMENT_RECIPES.filter(r=>r.v33EquipmentTier==='T1'&&r.classId==='IRONWARDEN'&&r.v33Path==='Foundation');
const chest=t1.find(r=>itemDef(r.output.itemId).slot==='chest')!;
const ring=t1.find(r=>itemDef(r.output.itemId).slot==='ring')!;
assert(chest&&ring,'Need exact recipes for comparable slots');
const neutral={rarity:'common' as const,quality:50,enhancementRank:0};
const chestQuote=previewMarketGearBandV14(chest.output.itemId,neutral)!;
const ringQuote=previewMarketGearBandV14(ring.output.itemId,neutral)!;
assert(chestQuote.recipeCost!.unitProductionCostGold>ringQuote.recipeCost!.unitProductionCostGold,
 'Chest and ring must have different true forge costs');
assert(chestQuote.unitMin>ringQuote.unitMin,
 'Same-tier exact pieces should have differentiated floors');
assert.equal(previewMarketGearBandV14(chest.output.itemId,{...neutral,quality:-1}),undefined);
assert.equal(previewMarketGearBandV14(chest.output.itemId,{...neutral,enhancementRank:5}),undefined);
assert.equal(previewMarketGearBandV14('basic_sword',neutral),undefined,
 'Legacy unreceipted equipment must remain unpriced');
console.log('PASS: hidden V14 complete-chain crafted material and per-recipe exact gear price previews');

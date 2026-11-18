import {EQUIPMENT_V2_RELEASED,CRAFTING_V2_RELEASED,EQUIPMENT_CRAFTING_V2_RELEASED} from '../src/core/release-flags';
import {equipmentV2PreviewBaseStats,equipmentV2StatBudget,equipmentV2Budget,
 EQUIPMENT_V2_PROFILES,EQUIPMENT_V2_RARITIES,equipmentV2AffixBounds,equipmentV2AffixCount,equipmentV2QualityMultiplier} from '../src/core/equipment-crafting-v2-foundation';
import {equipmentV2DraftAssembly,equipmentV2SourcePlan,equipmentV2CostSummary} from '../src/core/equipment-crafting-v2-economy';
import {equipmentV2HiddenRecipeScreen,equipmentV2PublicEntryAvailable} from '../src/core/equipment-crafting-v2-screen';
const check=(ok:unknown,label:string)=>{if(!ok)throw new Error(label)};
check(!EQUIPMENT_V2_RELEASED&&!CRAFTING_V2_RELEASED&&!EQUIPMENT_CRAFTING_V2_RELEASED&&!equipmentV2PublicEntryAvailable(),'V2 client release must stay hidden and atomic');
check(Math.abs(EQUIPMENT_V2_RARITIES.reduce((sum,row)=>sum+row.chance,0)-1)<1e-10,'Rarity odds must sum to 100%');
check(equipmentV2AffixCount(1,'epic')===1&&equipmentV2AffixCount(3,'epic')===2,'Epic affix breakpoint');
check(equipmentV2AffixCount(1,'mythic')===2&&equipmentV2AffixCount(4,'mythic')===3,'Mythic affix breakpoint');
check(equipmentV2QualityMultiplier(0)===.75&&equipmentV2QualityMultiplier(50)===1&&equipmentV2QualityMultiplier(100)===1.25,'Quality baseline');
for(const slot of Object.keys(EQUIPMENT_V2_PROFILES) as Array<keyof typeof EQUIPMENT_V2_PROFILES>){
 for(const profile of EQUIPMENT_V2_PROFILES[slot]){
  for(const tier of [1,2,3,4] as const){
   const stats=equipmentV2PreviewBaseStats(tier,slot,profile);
   check(Math.abs(equipmentV2StatBudget(stats)-equipmentV2Budget(tier,slot))<1e-8,'Stat budget drift: '+slot+':'+profile+':'+tier);
   check(Object.values(stats).filter(v=>v>1e-8).length>=1&&Object.values(stats).filter(v=>v>1e-8).length<=2,'Only one/two base stats permitted');
  }
 }
}
const epic=equipmentV2AffixBounds(3,'epic','critRate');
check(Math.abs(epic.minimum-1.05)<1e-8&&Math.abs(epic.maximum-1.35)<1e-8,'T3 Epic crit bounds');
const chest=equipmentV2DraftAssembly(3,'chest',true);
check(chest.gold===6000&&chest.xp===882,'T3 chest candidate Gold/XP');
const inputs=[{itemId:'SUNSCALE',required:30,owned:18,kind:'gather' as const,offers:[{listingId:'p1',itemId:'SUNSCALE',quantity:20,unitGold:12}]},
 {itemId:'ARMOR_RIVETS',required:2,owned:1,kind:'component' as const,offers:[{listingId:'p2',itemId:'ARMOR_RIVETS',quantity:1,unitGold:100}]}];
const notReleased=equipmentV2SourcePlan(inputs,'market',false);
check(notReleased.marketGold===0&&notReleased.ingredients.every(row=>row.bought===0&&row.marketStatus==='unavailable'),'No market purchases/quotes while hidden');
const liveQuote=equipmentV2SourcePlan(inputs,'market',true);
check(liveQuote.marketGold===244&&liveQuote.marketFullyQuoted,'Real quantity-based quote calculation');
const hybrid=equipmentV2SourcePlan(inputs,'hybrid',true);
check(hybrid.marketGold===100&&hybrid.selfSourceCount===12,'Hybrid keeps gatherable materials self-sourced');
const subtotal=equipmentV2CostSummary({assemblyGold:6000,processingGold:312,source:hybrid});
check(subtotal.knownGold===6412&&!subtotal.complete,'Incomplete sourcing must not be claimed complete');
const result=equipmentV2HiddenRecipeScreen({name:'Sunscar Thornhide Vest',tier:3,slot:'chest',profile:'defense_health',
 setPiece:true,ingredients:inputs,strategy:'market',marketReleased:false,characterLevel:30,
 professionLevel:25,goldAvailable:10000,queueHasCapacity:true});
check(!result.marketControlsEnabled&&result.action==='prepare_components'&&!result.canCraftNow,'Hidden UI refuses incomplete/market-dependent craft');
check(result.rarityOutcomes.find(row=>row.rarity==='epic')?.affixes===2,'UI odds follow tier affix rule');
const purchasePreview=equipmentV2HiddenRecipeScreen({name:'Sunscar Thornhide Vest',tier:3,slot:'chest',profile:'defense_health',setPiece:true,
 ingredients:inputs,strategy:'market',marketReleased:true,characterLevel:30,professionLevel:25,goldAvailable:10000,queueHasCapacity:true});
check(purchasePreview.action==='review_market_purchase'&&!purchasePreview.canCraftNow&&!purchasePreview.marketControlsEnabled,
 'A quoted market basket never counts as owned or unlocks purchases behind the V2 gate');
console.log('PASS: hidden Equipment/Crafting 2.0 release gate, stat budgets, rarity, Gold/XP and sourcing preview');

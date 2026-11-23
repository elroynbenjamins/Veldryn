import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {RECIPES,FISH_COOKING_RECIPE_IDS} from '../src/content/skills';
import {NOVICE_RECIPES,NOVICE_STAGE} from '../src/content/novice-sets';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import equipmentCatalog from '../src/content/equipment_catalog_t1_t9_v33.json';
import {createCharacter,newGame} from '../src/core/game';
import {professionActionPace} from '../src/core/profession-action-pace';
import {cookingRecipeXpPreview} from '../src/core/cooking-xp-preview';
import {totalXpAtLevel} from '../src/core/progression';
import {craftingDetailText} from '../src/i18n/crafting-details';
import type {Language} from '../src/i18n/languages';
import {startProcessingBatch,processingRecipeDef,previewProcessingReward} from '../src/core/processing';
import {mealBonusDef} from '../src/core/meal-buffs';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': '+String(actual)+' !== '+String(expected))}
const cooking=RECIPES.filter(recipe=>recipe.skillId==='cooking');
ok(cooking.length>=5,'Cooking browser should include multiple dish recipes');
ok(cooking.every(recipe=>recipe.gold>0&&recipe.gold%10===0),'All Cooking Gold costs are multiples of 10');
// Fish recipes exchange firewood for cheaper gold; fish and special ingredients stay unchanged.
// Gold is discounted 40% after the existing 20% standard crafting surcharge.
const fishCookingBaselines=[
 ['COOK_MEADOW_PERCH','MEADOW_PERCH',5,'GREENWOOD_LOG',80,30],
 ['COOK_SILVERFIN','SILVERFIN',5,'GREENWOOD_LOG',100,40],
 ['COOK_ROOTSTREAM_TROUT','ROOTSTREAM_TROUT',4,'IRONWOOD_LOG',145,50],
 ['COOK_RIVER_EEL','RIVER_EEL',4,'IRONWOOD_LOG',180,60],
 ['COOK_OATHSCALE','OATHSCALE_PIKE',3,'CROWNWOOD_LOG',260,90],
 ['COOK_CAVE_LOACH','CAVE_LOACH',3,'CROWNWOOD_LOG',245,90],
 ['COOK_CROWN_CARP','CROWN_CARP',3,'CROWNWOOD_LOG',330,120],
 ['COOK_IRONWOOD_STEW','RIVER_EEL',2,'IRONWOOD_LOG',105,100],
 ['COOK_OASIS_CARP','OASIS_CARP',4,'DUNEWOOD',420,160],
 ['COOK_GLASSFIN_FEAST','GLASSFIN',3,'DUNEWOOD',720,370],
 ['COOK_ICEFISH','ICEFIN',3,'WHITEPINE_LOG',1100,650],
 ['COOK_EMBERFIN','EMBERFIN',3,'CINDERWOOD_LOG',1650,860],
] as const;
equal(FISH_COOKING_RECIPE_IDS.size,fishCookingBaselines.length,'Exactly the twelve fish-based dishes get the new balance');
for(const [id,fish,fishQuantity,wood,oldXp,gold] of fishCookingBaselines){
 const recipe=cooking.find(row=>row.id===id);
 ok(!!recipe,id+' exists');
 equal(recipe!.inputs.find(input=>input.itemId===fish)?.quantity,fishQuantity,id+' fish input remains unchanged');
 equal(recipe!.inputs.find(input=>input.itemId===wood)?.quantity,5,id+' burns five wood');
 equal(recipe!.xp,oldXp+10,id+' awards exactly ten additional XP');
 equal(recipe!.gold,gold,id+' gets 40% post-surcharge Gold discount, nearest ten');
}
const nonFish=cooking.find(recipe=>recipe.id==='COOK_ASHLANDS_EMBER_STEW');
equal(nonFish?.xp,2280,'Non-fish Ashlands stew keeps its earlier 3× XP balance');
equal(nonFish?.gold,810,'Non-fish stew retains its earlier 25% Gold discount');
for(const [material,quantity] of [['ASHEN_MYRRH',10],['CINDER_HEART',5],['CINDERWOOD_LOG',5]] as const){
 equal(nonFish?.inputs.find(input=>input.itemId===material)?.quantity,quantity,
  'Only non-fish Ashlands stew retains the previously planned 5× material sink: '+material);
}
// Starter-material rebalance: test charged Gold after the universal 20% surcharge.
const copper=RECIPES.find(recipe=>recipe.id==='SMELT_COPPER_INGOT');
ok(!!copper,'Copper smelting recipe exists');
equal(copper!.output.itemId,'COPPER_INGOT','Copper output item is unchanged');
equal(copper!.output.quantity,5,'Copper smelting still produces five ingots');
equal(copper!.inputs.find(input=>input.itemId==='COPPER_ORE')?.quantity,15,'Copper ore raised to 15 per batch');
equal(copper!.inputs.find(input=>input.itemId==='GREENWOOD_LOG')?.quantity,3,'Copper smelting uses three Greenwood');
equal(copper!.gold,30,'Copper smelting costs exactly 30 charged Gold');
equal(copper!.xp,125,'Copper smelting gains the earlier five XP plus another twenty');
const bindings=RECIPES.find(recipe=>recipe.id==='WEAVE_CLOTH_BINDINGS');
equal(bindings?.inputs.find(input=>input.itemId==='MOSS_FIBER')?.quantity,7,'Cloth Bindings use seven Moss Fiber');
equal(bindings?.inputs.find(input=>input.itemId==='BOAR_HIDE')?.quantity,2,'Cloth Bindings use two Boar Hide');
equal(bindings?.gold,30,'Cloth Bindings cost exactly 30 charged Gold');
const linings=RECIPES.find(recipe=>recipe.id==='STITCH_PADDED_LININGS');
equal(linings?.inputs.find(input=>input.itemId==='WOLF_PELT')?.quantity,5,'Padded Linings keep five Wolf Pelts');
equal(linings?.inputs.find(input=>input.itemId==='MOSS_FIBER')?.quantity,6,'Padded Linings keep six Moss Fiber');
equal(linings?.gold,80,'Padded Linings cost exactly 80 charged Gold');

for(const [id,xp] of [
 ['SMELT_COPPER_INGOT',125],['SMELT_ASTER_IRON_INGOT',185],['SMELT_OATHSTONE_INGOT',250],
 ['SMELT_SUNSTONE_INGOT',540],['SMELT_FROSTIRON_INGOT',1000],['SMELT_BLACKGLASS_INGOT',1870],
] as const){equal(RECIPES.find(recipe=>recipe.id===id)?.xp,xp,id+' has the added 20 XP');}

// Verify equipment-specific XP bonuses across both existing equipment catalogs;
// tools, guild components and material processing must not inherit this increase.
ok(NOVICE_RECIPES.length>0&&V33_EQUIPMENT_RECIPES.length>0,'Equipment catalogs are populated');
for(const recipe of NOVICE_RECIPES){
 const slot=recipe.output.itemId.split('_').at(-1)?.toLowerCase() as keyof typeof NOVICE_STAGE;
 equal(recipe.xp,(NOVICE_STAGE[slot]??4)*50+5,recipe.id+' gains five novice equipment XP');
}
const tierXp={T1:165,T2:290,T3:450,T4:700,T5:1200,T6:1600,T7:2200,T8:2900,T9:3800} as const;
const slotMultiplier={Helmet:.85,Chest:1.2,Gloves:.7,Legs:1,Boots:.75,Weapon:1.35,'Off-hand':1.15,Cape:.85,Amulet:.65,Ring:.55} as const;
for(const piece of equipmentCatalog.pieces){
 const tier=piece.Tier as keyof typeof tierXp,slot=piece.Slot as keyof typeof slotMultiplier;
 const baseXp=Math.max(1,Math.round(tierXp[tier]*slotMultiplier[slot]))+(['T3','T4'].includes(tier)?20:0);
 const boosted=['T2','T3','T4'].includes(tier)?Math.round(Math.round(baseXp*1.25)*1.2):baseXp;
 const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.id==='CRAFT_V33_'+piece['Piece ID']);
 equal(recipe?.xp,boosted+5,recipe?.id??'unknown V33 item'+' gains five equipment XP');
}

for(const [id,wood,quantity] of [
 ['SMELT_COPPER_INGOT','GREENWOOD_LOG',3],
 ['SMELT_ASTER_IRON_INGOT','IRONWOOD_LOG',3],
 ['SMELT_OATHSTONE_INGOT','CROWNWOOD_LOG',4],
 ['SMELT_SUNSTONE_INGOT','DUNEWOOD',5],
 ['SMELT_FROSTIRON_INGOT','WHITEPINE_LOG',5],
 ['SMELT_BLACKGLASS_INGOT','CINDERWOOD_LOG',5],
] as const){
 const smelting=RECIPES.find(recipe=>recipe.id===id);
 equal(smelting?.inputs.find(input=>input.itemId===wood)?.quantity,quantity,id+' uses one additional wood per batch');
}

const now=Date.UTC(2026,10,19,12);
let tested=0;
for(const recipe of cooking.filter(recipe=>!!processingRecipeDef(recipe.id)).slice(0,20)){
 const original=createCharacter(newGame(now),'IRONWARDEN','Cook Tester');
 const state:GameState={...original,
  character:{...original.character!,level:100,gold:1_000_000},
  skills:original.skills.map(skill=>skill.skillId==='cooking'?{...skill,level:100}:skill),
  inventory:{...original.inventory,capacity:100,stacks:recipe.inputs.map(row=>({itemId:row.itemId,quantity:row.quantity*5}))},
  bank:{...original.bank,capacity:100,stacks:[]},
 };
 const displayedXp=Math.floor(professionActionPace(state,recipe,'batch').xpPerAction+1e-9);
 const preview=cookingRecipeXpPreview(state,recipe);
 equal(preview?.estimatedXp,displayedXp,recipe.id+' cooking UI preview matches the prospective batch');
 const reserved=startProcessingBatch(state,recipe.id,1,now).activity?.processing;
 ok(!!reserved,'Cooking recipe '+recipe.id+' should reserve one processing batch');
 equal(Math.floor((reserved?.xpPerBatch??0)+1e-9),displayedXp,recipe.id+' shown XP should use the same effective pace as the gameplay batch');
 const earned=previewProcessingReward(startProcessingBatch(state,recipe.id,1,now),reserved!.cycleSeconds).xp;
 equal(earned,displayedXp,recipe.id+' displayed Cooking XP must equal the actual one-batch XP settlement');
 // An already-reserved cooking run keeps its earlier XP rate even if the
 // current recipe projection would change after a progression update.
 const active=startProcessingBatch(state,recipe.id,1,now);
 const saved={...active,activity:{...active.activity!,processing:{...active.activity!.processing!,xpPerBatch:displayedXp+13}}} as GameState;
 const reservedPreview=cookingRecipeXpPreview(saved,recipe);
 ok(reservedPreview?.usingReservedRate,recipe.id+' preview should detect current reserved cooking work');
 equal(reservedPreview?.estimatedXp,displayedXp+13,recipe.id+' preview should honor locked-in batch XP');
 const capXp=totalXpAtLevel(100);
 const capped={...state,skills:state.skills.map(row=>row.skillId==='cooking'?{...row,xp:capXp,level:100}:row)};
 const cappedPreview=cookingRecipeXpPreview(capped,recipe);
 ok(cappedPreview?.maxed&&cappedPreview.estimatedXp===0,recipe.id+' must show zero XP at the skill cap');
 const nearCap={...state,skills:state.skills.map(row=>row.skillId==='cooking'?{...row,xp:capXp-4,level:99}:row)};
 const limited=cookingRecipeXpPreview(nearCap,recipe);
 ok(limited?.limitedByCap&&limited.estimatedXp===4,recipe.id+' must limit displayed XP to remaining skill XP');
 equal(previewProcessingReward(startProcessingBatch(nearCap,recipe.id,1,now),reserved!.cycleSeconds).xp,4,recipe.id+' XP settlement must match the cap-safe preview');
 ok(displayedXp>=0,recipe.id+' XP cannot be negative');
 tested++;
}
ok(tested>=5,'Test real Cooking XP values for at least five dishes');
for(const recipe of cooking.filter(recipe=>!!mealBonusDef(recipe.output.itemId))){
 const meal=mealBonusDef(recipe.output.itemId)!;
 ok(meal.percent>=4&&meal.percent<=10,recipe.id+' special meal should expose the doubled bonus');
 ok(meal.label.includes('+'+meal.percent+'%'),recipe.id+' bonus copy must match its runtime rate');
}

// All supported locales must produce usable text and interpolate exact XP/rates.
for(const language of ['en','de','es','nl','it','fr','ru','tr'] as const satisfies readonly Language[]){
 for(const [key,value] of [['+{xp} Cooking XP per batch','420'],['+{value}% Gathering speed','6']] as const){
  const text=craftingDetailText(language,key,key.includes('{xp}')?{xp:value}:{value});
  ok(text.includes(value)&&!text.includes('{xp}')&&!text.includes('{value}'),
    'Cooking XP / meal rate must interpolate in '+language+': '+key);
 }
}

const component=readFileSync(join(process.cwd(),'src/components/RecipeCard.tsx'),'utf8');
const translations=readFileSync(join(process.cwd(),'src/i18n/crafting-details.ts'),'utf8');
const workshop=readFileSync(join(process.cwd(),'src/components/ConsumableWorkshop.tsx'),'utf8');
ok(component.includes("recipe.skillId==='cooking'?<Text style={s.cookingXp}"),
 'Collapsed Cooking cards must show XP without opening recipe details');
ok(component.includes("ct('+{xp} Cooking XP per batch'"),
 'Cooking XP value must be labeled as per-batch, not generic XP');
ok(component.includes("meal?<Text style={s.mealBonusCompact}>"),'Collapsed cards must reveal improved special-meal buffs');
ok(component.includes('const mealLabel=meal?cookingMealEffectText('),'Shared recipe card must use translated meal effect text');
for(const key of ['+{value}% Gathering speed','+{value}% Crafting speed','+{value}% Combat XP','+{value}% Non-combat skill speed'])
 ok(translations.includes("'"+key+"'"),'Translated meal descriptor missing: '+key);

ok(workshop.includes("skillId==='cooking'?<Text style={[s.xp"),
 'Cooking workshop tiles must show the XP estimate without requiring a tap');
ok(workshop.includes('cookingXpLabel(detail)'),
 'Cooking workshop detail sheet must repeat the current XP estimate');
ok(workshop.includes('detailXp?.usingReservedRate'),
 'Cooking workshop must disclose active reserved XP snapshots');
ok(workshop.includes('cookingMealEffectText(language,meal)'),
 'Cooking workshop must show localized doubled special meal effects');
ok(workshop.includes('Activate meal buffs from Inventory. Auto-eat only restores HP.'),
 'Cooking workshop must explain manual activation vs ordinary auto-eat');

ok(component.includes('cookingXpPreview?.usingReservedRate'),'Cooking details must explain the active reserved XP snapshot');
ok(component.includes('Cooking mastered · no more XP'),'Cooking card must display level-cap state');
ok(component.includes('Activate meal buffs from Inventory. Auto-eat only restores HP.'),'Meal buff preview must distinguish activation from auto-eating');
ok(component.includes("meal?<><Text style={s.mealBonus}>")||component.includes("meal?<Text style={s.mealBonus}>"),
 'Expanded Cooking recipes must display food utility buffs');
ok(translations.includes("' +{xp} Cooking XP per batch'")||translations.includes("'+{xp} Cooking XP per batch'"),
 'Cooking XP label must be localized through crafting detail translations');
for(const label of ['Cooking mastered · no more XP','Current cooking run uses the XP rate reserved when it started.','Activate meal buffs from Inventory. Auto-eat only restores HP.'])
 ok(translations.includes("'"+label+"'"),'Cooking explanation must be translatable: '+label);

console.log(JSON.stringify({status:'PASS',testedCookingRecipes:tested,specialMeals:cooking.filter(recipe=>!!mealBonusDef(recipe.output.itemId)).length}));

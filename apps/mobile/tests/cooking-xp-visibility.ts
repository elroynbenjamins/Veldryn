import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {RECIPES} from '../src/content/skills';
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
equal(cooking.find(recipe=>recipe.id==='COOK_MEADOW_PERCH')?.gold,30,'Starter Cooking cost reduces by 25% then rounds down');
equal(cooking.find(recipe=>recipe.id==='COOK_SILVERFIN')?.gold,40,'Silverfin receives same rounded discount');
equal(cooking.find(recipe=>recipe.id==='COOK_ICEFISH')?.gold,810,'High tier Cooking uses proportional discount');
// Starter-material rebalance: test charged Gold after the universal 20% surcharge.
const copper=RECIPES.find(recipe=>recipe.id==='SMELT_COPPER_INGOT');
ok(!!copper,'Copper smelting recipe exists');
equal(copper!.output.itemId,'COPPER_INGOT','Copper output item is unchanged');
equal(copper!.output.quantity,5,'Copper smelting still produces five ingots');
equal(copper!.inputs.find(input=>input.itemId==='COPPER_ORE')?.quantity,15,'Copper ore raised to 15 per batch');
equal(copper!.inputs.find(input=>input.itemId==='GREENWOOD_LOG')?.quantity,3,'Copper smelting uses three Greenwood');
equal(copper!.gold,30,'Copper smelting costs exactly 30 charged Gold');
equal(copper!.xp,105,'Copper smelting gains five XP');
const bindings=RECIPES.find(recipe=>recipe.id==='WEAVE_CLOTH_BINDINGS');
equal(bindings?.inputs.find(input=>input.itemId==='MOSS_FIBER')?.quantity,7,'Cloth Bindings use seven Moss Fiber');
equal(bindings?.inputs.find(input=>input.itemId==='BOAR_HIDE')?.quantity,2,'Cloth Bindings use two Boar Hide');
equal(bindings?.gold,30,'Cloth Bindings cost exactly 30 charged Gold');
const linings=RECIPES.find(recipe=>recipe.id==='STITCH_PADDED_LININGS');
equal(linings?.inputs.find(input=>input.itemId==='WOLF_PELT')?.quantity,5,'Padded Linings keep five Wolf Pelts');
equal(linings?.inputs.find(input=>input.itemId==='MOSS_FIBER')?.quantity,6,'Padded Linings keep six Moss Fiber');
equal(linings?.gold,80,'Padded Linings cost exactly 80 charged Gold');

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

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {RECIPES} from '../src/content/skills';
import {createCharacter,newGame} from '../src/core/game';
import {professionActionPace} from '../src/core/profession-action-pace';
import {cookingRecipeXpPreview} from '../src/core/cooking-xp-preview';
import {totalXpAtLevel} from '../src/core/progression';
import {craftingDetailText} from '../src/i18n/crafting-details';
import type {Language} from '../src/i18n/languages';
import {startProcessingBatch,processingRecipeDef,previewProcessingReward,normalizeProcessingBatch} from '../src/core/processing';
import {mealBonusDef} from '../src/core/meal-buffs';
import {masteryPointsForRank} from '../src/core/profession-mastery-v40';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': '+String(actual)+' !== '+String(expected))}
const cooking=RECIPES.filter(recipe=>recipe.skillId==='cooking');
const boostedMeals=cooking.filter(recipe=>!!mealBonusDef(recipe.output.itemId));
equal(boostedMeals.length,6,'all six bonus meals have a Cooking recipe');
const expectedCosts:Record<string,number[]>={COOK_IRONWOOD_STEW:[6,3,3],COOK_SUNSCAR_SPICED_PLATTER:[12,4,3],COOK_GLASSFIN_FEAST:[9,3,3],COOK_ICEFISH:[9,3,3],COOK_ASHLANDS_EMBER_STEW:[6,3,3],COOK_EMBERFIN:[9,3,3]};
for(const recipe of boostedMeals)equal(JSON.stringify(recipe.inputs.map(input=>input.quantity)),JSON.stringify(expectedCosts[recipe.id]),recipe.id+' uses increased meal materials');
for(const recipe of boostedMeals)equal(recipe.output.quantity,1,recipe.id+' one portion per batch');
ok(cooking.length>=5,'Cooking browser should include multiple dish recipes');
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
 const displayedXp=professionActionPace(state,recipe,'batch').xpPerAction;
 equal(recipe.xp%10,0,recipe.id+' base Cooking XP is rounded to tens');
 equal(displayedXp%10,0,recipe.id+' effective Cooking XP is rounded after modifiers');
 const preview=cookingRecipeXpPreview(state,recipe);
 equal(preview?.estimatedXp,displayedXp,recipe.id+' cooking UI preview matches the prospective batch');
 const reserved=startProcessingBatch(state,recipe.id,1,now).activity?.processing;
 ok(!!reserved,'Cooking recipe '+recipe.id+' should reserve one processing batch');
 equal(Math.floor((reserved?.xpPerBatch??0)+1e-9),displayedXp,recipe.id+' shown XP should use the same effective pace as the gameplay batch');
 const earned=previewProcessingReward(startProcessingBatch(state,recipe.id,1,now),reserved!.cycleSeconds).xp;
 if(mealBonusDef(recipe.output.itemId)){
  const mastered:GameState={...state,account:{...state.account,professionMasteryByAction:{...state.account.professionMasteryByAction,[recipe.id]:{actionId:recipe.id,points:masteryPointsForRank(50),updatedAtMs:now}}},inventory:{...state.inventory,stacks:recipe.inputs.map(input=>({...input,quantity:input.quantity*25}))},rewardRemainders:{...state.rewardRemainders,[`mastery:processing:${recipe.id}:yield`]:.99}};
  const run=startProcessingBatch(mastered,recipe.id,25,now);
  const p=run.activity!.processing!;
  equal(normalizeProcessingBatch(p,recipe.id).fixedMealOutput,true,recipe.id+' fixed output survives normalization');
  equal(previewProcessingReward(run,p.cycleSeconds*25).items.find(item=>item.itemId===recipe.output.itemId)?.quantity,25,recipe.id+' max mastery and existing yield remainder cannot exceed one portion per completed batch');
 }
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
ok(workshop.includes("cooking:['Fish','Meals']")&&!workshop.includes("return 'Special'"),'Cooking exposes only Fish and Meals');
ok(workshop.includes("return mealBonusDef(recipe.output.itemId)?'Meals':'Fish'"),'all registered bonus meals automatically route to the Meals tab');
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

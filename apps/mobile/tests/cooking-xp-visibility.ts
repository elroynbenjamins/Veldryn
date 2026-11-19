import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {RECIPES} from '../src/content/skills';
import {createCharacter,newGame} from '../src/core/game';
import {professionActionPace} from '../src/core/profession-action-pace';
import {startProcessingBatch,processingRecipeDef,previewProcessingReward} from '../src/core/processing';
import {mealBonusDef} from '../src/core/meal-buffs';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': '+String(actual)+' !== '+String(expected))}
const cooking=RECIPES.filter(recipe=>recipe.skillId==='cooking');
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
 const displayedXp=Math.floor(professionActionPace(state,recipe,'batch').xpPerAction+1e-9);
 const reserved=startProcessingBatch(state,recipe.id,1,now).activity?.processing;
 ok(!!reserved,'Cooking recipe '+recipe.id+' should reserve one processing batch');
 equal(Math.floor((reserved?.xpPerBatch??0)+1e-9),displayedXp,recipe.id+' shown XP should use the same effective pace as the gameplay batch');
 const earned=previewProcessingReward(startProcessingBatch(state,recipe.id,1,now),reserved!.cycleSeconds).xp;
 equal(earned,displayedXp,recipe.id+' displayed Cooking XP must equal the actual one-batch XP settlement');
 ok(displayedXp>=0,recipe.id+' XP cannot be negative');
 tested++;
}
ok(tested>=5,'Test real Cooking XP values for at least five dishes');
for(const recipe of cooking.filter(recipe=>!!mealBonusDef(recipe.output.itemId))){
 const meal=mealBonusDef(recipe.output.itemId)!;
 ok(meal.percent>=4&&meal.percent<=10,recipe.id+' special meal should expose the doubled bonus');
 ok(meal.label.includes('+'+meal.percent+'%'),recipe.id+' bonus copy must match its runtime rate');
}

const component=readFileSync(join(process.cwd(),'src/components/RecipeCard.tsx'),'utf8');
const translations=readFileSync(join(process.cwd(),'src/i18n/crafting-details.ts'),'utf8');
ok(component.includes("recipe.skillId==='cooking'?<Text style={s.cookingXp}"),
 'Collapsed Cooking cards must show XP without opening recipe details');
ok(component.includes("ct('+{xp} Cooking XP per batch'"),
 'Cooking XP value must be labeled as per-batch, not generic XP');
ok(component.includes("meal?<Text style={s.mealBonusCompact}>"),'Collapsed cards must reveal improved special-meal buffs');
ok(component.includes('const mealLabel=meal?ct('),'Special dish bonuses must use localized translations');
for(const key of ['+{value}% Gathering speed','+{value}% Crafting speed','+{value}% Combat XP','+{value}% Non-combat skill speed'])
 ok(translations.includes("'"+key+"'"),'Translated meal descriptor missing: '+key);
ok(component.includes("meal?<Text style={s.mealBonus}>"),
 'Expanded Cooking recipes must display food utility buffs');
ok(translations.includes("' +{xp} Cooking XP per batch'")||translations.includes("'+{xp} Cooking XP per batch'"),
 'Cooking XP label must be localized through crafting detail translations');

console.log(JSON.stringify({status:'PASS',testedCookingRecipes:tested,specialMeals:cooking.filter(recipe=>!!mealBonusDef(recipe.output.itemId)).length}));

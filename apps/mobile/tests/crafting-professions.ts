import {createCharacter,newGame} from '../src/core/game';
import {RECIPES} from '../src/content/skills';
import {EQUIPMENT_CRAFT_SKILL_BY_CLASS,V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {bestRecipeTrainingDestination} from '../src/core/skill-progression-navigation';
import {progressionGoalDestination} from '../src/core/working-toward';
import {availableGemRefinementsV1,gemRefineRecipeIdV1} from '../src/core/gem-progression-v1';
import {claimForgeJob,startGemRefinement} from '../src/core/equipment-crafting-queue';
import type {ProgressionGoal} from '../src/core/progression-goals-v40';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

const state=createCharacter(newGame(0),'WAYFINDER','Profession Tester');
const tailoring=RECIPES.filter(row=>row.skillId==='tailoring'&&!!row.v33SetId);
const enchantingRecipes=RECIPES.filter(row=>row.skillId==='enchanting');
const retiredRecipeIds=['TAILOR_MOSSWRAP_GLOVES','TAILOR_BOARHIDE_BOOTS','TAILOR_HIDE_VEST','TAILOR_TROLLGUARD_HELM','ENCHANT_WISP_CHARM','ENCHANT_THORN_RING','ENCHANT_OATHGLASS_CAPE'];

ok(tailoring.length>0,'Tailoring must own V33 Equipment 2.0 recipes');
ok(enchantingRecipes.every(recipe=>!recipe.v33SetId),'Enchanting utility recipes must never own V33 equipment');
ok(enchantingRecipes.every(recipe=>!recipe.output.itemId.startsWith('T')),'Enchanting recipes must not resurrect equipment outputs');
ok(enchantingRecipes.every(recipe=>['REGIONAL_CATALYST','RADIANT_CATALYST'].includes(recipe.output.itemId)),'Enchanting normal recipes are limited to modern catalyst synthesis; gems still use refinement/combining');
ok(enchantingRecipes.map(recipe=>recipe.level).sort((a,b)=>a-b).join(',')==='70,90','Enchanting utility recipes must remain late-game catalyst synthesis rather than early gear crafting');
ok(RECIPES.every(recipe=>!retiredRecipeIds.includes(recipe.id)),'Removed pre-V33 profession gear recipes must not return');
ok(V33_EQUIPMENT_RECIPES.every(recipe=>recipe.skillId===EQUIPMENT_CRAFT_SKILL_BY_CLASS[recipe.classId]),'Every V33 class must use its authoritative primary equipment profession');
for(const classId of ['WAYFINDER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER'] as const)ok(V33_EQUIPMENT_RECIPES.some(recipe=>recipe.classId===classId&&recipe.skillId==='tailoring'),classId+' must use Tailoring');
for(const classId of ['IRONWARDEN','BASTION','DREADGUARD','RAVAGER'] as const)ok(V33_EQUIPMENT_RECIPES.some(recipe=>recipe.classId===classId&&recipe.skillId==='smithing'),classId+' must use Smithing');

const tailoringDestination=bestRecipeTrainingDestination(state,'tailoring');
equal(tailoringDestination.kind,'skills','Tailoring training navigation stays in Skills');
if(tailoringDestination.kind==='skills'){
 equal(tailoringDestination.mode,'crafting','Tailoring training opens crafting mode');
 equal(tailoringDestination.skillId,'tailoring','Tailoring remains selected');
 ok(!!tailoringDestination.recipeId&&tailoring.some(recipe=>recipe.id===tailoringDestination.recipeId),'Tailoring training must recommend an active V33 recipe');
}

const enchantingDestination=bestRecipeTrainingDestination(state,'enchanting');
equal(enchantingDestination.kind,'skills','Enchanting training navigation stays in Skills');
if(enchantingDestination.kind==='skills'){
 equal(enchantingDestination.mode,'crafting','Enchanting training opens the refinery/crafting view');
 equal(enchantingDestination.skillId,'enchanting','Enchanting remains selected');
 ok(!enchantingDestination.recipeId,'Enchanting must not invent a normal gear recipe');
}

for(const skillId of ['tailoring','enchanting'] as const){
 const goal:ProgressionGoal={id:'goal-'+skillId,characterId:state.character!.id,kind:'skill_level',title:skillId,createdAtMs:0,pinnedAtMs:0,skillId,targetLevel:5};
 const destination=progressionGoalDestination(state,goal);
 equal(destination.kind,'skills',skillId+' goal routes to Skills');
 if(destination.kind==='skills'){
  equal(destination.skillId,skillId,skillId+' remains selected');
  equal(destination.mode,'crafting',skillId+' progression goal opens its crafting/refinery view');
 }
}

let enchantingState=createCharacter(newGame(0),'IRONWARDEN','Enchanter');
enchantingState={...enchantingState,character:{...enchantingState.character!,gold:10000},inventory:{...enchantingState.inventory,capacity:80,stacks:[
 ...enchantingState.inventory.stacks,
 {itemId:'raw_gem:stat_vitality:g1',quantity:1},
 {itemId:'WISP_DUST',quantity:10},
]}};
const refineId=gemRefineRecipeIdV1('stat_vitality',1),refinement=availableGemRefinementsV1(enchantingState).find(row=>row.recipe.id===refineId);
ok(refinement?.ready,'Grade I raw Vitality Gem should be a valid starter Enchanting refinement');
const xpBefore=enchantingState.skills.find(row=>row.skillId==='enchanting')!.xp;
const started=startGemRefinement(enchantingState,refineId,1000);
const claimed=claimForgeJob(started.state,started.job.id,started.job.completesAtMs);
ok(claimed.state.inventory.stacks.some(row=>row.itemId==='gem:stat_vitality:g1'),'Enchanting refinement must create the socketable gem');
ok(!claimed.state.inventory.stacks.some(row=>row.itemId==='raw_gem:stat_vitality:g1'),'Enchanting refinement must consume the raw gem');
ok(claimed.state.skills.find(row=>row.skillId==='enchanting')!.xp>xpBefore,'Enchanting refinement must award Enchanting XP');

console.log('PASS: Tailoring owns V33 equipment while Enchanting progresses through the raw-gem refinery without legacy gear');

import {createCharacter,newGame} from '../src/core/game';
import {RECIPES} from '../src/content/skills';
import {itemDef} from '../src/content/items';
import {bestRecipeTrainingDestination} from '../src/core/skill-progression-navigation';
import {progressionGoalDestination} from '../src/core/working-toward';
import type {GameState} from '../src/core/types';
import type {ProgressionGoal} from '../src/core/progression-goals-v40';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

const state=createCharacter(newGame(0),'IRONWARDEN','Profession Tester');
const tailoring=RECIPES.filter(row=>row.skillId==='tailoring');
const enchanting=RECIPES.filter(row=>row.skillId==='enchanting');
const retiredRecipeIds=new Set([
  'TAILOR_MOSSWRAP_GLOVES','TAILOR_BOARHIDE_BOOTS','TAILOR_HIDE_VEST','TAILOR_TROLLGUARD_HELM',
  'ENCHANT_WISP_CHARM','ENCHANT_THORN_RING','ENCHANT_OATHGLASS_CAPE',
]);

ok([...tailoring,...enchanting].every(recipe=>!retiredRecipeIds.has(recipe.id)),'Removed pre-V33 profession gear recipes must not return');
for(const recipe of [...tailoring,...enchanting])itemDef(recipe.output.itemId);

for(const skillId of ['tailoring','enchanting'] as const){
 const destination=bestRecipeTrainingDestination(state,skillId);
 equal(destination.kind,'skills',skillId+' training navigation stays in Skills');
 if(destination.kind==='skills'){
  equal(destination.mode,'crafting',skillId+' training navigation stays in crafting mode');
  equal(destination.skillId,skillId,skillId+' remains selected');
  if(destination.recipeId)ok(!retiredRecipeIds.has(destination.recipeId),skillId+' must not recommend a retired training recipe');
 }
 const goal:ProgressionGoal={id:'goal-'+skillId,characterId:state.character!.id,kind:'skill_level',title:skillId,createdAtMs:0,pinnedAtMs:0,skillId,targetLevel:5};
 const goalDestination=progressionGoalDestination(state,goal);
 equal(goalDestination.kind,'skills',skillId+' goal routes to Skills');
 if(goalDestination.kind==='skills'){
  equal(goalDestination.skillId,skillId,skillId+' remains selected');
  if((skillId==='tailoring'?tailoring:enchanting).length)equal(goalDestination.mode,'crafting',skillId+' goal uses crafting mode when active recipes exist');
  else ok(goalDestination.mode===undefined,skillId+' must not pretend a crafting recipe catalog exists before replacement content lands');
 }
}

console.log('PASS: Tailoring and Enchanting navigation stays valid without obsolete pre-V33 gear recipes');

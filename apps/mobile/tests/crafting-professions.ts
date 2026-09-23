import {craftRecipe,createCharacter,newGame} from '../src/core/game';
import {RECIPES} from '../src/content/skills';
import {itemDef} from '../src/content/items';
import {recipeAvailability} from '../src/core/playability';
import {bestRecipeTrainingDestination} from '../src/core/skill-progression-navigation';
import {progressionGoalDestination} from '../src/core/working-toward';
import type {GameState} from '../src/core/types';
import type {ProgressionGoal} from '../src/core/progression-goals-v40';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
const withMaterials=(stacks:Array<{itemId:string;quantity:number}>):GameState=>{
 const state=createCharacter(newGame(0),'IRONWARDEN','Profession Tester');
 return {...state,character:{...state.character!,gold:10000},inventory:{...state.inventory,stacks}};
};
const skill=(state:GameState,id:'tailoring'|'enchanting')=>state.skills.find(row=>row.skillId===id)!;

const tailoring=RECIPES.filter(row=>row.skillId==='tailoring');
const tailoringTraining=tailoring.filter(row=>row.repeatableTraining);
const tailoringEquipment=tailoring.filter(row=>!!row.v33SetId);
const enchanting=RECIPES.filter(row=>row.skillId==='enchanting');
const enchantingTraining=enchanting.filter(row=>row.repeatableTraining);
equal(tailoringTraining.length,4,'Tailoring keeps its authored Asterfall training ladder');
ok(tailoringEquipment.length>0,'Tailoring owns leather/fabric V33 class equipment recipes');
equal(enchantingTraining.length,3,'Enchanting keeps its authored Asterfall training ladder');
ok(tailoringTraining.every(row=>row.repeatableTraining),'Tailoring training recipes remain repeatable choices');
ok(enchantingTraining.every(row=>row.repeatableTraining),'Enchanting training recipes remain repeatable choices');
for(const recipe of [...tailoringTraining,...tailoringEquipment.slice(0,10),...enchantingTraining])itemDef(recipe.output.itemId);

let tail=withMaterials([{itemId:'MOSS_FIBER',quantity:8}]);
ok(recipeAvailability(tail,'TAILOR_MOSSWRAP_GLOVES').ready,'starter Tailoring recipe is craftable with its listed material');
const enchantingBefore=skill(tail,'enchanting').xp;
tail=craftRecipe(tail,'TAILOR_MOSSWRAP_GLOVES',1);
equal(skill(tail,'tailoring').xp,70,'Tailoring craft grants Tailoring XP');
equal(skill(tail,'enchanting').xp,enchantingBefore,'Tailoring craft does not leak XP into Enchanting');
equal(tail.inventory.stacks.find(row=>row.itemId==='MOSSWRAP_GLOVES')?.quantity,1,'Tailoring creates the existing gear output');

let enchant=withMaterials([{itemId:'WISP_DUST',quantity:6},{itemId:'COPPER_INGOT',quantity:1}]);
ok(recipeAvailability(enchant,'ENCHANT_WISP_CHARM').ready,'starter Enchanting recipe is craftable with its listed materials');
const tailoringBefore=skill(enchant,'tailoring').xp;
enchant=craftRecipe(enchant,'ENCHANT_WISP_CHARM',2);
equal(skill(enchant,'enchanting').xp,75,'Enchanting craft grants Enchanting XP');
equal(skill(enchant,'tailoring').xp,tailoringBefore,'Enchanting craft does not leak XP into Tailoring');
equal(enchant.inventory.stacks.find(row=>row.itemId==='WISP_CHARM')?.quantity,1,'Enchanting creates the existing gear output');

const tailDestination=bestRecipeTrainingDestination(withMaterials([]),'tailoring');
equal(tailDestination.kind,'skills','Tailoring training navigation stays in Skills');
if(tailDestination.kind==='skills')equal(tailDestination.recipeId,'TAILOR_MOSSWRAP_GLOVES','Tailoring navigation selects its starter recipe');
const enchantDestination=bestRecipeTrainingDestination(withMaterials([]),'enchanting');
equal(enchantDestination.kind,'skills','Enchanting training navigation stays in Skills');
if(enchantDestination.kind==='skills')equal(enchantDestination.recipeId,'ENCHANT_WISP_CHARM','Enchanting navigation selects its starter recipe');

const state=withMaterials([]),characterId=state.character!.id;
for(const skillId of ['tailoring','enchanting'] as const){
 const goal:ProgressionGoal={id:'goal-'+skillId,characterId,kind:'skill_level',title:skillId,createdAtMs:0,pinnedAtMs:0,skillId,targetLevel:5};
 const destination=progressionGoalDestination(state,goal);
 equal(destination.kind,'skills',skillId+' goal routes to Skills');
 if(destination.kind==='skills'){equal(destination.mode,'crafting',skillId+' goal routes to crafting mode');equal(destination.skillId,skillId,skillId+' remains selected');}
}

console.log('PASS: Tailoring and Enchanting have real Asterfall crafting progression');

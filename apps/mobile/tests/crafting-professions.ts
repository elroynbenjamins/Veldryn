import {createCharacter,newGame} from '../src/core/game';
import {claimEquipmentCraft,startEquipmentCraft} from '../src/core/equipment-crafting-queue';
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

const tailoring=RECIPES.filter(row=>row.skillId==='tailoring'),tailoringTraining=tailoring.filter(row=>row.repeatableTraining);
const enchanting=RECIPES.filter(row=>row.skillId==='enchanting'),enchantingTraining=enchanting.filter(row=>row.repeatableTraining);
equal(tailoringTraining.length,4,'Tailoring keeps its authored Asterfall training ladder alongside equipment progression');
equal(enchantingTraining.length,3,'Enchanting has an authored Asterfall training ladder');
ok(tailoringTraining.every(row=>row.repeatableTraining),'Tailoring starter recipes remain repeatable training choices');
ok(enchantingTraining.every(row=>row.repeatableTraining),'Enchanting recipes remain repeatable training choices');
ok(tailoring.some(row=>row.v33SetId),'Tailoring extends into V33 class equipment progression');
for(const recipe of [...tailoringTraining,...enchantingTraining])itemDef(recipe.output.itemId);

let tail=withMaterials([{itemId:'MOSS_FIBER',quantity:8}]);
ok(recipeAvailability(tail,'TAILOR_MOSSWRAP_GLOVES').ready,'starter Tailoring recipe is craftable with its listed material');
const enchantingBefore=skill(tail,'enchanting').xp,tailJob=startEquipmentCraft(tail,'TAILOR_MOSSWRAP_GLOVES',1);
tail=claimEquipmentCraft(tailJob.state,tailJob.job.id,tailJob.job.completesAtMs,.5).state;
equal(skill(tail,'tailoring').xp,70,'Tailoring Forge craft grants Tailoring XP');
equal(skill(tail,'enchanting').xp,enchantingBefore,'Tailoring craft does not leak XP into Enchanting');
equal(tail.inventory.stacks.find(row=>row.itemId==='MOSSWRAP_GLOVES')?.quantity,1,'Tailoring Forge creates the existing gear output');

let enchant=withMaterials([{itemId:'WISP_DUST',quantity:6},{itemId:'COPPER_INGOT',quantity:1}]);
ok(recipeAvailability(enchant,'ENCHANT_WISP_CHARM').ready,'starter Enchanting recipe is craftable with its listed materials');
const tailoringBefore=skill(enchant,'tailoring').xp,enchantJob=startEquipmentCraft(enchant,'ENCHANT_WISP_CHARM',2);
enchant=claimEquipmentCraft(enchantJob.state,enchantJob.job.id,enchantJob.job.completesAtMs,.5).state;
equal(skill(enchant,'enchanting').xp,75,'Enchanting Forge craft grants Enchanting XP');
equal(skill(enchant,'tailoring').xp,tailoringBefore,'Enchanting craft does not leak XP into Tailoring');
equal(enchant.inventory.stacks.find(row=>row.itemId==='WISP_CHARM')?.quantity,1,'Enchanting Forge creates the existing gear output');

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

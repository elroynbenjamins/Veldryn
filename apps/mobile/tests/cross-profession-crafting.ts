import {CROSS_PROFESSION_COMPONENT_ITEMS,CROSS_PROFESSION_COMPONENT_RECIPES} from '../src/content/cross-profession-components';
import {V33_EQUIPMENT_RECIPES,CROSS_PROFESSION_ASSEMBLY_INPUTS} from '../src/content/equipment-recipes-v33';
import {RECIPES} from '../src/content/skills';
import {itemDef} from '../src/content/items';
import {newGame,createCharacter} from '../src/core/game';
import {startEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {processingAvailability,startProcessingBatch} from '../src/core/processing';
import {marketCatalogCandidate} from '../src/core/player-market-readiness';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+' (expected '+expected+', got '+actual+')');}

const ids=new Set(CROSS_PROFESSION_COMPONENT_ITEMS.map(item=>item.id));
equal(ids.size,6,'Cross-profession item IDs must be unique');
equal(CROSS_PROFESSION_COMPONENT_RECIPES.length,6,'Both professions must have three repeatable component recipes');

for(const item of CROSS_PROFESSION_COMPONENT_ITEMS){
 equal(itemDef(item.id).type,'material','Every component must be a registered material');
 ok(marketCatalogCandidate(item.id),'Shared components must be eligible for future player trading');
 const recipes=CROSS_PROFESSION_COMPONENT_RECIPES.filter(recipe=>recipe.output.itemId===item.id);
 equal(recipes.length,1,'Each component must have exactly one recipe');
 ok(recipes[0].repeatableTraining,'Every component must provide repeatable profession XP');
 ok(recipes[0].xp>0,'Every component craft must award XP');
 ok(recipes[0].inputs.length>0&&recipes[0].inputs.every(input=>!ids.has(input.itemId)),'Component recipes must not depend on each other or create circular crafting chains');
 ok(RECIPES.some(recipe=>recipe.id===recipes[0].id),'Shared component recipe must be in the global catalog');
}
for(const skillId of ['smithing','tailoring'] as const){
 const recipes=CROSS_PROFESSION_COMPONENT_RECIPES.filter(recipe=>recipe.skillId===skillId);
 equal(recipes.length,3,'Each profession must produce three component tiers');
 ok(recipes.some(recipe=>recipe.level===1),'Every class needs a profession training recipe at level 1');
}

const crossTiers=new Set(Object.keys(CROSS_PROFESSION_ASSEMBLY_INPUTS));
let affected=0;
for(const gear of V33_EQUIPMENT_RECIPES){
 const opposite=gear.skillId==='smithing'?'tailoring':'smithing';
 const assembly=CROSS_PROFESSION_ASSEMBLY_INPUTS[gear.v33EquipmentTier];
 const cross=gear.inputs.filter(input=>ids.has(input.itemId));
 if(assembly){
   affected++;
   equal(cross.length,1,'Every T1–T4 gear piece must require exactly one opposite-profession component');
   equal(cross[0].itemId,assembly[gear.skillId],'Cross component must come from opposite profession');
   ok(cross[0].quantity>=1,'Shared component quantity must remain positive');
   const producer=CROSS_PROFESSION_COMPONENT_RECIPES.find(recipe=>recipe.output.itemId===cross[0].itemId)!;
   equal(producer.skillId,opposite,'Component producer must be opposite of assembly skill');
 }else equal(cross.length,0,'T5+ material costs must remain unchanged until a separate tier balance pass');
}
equal(crossTiers.size,4,'Cross-profession rollout must be limited to T1–T4');
equal(affected,720,'All nine classes, two paths and ten slots across T1–T4 must have cross-profession inputs');

for(const [classId,profession] of [['IRONWARDEN','tailoring'],['WAYFINDER','smithing']] as const){
 const gear=V33_EQUIPMENT_RECIPES.find(recipe=>recipe.skillId===profession&&recipe.classId!==classId&&recipe.v33EquipmentTier==='T1')!;
 ok(gear,'Need a foreign-class gear recipe for the cross-class forge check');
 let state=createCharacter(newGame(0),classId,'All-Profession Crafter');
 state={...state,character:{...state.character!,level:gear.characterLevel,gold:gear.gold+1},skills:state.skills.map(s=>s.skillId===profession?{...s,level:gear.level}:s),inventory:{...state.inventory,stacks:gear.inputs.map(input=>({...input}))}};
 const started=startEquipmentCraft(state,gear.id,1000);
 equal(started.job.recipeId,gear.id,'Foreign class must be able to start the forge');
 equal(started.job.reservedInputs?.length,gear.inputs.length,'Cross-profession component reservations must be recorded');
}
for(const recipe of CROSS_PROFESSION_COMPONENT_RECIPES){
 let state=createCharacter(newGame(0),'IRONWARDEN','Material Crafter');
 state={...state,character:{...state.character!,gold:recipe.gold+1},skills:state.skills.map(s=>s.skillId===recipe.skillId?{...s,level:recipe.level}:s),inventory:{...state.inventory,stacks:recipe.inputs.map(input=>({...input}))}};
 const status=processingAvailability(state,recipe.id,1);
 ok(status.ready,'Component must be eligible for timed production: '+recipe.id+' ('+status.reason+')');
 const started=startProcessingBatch(state,recipe.id,1,1000);
 equal(started.activity?.processing?.recipeId,recipe.id,'Timed component crafting must reserve the expected output');
}
console.log('PASS: T1–T4 equipment requires tradeable, class-independent Smithing and Tailoring components with repeatable XP and no material cycles');

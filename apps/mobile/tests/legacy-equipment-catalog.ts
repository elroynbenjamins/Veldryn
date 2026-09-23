import {RECIPES,type Recipe} from '../src/content/skills';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {noviceItemId} from '../src/content/novice-sets';
import {createCharacter,craftRecipe,newGame} from '../src/core/game';
import {claimEquipmentCraft,startEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {equipmentCraftingPath} from '../src/core/equipment-crafting-path';
import {itemInspectModel} from '../src/core/item-inspect';
import {recipeAvailability} from '../src/core/playability';
import {workingTowardDestinationAvailability,workingTowardItemSource} from '../src/core/working-toward';
import {
  equipmentCatalogStatus,
  legacyEquipmentNotice,
  recipeCatalogStatus,
  recipeVisibleInActiveCatalog,
  visibleRecipeCatalogForSkill,
} from '../src/core/equipment-catalog-status';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(message+': expected '+String(expected)+', got '+String(actual))}

equal(equipmentCatalogStatus('TRACKER_CHEST'),'legacy','Old Tracker gear must be compatibility-only');
equal(equipmentCatalogStatus('T1P_001'),'v33','V33 pieces must stay active');
equal(equipmentCatalogStatus('basic_sword'),'starter','Class starter weapons must stay active');
equal(equipmentCatalogStatus(noviceItemId('WAYFINDER','chest')),'novice','Novice onboarding gear must stay active');
ok(legacyEquipmentNotice('TRACKER_CHEST')?.includes('Existing copies remain usable'),'Legacy equipment must explain compatibility behavior');

const retired=RECIPES.find(row=>row.id==='CRAFT_TRACKER_CHEST')!;
equal(recipeCatalogStatus(retired),'retired','Old class-set craft must be retired');
ok(!recipeVisibleInActiveCatalog(RECIPES,retired,'WAYFINDER'),'Retired class-set recipe must not be visible');

const visibleSmithing=visibleRecipeCatalogForSkill(RECIPES,'smithing','WAYFINDER');
ok(visibleSmithing.length>0,'Smithing must retain active recipes');
ok(visibleSmithing.every(recipe=>recipeCatalogStatus(recipe)!=='retired'),'Smithing browser must contain no retired equipment recipes');
ok(visibleSmithing.some(recipe=>recipe.v33SetId),'Smithing browser must retain V33 equipment recipes');

const tailoringVisible=visibleRecipeCatalogForSkill(RECIPES,'tailoring','WAYFINDER');
const tailoringStatuses=tailoringVisible.map(recipeCatalogStatus);
ok(tailoringStatuses.every(status=>status==='active'||status==='legacy_training'),'Tailoring bridge may expose only active or explicit legacy-training recipes');
if(tailoringStatuses.some(status=>status==='active'))ok(!tailoringStatuses.includes('legacy_training'),'Legacy Tailoring training must disappear once active replacements exist');
else ok(tailoringVisible.length>0&&tailoringStatuses.every(status=>status==='legacy_training'),'Tailoring must retain a temporary training bridge until replacement recipes exist');

const fakeReplacement:Recipe={id:'TEST_TAILOR_ACTIVE',name:'Active Tailoring Test',skillId:'tailoring',level:1,xp:1,gold:0,seconds:1,repeatableTraining:true,inputs:[],output:{itemId:'MOSS_FIBER',quantity:1}};
const simulatedTailoring=visibleRecipeCatalogForSkill([...RECIPES,fakeReplacement],'tailoring','WAYFINDER');
ok(simulatedTailoring.some(recipe=>recipe.id===fakeReplacement.id),'Active replacement recipe must enter the Tailoring catalog');
ok(simulatedTailoring.every(recipe=>recipeCatalogStatus(recipe)!=='legacy_training'),'Active replacement recipes must automatically hide legacy training patterns');

let state=createCharacter(newGame(0),'WAYFINDER','Legacy Catalog Tester','male');
const source=workingTowardItemSource(state,'TRACKER_CHEST');
equal(source.kind,'inventory','Working Toward must not recommend retired Tracker crafting');
ok(!equipmentCraftingPath(state,'TRACKER_CHEST'),'Legacy Tracker gear must not expose an Equipment 2.0 crafting path');
const legacyInspect=itemInspectModel(state,'TRACKER_CHEST');
equal(legacyInspect.catalogStatus,'legacy','Quick Inspect must flag legacy gear');
ok(!!legacyInspect.legacyNotice,'Quick Inspect must carry the legacy compatibility notice');
ok(!legacyInspect.sources.some(row=>row.kind==='crafting'),'Retired gear must not advertise old crafting sources');

const v33Recipe=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='WAYFINDER')!;
ok(recipeVisibleInActiveCatalog(RECIPES,v33Recipe,'WAYFINDER'),'V33 recipe must remain visible');
ok(!!equipmentCraftingPath(state,v33Recipe.output.itemId),'V33 equipment must retain its crafting path');

const retiredAvailability=recipeAvailability(state,retired.id);
ok(!retiredAvailability.ready&&retiredAvailability.reason.toLowerCase().includes('retired'),'Legacy direct crafting availability must be blocked');
let directBlocked=false;
try{craftRecipe(state,retired.id,1000)}catch(error){directBlocked=error instanceof Error&&error.message.toLowerCase().includes('retired')}
ok(directBlocked,'Direct core crafting must reject retired gear recipes');

let forgeBlocked=false;
try{startEquipmentCraft(state,retired.id,1000)}catch(error){forgeBlocked=error instanceof Error&&error.message.toLowerCase().includes('retired')}
ok(forgeBlocked,'New forge jobs must reject retired gear recipes');

const destination=workingTowardDestinationAvailability(state,{kind:'skills',skillId:'smithing',mode:'crafting',recipeId:retired.id,button:'Open recipe',detail:'Open old recipe'});
equal(destination.status,'locked','Saved old recipe destinations must become unavailable');
ok(destination.detail.toLowerCase().includes('retired'),'Saved old recipe destinations must explain the retirement');

const jobId='legacy-compat-job';
state={...state,account:{...state.account,equipmentCraftingQueue:[{
  id:jobId,recipeId:retired.id,ownerCharacterId:state.character!.id,startedAtMs:0,completesAtMs:1,reservedGold:retired.gold,reservedInputs:retired.inputs.map(input=>({...input})),
}]}};
const claimed=claimEquipmentCraft(state,jobId,2,.5);
ok(
  claimed.state.inventory.stacks.some(row=>row.itemId===retired.output.itemId)||
  claimed.state.bank.stacks.some(row=>row.itemId===retired.output.itemId),
  'A legacy forge job already reserved in an old save must still be claimable'
);

console.log('PASS: legacy equipment is compatibility-only while V33/novice/starter progression stays active');

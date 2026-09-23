import {V33_EQUIPMENT_RECIPES,v33EquipmentRecipeForItem} from '../src/content/equipment-recipes-v33';
import {RECIPES} from '../src/content/skills';
import {itemDef} from '../src/content/items';
import {createCharacter,craftRecipe,newGame} from '../src/core/game';
import {equipmentCraftingPath} from '../src/core/equipment-crafting-path';
import {itemInspectModel} from '../src/core/item-inspect';
import {workingTowardItemSource} from '../src/core/working-toward';
import {MONSTERS} from '../src/content/monsters';
import {combatBaselineProjection,dropExpectation} from '../src/core/balance-projection';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

ok(V33_EQUIPMENT_RECIPES.length===2430,'All 2,430 V33 equipment pieces need a recipe');
ok(new Set(V33_EQUIPMENT_RECIPES.map(row=>row.id)).size===2430,'V33 recipe IDs must be unique');
ok(new Set(V33_EQUIPMENT_RECIPES.map(row=>row.output.itemId)).size===2430,'Every V33 piece should have exactly one generated output recipe');
ok(V33_EQUIPMENT_RECIPES.every(row=>RECIPES.some(recipe=>recipe.id===row.id&&recipe.output.itemId===row.output.itemId)),'All generated V33 recipes must be registered in RECIPES');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.inputs.length>=2&&row.inputs.every(input=>itemDef(input.itemId).type==='material')),'Every V33 recipe needs registered material inputs');

const timerRanges:Record<string,[number,number]>={T1:[60,180],T2:[180,360],T3:[300,600],T4:[480,900],T5:[720,1200],T6:[900,1500],T7:[1200,1800],T8:[1500,2400],T9:[1800,2700]};
for(const recipe of V33_EQUIPMENT_RECIPES){
  const range=timerRanges[recipe.v33EquipmentTier];
  ok(!!range&&recipe.seconds>=range[0]&&recipe.seconds<=range[1],recipe.id+' craft timer is outside the V33 tier pacing band');
  for(const input of recipe.inputs){
    const state=createCharacter(newGame(0),recipe.classId,'Source Check','male');
    const source=workingTowardItemSource(state,input.itemId);
    ok(source.kind!=='inventory',recipe.id+' has an ingredient without a registered actionable source: '+input.itemId);
  }
}

const oathbound=V33_EQUIPMENT_RECIPES.filter(row=>row.v33SetId==='T1_001');
const bySlot=(slot:string)=>oathbound.find(row=>itemDef(row.output.itemId).slot===slot as any)!;
ok(bySlot('ring').gold<bySlot('chest').gold&&bySlot('chest').gold<bySlot('weapon').gold,'Slot cost multipliers should keep Ring < Chest < Weapon');
ok(bySlot('ring').seconds<bySlot('chest').seconds&&bySlot('chest').seconds<=bySlot('weapon').seconds,'Slot timers should preserve meaningful size differences');

const t1=v33EquipmentRecipeForItem('T1P_001')!;
ok(t1.inputs.some(row=>row.itemId==='GREENWOOD_LOG'),'T1 must use early Asterfall gathering rather than late Oathstone');
ok(!t1.inputs.some(row=>row.itemId==='OATHSTONE_INGOT'),'T1 must not be accidentally routed through the old late-Asterfall generator');
const t5=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T5')!;
ok(t5.inputs.some(row=>row.itemId==='SUNSTONE_ORE')&&t5.inputs.some(row=>row.itemId==='AMBERGLASS'),'T5 must use Sunscar materials');
const t8=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T8')!;
ok(t8.inputs.some(row=>row.itemId==='FROSTIRON')&&t8.inputs.some(row=>row.itemId==='CHOIR_BLOOM'),'T8 must use Frostmarch materials');

const materialSourceMonster:Record<string,string>={
  SUNSTONE_ORE:'GLASSBOUND_SENTINEL',AMBERGLASS:'GLASSBOUND_SENTINEL',ASTRAL_SCRIPT:'GLASSBOUND_SENTINEL',
  FROSTIRON:'CHOIR_HUNTER',RIMEGLASS:'CHOIR_HUNTER',CHOIR_BLOOM:'CHOIR_HUNTER',
};
function projectedFarmHours(recipe:typeof t8){
  return recipe.inputs.reduce((hours,input)=>{
    const monsterId=materialSourceMonster[input.itemId];if(!monsterId)return hours;
    const monster=MONSTERS.find(row=>row.id===monsterId)!;
    const drop=monster.drops.find(row=>row.itemId===input.itemId)!;
    const pace=combatBaselineProjection(monster),expectation=dropExpectation(drop.chance,drop.min,drop.max,pace.killsPerHour);
    return hours+input.quantity/Math.max(.0001,expectation.expectedQuantityPerHour);
  },0);
}
const highTierBands:Record<string,[number,number]>={
  T5:[.75,2.75],T6:[.9,3.5],T7:[1.0,3.5],T8:[1.25,5.5],T9:[1.5,7.0],
};
for(const tier of Object.keys(highTierBands)){
  const rows=V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier===tier);
  const [minHours,maxHours]=highTierBands[tier];
  for(const recipe of rows){
    const hours=projectedFarmHours(recipe);
    ok(hours>=minHours,recipe.id+' regional materials are below the grind floor for '+tier+': '+hours.toFixed(2)+'h baseline');
    ok(hours<=maxHours,recipe.id+' regional materials exceed the grind ceiling for '+tier+': '+hours.toFixed(2)+'h baseline');
  }
}
const t5Ring=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T5'&&itemDef(row.output.itemId).slot==='ring')!;
ok(projectedFarmHours(t5Ring)>=.75,'Even the cheapest T5 ring must require at least ~45 minutes of baseline regional farming');

let state=createCharacter(newGame(0),'IRONWARDEN','Crafter','male');
const path=equipmentCraftingPath(state,'T1P_001')!;
ok(path.recipe.id===t1.id&&path.tier==='T1'&&path.region==='Asterfall','Crafting path must resolve exact V33 recipe metadata');
ok(path.blockers.some(row=>row.kind==='character_level'),'Low-level character should see the exact character-level blocker');
ok(path.ingredients.every(row=>row.source.kind!=='inventory'),'Crafting path must expose direct material sources');

const inspect=itemInspectModel(state,'T1P_001');
const craftSource=inspect.sources.find(row=>row.kind==='crafting');
ok(craftSource?.navigation?.kind==='skills'&&craftSource.navigation.recipeId===t1.id,'Quick Inspect HOW TO GET must open the exact V33 recipe');

state={...state,character:{...state.character!,level:t1.characterLevel,gold:100000},skills:state.skills.map(row=>row.skillId==='smithing'?{...row,level:t1.level}:row),inventory:{...state.inventory,stacks:t1.inputs.map(input=>({...input}))}};
const readyPath=equipmentCraftingPath(state,'T1P_001')!;
ok(readyPath.canCraftNow&&readyPath.blockers.length===0,'Recipe planner should become READY when all authoritative requirements are met');
const crafted=craftRecipe(state,t1.id,1000);
ok(crafted.inventory.stacks.some(row=>row.itemId==='T1P_001'&&row.quantity===1),'Authoritative craft path must actually create the V33 equipment piece');

console.log('PASS: all V33 equipment pieces have paced, sourceable, actionable recipes and craft through the shared authoritative operation');

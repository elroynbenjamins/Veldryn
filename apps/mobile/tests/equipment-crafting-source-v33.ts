import {skillAffinityModifiers} from '../src/core/class-skill-affinities';
import {EQUIPMENT_CRAFT_SKILL_BY_CLASS,TIER_CHARACTER_LEVEL_FLOOR,TIER_CRAFTING_LEVEL_FLOOR,V33_EQUIPMENT_RECIPES,v33EquipmentRecipeForItem} from '../src/content/equipment-recipes-v33';
import {GATHERING,RECIPES} from '../src/content/skills';
import {itemDef} from '../src/content/items';
import {createCharacter,craftRecipe,newGame} from '../src/core/game';
import {equipmentCraftingPath} from '../src/core/equipment-crafting-path';
import {itemInspectModel} from '../src/core/item-inspect';
import {workingTowardItemSource} from '../src/core/working-toward';
import {MONSTERS} from '../src/content/monsters';
import {HERB_NODES} from '../src/content/herbalism';
import {combatBaselineProjection,dropExpectation,gatheringBalanceProjection} from '../src/core/balance-projection';
import {isV33EquipmentCraftingMaterial,v33EquipmentMaterialUse} from '../src/core/equipment-loot-v33';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

ok(V33_EQUIPMENT_RECIPES.length===2430,'All 2,430 V33 equipment pieces need a recipe');
ok(new Set(V33_EQUIPMENT_RECIPES.map(row=>row.id)).size===2430,'V33 recipe IDs must be unique');
ok(new Set(V33_EQUIPMENT_RECIPES.map(row=>row.output.itemId)).size===2430,'Every V33 piece should have exactly one generated output recipe');
ok(V33_EQUIPMENT_RECIPES.every(row=>RECIPES.some(recipe=>recipe.id===row.id&&recipe.output.itemId===row.output.itemId)),'All generated V33 recipes must be registered in RECIPES');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.inputs.length>=2&&row.inputs.every(input=>itemDef(input.itemId).type==='material')),'Every V33 recipe needs registered material inputs');
ok(V33_EQUIPMENT_RECIPES.every(row=>new Set(row.inputs.map(input=>input.itemId)).size===row.inputs.length),'V33 recipes must merge duplicate material rows');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.skillId===EQUIPMENT_CRAFT_SKILL_BY_CLASS[row.classId]),'Every V33 recipe must use its class primary crafting profession');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.characterLevel>=(TIER_CHARACTER_LEVEL_FLOOR[row.v33EquipmentTier]??1)),'Every V33 recipe must respect its tier character floor');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.level>=(TIER_CRAFTING_LEVEL_FLOOR[row.v33EquipmentTier]??1)),'Every V33 recipe must respect its tier profession floor');

const finishedGearDrops=MONSTERS.flatMap(monster=>monster.drops.map(drop=>({monster,drop}))).filter(row=>itemDef(row.drop.itemId).type==='gear');
ok(finishedGearDrops.length===0,'Combat must not bypass V33 crafting with finished equipment drops');
const combatFedV33Materials=['MOSS_FIBER','WISP_DUST','BOAR_HIDE','WOLF_PELT','IRONWOOD_FANG','THORN_SAP','TROLL_HIDE','OATHGLASS_SHARD','TORN_OATHCLOTH','LANTERNSTEEL_SHARD','ECHO_QUARTZ','AMBERGLASS','ASTRAL_SCRIPT','RIMEGLASS','CHOIR_BLOOM'];
for(const itemId of combatFedV33Materials){
  ok(isV33EquipmentCraftingMaterial(itemId),itemId+' must feed at least one V33 equipment recipe');
  ok(MONSTERS.some(monster=>monster.drops.some(drop=>drop.itemId===itemId)),itemId+' must retain a combat source for Equipment 2.0');
}
for(const chain of [
  {raw:'SUNSTONE_ORE',processed:'SUNSTONE_INGOT',recipe:'SMELT_SUNSTONE_INGOT'},
  {raw:'FROSTIRON',processed:'FROSTIRON_INGOT',recipe:'SMELT_FROSTIRON_INGOT'},
] as const){
  ok(MONSTERS.some(monster=>monster.drops.some(drop=>drop.itemId===chain.raw)),chain.raw+' must retain its combat source');
  ok(isV33EquipmentCraftingMaterial(chain.processed),chain.processed+' must feed V33 equipment');
  const processing=RECIPES.find(recipe=>recipe.id===chain.recipe);
  ok(processing?.inputs.some(input=>input.itemId===chain.raw)&&processing.output.itemId===chain.processed,chain.raw+' must reach equipment through regional processing');
}
const mossUse=v33EquipmentMaterialUse('MOSS_FIBER')!;
ok(mossUse.tiers.includes('T1')&&mossUse.recipeCount>0,'Starter monster materials must identify their V33 equipment use');
const frostUse=v33EquipmentMaterialUse('FROSTIRON_INGOT')!;
ok(frostUse.tiers.some(tier=>['T7','T8','T9'].includes(tier)),'Processed Frostmarch metal must feed later V33 tiers');


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
const t5=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T5'&&row.skillId==='smithing')!;
ok(t5.inputs.some(row=>row.itemId==='SUNSTONE_INGOT')&&t5.inputs.some(row=>row.itemId==='AMBERGLASS'),'T5 must use processed Sunscar materials');
const t8=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T8'&&row.skillId==='smithing')!;
ok(t8.inputs.some(row=>row.itemId==='FROSTIRON_INGOT')&&t8.inputs.some(row=>row.itemId==='CHOIR_BLOOM'),'T8 must use processed Frostmarch materials');

const materialSourceMonster:Record<string,string>={
  SUNSTONE_ORE:'GLASSBOUND_SENTINEL',AMBERGLASS:'GLASSBOUND_SENTINEL',ASTRAL_SCRIPT:'GLASSBOUND_SENTINEL',
  FROSTIRON:'CHOIR_HUNTER',RIMEGLASS:'CHOIR_HUNTER',CHOIR_BLOOM:'CHOIR_HUNTER',
};
function materialFarmHours(state:ReturnType<typeof createCharacter>,itemId:string,quantity:number,depth=0):number{
  if(depth>4)return 0;
  const gather=[...GATHERING,...HERB_NODES].find(row=>row.itemId===itemId);
  if(gather){
    const pace=gatheringBalanceProjection(state,gather,24),affinity=skillAffinityModifiers(state.character?.classId,gather.skillId);
    // This test guards authored material quantities at baseline, not specialist completion times.
    // Affinity runtime speed and unchanged per-action yields are tested separately across all classes.
    const baselineItemsPerHour=pace.runtimeItemsPerHour/affinity.speedMultiplier;
    return quantity/Math.max(.0001,baselineItemsPerHour);
  }
  const monsterId=materialSourceMonster[itemId];
  if(monsterId){const monster=MONSTERS.find(row=>row.id===monsterId)!;const drop=monster.drops.find(row=>row.itemId===itemId)!;const pace=combatBaselineProjection(monster),expectation=dropExpectation(drop.chance,drop.min,drop.max,pace.killsPerHour);return quantity/Math.max(.0001,expectation.expectedQuantityPerHour);}
  const processing=RECIPES.find(row=>row.repeatableTraining&&row.output.itemId===itemId);
  if(!processing)return 0;
  const batches=quantity/Math.max(1,processing.output.quantity);
  return processing.inputs.reduce((sum,input)=>sum+materialFarmHours(state,input.itemId,input.quantity*batches,depth+1),0);
}
function projectedFarmHours(recipe:typeof t8){
  const state=createCharacter(newGame(0),recipe.classId,'Farm Pace','male');
  return recipe.inputs.reduce((hours,input)=>hours+materialFarmHours(state,input.itemId,input.quantity),0);
}
const highTierBands:Record<string,[number,number]>={
  // Regional ore -> ingot processing now includes its local wood fuel. T7 is the first Frostmarch tier,
  // so its ceiling includes the new Frostiron + Whitepine processing chain while staying below T8.
  // T9 keeps a lower floor for Ring/Amulet slot multipliers; generated small-slot pieces may land near ~1.0h,
  // while large-slot pieces still scale much higher. This floor guards against near-free recipes without flattening slot identity.
  T5:[.75,4.5],T6:[1.0,5.5],T7:[1.2,6.5],T8:[1.5,7.5],T9:[1.0,9.0],
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
const tailoringT5=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T5'&&row.skillId==='tailoring')!;
ok(tailoringT5.inputs.some(row=>row.itemId==='SUNSCALE')&&tailoringT5.inputs.some(row=>row.itemId==='AMBERGLASS'),'T5 Tailoring must use Sunscar Herbalism fiber plus regional magical material');
const tailoringT8=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T8'&&row.skillId==='tailoring')!;
ok(tailoringT8.inputs.some(row=>row.itemId==='FROSTBLOOM')&&tailoringT8.inputs.some(row=>row.itemId==='RIMEGLASS'),'T8 Tailoring must use Frostmarch Herbalism fiber plus regional magical material');
const tailoringT9=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T9'&&row.skillId==='tailoring')!;
ok(tailoringT9.inputs.some(row=>row.itemId==='ASHEN_MYRRH'),'T9 Tailoring must use Ashlands Herbalism fiber');


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

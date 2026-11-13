import {skillAffinityModifiers} from '../src/core/class-skill-affinities';
import {EQUIPMENT_FORGE_GOLD_MULTIPLIER,T2_T4_EQUIPMENT_CRAFT_XP_MULTIPLIER,T3_T4_DUNEWOOD_REDUCTION_FACTOR,EQUIPMENT_CRAFT_SKILL_BY_CLASS,TIER_CHARACTER_LEVEL_FLOOR,TIER_CRAFTING_LEVEL_FLOOR,V33_EQUIPMENT_RECIPES,v33EquipmentRecipeForItem} from '../src/content/equipment-recipes-v33';
import {GATHERING,RECIPES} from '../src/content/skills';
import {NOVICE_RECIPES,NOVICE_STAGE} from '../src/content/novice-sets';
import {recipeAvailability} from '../src/core/playability';
import {itemDef} from '../src/content/items';
import {createCharacter,craftRecipe,newGame} from '../src/core/game';
import {equipmentCraftingPath} from '../src/core/equipment-crafting-path';
import {itemInspectModel} from '../src/core/item-inspect';
import {workingTowardItemSource} from '../src/core/working-toward';
import {MONSTERS} from '../src/content/monsters';
import {HERB_NODES} from '../src/content/herbalism';
import {combatBaselineProjection,dropExpectation,gatheringBalanceProjection} from '../src/core/balance-projection';
import {isV33EquipmentCraftingMaterial,v33EquipmentMaterialUse} from '../src/core/equipment-loot-v33';
import {ALCHEMY_EQUIPMENT_INFUSIONS} from '../src/content/alchemy';
import {increasedCraftingGoldCost} from '../src/content/crafting-gold-cost';
import {isT5EquipmentAffixSlot,T5_AFFIX_XP_MULTIPLIER} from '../src/content/t5-equipment-affix-spec';
import {rebasedCombatLevelFromLegacyLevel as rebaseLevel} from '../src/core/progression';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

ok(V33_EQUIPMENT_RECIPES.length===1620,'All 1,620 V33 equipment pieces need a recipe');
ok(EQUIPMENT_FORGE_GOLD_MULTIPLIER===3,'The equipment forge gold multiplier must be exactly 3×');
ok(T2_T4_EQUIPMENT_CRAFT_XP_MULTIPLIER===1.25,'T2–T4 equipment forge XP must be increased by exactly 25%');
ok(T3_T4_DUNEWOOD_REDUCTION_FACTOR===0.8,'T3/T4 assembly Dunewood must be 20% below the recently tripled cost');
// T5 was deliberately repriced (3500 → 6000 Gold, 1100 → 1200 XP) when the T5 affix
// slots landed; every other tier stays pinned to its original baseline.
const originalTierGold:Record<string,number>={T1:120,T2:420,T3:900,T4:1800,T5:6000,T6:10000,T7:18000,T8:30000,T9:50000};
const originalTierXp:Record<string,number>={T1:165,T2:290,T3:450,T4:700,T5:1200,T6:1600,T7:2200,T8:2900,T9:3800};
const originalSlotGold:Record<string,number>={helmet:.85,chest:1.2,gloves:.7,legs:1,boots:.75,weapon:1.35,offhand:1.15,cape:.85,amulet:.65,ring:.55};
for(const recipe of V33_EQUIPMENT_RECIPES){
  const slot=itemDef(recipe.output.itemId).slot!;
  const previousPrice=Math.max(1,Math.round(originalTierGold[recipe.v33EquipmentTier]*originalSlotGold[slot]));
  const highSunscar=recipe.v33EquipmentTier==='T3'||recipe.v33EquipmentTier==='T4';
  ok(recipe.gold===increasedCraftingGoldCost(previousPrice*3)*(highSunscar?2:1),recipe.id+' must use the existing forge baseline plus exactly 2× Gold for T3/T4 only');
  const baselineXp=Math.max(1,Math.round(originalTierXp[recipe.v33EquipmentTier]*originalSlotGold[slot]));
  const previousXp=baselineXp+(highSunscar?20:0);
  const boostedTier=['T2','T3','T4'].includes(recipe.v33EquipmentTier);
  const standardXp=boostedTier?Math.round(previousXp*1.25):previousXp;
  // Three of the ten T5 slots carry a secondary stat and pay for it in profession XP.
  const t5Affix=recipe.v33EquipmentTier==='T5'&&isT5EquipmentAffixSlot(slot);
  ok(recipe.xp===(t5Affix?Math.round(standardXp*T5_AFFIX_XP_MULTIPLIER):standardXp),recipe.id+' must apply 25% more equipment crafting XP only to T2–T4 and the T5 affix bonus only to affix slots, retaining the T3/T4 +20 baseline');
  ok(RECIPES.find(row=>row.id===recipe.id)?.xp===recipe.xp,recipe.id+' registered recipe XP must match the forge');
  ok(RECIPES.find(row=>row.id===recipe.id)?.gold===recipe.gold,recipe.id+' registered recipe price must match the forge');
}
for(const recipe of NOVICE_RECIPES){
  const slot=itemDef(recipe.output.itemId).slot!,stage=NOVICE_STAGE[slot]??4;
  const previousPrice=(slot==='weapon'||slot==='amulet'||slot==='ring'?20:stage===4?15:10)*2;
  ok(recipe.gold===increasedCraftingGoldCost(previousPrice*3),recipe.id+' novice equipment must cost 20% above the 3× forge baseline');
  ok(RECIPES.find(row=>row.id===recipe.id)?.gold===recipe.gold,recipe.id+' novice recipe price must match the shared catalog');
}
const firstNovice=NOVICE_RECIPES.find(row=>row.classId==='IRONWARDEN'&&row.output.itemId.endsWith('_CHEST'))!;
let noviceBudget=createCharacter(newGame(0),'IRONWARDEN','Novice Gold Budget','male');
noviceBudget={...noviceBudget,character:{...noviceBudget.character!,gold:firstNovice.gold-1},inventory:{...noviceBudget.inventory,capacity:60,stacks:firstNovice.inputs.map(input=>({...input}))}};
ok(!recipeAvailability(noviceBudget,firstNovice.id).ready,'Novice equipment availability must reject one gold short');
const exactNovice={...noviceBudget,character:{...noviceBudget.character!,gold:firstNovice.gold}};
ok(recipeAvailability(exactNovice,firstNovice.id).ready,'Novice equipment availability must accept the exact increased gold price');
ok(craftRecipe(exactNovice,firstNovice.id,1000).character!.gold===0,'Novice equipment crafting must deduct the increased gold price');
ok(new Set(V33_EQUIPMENT_RECIPES.map(row=>row.id)).size===1620,'V33 recipe IDs must be unique');
ok(new Set(V33_EQUIPMENT_RECIPES.map(row=>row.output.itemId)).size===1620,'Every V33 piece should have exactly one generated output recipe');
ok(V33_EQUIPMENT_RECIPES.every(row=>RECIPES.some(recipe=>recipe.id===row.id&&recipe.output.itemId===row.output.itemId)),'All generated V33 recipes must be registered in RECIPES');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.inputs.length>=2&&row.inputs.every(input=>itemDef(input.itemId).type==='material')),'Every V33 recipe needs registered material inputs');
ok(V33_EQUIPMENT_RECIPES.every(row=>new Set(row.inputs.map(input=>input.itemId)).size===row.inputs.length),'V33 recipes must merge duplicate material rows');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.skillId===EQUIPMENT_CRAFT_SKILL_BY_CLASS[row.classId]),'Every V33 recipe must use its class primary crafting profession');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.characterLevel>=rebaseLevel(TIER_CHARACTER_LEVEL_FLOOR[row.v33EquipmentTier]??1)),'Every V33 recipe must respect its tier character floor');
ok(V33_EQUIPMENT_RECIPES.every(row=>row.level>=(TIER_CRAFTING_LEVEL_FLOOR[row.v33EquipmentTier]??1)),'Every V33 recipe must respect its tier profession floor');
const infusionByTier={T1:'VERDANT_BINDING_RESIN',T2:'IRONWOOD_BINDING_RESIN',T3:'SUNSCAR_DUNE_BINDER',T4:'GLASSBOUND_BINDER',T5:'SUNFUSED_FIXATIVE',T6:'SUNFUSED_FIXATIVE',T7:'RIMEWARD_DISTILLATE',T8:'RIMEWARD_DISTILLATE',T9:'CINDERHEART_ELIXIR'} as const;
ok(ALCHEMY_EQUIPMENT_INFUSIONS.every(infusion=>V33_EQUIPMENT_RECIPES.some(recipe=>recipe.inputs.some(input=>input.itemId===infusion.id))||RECIPES.some(refine=>refine.inputs.some(input=>input.itemId===infusion.id)&&V33_EQUIPMENT_RECIPES.some(gear=>gear.inputs.some(input=>input.itemId===refine.output.itemId)))),'Every crafted infusion must feed equipment directly or through a verified conversion');
for(const [tier,infusionId] of Object.entries(infusionByTier))ok(V33_EQUIPMENT_RECIPES.filter(recipe=>recipe.v33EquipmentTier===tier).every(recipe=>recipe.inputs.some(input=>input.itemId===infusionId)),tier+' equipment must require its regional Alchemy infusion');
function fullSetGold(tier:string,skillId:'smithing'|'tailoring'){
  return V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier===tier&&row.skillId===skillId&&row.v33Path==='Foundation').slice(0,10).reduce((sum,row)=>sum+row.gold,0);
}
for(const skillId of ['smithing','tailoring'] as const){
  ok(fullSetGold('T4',skillId)<fullSetGold('T5',skillId),skillId+' full-set Gold must increase from T4 to T5');
  ok(fullSetGold('T5',skillId)<fullSetGold('T6',skillId),skillId+' full-set Gold must increase from T5 to T6');
}
for(const recipe of V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier==='T5')){
  const slot=itemDef(recipe.output.itemId).slot!;
  const fixative=recipe.inputs.find(input=>input.itemId==='SUNFUSED_FIXATIVE');
  ok(fixative,'T5 '+recipe.id+' must require Sunfused Fixative');
  if(isT5EquipmentAffixSlot(slot)){
    ok(fixative!.quantity===2,recipe.id+' affix slot must require 2 Sunfused Fixative (base + extra)');
  }else{
    ok(fixative!.quantity===1,recipe.id+' non-affix slot must require exactly 1 Sunfused Fixative');
  }
}

const finishedGearDrops=MONSTERS.flatMap(monster=>monster.drops.map(drop=>({monster,drop}))).filter(row=>itemDef(row.drop.itemId).type==='gear');
ok(finishedGearDrops.length===0,'Combat must not bypass V33 crafting with finished equipment drops');
const combatFedV33Materials=['MOSS_FIBER','BOAR_HIDE','WOLF_PELT','IRONWOOD_FANG','THORN_SAP','TROLL_HIDE','AMBERGLASS','ASTRAL_SCRIPT','RIMEGLASS','CHOIR_BLOOM'];
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
const t3=V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier==='T3');
const t4=V33_EQUIPMENT_RECIPES.filter(row=>row.v33EquipmentTier==='T4');
const t3Materials=new Set(['DUNEWOOD','SUNSTONE_ORE','SUNSCALE','AMBERGLASS','ASTRAL_SCRIPT','SUNSCAR_DUNE_BINDER']);
const t4Materials=new Set(['SUNSTONE_INGOT','SUNSCALE','DUNEWOOD','ASTRAL_SCRIPT','AMBERGLASS','GLASSBOUND_BINDER']);
ok(t3.every(recipe=>recipe.inputs.every(input=>t3Materials.has(input.itemId))),'T3 gear must use early-Sunscar sources only, without Asterfall solvent');
ok(t3.length===180,'Nine classes × two paths × ten slots must retain all 180 T3 equipment recipes');
for(const recipe of t3){
  const slot=itemDef(recipe.output.itemId).slot!;
  const woodBase=recipe.skillId==='tailoring'?10:22;
  const previousWood=Math.max(1,Math.round(woodBase*1.35*originalSlotGold[slot]));
  const wood=recipe.inputs.find(row=>row.itemId==='DUNEWOOD');
  ok(wood?.quantity===Math.max(1,Math.round(previousWood*3*T3_T4_DUNEWOOD_REDUCTION_FACTOR)),recipe.id+' must reduce recently tripled T3 Dunewood by 20% after slot rounding');
  ok(recipe.inputs.find(row=>row.itemId==='SUNSCAR_DUNE_BINDER')?.quantity===1,recipe.id+' must preserve one Dune Binding Resin');
}
for(const classId of Object.keys(EQUIPMENT_CRAFT_SKILL_BY_CLASS)){
  for(const path of ['Foundation','Alternate']){
    const set=t3.filter(recipe=>recipe.classId===classId&&recipe.v33Path===path);
    const woodTotal=set.reduce((total,recipe)=>total+(recipe.inputs.find(input=>input.itemId==='DUNEWOOD')?.quantity??0),0);
    ok(set.length===10&&woodTotal===(EQUIPMENT_CRAFT_SKILL_BY_CLASS[classId as keyof typeof EQUIPMENT_CRAFT_SKILL_BY_CLASS]==='smithing'?643:290),classId+' / '+path+' T3 set must reflect the 20% cut, rounded for every piece');
    ok(set.reduce((total,recipe)=>total+(recipe.inputs.find(input=>input.itemId==='SUNSCAR_DUNE_BINDER')?.quantity??0),0)===10,classId+' / '+path+' complete T3 set must still require ten Dune Binders');
  }
}
ok(t4.every(recipe=>recipe.inputs.every(input=>t4Materials.has(input.itemId))),'T4 gear must not require Oathglass, King\'s Road drops, or Asterfall ingots');
ok(t4.length===180,'Nine classes × two paths × ten slots must retain all 180 T4 equipment recipes');
for(const recipe of t4){
  const slot=itemDef(recipe.output.itemId).slot!;
  const woodBase=recipe.skillId==='tailoring'?7:8;
  // T4's regional-material multiplier was lowered from 2 to 1.5 alongside the T5 repricing.
  const previousWood=Math.max(1,Math.round(woodBase*1.5*originalSlotGold[slot]));
  const wood=recipe.inputs.find(row=>row.itemId==='DUNEWOOD');
  ok(wood?.quantity===Math.max(1,Math.round(previousWood*3*T3_T4_DUNEWOOD_REDUCTION_FACTOR)),recipe.id+' must reduce recently tripled T4 Dunewood by 20% after slot rounding');
}
ok(t4.every(recipe=>recipe.inputs.some(input=>input.itemId==='DUNEWOOD')&&recipe.inputs.some(input=>input.itemId==='GLASSBOUND_BINDER'&&input.quantity===1)&&!recipe.inputs.some(input=>input.itemId==='GLASSBOUND_CORE')),'Each T4 piece must use one Glassbound Binder and ordinary regional timber, never duplicate the rare Core directly');
for(const classId of Object.keys(EQUIPMENT_CRAFT_SKILL_BY_CLASS)){
  for(const path of ['Foundation','Alternate']){
    const set=t4.filter(recipe=>recipe.classId===classId&&recipe.v33Path===path);
    ok(set.length===10&&set.reduce((total,recipe)=>total+(recipe.inputs.find(input=>input.itemId==='GLASSBOUND_BINDER')?.quantity??0),0)===10,classId+' / '+path+' complete T4 set must cost precisely ten Glassbound Binders');
    const woodTotal=set.reduce((total,recipe)=>total+(recipe.inputs.find(input=>input.itemId==='DUNEWOOD')?.quantity??0),0);
    // Lowering the T4 multiplier from 2 to 1.5 takes a full set from 349/308 to 260/231.
    ok(woodTotal===(EQUIPMENT_CRAFT_SKILL_BY_CLASS[classId as keyof typeof EQUIPMENT_CRAFT_SKILL_BY_CLASS]==='smithing'?260:231),classId+' / '+path+' T4 set must reflect the 20% cut, rounded for every piece');
  }
}
const binderRoutes=RECIPES.filter(recipe=>recipe.output.itemId==='GLASSBOUND_BINDER');
ok(binderRoutes.length>=2&&binderRoutes.every(recipe=>recipe.inputs.filter(input=>input.itemId==='GLASSBOUND_CORE').reduce((sum,input)=>sum+input.quantity,0)===1),'Every standard/legacy Glassbound Binder recipe must require exactly one late-Sunscar Core');
ok(!isV33EquipmentCraftingMaterial('GLASSBOUND_CORE'),'Glassbound Core must be consumed in Alchemy rather than mislabelled as a direct gear-assembly input');
ok(t3.every(recipe=>!recipe.inputs.some(input=>input.itemId==='GLASSBOUND_CORE')),'T3 gear must remain accessible before Glassbound Sentinel');
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
  T5:[.75,5.4],T6:[1.0,6.6],T7:[1.2,7.9],T8:[1.5,9.6],T9:[1.0,10.8],
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
const t5HeavyChest=V33_EQUIPMENT_RECIPES.find(row=>row.output.itemId==='T5P_758')!;
ok(itemDef(t5HeavyChest.output.itemId).slot==='chest','T5P_758 must remain a heavy chest piece');
ok(projectedFarmHours(t5HeavyChest)<=highTierBands.T5[1],'Heavy T5 chest must respect the unchanged 5.4h ceiling without slot exemptions');
const t5SmithingWeapon=V33_EQUIPMENT_RECIPES.find(row=>row.output.itemId==='T5P_762')!;
ok(projectedFarmHours(t5SmithingWeapon)<=highTierBands.T5[1],'T5 smithing weapon must respect the unchanged 5.4h ceiling with the preserved 1.20 tier material multiplier');
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

console.log('PASS: V33 equipment T2–T4 grants 25% more crafting XP; other tiers and existing Gold/material balance remain unchanged');

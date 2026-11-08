import {ITEMS} from '../src/content/items';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {regionalStoryLeads} from '../src/core/regional-story-leads';
import type {GameState} from '../src/core/types';
import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES,HERBALISM_ESSENCE_BY_ZONE} from '../src/content/herbalism';
import {MONSTERS} from '../src/content/monsters';
import {DUNGEON_MATERIAL_SOURCES} from '../src/content/dungeon-material-sources';
import {GEM_DISMANTLE_DUST_V1} from '../src/core/gem-progression-v1';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
const itemIds=new Set(ITEMS.map(row=>row.id));
const direct=new Set<string>();
for(const row of [...GATHERING,...HERB_NODES])direct.add(row.itemId);
for(const row of Object.values(HERBALISM_ESSENCE_BY_ZONE))direct.add(row.itemId);
for(const monster of MONSTERS)for(const drop of monster.drops)direct.add(drop.itemId);
for(const source of DUNGEON_MATERIAL_SOURCES)direct.add(source.itemId);
// Gem Dust is intentionally recycled from socketable canonical gems rather than dropped directly.
// Grade-I raw gems drop in Asterfall, refine into canonical gems, and any canonical grade can be dismantled.
if(Object.values(GEM_DISMANTLE_DUST_V1).some(value=>value>0)&&MONSTERS.some(monster=>monster.drops.some(drop=>drop.itemId.startsWith('raw_gem:'))))direct.add('GEM_DUST');

// A recipe output is reachable only after every input is reachable. Iterate to a fixed point
// so multi-step processing chains (ore -> ingot -> fitting -> tool/equipment) are validated.
const reachable=new Set(direct);
let changed=true;
while(changed){
 changed=false;
 for(const recipe of RECIPES){
  if(reachable.has(recipe.output.itemId))continue;
  if(recipe.inputs.every(input=>reachable.has(input.itemId))){reachable.add(recipe.output.itemId);changed=true;}
 }
}

const requiredInputs=new Set(RECIPES.flatMap(recipe=>recipe.inputs.map(input=>input.itemId)));
const missingDefinitions=[...requiredInputs].filter(id=>!itemIds.has(id)).sort();
const unreachableRequired=[...requiredInputs].filter(id=>itemIds.has(id)&&!reachable.has(id)).sort();
ok(!missingDefinitions.length,'Recipe inputs missing item definitions: '+missingDefinitions.join(', '));
ok(!unreachableRequired.length,'Required recipe materials have no reachable gathering/drop/dungeon/crafting chain: '+unreachableRequired.join(', '));

const unreachableRecipes=RECIPES.filter(recipe=>!recipe.inputs.every(input=>reachable.has(input.itemId)));
ok(!unreachableRecipes.length,'Recipes with unreachable prerequisites: '+unreachableRecipes.slice(0,20).map(recipe=>recipe.id).join(', ')+(unreachableRecipes.length>20?' …':''));

for(const tier of ['T1','T2','T3','T4','T5','T6','T7','T8','T9']){
 const recipes=RECIPES.filter(recipe=>recipe.v33EquipmentTier===tier);
 ok(recipes.length>0,tier+' must contain equipment recipes');
 ok(recipes.every(recipe=>recipe.inputs.every(input=>reachable.has(input.itemId))),tier+' equipment has an unreachable material chain');
}

// Early recipes must not require repeated hunts in substantially outdated zones.
const gearInTier=(tier:string)=>V33_EQUIPMENT_RECIPES.filter(recipe=>recipe.v33EquipmentTier===tier);
for(const recipe of gearInTier('T1'))ok(!recipe.inputs.some(row=>row.itemId==='THORN_SAP'),'T1 alternate gear must not require level-8 Thorn Sap');
for(const recipe of gearInTier('T2')){
 ok(!recipe.inputs.some(row=>row.itemId==='BOAR_HIDE'),'T2 gear should not demand level-4 Boar Hide');
 ok(recipe.inputs.some(row=>row.itemId==='IRONWOOD_BINDING_RESIN'),'T2 gear must require its Ironwood-specific Alchemy resin');
 ok(!recipe.inputs.some(row=>row.itemId==='VERDANT_BINDING_RESIN'),'T2 equipment must not demand a starter-region infusion');
}
for(const recipe of gearInTier('T1'))ok(recipe.inputs.some(row=>row.itemId==='VERDANT_BINDING_RESIN'),'T1 gear must continue using Verdant resin');
const ironwoodResin=RECIPES.find(row=>row.id==='BREW_IRONWOOD_BINDING_RESIN')!;
ok(!!ironwoodResin&&ironwoodResin.level<=8,'T2 resin must unlock by Alchemy 8');
ok(ironwoodResin.inputs.length>=3&&ironwoodResin.inputs.every(input=>['IRONWOOD_LOG','THORN_SAP','WOLF_PELT'].includes(input.itemId)),'T2 resin must use exclusively obtainable Ironwood materials');
const materialDropLevels=(id:string)=>MONSTERS.filter(monster=>monster.drops.some(drop=>drop.itemId===id)).map(monster=>monster.level);
for(const [id,lower,higher] of [['MOSS_FIBER',1,8],['WISP_DUST',2,5],['BOAR_HIDE',4,7],['WOLF_PELT',7,14],['IRONWOOD_FANG',7,14],['THORN_SAP',8,10],['TROLL_HIDE',14,22]] as const){
 const levels=materialDropLevels(id);
 ok(levels.includes(lower)&&levels.includes(higher),id+' needs both original and higher-level monster drop sources');
}
const ironwoodWolf=MONSTERS.find(row=>row.id==='IRONWOOD_WOLF')!;
const forestTroll=MONSTERS.find(row=>row.id==='FOREST_TROLL')!;
ok(ironwoodWolf.drops.some(drop=>drop.itemId==='BOAR_HIDE'&&drop.chance<=.1),'Wolf boar-hide scavenging must remain a low-frequency secondary source');
ok(forestTroll.drops.some(drop=>drop.itemId==='IRONWOOD_FANG'&&drop.chance<=.06),'Forest Troll fang trophies must not replace focused wolf hunts');
for(const recipe of gearInTier('T3')){
 const materialIds=recipe.inputs.map(row=>row.itemId);
 ok(!materialIds.some(id=>['TROLL_HIDE','WOLF_PELT','THORN_SAP','CROWNWOOD_LOG','OATHGLASS_SOLVENT'].includes(id)),'T3 gear cannot depend on Asterfall farming');
 ok(materialIds.some(id=>['AMBERGLASS','ASTRAL_SCRIPT'].includes(id)),'T3 gear needs a Sunscar monster material');
 ok(materialIds.some(id=>['DUNEWOOD','SUNSCALE','SUNSTONE_ORE'].includes(id)),'T3 gear needs Sunscar gathering');
}
const sunscarTier3Binder=RECIPES.find(recipe=>recipe.id==='BREW_SUNSCAR_DUNE_BINDER')!;
const sunscarTier4Binder=RECIPES.find(recipe=>recipe.id==='BREW_GLASSBOUND_BINDER')!;
ok(!!sunscarTier3Binder&&sunscarTier3Binder.level<=20&&sunscarTier3Binder.inputs.every(row=>['DUNEWOOD','SUNSCALE','SUNSTONE_ORE'].includes(row.itemId)),'T3 binder must use only early Sunscar supplies');
ok(!!sunscarTier4Binder&&sunscarTier4Binder.level<=34&&sunscarTier4Binder.inputs.some(row=>row.itemId==='GLASSBOUND_CORE'),'T4 binder must require late-Sunscar Glassbound Core');
ok(RECIPES.some(row=>row.id==='REFINE_OATHGLASS_TO_DUNE_BINDER'&&row.output.itemId==='SUNSCAR_DUNE_BINDER')&&RECIPES.some(row=>row.id==='REFINE_OATHGLASS_TO_GLASSBOUND_BINDER'&&row.output.itemId==='GLASSBOUND_BINDER'),'Stored legacy Oathglass Solvent must remain useful through conversion');
const kingsRoadMonsters=MONSTERS.filter(row=>row.zone==="King's Road"&&!row.boss);
ok(kingsRoadMonsters.filter(monster=>monster.drops.some(drop=>['WOLF_PELT','THORN_SAP','TROLL_HIDE','IRONWOOD_FANG','IRONWOOD_LOG'].includes(drop.itemId))).length>=4,'King\'s Road retains four T2 material trophy sources while preparing for Fallen Knight');
ok(kingsRoadMonsters.every(monster=>monster.drops.every(drop=>drop.itemId!=='GLASSBOUND_CORE')),'T4 trophy must never drop before Sunscar');
const glassbound=MONSTERS.find(monster=>monster.id==='GLASSBOUND_SENTINEL')!;
ok(glassbound.level>=40&&glassbound.drops.some(drop=>drop.itemId==='GLASSBOUND_CORE'),'Late Sunscar must be the source of fourth-tier core');
ok(MONSTERS.every(monster=>!monster.drops.some(drop=>drop.itemId==='GLASSBOUND_CORE')||monster.zone==='Sunscar'&&monster.unlockLevel>=38),'Glassbound Core must have no early-region source');
for(const recipe of gearInTier('T4')){
 const inputs=recipe.inputs.map(row=>row.itemId);
 ok(inputs.includes('GLASSBOUND_CORE')&&inputs.includes('GLASSBOUND_BINDER'),'All T4 pieces must require late Sunscar monster trophies and binder');
 ok(!inputs.some(id=>['OATHSTONE_INGOT','OATHGLASS_SHARD','TORN_OATHCLOTH','ECHO_TOUCHED_PELT','ECHO_QUARTZ','OATHGLASS_SOLVENT'].includes(id)),'T4 gear cannot require King\'s Road / Old Mines materials');
}
// Characters can earn Sunscar supplies through hunts even before they train the local gathering skill to 26.
const sunscarScorpion=MONSTERS.find(monster=>monster.id==='SUNSCAR_SCORPION')!;
ok(sunscarScorpion.drops.some(drop=>drop.itemId==='DUNEWOOD'),'Sunscar entry hunts should offer an alternative to level-26 woodcutting');
ok(sunscarScorpion.drops.some(drop=>drop.itemId==='SUNSCALE'),'Sunscar entry hunts should offer an alternative to level-26 herbalism');
// Sunscar story leads resolve at the existing Rank-5 damage milestone, not 500 kills.
const leadState=(points:number)=>({character:{level:40,monsterMasteryPoints:{SUNSCAR_SCORPION:points}}}) as unknown as GameState;
const before=regionalStoryLeads('SUNSCAR',leadState(124));
const after=regionalStoryLeads('SUNSCAR',leadState(125));
ok(before[0].requiredMasteryRank===5&&before[0].status==='available','Sunscar first story lead remains active below 125 kills');
ok(after[0].status==='mastered'&&after[1].status==='available','Sunscar story advances on the Rank-5 milestone');
console.log(JSON.stringify({status:'PASS',directSources:direct.size,reachableItems:reachable.size,requiredRecipeInputs:requiredInputs.size,recipes:RECIPES.length,equipmentTiers:9},null,2));

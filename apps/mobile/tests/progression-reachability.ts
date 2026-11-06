import {ITEMS} from '../src/content/items';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
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
for(const recipe of gearInTier('T2'))ok(!recipe.inputs.some(row=>row.itemId==='BOAR_HIDE'),'T2 gear should not demand level-4 Boar Hide');
for(const recipe of gearInTier('T3')){
 const materialIds=recipe.inputs.map(row=>row.itemId);
 ok(!materialIds.some(id=>['TROLL_HIDE','WOLF_PELT','THORN_SAP','CROWNWOOD_LOG'].includes(id)),'T3 gear cannot depend on Ironwood monster farming');
 ok(materialIds.some(id=>['AMBERGLASS','ASTRAL_SCRIPT'].includes(id)),'T3 gear needs a Sunscar monster material');
 ok(materialIds.some(id=>['DUNEWOOD','SUNSCALE','SUNSTONE_ORE'].includes(id)),'T3 gear needs Sunscar gathering');
}
// Characters can earn Sunscar supplies through hunts even before they train the local gathering skill to 26.
const sunscarScorpion=MONSTERS.find(monster=>monster.id==='SUNSCAR_SCORPION')!;
ok(sunscarScorpion.drops.some(drop=>drop.itemId==='DUNEWOOD'),'Sunscar entry hunts should offer an alternative to level-26 woodcutting');
ok(sunscarScorpion.drops.some(drop=>drop.itemId==='SUNSCALE'),'Sunscar entry hunts should offer an alternative to level-26 herbalism');
console.log(JSON.stringify({status:'PASS',directSources:direct.size,reachableItems:reachable.size,requiredRecipeInputs:requiredInputs.size,recipes:RECIPES.length,equipmentTiers:9},null,2));

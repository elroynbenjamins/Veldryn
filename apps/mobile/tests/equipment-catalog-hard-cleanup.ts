import {ITEMS,itemDef} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {NOVICE_ITEMS} from '../src/content/novice-sets';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}

const gear=ITEMS.filter(item=>item.type==='gear');
const allowed=(id:string)=>id.startsWith('basic_')||id.startsWith('START_')||NOVICE_ITEMS.some(item=>item.id===id)||EQUIPMENT_ITEMS_V33.some(item=>item.id===id);

ok(gear.length>2500,'Canonical gear catalog should contain the full V33 catalog plus starter/novice gear');
ok(gear.every(item=>allowed(item.id)),'Every runtime gear item must be starter, novice or V33');
ok(EQUIPMENT_ITEMS_V33.every(item=>ITEMS.some(row=>row.id===item.id)),'Every V33 gear item must remain registered');
ok(NOVICE_ITEMS.every(item=>ITEMS.some(row=>row.id===item.id)),'Every novice gear item must remain registered');

const gearRecipes=RECIPES.filter(recipe=>itemDef(recipe.output.itemId).type==='gear');
ok(gearRecipes.length>=EQUIPMENT_ITEMS_V33.length,'All V33 gear must retain craft recipes');
ok(gearRecipes.every(recipe=>recipe.noviceSetId||recipe.v33SetId),'Every gear-producing recipe must be novice or V33');
ok(gearRecipes.every(recipe=>!/^SMITH_|^CRAFT_(STONEHEART|LASTWALL|MOURNCHAIN|QUICKPRAYER|TRACKER|BLOODRUSH|SPELLGLASS|NIGHTFANG|STORMCARVED|SUNSCORED_|RIMEBOUND_)/.test(recipe.id)),'Pre-V33 equipment recipe families must be absent');

for(const id of ['WORN_BLADE','MOSSWRAP_GLOVES','ASTER_IRON_CHEST','OATHSTONE_WARDPLATE','STONEHEART_CHEST','TRACKER_CHEST','BLOODRUSH_CHEST','SUNSCORED_TRACKER_CHEST','RIMEBOUND_STONEHEART_CHEST']){
  ok(!ITEMS.some(item=>item.id===id),id+' must be deleted from the runtime item catalog');
  ok(!RECIPES.some(recipe=>recipe.output.itemId===id),id+' must have no remaining recipe');
}

console.log('PASS: runtime equipment catalog contains only starter, novice and V33 gear');

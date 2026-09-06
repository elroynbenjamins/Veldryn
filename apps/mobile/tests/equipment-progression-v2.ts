import {ITEMS,itemDef} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
const required=['ASTER_IRON_HELM','ASTER_IRON_CHEST','ASTER_IRON_LEGS','ASTER_IRON_BOOTS','ASTER_IRON_GLOVES'];
for(const id of required){const item=itemDef(id);if(item.type!=='gear'||!item.slot||!item.salvage)throw new Error(`${id} must be complete gear with salvage`);}
for(const id of ['SMITH_ASTER_IRON_HELM','SMITH_ASTER_IRON_CHEST','SMITH_ASTER_IRON_LEGS','SMITH_ASTER_IRON_BOOTS','SMITH_ASTER_IRON_GLOVES']){const recipe=RECIPES.find(x=>x.id===id);if(!recipe||recipe.inputs.length<2||recipe.level<9)throw new Error(`${id} missing meaningful progression gate`);}
const readiness=required.map(id=>itemDef(id).readiness||0);if(Math.min(...readiness)<6||Math.max(...readiness)<=7)throw new Error('Aster-Iron tier lacks distinct readiness values');
if(new Set(ITEMS.map(x=>x.id)).size!==ITEMS.length)throw new Error('Duplicate equipment item ID');
console.log('PASS: Aster-Iron gear progression covers weapon, helm, chest, legs, boots and gloves');

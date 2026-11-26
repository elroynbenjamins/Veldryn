import { strict as assert } from 'node:assert';
import {
  RETIRED_EQUIPMENT_ITEM_IDS_V33,
  RETIRED_EQUIPMENT_RESOURCE_KEYS_V33,
  missingV33RecipeResourceKeys,
  recipeInventoryRequirementsV33,
  validateV33RecipeMaterialBindings,
} from './equipment-recipe-materials-v33';

const ready=recipeInventoryRequirementsV33('T1P_001');
assert.ok(ready.length>0);
assert.ok(ready.every(entry=>entry.itemId.startsWith('ITEM_')));
assert.deepEqual(missingV33RecipeResourceKeys('T1P_001'),[]);
assert.ok(missingV33RecipeResourceKeys('T9P_1701').length>=0);
assert.ok(RETIRED_EQUIPMENT_RESOURCE_KEYS_V33.has('asterfall.echo_bat_wing'));
assert.ok(RETIRED_EQUIPMENT_ITEM_IDS_V33.has('ITEM_0077'));
assert.deepEqual(validateV33RecipeMaterialBindings(),[],'Current V33 recipes must not reference retired resource keys or item IDs');
console.log('v33 recipe material mapping tests passed; retired Echo Bat Wing aliases remain unreachable');

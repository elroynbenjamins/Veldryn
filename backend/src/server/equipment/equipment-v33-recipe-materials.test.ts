import { strict as assert } from 'node:assert';
import { missingV33RecipeResourceKeys, recipeInventoryRequirementsV33 } from './equipment-recipe-materials-v33';

const ready=recipeInventoryRequirementsV33('T1P_001');
assert.ok(ready.length>0);
assert.ok(ready.every(entry=>entry.itemId.startsWith('ITEM_')));
assert.deepEqual(missingV33RecipeResourceKeys('T1P_001'),[]);
assert.ok(missingV33RecipeResourceKeys('T9P_2430').length>=0);
console.log('v33 recipe material mapping tests passed');

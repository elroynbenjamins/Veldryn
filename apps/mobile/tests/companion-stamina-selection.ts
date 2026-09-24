import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../src/core/game';
import {companionAutoStaminaSelection,companionStaminaSelectionTotal} from '../src/core/companion-stamina-selection';

let state=createCharacter(newGame(0),'IRONWARDEN','Stamina UI');
state.inventory.stacks=[{itemId:'COOKED_SILVERFIN',quantity:20},{itemId:'IRONWOOD_STEW',quantity:2}];
const auto=companionAutoStaminaSelection(state,100);
assert.equal(auto.ready,true);assert.ok(auto.total>=100);
assert.equal(auto.selection[0].itemId,'IRONWOOD_STEW','auto selection should use stronger food first');
assert.ok(companionStaminaSelectionTotal([{itemId:'COOKED_SILVERFIN',quantity:10},{itemId:'IRONWOOD_STEW',quantity:4}])>=100);
console.log('PASS mixed Companion Stamina food selection');

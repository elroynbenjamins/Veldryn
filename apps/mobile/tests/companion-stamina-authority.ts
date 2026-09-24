import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {executeCompanionActivity} from '../src/core/companion-runtime';

let state=createCharacter(newGame(0),'IRONWARDEN','Provision Test');
state.inventory.stacks=[{itemId:'COOKED_SILVERFIN',quantity:20}];
state.bank.stacks=[{itemId:'COOKED_SILVERFIN',quantity:10}];
let failed=false;
try{executeCompanionActivity(state,'companion_assignment_start',{id:'invalid',ids:['UNIT_001'],food:[{itemId:'COOKED_SILVERFIN',quantity:19}]},Date.now())}catch{failed=true}
assert.equal(failed,true);
assert.equal(state.inventory.stacks[0].quantity,20,'failed assignment must not consume food');
assert.equal(state.bank.stacks[0].quantity,10,'failed assignment must not consume bank food');
console.log('PASS failed Companion Expedition start preserves Stamina food');

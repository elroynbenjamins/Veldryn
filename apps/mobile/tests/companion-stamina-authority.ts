import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {unlockCombatCompanion} from '../src/core/combat-companions';
import {executeCompanionActivity,refreshCompanions} from '../src/core/companion-runtime';
import {companionExpeditionStaminaCost} from '../src/core/companion-provisions';
import {companionAutoStaminaSelection,companionStaminaSelectionHealingHp} from '../src/core/companion-stamina-selection';

const now=Date.UTC(2026,10,14),missionId='MISSION_SCOUT_2H',required=companionExpeditionStaminaCost(2);
assert.equal(required,50);
function fixture(){
 let state=createCharacter(newGame(now),'IRONWARDEN','Provision Test');
 state.quests=state.quests.map(q=>q.questId==='QST_005'?{...q,status:'claimed'}:q);
 state=unlockCombatCompanion(state,'UNIT_001',now);
 state.account.combatCompanionProgress!.UNIT_001.level=5;
 state.account.companionSanctuary!.expeditionPensLevel=1;
 state.character!.gold=10000;
 // Two inventory stacks plus banked food reproduce the old over-deduction path.
 state.inventory.stacks=[{itemId:'COOKED_SILVERFIN',quantity:8},{itemId:'COOKED_SILVERFIN',quantity:4},{itemId:'TRAVEL_RATION',quantity:2}];
 state.bank.stacks=[{itemId:'COOKED_SILVERFIN',quantity:8},{itemId:'TRAVEL_RATION',quantity:2}];
 return refreshCompanions(state,now);
}
const input=fixture();
const auto=companionAutoStaminaSelection(input,required);
assert.equal(auto.ready,true,'auto-selection must cover the expedition');
assert.equal(companionStaminaSelectionHealingHp(auto.selection),500,'food meets exactly 50 stamina (500 HP)');
assert.equal(auto.total,required,'UI must show the exact server stamina threshold');

const started=executeGameCommand(input,{type:'companion_assignment_start',args:{id:missionId,ids:['UNIT_001'],food:auto.selection}},now).state;
assert.ok(started.account.companionAssignments?.some(row=>row.missionId===missionId&&row.status==='active'),'a fully provisioned expedition must start');
assert.equal(started.inventory.stacks.filter(s=>s.itemId==='COOKED_SILVERFIN').reduce((n,s)=>n+s.quantity,0),0,'all selected inventory silverfin used exactly once');
assert.equal(started.bank.stacks.filter(s=>s.itemId==='COOKED_SILVERFIN').reduce((n,s)=>n+s.quantity,0),0,'bank silverfin used only for the remainder');
assert.equal(started.inventory.stacks.filter(s=>s.itemId==='TRAVEL_RATION').reduce((n,s)=>n+s.quantity,0),0);
assert.equal(started.bank.stacks.filter(s=>s.itemId==='TRAVEL_RATION').reduce((n,s)=>n+s.quantity,0),0);
assert.equal(started.account.longTermMetrics?.['companions.expedition.stamina_supplied'],50);

const insufficient=fixture();
let failure='';
try{
 executeCompanionActivity(insufficient,'companion_assignment_start',{id:missionId,ids:['UNIT_001'],food:[{itemId:'COOKED_SILVERFIN',quantity:20},{itemId:'TRAVEL_RATION',quantity:3}]},now);
}catch(error){failure=error instanceof Error?error.message:String(error);}
assert.equal(failure,'companion_stamina_required','less than 500 HP must still be rejected');
assert.equal(insufficient.inventory.stacks[0].quantity,8,'failed start must preserve inventory');
assert.equal(insufficient.bank.stacks[0].quantity,8,'failed start must preserve bank');

const duplicated=fixture();
failure='';
try{
 executeCompanionActivity(duplicated,'companion_assignment_start',{id:missionId,ids:['UNIT_001'],food:[{itemId:'COOKED_SILVERFIN',quantity:20},{itemId:'COOKED_SILVERFIN',quantity:20}]},now);
}catch(error){failure=error instanceof Error?error.message:String(error);}
assert.equal(failure,'companion_food_missing','repeated IDs cannot spend the same food twice');
assert.equal(duplicated.inventory.stacks[0].quantity,8);
assert.equal(duplicated.bank.stacks[0].quantity,8);

console.log('PASS Companion Expedition exact Stamina, mixed inventory/bank dispatch and failure atomicity');

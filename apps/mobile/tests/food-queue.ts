import {assert} from './test-assert';
import {claimActivity,effectiveStats,previewActivityReward} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {normalizeSave} from '../src/core/save-normalization';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {MAX_FOOD_BACKUPS,autoEatFoodOrder,normalizeFoodQueueIds} from '../src/core/food-queue';

const T=Date.UTC(2026,10,13,12),H=3600000;
const initialFood=REGIONAL_COMBAT_FIXTURES[0].foodId,backupFood='IRONWOOD_STEW';
const base=regionalCombatFixture(REGIONAL_COMBAT_FIXTURES[0],'prepared');
base.activity={kind:'combat',targetId:REGIONAL_COMBAT_FIXTURES[0].monsterId,combatTacticId:'balanced',startedAtMs:T,lastClaimAtMs:T};
base.character!.currentHp=effectiveStats(base).hp;
base.inventory.stacks=[{itemId:initialFood,quantity:1},{itemId:backupFood,quantity:1000}];
base.character!.equippedFoodId=initialFood;
const set=executeGameCommand(base,{type:'food_queue',args:{ids:[backupFood]}},T).state;
assert.deepEqual(autoEatFoodOrder(set.character),[initialFood,backupFood]);
assert.deepEqual(normalizeSave(structuredClone(set)).character?.foodQueueIds,[backupFood],'queue persists through save normalization');

const noBackup=structuredClone(set);
noBackup.character!.foodQueueIds=[];
const depleted=previewActivityReward(noBackup,T+8*H);
assert.equal(depleted.foodConsumed,1,'single selected food runs out normally');
assert.ok(depleted.stoppedReason,'one portion is not sufficient for an eight-hour hunt');
const preview=previewActivityReward(set,T+8*H);
const spent=preview.foodConsumedById??[];
assert.equal(spent.find(row=>row.itemId===initialFood)?.quantity,1,'selected food used before backup');
assert.ok((spent.find(row=>row.itemId===backupFood)?.quantity??0)>0,'backup takes over automatically');
assert.equal(spent.reduce((sum,row)=>sum+row.quantity,0),preview.foodConsumed,'itemized consumption reconciles to total');
assert.ok(!preview.stoppedReason,'carried backup food sustains the ordinary hunt');

const settled=claimActivity(set,T+8*H);
assert.equal(settled.state.character?.equippedFoodId,backupFood,'selected food advances to stocked backup after claim');
assert.deepEqual(settled.state.character?.foodQueueIds,[],'spent primary and promoted backup leave no extra backups');
assert.equal(settled.state.inventory.stacks.find(row=>row.itemId===initialFood)?.quantity??0,0,'old food is fully consumed');
assert.equal(settled.state.inventory.stacks.find(row=>row.itemId===backupFood)?.quantity,1000-(spent.find(row=>row.itemId===backupFood)?.quantity??0),'backup is only charged for actual uses');
assert.equal(claimActivity(settled.state,T+8*H).reward.foodConsumed??0,0,'repeat claim cannot consume duplicate food');

const switched=executeGameCommand(set,{type:'food',args:{id:backupFood}},T).state;
assert.equal(switched.character?.equippedFoodId,backupFood,'manual select overrides selected food');
assert.deepEqual(switched.character?.foodQueueIds,[],'manual select removes selected item from backups');

function rejects(ids:unknown){
 let rejected=false;
 try{executeGameCommand(base,{type:'food_queue',args:{ids}},T);}catch{rejected=true;}
 assert.ok(rejected,'invalid or unavailable backup queue must fail');
}
rejects([initialFood]); // duplicate primary
rejects([backupFood,backupFood]); // duplicate backup
rejects(['IRON_ORE']); // not food
rejects([backupFood,backupFood,backupFood,backupFood,backupFood]); // >4
rejects('IRONWOOD_STEW'); // not an array
const bankOnly=structuredClone(base);
bankOnly.inventory.stacks=bankOnly.inventory.stacks.filter(row=>row.itemId!==backupFood);
let bankRejected=false;
try{executeGameCommand(bankOnly,{type:'food_queue',args:{ids:[backupFood]}},T);}catch{bankRejected=true;}
assert.ok(bankRejected,'queue cannot silently consume or reserve Bank food');
assert.equal(MAX_FOOD_BACKUPS,4);
assert.deepEqual(normalizeFoodQueueIds(undefined,initialFood),[],'older saved characters need no migration');

console.log('PASS food backup queue: priorities, offline consumption, save safety, selection and idempotence');

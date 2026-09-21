import {createCharacter,newGame} from '../src/core/game';
import {gearEnhancement,gemEffectCapDescription,gemExtractionFee,replaceGem,socketGem,unsocketGem} from '../src/core/equipment-enhancement';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}
function qty(stacks:Array<{itemId:string;quantity:number}>,id:string){return stacks.filter(row=>row.itemId===id).reduce((sum,row)=>sum+row.quantity,0)}

let state=createCharacter(newGame(1),'IRONWARDEN','Gemsmith','male');
state={...state,character:{...state.character!,gold:10000,equipment:{...state.character!.equipment,ring:'STONEHEART_RING'}},inventory:{stacks:[{itemId:'WARD_SHARD',quantity:1},{itemId:'WARDHEART_GEM',quantity:1},{itemId:'SWIFT_SIGIL',quantity:1},{itemId:'BULWARK_SIGIL',quantity:1}],capacity:30}};
state=socketGem(state,'STONEHEART_RING','WARD_SHARD');
const goldBeforeReplace=state.character!.gold;
state=replaceGem(state,'STONEHEART_RING','WARDHEART_GEM',1000);
equal(gearEnhancement(state,'STONEHEART_RING').statGemId,'WARDHEART_GEM','replacement should atomically install the new Stat Gem');
equal(state.character!.gold,goldBeforeReplace-gemExtractionFee('WARD_SHARD'),'replacement should charge only safe extraction for the old gem');
ok(qty(state.inventory.stacks,'WARD_SHARD')===1,'replacement should return the previous gem instead of destroying it');

state=socketGem(state,'STONEHEART_RING','SWIFT_SIGIL');
const goldBeforeEffectReplace=state.character!.gold;
state=replaceGem(state,'STONEHEART_RING','BULWARK_SIGIL',2000);
equal(gearEnhancement(state,'STONEHEART_RING').effectGemId,'BULWARK_SIGIL','replacement should preserve Stat/Effect socket identity');
equal(state.character!.gold,goldBeforeEffectReplace-gemExtractionFee('SWIFT_SIGIL'),'Effect Gem replacement should use the old gem extraction tier');
ok(qty(state.inventory.stacks,'SWIFT_SIGIL')===1,'Effect Gem replacement should safely recover the old Effect Gem');

let bankFallback=createCharacter(newGame(1),'IRONWARDEN','Banked','male');
bankFallback={...bankFallback,character:{...bankFallback.character!,gold:5000,equipment:{...bankFallback.character!.equipment,ring:'STONEHEART_RING'}},inventory:{stacks:[{itemId:'WARD_SHARD',quantity:1}],capacity:0},bank:{stacks:[],capacity:120}};
bankFallback=socketGem(bankFallback,'STONEHEART_RING','WARD_SHARD');
bankFallback=unsocketGem(bankFallback,'STONEHEART_RING',0,3000);
ok(qty(bankFallback.bank.stacks,'WARD_SHARD')===1,'safe extraction should fall back to Bank when Inventory has no room');

let overflowFallback=createCharacter(newGame(1),'IRONWARDEN','Overflow','male');
overflowFallback={...overflowFallback,character:{...overflowFallback.character!,gold:5000,equipment:{...overflowFallback.character!.equipment,ring:'STONEHEART_RING'}},inventory:{stacks:[{itemId:'WARD_SHARD',quantity:1}],capacity:0},bank:{stacks:[],capacity:0},overflow:{stacks:[],expiresAtMs:null}};
overflowFallback=socketGem(overflowFallback,'STONEHEART_RING','WARD_SHARD');
overflowFallback=unsocketGem(overflowFallback,'STONEHEART_RING',0,4000);
ok(qty(overflowFallback.overflow.stacks,'WARD_SHARD')===1,'safe extraction should fall back to Overflow when both Inventory and Bank are full');
equal(overflowFallback.overflow.expiresAtMs,4000+72*60*60*1000,'gem recovery Overflow should receive the standard protection window');

equal(gemExtractionFee('WARD_SHARD'),500,'Tier 1 safe extraction fee');
equal(gemExtractionFee('WARDHEART_GEM'),1000,'Tier 2 safe extraction fee');
ok(gemEffectCapDescription('combat_speed').includes('10%'),'combat speed cap must remain visible to the UI');
ok(gemEffectCapDescription('boss_power').includes('15%'),'boss-power cap must remain visible to the UI');

console.log('PASS Stat/Effect Gem replacement and extraction are safe, typed and storage-aware');

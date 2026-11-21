import {strict as assert} from 'node:assert';
import {newGame,createCharacter,stackItems,depositToBank,withdrawFromBank,sellBankItem,sellItem} from '../src/core/game';
import {bulkSelectionSummary} from '../src/core/inventory-bulk';
import {inventoryWithSalvageRewards} from '../src/core/equipment-salvage';

let state=createCharacter(newGame(0),'IRONWARDEN');
const dust='TEMPERING_DUST';
const bound={itemId:dust,quantity:10,bound:true as const};
state={...state,bank:{...state.bank,stacks:stackItems(state.bank.stacks,[bound,{itemId:dust,quantity:5}])}};
assert.equal(state.bank.stacks.filter(row=>row.itemId===dust).length,2,
 'same item ID with different provenance must remain separate physical stacks');
assert.equal(state.bank.stacks.find(row=>row.itemId===dust&&row.bound)?.quantity,10);
assert.equal(state.bank.stacks.find(row=>row.itemId===dust&&!row.bound)?.quantity,5);

let sold=sellBankItem(state,dust,2);
assert.equal(sold.bank.stacks.find(row=>row.itemId===dust&&row.bound)?.quantity,10,
 'selling freely earned dust must never spend account-bound stock');
assert.equal(sold.bank.stacks.find(row=>row.itemId===dust&&!row.bound)?.quantity,3);
assert.throws(()=>sellBankItem(sold,dust,4),/Account-bound Dungeon Shop materials cannot be sold/);
sold=withdrawFromBank(sold,dust,13);
assert.equal(sold.inventory.stacks.reduce((sum,row)=>sum+(row.itemId===dust&&row.bound?row.quantity:0),0),10,
 'withdrawal must retain original bound quantity and flag');
assert.equal(sold.inventory.stacks.reduce((sum,row)=>sum+(row.itemId===dust&&!row.bound?row.quantity:0),0),3);
assert.throws(()=>sellItem(sold,dust,4),/Account-bound Dungeon Shop materials cannot be sold/);
sold=depositToBank(sold,dust,13);
assert.equal(sold.bank.stacks.find(row=>row.itemId===dust&&row.bound)?.quantity,10,
 'Bank deposit must never strip the bound flag');
assert.equal(sold.bank.stacks.find(row=>row.itemId===dust&&!row.bound)?.quantity,3);

const onlyBound={...state,bank:{...state.bank,stacks:[bound]}};
assert.equal(bulkSelectionSummary(onlyBound,[dust],'bank').sellableUnitCount,0,
 'bulk selling must never offer account-bound materials');
assert.equal(bulkSelectionSummary(onlyBound,[dust],'bank').transferableUnitCount,10,
 'account-bound materials can move between own Inventory and Bank');

const salvaged=inventoryWithSalvageRewards({stacks:[bound],capacity:5},[{itemId:dust,quantity:2}],5);
assert.equal(salvaged.stacks.filter(row=>row.itemId===dust).length,2,
 'salvage output must not be falsely relabeled account-bound');
assert.equal(salvaged.stacks.find(row=>row.itemId===dust&&row.bound)?.quantity,10);
assert.equal(salvaged.stacks.find(row=>row.itemId===dust&&!row.bound)?.quantity,2);

console.log('PASS Dungeon Shop account-bound material stacking, own-bank transfer, sell protection and salvage provenance');

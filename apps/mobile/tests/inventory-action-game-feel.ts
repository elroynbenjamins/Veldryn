import {executeGameCommand} from '../src/core/game-commands';
import {newGame} from '../src/core/game';
import {ITEMS} from '../src/content/items';
import {inventoryFeedbackIntent,resolveInventoryActionFeedback} from '../src/core/inventory-action-feedback';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

let state=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'Inventory Hero',body:'male'}},1,{characterId:'11111111-1111-4111-8111-111111111111'}).state;
state={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks.filter(row=>row.itemId!=='COPPER_ORE'),{itemId:'COPPER_ORE',quantity:10}]},bank:{...state.bank,stacks:state.bank.stacks.filter(row=>row.itemId!=='COPPER_ORE')}};

const depositIntent=inventoryFeedbackIntent(state,{kind:'deposit',itemId:'COPPER_ORE',quantity:5});
const deposited={...state,inventory:{...state.inventory,stacks:state.inventory.stacks.map(row=>row.itemId==='COPPER_ORE'?{...row,quantity:5}:row)},bank:{...state.bank,stacks:[...state.bank.stacks,{itemId:'COPPER_ORE',quantity:5}]}};
equal(resolveInventoryActionFeedback(depositIntent,state),null,'feedback must wait for committed deposit state');
ok(resolveInventoryActionFeedback(depositIntent,deposited)?.message.includes('Deposited 5×'),'committed deposit must report moved quantity');

const withdrawIntent=inventoryFeedbackIntent(deposited,{kind:'withdraw',itemId:'COPPER_ORE',quantity:2});
const withdrawn={...deposited,inventory:{...deposited.inventory,stacks:deposited.inventory.stacks.map(row=>row.itemId==='COPPER_ORE'?{...row,quantity:7}:row)},bank:{...deposited.bank,stacks:deposited.bank.stacks.map(row=>row.itemId==='COPPER_ORE'?{...row,quantity:3}:row)}};
ok(resolveInventoryActionFeedback(withdrawIntent,withdrawn)?.message.includes('Withdrew 2×'),'committed withdrawal must report moved quantity');

const copperValue=ITEMS.find(item=>item.id==='COPPER_ORE')?.value??0;
const sellIntent=inventoryFeedbackIntent(withdrawn,{kind:'sell',itemId:'COPPER_ORE',quantity:1});
// Simulate unrelated activity Gold settling in the same authoritative command; the sale message must stay scoped to the item value.
const sold={...withdrawn,inventory:{...withdrawn.inventory,stacks:withdrawn.inventory.stacks.map(row=>row.itemId==='COPPER_ORE'?{...row,quantity:6}:row)},character:{...withdrawn.character!,gold:withdrawn.character!.gold+copperValue+17}};
ok(resolveInventoryActionFeedback(sellIntent,sold)?.message.includes('+'+copperValue+' Gold'),'sale feedback must report sale value without folding in unrelated activity settlement');

const salvageItem=ITEMS.find(item=>item.type==='gear'&&item.salvage);if(!salvageItem?.salvage)throw new Error('salvageable gear fixture missing');
const salvageBase={...sold,inventory:{...sold.inventory,stacks:[...sold.inventory.stacks,{itemId:salvageItem.id,quantity:1}]},bank:{...sold.bank,stacks:sold.bank.stacks.filter(row=>row.itemId!==salvageItem.salvage!.itemId)}};
const salvageIntent=inventoryFeedbackIntent(salvageBase,{kind:'salvage',itemId:salvageItem.id,quantity:1});
const salvaged={...salvageBase,inventory:{...salvageBase.inventory,stacks:[...salvageBase.inventory.stacks.filter(row=>row.itemId!==salvageItem.id),{itemId:salvageItem.salvage.itemId,quantity:salvageItem.salvage.quantity}]}};
const salvageFeedback=resolveInventoryActionFeedback(salvageIntent,salvaged);
ok(salvageFeedback?.message.includes('Salvaged'),'salvage feedback must wait for and report the committed destruction');
ok(salvageFeedback?.message.includes(salvageItem.salvage.quantity+' '+ITEMS.find(item=>item.id===salvageItem.salvage!.itemId)!.name),'salvage feedback must show the recovered material');

const bulkIntent=inventoryFeedbackIntent(state,{kind:'bulk_transfer',direction:'deposit',stacks:1,units:5});
ok(resolveInventoryActionFeedback(bulkIntent,deposited)?.message.includes('Bulk deposit complete'),'bulk transfers must receive compact committed feedback');

const inventory=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8');
ok(inventory.includes('runInventory=(request:InventoryFeedbackRequest'),'inventory actions must stage feedback intent before waiting for committed state');
ok(inventory.includes('resolveInventoryActionFeedback(inventoryIntent,state)'),'inventory success feedback must resolve from committed state rather than the tap');
ok(inventory.includes("kind:'bulk_transfer'")&&inventory.includes("kind:'bulk_sell'")&&inventory.includes("kind:'bulk_salvage'"),'bulk inventory actions must use the same feedback path');
ok(inventory.includes('ActionFeedback message={inventoryFeedback.message}'),'routine inventory results should use compact shared action feedback');
ok(inventory.includes('setTimeout(()=>setInventoryFeedback(null),4500)'),'routine inventory feedback must auto-clear instead of blocking management');
ok(inventory.includes('setTimeout(()=>setInventoryIntent(null),12000)'),'failed or abandoned pending result intents must expire safely');

console.log('PASS routine inventory actions report committed results without extra blocking dialogs');

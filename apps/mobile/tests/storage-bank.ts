import {newGame,createCharacter,depositToBank,withdrawFromBank,craftRecipe} from '../src/core/game';
let s=createCharacter(newGame(0),'IRONWARDEN');
if(s.inventory.capacity!==30) throw new Error('inventory should start 30');
if(s.bank.capacity!==120) throw new Error('bank should start 120');
s=depositToBank(s,'TRAVEL_RATION',5);
if(s.bank.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity!==5) throw new Error('deposit failed');
s=withdrawFromBank(s,'TRAVEL_RATION',2);
if(s.bank.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity!==3) throw new Error('withdraw failed');
console.log(JSON.stringify({status:'PASS',inventoryCapacity:s.inventory.capacity,bankCapacity:s.bank.capacity,inventoryRations:s.inventory.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity,bankRations:s.bank.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity},null,2));

import {newGame,createCharacter,depositAllMaterials,depositToBank,storageUpgradePreview,upgradeStorage,withdrawFromBank} from '../src/core/game';
let s=createCharacter(newGame(0),'IRONWARDEN');
if(s.inventory.capacity!==30) throw new Error('inventory should start 30');
if(s.bank.capacity!==120) throw new Error('bank should start 120');
s=depositToBank(s,'TRAVEL_RATION',5);
if(s.bank.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity!==5) throw new Error('deposit failed');
s=withdrawFromBank(s,'TRAVEL_RATION',2);
if(s.bank.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity!==3) throw new Error('withdraw failed');
s={...s,inventory:{...s.inventory,stacks:[...s.inventory.stacks,{itemId:'COPPER_ORE',quantity:20},{itemId:'GREENWOOD_LOG',quantity:15}]},character:{...s.character!,gold:5000}};
s=depositAllMaterials(s);
if(s.inventory.stacks.some(x=>x.itemId==='COPPER_ORE'||x.itemId==='GREENWOOD_LOG')||s.bank.stacks.find(x=>x.itemId==='COPPER_ORE')?.quantity!==20)throw new Error('quick material deposit failed');
if(storageUpgradePreview(s,'inventory')?.capacity!==40||storageUpgradePreview(s,'bank')?.capacity!==160)throw new Error('starting storage upgrade tiers missing');
const gold=s.character!.gold;s=upgradeStorage(s,'inventory');
if(s.inventory.capacity!==40||s.character!.gold!==gold-500)throw new Error('inventory upgrade must charge once and persist capacity');

const blockedDeposit={...s,bank:{stacks:[],capacity:0}};
const blockedDepositBefore=JSON.stringify(blockedDeposit);
let depositRejected=false;try{depositToBank(blockedDeposit,'TRAVEL_RATION',1)}catch(error){depositRejected=error instanceof Error&&error.message==='Bank is full'}
if(!depositRejected||JSON.stringify(blockedDeposit)!==blockedDepositBefore)throw new Error('failed deposit must be atomic');

const bankRations=s.bank.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity??0;
const blockedWithdraw={...s,inventory:{stacks:[],capacity:0},bank:{...s.bank,stacks:[{itemId:'TRAVEL_RATION',quantity:bankRations||1}]}};
const blockedWithdrawBefore=JSON.stringify(blockedWithdraw);
let withdrawRejected=false;try{withdrawFromBank(blockedWithdraw,'TRAVEL_RATION',1)}catch(error){withdrawRejected=error instanceof Error&&error.message==='Inventory is full'}
if(!withdrawRejected||JSON.stringify(blockedWithdraw)!==blockedWithdrawBefore)throw new Error('failed withdrawal must be atomic');

const poor={...s,character:{...s.character!,gold:0}};
const poorBefore=JSON.stringify(poor);
let upgradeRejected=false;try{upgradeStorage(poor,'bank')}catch(error){upgradeRejected=error instanceof Error&&error.message.includes('Requires')}
if(!upgradeRejected||JSON.stringify(poor)!==poorBefore)throw new Error('failed storage upgrade must not mutate state');

console.log(JSON.stringify({status:'PASS',inventoryCapacity:s.inventory.capacity,bankCapacity:s.bank.capacity,inventoryRations:s.inventory.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity,bankRations:s.bank.stacks.find(x=>x.itemId==='TRAVEL_RATION')?.quantity},null,2));

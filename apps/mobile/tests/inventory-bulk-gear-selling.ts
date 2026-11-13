import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {createCharacter,newGame} from '../src/core/game';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {bulkSelectionSummary,bulkSellSelected,inventoryBulkSelectionId} from '../src/core/inventory-bulk';
import {executeGameCommand} from '../src/core/game-commands';
import type {GameState,ItemStack} from '../src/core/types';

function check(value:unknown,why:string){if(!value)throw new Error(why)}
const gearId=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='BASTION'&&row.v33EquipmentTier==='T1')!.output.itemId;
const original=createCharacter(newGame(0),'BASTION','Bulk Sell Tester');
const safe=draftCraftedGearInstance({itemId:gearId,ownerCharacterId:original.character!.id,jobId:'bulk-safe',createdAtMs:100,roll:.02});
const locked={...draftCraftedGearInstance({itemId:gearId,ownerCharacterId:original.character!.id,jobId:'bulk-locked',createdAtMs:101,roll:.03}),locked:true};
const legacy:ItemStack={itemId:gearId,quantity:2};
const safeStack:ItemStack={itemId:gearId,quantity:1,instanceId:safe.id};
const lockedStack:ItemStack={itemId:gearId,quantity:1,instanceId:locked.id};
const state:GameState={
 ...original,character:{...original.character!,gold:500},
 inventory:{...original.inventory,stacks:[safeStack,lockedStack,legacy]},
 account:{...original.account,craftedGearInstances:[safe,locked]},
};
const ids=[inventoryBulkSelectionId(safeStack),inventoryBulkSelectionId(lockedStack),inventoryBulkSelectionId(legacy)];
check(new Set(ids).size===3,'Two unique copies and a legacy stack must have different selection IDs');
const summary=bulkSelectionSummary(state,ids,'inventory');
check(summary.selectedStackCount===3&&summary.selectedUnitCount===4,'Selecting gear must count exact copies and legacy units');
check(summary.sellableStackCount===2&&summary.sellProtectedCount===1,'Locked unique copy excluded, never silently disposed');
check(summary.sellGold===itemDef(gearId).value*3,'Sale preview must sum exact copy and all legacy units');
check(summary.sellableIds.includes(ids[0])&&!summary.sellableIds.includes(ids[1]),'Only eligible unique copy enters sale');
const settled=executeGameCommand(state,{type:'bulk_sell',args:{ids:summary.sellableIds}},200).state;
check(settled.inventory.stacks.length===1&&settled.inventory.stacks[0].instanceId===locked.id,
 'Batch sale removes only selected eligible inventory equipment');
check(settled.character!.gold===state.character!.gold+summary.sellGold,'Preview and authoritative character Gold must agree');
check(settled.account.craftedGearInstances?.length===1&&settled.account.craftedGearInstances[0].id===locked.id,
 'Bulk sale must never remove the locked forged record');
check(state.inventory.stacks.length===3&&state.character!.gold===500,'Previous snapshot must remain unchanged');
const salvageTime=Date.UTC(2026,8,5,12);
const salvageIds=bulkSelectionSummary(state,ids,'inventory').salvageableIds;
check(salvageIds.includes(ids[0])&&salvageIds.includes(ids[2])&&!salvageIds.includes(ids[1]),'Bulk salvage must respect exact copy locks');
const salvaged=executeGameCommand(state,{type:'bulk_salvage',args:{ids:salvageIds}},salvageTime).state;
check(salvaged.account.seasonalContractProgress?.daily?.counts.salvage===3,'One unique copy and two legacy units must credit exactly three salvages');
check(!state.account.seasonalContractProgress?.daily?.counts.salvage,'Bulk salvage must not mutate old account progress');

let rejected=false;
try{bulkSellSelected(state,[ids[1]])}catch{rejected=true}
check(rejected,'Locked copy alone cannot be sold');
rejected=false;
try{bulkSellSelected(settled,[ids[0]])}catch{rejected=true}
check(rejected,'Stale exact copy cannot be sold again');
const selectedBank={...state,inventory:{...state.inventory,stacks:[lockedStack,legacy]},bank:{...state.bank,stacks:[safeStack]}};
rejected=false;
try{bulkSellSelected(selectedBank,[ids[0]])}catch{rejected=true}
check(rejected,'Inventory bulk sale cannot target Bank gear');
console.log('PASS: exact forged copies and legacy gear bulk sell with consistent Gold and protected locks');

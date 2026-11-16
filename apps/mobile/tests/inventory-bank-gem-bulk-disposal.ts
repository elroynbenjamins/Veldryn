import {createCharacter,newGame} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {bulkSelectionSummary} from '../src/core/inventory-bulk';
import {gemPouchBulkSummary} from '../src/core/gem-pouch-bulk';
import {gemPouch} from '../src/core/gem-pouch';
import {equipmentSalvageReward} from '../src/core/equipment-salvage';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function fails(fn:()=>unknown,message:string){let failed=false;try{fn()}catch{failed=true}ok(failed,message)}
const base=createCharacter(newGame(0),'IRONWARDEN','Disposal QA');
const gearId=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='IRONWARDEN'&&row.v33EquipmentTier==='T1')!.output.itemId;
const reward=equipmentSalvageReward(gearId)!;
ok(!!reward,'Crafted T1 equipment must yield salvage materials');
const start={...base,character:{...base.character!,gold:800},bank:{...base.bank,gold:75,stacks:[
  {itemId:'COPPER_ORE',quantity:12},{itemId:gearId,quantity:2},
]}};
const copperPrice=itemDef('COPPER_ORE').value;
const singleSale=executeGameCommand(start,{type:'bank_sell',args:{id:'COPPER_ORE',quantity:4}},1000).state;
ok(singleSale.bank.gold===75+copperPrice*4&&singleSale.character!.gold===800,'Bank sale credits only Bank Gold');
const startingDust=singleSale.inventory.stacks.find(row=>row.itemId===reward.itemId)?.quantity??0;
const singleSalvage=executeGameCommand(singleSale,{type:'bank_salvage',args:{id:gearId}},1001).state;
ok(singleSalvage.bank.stacks.find(row=>row.itemId===gearId)?.quantity===1,'Bank single salvage removes one gear');
ok((singleSalvage.inventory.stacks.find(row=>row.itemId===reward.itemId)?.quantity??0)===startingDust+reward.quantity,'Bank salvage material goes to active Inventory');
const bankSaleSummary=bulkSelectionSummary(singleSalvage,['COPPER_ORE'],'bank');
ok(bankSaleSummary.sellableUnitCount===8,'Bank bulk select counts only its own stacks');
const allBankSold=executeGameCommand(singleSalvage,{type:'bulk_sell',args:{location:'bank',ids:['COPPER_ORE']}},1002).state;
ok(!allBankSold.bank.stacks.some(row=>row.itemId==='COPPER_ORE'),'Bank bulk sale removes requested bank material');
ok((allBankSold.bank.gold??0)===(singleSalvage.bank.gold??0)+copperPrice*8&&allBankSold.character!.gold===800,'Bank bulk proceeds must never enter carried Gold');
const allBankSalvaged=executeGameCommand(allBankSold,{type:'bulk_salvage',args:{location:'bank',ids:[gearId]}},1003).state;
ok(!allBankSalvaged.bank.stacks.some(row=>row.itemId===gearId),'Bank bulk salvage removes requested gear');
ok((allBankSalvaged.inventory.stacks.find(row=>row.itemId===reward.itemId)?.quantity??0)===startingDust+2*reward.quantity,'Bank bulk salvage grants each reward once');
const protectedBank={...start,settings:{...start.settings,favoriteItemIds:[gearId]}};
ok(bulkSelectionSummary(protectedBank,[gearId],'bank').salvageableIds.length===0,'Favorite Bank gear is excluded');
fails(()=>executeGameCommand(protectedBank,{type:'bank_salvage',args:{id:gearId}},1004),'Favorite Bank gear is server-protected');
fails(()=>executeGameCommand(protectedBank,{type:'bulk_salvage',args:{location:'bank',ids:[gearId]}},1004),'Protected Bank bulk disposal must fail');

const copy=draftCraftedGearInstance({itemId:gearId,ownerCharacterId:start.character!.id,jobId:'bank-exact-copy',createdAtMs:50,roll:.2});
const exact={...start,bank:{...start.bank,stacks:[{itemId:gearId,quantity:1,instanceId:copy.id}]},account:{...start.account,craftedGearInstances:[copy]}};
const exactId='copy:'+copy.id;
ok(bulkSelectionSummary(exact,[exactId],'bank').sellableIds.includes(exactId),'Bank exact forged copy must be individually selectable');
const soldCopy=executeGameCommand(exact,{type:'bulk_sell',args:{location:'bank',ids:[exactId]}},1005).state;
ok(soldCopy.bank.gold===start.bank.gold+itemDef(gearId).value,'Forged Bank copy sale credits Bank Gold');
ok(!soldCopy.account.craftedGearInstances?.some(record=>record.id===copy.id),'Sold forged copy must remove exact ownership record');
fails(()=>executeGameCommand(soldCopy,{type:'bulk_sell',args:{location:'bank',ids:[exactId]}},1006),'Stale forged-copy selection must not sell a different copy');

const vitality='gem:stat_vitality:g1',might='gem:stat_might:g1';
const gems={...base,character:{...base.character!,gold:800},account:{...base.account,gemPouch:{capacity:30,stacks:[
  {itemId:vitality,quantity:2},{itemId:might,quantity:3},
]}}};
const gemSummary=gemPouchBulkSummary(gems,[vitality,might]);
ok(gemSummary.sellableIds.length===2&&gemSummary.dismantleIds.length===2,'Pouch selection previews sale and dismantle candidates');
const gemSold=executeGameCommand(gems,{type:'gem_pouch_bulk_sell',args:{ids:[vitality]}},1007).state;
ok(!gemPouch(gemSold).stacks.some(row=>row.itemId===vitality),'Pouch bulk sale removes entire selected stack only');
ok(gemSold.character!.gold===800+2*itemDef(vitality).value,'Pouch bulk sale credits correct carried Gold');
const dustBefore=gemSold.inventory.stacks.find(row=>row.itemId==='GEM_DUST')?.quantity??0;
const gemDismantled=executeGameCommand(gemSold,{type:'gem_pouch_bulk_dismantle',args:{ids:[might]}},1008).state;
ok(!gemPouch(gemDismantled).stacks.some(row=>row.itemId===might),'Pouch bulk dismantle consumes selected gem stack');
ok((gemDismantled.inventory.stacks.find(row=>row.itemId==='GEM_DUST')?.quantity??0)===dustBefore+3,'Dismantled G1 gems grant one Dust each');
const protectedGem={...gems,settings:{...gems.settings,lockedItemIds:[might]}};
ok(!gemPouchBulkSummary(protectedGem,[might]).dismantleIds.length,'Locked pouch gems excluded from candidate list');
fails(()=>executeGameCommand(protectedGem,{type:'gem_pouch_bulk_dismantle',args:{ids:[might]}},1009),'Locked gem batch command rejected');
fails(()=>executeGameCommand(protectedGem,{type:'gem_dismantle',args:{gemId:might,quantity:1}},1009),'Locked gem direct dismantle blocked server-side');
fails(()=>executeGameCommand(gemSold,{type:'gem_pouch_bulk_sell',args:{ids:[vitality]}},1010),'Stale gem sale must be rejected');
console.log('PASS: Bank sale/salvage, Bank Gold routing, exact forged copy protection and Gem Pouch bulk disposal');

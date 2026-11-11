import {strict as assert} from 'node:assert';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {createCharacter,newGame} from '../src/core/game';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {auditCraftedGearOwnership,disposeCraftedGearInstance} from '../src/core/crafted-gear-ownership';
import {equipmentSalvageReward,equipmentSalvageRewards} from '../src/core/equipment-salvage';
import {equipmentPouchSalvageCandidates,salvageEquipmentPouchSelected} from '../src/core/equipment-pouch-selling';
import {bulkSalvageSelected} from '../src/core/inventory-bulk';
import {itemRarity} from '../src/core/item-rarity';
import type {CraftedGearInstance,GameState,ItemStack} from '../src/core/types';

const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.output.itemId==='T1P_001')!;
assert.ok(recipe,'T1 salvage fixture must have an authored Forge recipe');
const itemId=recipe.output.itemId;
const character=createCharacter(newGame(0),recipe.classId,'Salvage Test');
function receipt(name:string,rarity:CraftedGearInstance['rarity'],quality?:number):CraftedGearInstance{
 return {...draftCraftedGearInstance({itemId,ownerCharacterId:character.character!.id,jobId:name,createdAtMs:100,roll:.5}),rarity,quality};
}
const common=receipt('salvage-common','common',50),superior=receipt('salvage-superior','mythic',100);
const dust=equipmentSalvageReward(itemId)!;
assert.equal(dust.itemId,'TEMPERING_DUST','salvage keeps guaranteed Tempering Dust');
const ordinary=equipmentSalvageRewards(itemId,common),best=equipmentSalvageRewards(itemId,superior);
assert.deepEqual(equipmentSalvageRewards(itemId),[dust],'legacy/untracked items do not invent a Forge ingredient receipt');
assert.deepEqual(equipmentSalvageRewards(itemId,{...common,itemId:'NON_MATCHING'}),[dust],'mismatched recipe receipt cannot grant recovery');
assert.deepEqual(equipmentSalvageRewards('NOT_EQUIPMENT',common),[],'only authored equipment is salvageable');
assert.ok(ordinary.length>1,'crafted T1 gear recovers ordinary material as well as Dust');
assert.ok(ordinary.every(row=>best.find(max=>max.itemId===row.itemId)!.quantity>=row.quantity),'higher quality/rarity never lowers recovery');
assert.ok(best.some(row=>row.itemId!==dust.itemId&&row.quantity>ordinary.find(min=>min.itemId===row.itemId)!.quantity),'mythic Q100 can recover more ordinary resources');
const infusionIds=new Set(['VERDANT_BINDING_RESIN','IRONWOOD_BINDING_RESIN','SUNSCAR_DUNE_BINDER','GLASSBOUND_BINDER','SUNFUSED_FIXATIVE','RIMEWARD_DISTILLATE','CINDERHEART_ELIXIR']);
for(const recipe of V33_EQUIPMENT_RECIPES){
 const forged={...common,itemId:recipe.output.itemId,rarity:'mythic' as const,quality:100};
 const rewards=equipmentSalvageRewards(recipe.output.itemId,forged);
 assert.equal(rewards[0].itemId,'TEMPERING_DUST',recipe.id+' keeps guaranteed Dust');
 for(const returned of rewards.slice(1)){
  const input=recipe.inputs.find(input=>input.itemId===returned.itemId);
  assert.ok(input,recipe.id+' only recovers an authored ingredient');
  assert.ok(!infusionIds.has(returned.itemId),recipe.id+' cannot salvage an Alchemy catalyst');
  assert.ok(['common','uncommon'].includes(itemRarity(itemDef(returned.itemId))),recipe.id+' cannot recover a rare input');
  assert.equal(returned.quantity,Math.floor(input!.quantity*.25),recipe.id+' maximum is exactly 25% per ordinary material, rounded down');
  assert.ok(returned.quantity<input!.quantity,recipe.id+' recovery cannot pay for another complete craft');
 }
 assert.ok(new Set(rewards.map(row=>row.itemId)).size===rewards.length,recipe.id+' contains no duplicate reward type');
}
function pouchState(copy:CraftedGearInstance):GameState{
 return {...character,character:{...character.character!,equipmentPouch:{capacity:30,stacks:[{itemId,instanceId:copy.id,quantity:1}]}},
 account:{...character.account,craftedGearInstances:[copy]}};
}
const owned=pouchState(common);
assert.ok(auditCraftedGearOwnership(owned).consistent,'test uses an authoritative exact-copy Forge receipt');
const candidate=equipmentPouchSalvageCandidates(owned)[0];
assert.equal(candidate.eligible,true,'crafted pouch copy is salvageable');
assert.deepEqual(candidate.rewards,ordinary,'pouch preview must display exact server-derived outputs');
const salvaged=salvageEquipmentPouchSelected(owned,[candidate.id]);
assert.deepEqual(salvaged.inventory.stacks.filter(row=>ordinary.some(r=>r.itemId===row.itemId))
 .map(row=>({itemId:row.itemId,quantity:row.quantity})).sort((a,b)=>a.itemId.localeCompare(b.itemId)),
 ordinary.slice().sort((a,b)=>a.itemId.localeCompare(b.itemId)),'salvage credits every expected material exactly once');
assert.ok(!salvaged.account.craftedGearInstances?.some(record=>record.id===common.id),'used Forge receipt is consumed');
assert.equal(salvaged.character!.equipmentPouch?.stacks.length,0,'exact physical equipment copy is destroyed');
assert.throws(()=>salvageEquipmentPouchSelected(salvaged,[candidate.id]),'replay of an old receipt cannot pay out twice');
assert.equal(owned.character!.equipmentPouch?.stacks.length,1,'previous state is not mutated');
const legacy:GameState={...character,character:{...character.character!,equipmentPouch:{capacity:30,stacks:[{itemId,quantity:1}]}}};
assert.deepEqual(equipmentPouchSalvageCandidates(legacy)[0].rewards,[dust],'legacy pouch preview promises Dust only');
const legacyDone=salvageEquipmentPouchSelected(legacy,[equipmentPouchSalvageCandidates(legacy)[0].id]);
assert.deepEqual(legacyDone.inventory.stacks.filter(row=>row.itemId==='TEMPERING_DUST'),[dust],'legacy payout remains unchanged');
const locked=pouchState({...common,locked:true});
assert.throws(()=>disposeCraftedGearInstance(locked,common.id,'salvage'),/locked/i,'locked gear remains protected');
const equipped=pouchState({...common,enhancement:{...common.enhancement,rank:1}});
assert.throws(()=>disposeCraftedGearInstance(equipped,common.id,'salvage'),/Enhanced/i,'enhanced gear remains protected');
const full={...owned,inventory:{...owned.inventory,capacity:1,stacks:[{itemId:'BOAR_HIDE',quantity:1}]}};
assert.throws(()=>salvageEquipmentPouchSelected(full,[candidate.id]),/full/i,'insufficient Inventory slots reject the whole salvage');
assert.ok(full.account.craftedGearInstances?.some(record=>record.id===common.id)&&full.character!.equipmentPouch?.stacks.length===1,'failed salvage does not destroy equipment');
const inBank:GameState={...owned,character:{...owned.character!,equipmentPouch:{capacity:30,stacks:[]}},bank:{...owned.bank,stacks:[{itemId,quantity:1,instanceId:common.id}]}};
const bankResult=disposeCraftedGearInstance(inBank,common.id,'salvage');
assert.ok(bankResult.bank.stacks.length===0&&bankResult.inventory.stacks.some(row=>row.itemId==='TEMPERING_DUST'),'Bank gear salvages to active Inventory');
const inventoryGear:GameState={...owned,character:{...owned.character!,equipmentPouch:{capacity:30,stacks:[]}},inventory:{...owned.inventory,stacks:[{itemId,quantity:1,instanceId:common.id}]}};
const bulk=bulkSalvageSelected(inventoryGear,['copy:'+common.id]);
assert.ok(bulk.inventory.stacks.some(row=>row.itemId==='TEMPERING_DUST')&&!bulk.account.craftedGearInstances?.length,'bulk Inventory salvage uses the same exact-copy reward pipeline');
console.log('PASS: tiered Dust and 15–25% ordinary Forge-material salvage, per-copy previews, protected gear, full Inventory atomicity, Bank and bulk paths, replay safety');

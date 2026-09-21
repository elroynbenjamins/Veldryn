import {equipmentChangeFeedback,type EquipmentFeedbackSnapshot} from '../src/core/equipment-change-feedback';
import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {itemDef} from '../src/content/items';
import type {GearSlot} from '../src/core/types';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

const set=EQUIPMENT_SETS.find(row=>row.itemIds.length>=2);if(!set)throw new Error('runtime equipment set fixture missing');
const pieces=set.itemIds.map(id=>itemDef(id)).filter(item=>item.slot);
const first=pieces[0],second=pieces.find(item=>item.slot!==first.slot);if(!first?.slot||!second?.slot)throw new Error('set fixture requires two slots');
const beforeEquipment:Partial<Record<GearSlot,string>>={[first.slot]:first.id};
const afterEquipment:Partial<Record<GearSlot,string>>={...beforeEquipment,[second.slot]:second.id};
const before:EquipmentFeedbackSnapshot={characterId:'hero',equipment:beforeEquipment,stats:{attack:100,defense:100,hp:1000,power:300}};
const after:EquipmentFeedbackSnapshot={characterId:'hero',equipment:afterEquipment,stats:{attack:108,defense:104,hp:1040,power:318}};
const equipped=equipmentChangeFeedback(before,after);
equal(equipped?.action,'equipped','empty slot to gear must be classified as equipped');
equal(equipped?.itemId,second.id,'equipment feedback must identify the committed item');
equal(equipped?.delta.attack,8,'equipment feedback must preserve committed stat deltas');
equal(equipped?.delta.power,18,'equipment feedback must preserve committed power delta');
ok(equipped?.setChanges.some(change=>change.type==='activated'&&change.pieces===2&&change.setId===set.id),'crossing two pieces must surface the real 2pc set activation');

const replacementId=pieces.find(item=>item.slot===second.slot&&item.id!==second.id)?.id;
if(replacementId){
 const replaced=equipmentChangeFeedback(after,{...after,equipment:{...after.equipment,[second.slot]:replacementId},stats:{attack:105,defense:109,hp:1035,power:317}});
 equal(replaced?.action,'replaced','gear to different gear in one slot must be classified as a swap');
 equal(replaced?.previousItemId,second.id,'swap feedback must retain the item returned to Inventory');
}
equal(equipmentChangeFeedback(before,{...after,characterId:'different'}),null,'switching character must never emit a false equipment moment');

const inventory=fs.readFileSync('src/screens/InventoryScreen.tsx','utf8');
ok(inventory.includes('GEAR SWAPPED')&&inventory.includes('EQUIPPED')&&inventory.includes('UNEQUIPPED'),'Inventory must distinguish equip result types');
ok(inventory.includes('returned to Inventory.'),'gear replacement must explain where the old item went');
ok(inventory.includes('POWER')&&inventory.includes('ATK')&&inventory.includes('DEF')&&inventory.includes('HP'),'gear swap feedback must expose meaningful stat deltas');
ok(inventory.includes('SET BONUS ACTIVATED')&&inventory.includes('SET BONUS LOST'),'gear swap feedback must announce crossed set thresholds');
ok(inventory.includes('equipmentChangeFeedback(previous,next)'),'feedback must derive from committed state transitions');
ok(inventory.includes('setTimeout(()=>dismissRef.current(),5000)'),'equipment result moment should clear itself without blocking inventory use');
ok(inventory.includes('reduceMotion'),'equipment swap animation must respect Reduce Motion');

console.log('PASS equipment swaps report committed stat and set-bonus changes without interrupting inventory flow');

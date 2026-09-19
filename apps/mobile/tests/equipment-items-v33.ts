import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {ITEMS,itemDef} from '../src/content/items';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
ok(EQUIPMENT_ITEMS_V33.length===2430,'all v33 pieces have runtime item definitions');
ok(new Set(EQUIPMENT_ITEMS_V33.map(item=>item.id)).size===2430,'v33 piece IDs are unique');
ok(EQUIPMENT_ITEMS_V33.every(item=>item.type==='gear'&&item.equipmentSetId&&item.slot),'v33 pieces are gear');
ok(EQUIPMENT_ITEMS_V33.every(item=>itemDef(item.id)===item),'itemDef resolves every v33 piece');
ok(ITEMS.length>=2430,'v33 items are registered in the mobile item catalog');
console.log('PASS: all 2,430 v33 equipment pieces resolve through the mobile item registry');

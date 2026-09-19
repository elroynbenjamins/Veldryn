import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {equipmentFallbackSetByItemId} from '../src/theme/equipment-fallback-art';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
ok(EQUIPMENT_ITEMS_V33.every(item=>!equipmentFallbackSetByItemId[item.id]),'v33 pieces never inherit legacy visual aliases');
console.log('PASS: v33 equipment uses neutral fallback presentation until fresh male/female art is approved');

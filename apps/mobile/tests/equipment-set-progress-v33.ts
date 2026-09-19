import {EQUIPMENT_SETS,equipmentSetProgressV33} from '../src/content/equipment-sets';
const set=EQUIPMENT_SETS[0];
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const pieces=set.itemIds;
ok(pieces.length===10,'ten set pieces');
ok(equipmentSetProgressV33(set.id,pieces.slice(0,9)).thresholds.map(entry=>entry.active).join(',')==='true,true,true,true,false','thresholds');
ok(equipmentSetProgressV33(set.id,pieces).complete,'complete');
console.log('PASS: mobile v33 set progress exposes ten-piece completion and 2/4/6/8/10 thresholds');

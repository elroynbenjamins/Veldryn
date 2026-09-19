import { EQUIPMENT_SETS, equipmentSetSlotOrder } from '../src/content/equipment-sets';

const expected=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'];
if(EQUIPMENT_SETS.length!==243)throw new Error(`Expected 243 v33 sets, got ${EQUIPMENT_SETS.length}`);
if(EQUIPMENT_SETS.some(set=>set.itemIds.length!==10))throw new Error('Every v33 set must expose ten catalog pieces');
if(EQUIPMENT_SETS.some(set=>JSON.stringify(equipmentSetSlotOrder(set.id))!==JSON.stringify(expected)))throw new Error('Every v33 set must use the authoritative slot order');
if(EQUIPMENT_SETS.some(set=>[set.twoPiece,set.fourPiece,set.sixPiece,set.eightPiece,set.tenPiece].some(value=>!value)))throw new Error('Every v33 set must expose all five thresholds');
console.log('PASS: mobile equipment adapter exposes the v33 243-set, ten-slot catalog');

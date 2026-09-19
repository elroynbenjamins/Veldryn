"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_items_v33_1 = require("../src/content/equipment-items-v33");
const items_1 = require("../src/content/items");
function ok(value, message) { if (!value)
    throw new Error(message); }
ok(equipment_items_v33_1.EQUIPMENT_ITEMS_V33.length === 2430, 'all v33 pieces have runtime item definitions');
ok(new Set(equipment_items_v33_1.EQUIPMENT_ITEMS_V33.map(item => item.id)).size === 2430, 'v33 piece IDs are unique');
ok(equipment_items_v33_1.EQUIPMENT_ITEMS_V33.every(item => item.type === 'gear' && item.equipmentSetId && item.slot), 'v33 pieces are gear');
ok(equipment_items_v33_1.EQUIPMENT_ITEMS_V33.every(item => (0, items_1.itemDef)(item.id) === item), 'itemDef resolves every v33 piece');
ok(items_1.ITEMS.length >= 2430, 'v33 items are registered in the mobile item catalog');
console.log('PASS: all 2,430 v33 equipment pieces resolve through the mobile item registry');

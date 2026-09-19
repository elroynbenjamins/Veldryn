"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_sets_1 = require("../src/content/equipment-sets");
const set = equipment_sets_1.EQUIPMENT_SETS[0];
function ok(value, message) { if (!value)
    throw new Error(message); }
const pieces = set.itemIds;
ok(pieces.length === 10, 'ten set pieces');
ok((0, equipment_sets_1.equipmentSetProgressV33)(set.id, pieces.slice(0, 9)).thresholds.map(entry => entry.active).join(',') === 'true,true,true,true,false', 'thresholds');
ok((0, equipment_sets_1.equipmentSetProgressV33)(set.id, pieces).complete, 'complete');
console.log('PASS: mobile v33 set progress exposes ten-piece completion and 2/4/6/8/10 thresholds');

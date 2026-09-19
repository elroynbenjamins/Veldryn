"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_items_v33_1 = require("../src/content/equipment-items-v33");
const equipment_fallback_art_1 = require("../src/theme/equipment-fallback-art");
function ok(value, message) { if (!value)
    throw new Error(message); }
ok(equipment_items_v33_1.EQUIPMENT_ITEMS_V33.every(item => !equipment_fallback_art_1.equipmentFallbackSetByItemId[item.id]), 'v33 pieces never inherit legacy visual aliases');
console.log('PASS: v33 equipment uses neutral fallback presentation until fresh male/female art is approved');

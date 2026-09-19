"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEM_DETAIL_ACTIONS_V32 = void 0;
exports.itemCompareRowsV32 = itemCompareRowsV32;
exports.setChangeLinesV32 = setChangeLinesV32;
const equipment_v24_1 = require("./equipment-v24");
const percent = new Set(['evasion', 'critRate', 'critDamage', 'haste', 'tenacity', 'potency']);
function itemCompareRowsV32(p) { return Object.entries(p.statDelta).filter(([, v]) => Math.abs(v) > 1e-9).map(([key, value]) => ({ key, value, label: (0, equipment_v24_1.formatStatDeltaV24)(value, percent.has(key)), positive: value > 0 })); }
function setChangeLinesV32(p) { return p.setChanges.map(x => `${x.setName}: ${x.beforeCount} → ${x.afterCount} armor pieces${x.afterThresholds.length ? ` (${x.afterThresholds.join('/')}pc active)` : ''}`); }
exports.ITEM_DETAIL_ACTIONS_V32 = ['Equip', 'Compare', 'Upgrade', 'Stat Gem', 'Effect Gem', 'Set details'];

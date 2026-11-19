"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSetBonusesV22 = resolveSetBonusesV22;
const equipment_types_v22_1 = require("./equipment-types-v22");
function resolveSetBonusesV22(equipped, defs) {
    const map = new Map();
    for (const p of equipped) {
        if (!equipment_types_v22_1.ARMOR_SET_SLOTS.includes(p.slot))
            continue;
        const slots = map.get(p.setId) ?? new Set();
        slots.add(p.slot);
        map.set(p.setId, slots);
    }
    const byId = new Map(defs.map(d => [d.id, d]));
    const out = [];
    for (const [setId, slots] of map) {
        const d = byId.get(setId);
        if (!d)
            continue;
        const thresholds = d.thresholds.filter(t => slots.size >= t.pieces);
        if (thresholds.length)
            out.push({ setId, pieceCount: slots.size, thresholds });
    }
    return out.sort((a, b) => a.setId.localeCompare(b.setId));
}

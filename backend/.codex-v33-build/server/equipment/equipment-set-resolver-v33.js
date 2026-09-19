"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSetBonusesV33 = resolveSetBonusesV33;
const equipment_types_v33_1 = require("./equipment-types-v33");
function resolveSetBonusesV33(equipped, defs) {
    const bySet = new Map();
    for (const p of equipped) {
        if (!equipment_types_v33_1.EQUIPMENT_SLOT_ORDER_V33.includes(p.slot))
            continue;
        const slots = bySet.get(p.setId) ?? new Set();
        slots.add(p.slot);
        bySet.set(p.setId, slots);
    }
    const byId = new Map(defs.map(d => [d.id, d]));
    const out = [];
    for (const [setId, slots] of bySet) {
        const d = byId.get(setId);
        if (!d)
            continue;
        const thresholds = d.thresholds.filter(t => slots.size >= t.pieces);
        if (thresholds.length)
            out.push({ setId, pieceCount: slots.size, thresholds });
    }
    return out.sort((a, b) => a.setId.localeCompare(b.setId));
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_PIECES_V33 = exports.EQUIPMENT_SETS_V33 = void 0;
exports.validateCatalogV33 = validateCatalogV33;
const equipment_catalog_t1_t9_v33_json_1 = __importDefault(require("../../../data/equipment_catalog_t1_t9_v33.json"));
const slot = (v) => String(v);
exports.EQUIPMENT_SETS_V33 = equipment_catalog_t1_t9_v33_json_1.default.sets.map((r) => ({
    id: r['Set ID'], tier: r.Tier, tierName: r['Tier Name'], region: r.Region, levelMin: Number(r['Level Min']), levelMax: Number(r['Level Max']), unlockLevel: Number(r['Set Unlock Level']), className: r.Class, role: r.Role, path: r.Path, name: r['Set Name'], focus: r['Build Focus'], primaryStat: r['Primary Stat'], secondaryStat: r['Secondary Stat'], tertiaryStat: r['Tertiary Stat'], collectibleBonus: r['Collectible Bonus'], thresholds: [
        { pieces: 2, description: r['2pc Bonus v33'] }, { pieces: 4, description: r['4pc Bonus v33'] }, { pieces: 6, description: r['6pc Bonus v33'] }, { pieces: 8, description: r['8pc Bonus v33'] }, { pieces: 10, description: r['10pc Bonus v33'] },
    ]
}));
exports.EQUIPMENT_PIECES_V33 = equipment_catalog_t1_t9_v33_json_1.default.pieces.map((r) => ({
    id: r['Piece ID'], setId: r['Set ID'], tier: r.Tier, className: r.Class, role: r.Role, path: r.Path, setName: r['Set Name'], slot: slot(r.Slot), name: r['Item Name'], requiredLevel: Number(r['Req Level']), countsForSetBonus: true, requiredForSkin: true, primaryStat: r['Primary Stat Emphasis'], secondaryStat: r['Secondary Stat Emphasis']
}));
function validateCatalogV33() {
    const e = [];
    const ids = new Set();
    const setIds = new Set(exports.EQUIPMENT_SETS_V33.map(s => s.id));
    for (const p of exports.EQUIPMENT_PIECES_V33) {
        if (ids.has(p.id))
            e.push(`duplicate_piece:${p.id}`);
        ids.add(p.id);
        if (!setIds.has(p.setId))
            e.push(`unknown_set:${p.id}`);
    }
    for (const s of exports.EQUIPMENT_SETS_V33) {
        const ps = exports.EQUIPMENT_PIECES_V33.filter(p => p.setId === s.id);
        const slots = new Set(ps.map(p => p.slot));
        if (ps.length !== 10)
            e.push(`piece_count:${s.id}:${ps.length}`);
        for (const req of equipment_catalog_t1_t9_v33_json_1.default.slotOrder)
            if (!slots.has(req))
                e.push(`missing_slot:${s.id}:${req}`);
    }
    return e;
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKIN_MILESTONES_V22 = exports.EVENT_SKIN_POLICY_V22 = exports.SLOT_PACING_V22 = exports.TIER_PACING_V22 = exports.EQUIPMENT_PIECES_V22 = exports.EQUIPMENT_SETS_V22 = void 0;
exports.validateCatalogV22 = validateCatalogV22;
const equipment_catalog_t1_t8_v22_json_1 = __importDefault(require("../../../data/equipment_catalog_t1_t8_v22.json"));
const b = (v) => String(v ?? '').toLowerCase() === 'yes';
const slot = (v) => String(v);
exports.EQUIPMENT_SETS_V22 = equipment_catalog_t1_t8_v22_json_1.default.sets.map((r) => ({ id: r['Set ID'], tier: r.Tier, tierName: r['Tier Name'], region: r.Region, levelMin: Number(r['Level Min']), levelMax: Number(r['Level Max']), unlockLevel: Number(r['Set Unlock Level']), className: r.Class, role: r.Role, path: r.Path, name: r['Set Name'], focus: r['Build Focus'], primaryStat: r['Primary Stat'], secondaryStat: r['Secondary Stat'], tertiaryStat: r['Tertiary Stat'], thresholds: [{ pieces: 2, description: r['2pc Bonus'] }, { pieces: 3, description: r['3pc Bonus'] }, { pieces: 5, description: r['5pc Bonus'] }], collectibleBonus: r['Collectible Bonus'] }));
exports.EQUIPMENT_PIECES_V22 = equipment_catalog_t1_t8_v22_json_1.default.pieces.map((r) => ({ id: r['Piece ID'], setId: r['Set ID'], tier: r.Tier, className: r.Class, role: r.Role, path: r.Path, setName: r['Set Name'], slot: slot(r.Slot), name: r['Item Name'], requiredLevel: Number(r['Req Level']), countsForSetBonus: b(r['Counts for 2/3/5 Set Bonus?']), requiredForSkin: b(r['Required for Skin Unlock?']), weaponOffhandType: r['Weapon/Off-hand Type'] || undefined, primaryStat: r['Primary Stat Emphasis'], secondaryStat: r['Secondary Stat Emphasis'] }));
exports.TIER_PACING_V22 = equipment_catalog_t1_t8_v22_json_1.default.tierPacing.map((r) => ({ tier: r.Tier, levelRange: r.Levels, effectiveHoursPerPiece: r['Avg Effective Hours / Piece'], fullSetHours: r['Target Hours / Full 7-Piece Set'], craftTimer: r['Final Craft Timer / Piece'], realWorldCompletion: r['Typical Real-World Completion'], firstSetAcceleration: r['First-Set Story Acceleration'], oldTierCatchup: r['Old-Tier Catch-up'] }));
exports.SLOT_PACING_V22 = equipment_catalog_t1_t8_v22_json_1.default.slotPacing.map((r) => ({ slot: slot(r.Slot), costMultiplier: Number(r['Cost Multiplier']) }));
exports.EVENT_SKIN_POLICY_V22 = equipment_catalog_t1_t8_v22_json_1.default.eventSkinPolicy;
exports.SKIN_MILESTONES_V22 = equipment_catalog_t1_t8_v22_json_1.default.skinMilestones;
function validateCatalogV22() { const e = []; const setIds = new Set(exports.EQUIPMENT_SETS_V22.map(v => v.id)); const pieceIds = new Set(); for (const p of exports.EQUIPMENT_PIECES_V22) {
    if (pieceIds.has(p.id))
        e.push(`duplicate_piece:${p.id}`);
    pieceIds.add(p.id);
    if (!setIds.has(p.setId))
        e.push(`unknown_set:${p.id}`);
} for (const s of exports.EQUIPMENT_SETS_V22) {
    const ps = exports.EQUIPMENT_PIECES_V22.filter(p => p.setId === s.id);
    const slots = new Set(ps.map(p => p.slot));
    if (ps.length !== 7)
        e.push(`piece_count:${s.id}:${ps.length}`);
    for (const req of ['Helmet', 'Chest', 'Gloves', 'Legs', 'Boots', 'Weapon', 'Off-hand'])
        if (!slots.has(req))
            e.push(`missing_slot:${s.id}:${req}`);
} return e; }

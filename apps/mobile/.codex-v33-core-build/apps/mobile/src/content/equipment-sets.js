"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_SETS = void 0;
exports.equipmentSetDef = equipmentSetDef;
exports.equippedSetPieceCount = equippedSetPieceCount;
exports.equipmentSetSlotOrder = equipmentSetSlotOrder;
exports.equipmentSetProgressV33 = equipmentSetProgressV33;
const equipment_catalog_t1_t9_v33_json_1 = __importDefault(require("./equipment_catalog_t1_t9_v33.json"));
const classIdByCatalogName = {
    Ironwarden: 'IRONWARDEN',
    Bastion: 'BASTION',
    Dreadguard: 'DREADGUARD',
    Dawnkeeper: 'DAWNKEEPER',
    Wayfinder: 'WAYFINDER',
    Ravager: 'RAVAGER',
    Hexweaver: 'HEXWEAVER',
    'Knife Dancer': 'KNIFE_DANCER',
    Stonecaller: 'STONECALLER',
};
const slotByCatalogName = {
    Helmet: 'helmet', Chest: 'chest', Gloves: 'gloves', Legs: 'legs', Boots: 'boots', Weapon: 'weapon',
    'Off-hand': 'offhand', Cape: 'cape', Amulet: 'amulet', Ring: 'ring',
};
const paletteByTier = {
    T1: { accent: '#8fb7d9', surface: '#172331' }, T2: { accent: '#9fbd82', surface: '#1b281d' }, T3: { accent: '#d1a66b', surface: '#2b2118' },
    T4: { accent: '#d77d62', surface: '#2a1918' }, T5: { accent: '#b58be0', surface: '#21182d' }, T6: { accent: '#6fd5c5', surface: '#142b2b' },
    T7: { accent: '#7bb8e8', surface: '#17273a' }, T8: { accent: '#d9b75f', surface: '#2b2414' }, T9: { accent: '#e18b59', surface: '#2c1b16' },
};
const piecesBySet = new Map();
for (const piece of equipment_catalog_t1_t9_v33_json_1.default.pieces) {
    const setId = String(piece['Set ID']);
    const list = piecesBySet.get(setId) ?? [];
    list.push(String(piece['Piece ID']));
    piecesBySet.set(setId, list);
}
exports.EQUIPMENT_SETS = equipment_catalog_t1_t9_v33_json_1.default.sets.map(set => {
    const palette = paletteByTier[String(set.Tier)] ?? paletteByTier.T1;
    return {
        id: String(set['Set ID']), name: String(set['Set Name']), classId: classIdByCatalogName[String(set.Class)],
        itemIds: piecesBySet.get(String(set['Set ID'])) ?? [], twoPiece: String(set['2pc Bonus v33']), fourPiece: String(set['4pc Bonus v33']),
        sixPiece: String(set['6pc Bonus v33']), eightPiece: String(set['8pc Bonus v33']), tenPiece: String(set['10pc Bonus v33']),
        source: `${String(set.Region)} · ${String(set['Build Focus'])}`, accent: palette.accent, surface: palette.surface,
        tier: String(set.Tier), region: String(set.Region), path: String(set.Path), requiredLevel: Number(set['Set Unlock Level']),
    };
});
function equipmentSetDef(id) { return id ? exports.EQUIPMENT_SETS.find(set => set.id === id) : undefined; }
function equippedSetPieceCount(equipment, set) {
    return Object.values(equipment).filter(itemId => itemId && set.itemIds.includes(itemId)).length;
}
function equipmentSetSlotOrder(setId) {
    return equipment_catalog_t1_t9_v33_json_1.default.pieces.filter(piece => piece['Set ID'] === setId).map(piece => slotByCatalogName[String(piece.Slot)]);
}
function equipmentSetProgressV33(setId, craftedPieceIds) {
    const set = equipmentSetDef(setId);
    if (!set)
        throw new Error(`Unknown v33 equipment set: ${setId}`);
    const crafted = new Set(craftedPieceIds), pieces = set.itemIds.filter(id => crafted.has(id));
    const count = pieces.length;
    return { setId, crafted: count, required: 10, complete: count === 10, thresholds: [2, 4, 6, 8, 10].map(piecesRequired => ({ pieces: piecesRequired, active: count >= piecesRequired })) };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEquipV32 = validateEquipV32;
exports.equipItemV32 = equipItemV32;
exports.loadoutSummaryV32 = loadoutSummaryV32;
exports.compareEquipV32 = compareEquipV32;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_set_resolver_v22_1 = require("./equipment-set-resolver-v22");
const equipment_item_instance_v26_1 = require("./equipment-item-instance-v26");
const allStats = () => ({ maxHp: 0, power: 0, armor: 0, ward: 0, accuracy: 0, evasion: 0, critRate: 0, critDamage: 0, haste: 0, tenacity: 0, penetration: 0, potency: 0 });
function validateEquipV32(ctx, itemId) {
    const inst = ctx.instances.find(v => v.id === itemId);
    if (!inst)
        throw new Error('item_not_owned');
    if (inst.characterId !== ctx.characterId)
        throw new Error('wrong_character');
    const piece = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(v => v.id === inst.pieceId);
    if (!piece)
        throw new Error('unknown_piece');
    if (piece.className !== ctx.className)
        throw new Error('wrong_class');
    if (ctx.level < piece.requiredLevel)
        throw new Error('level_too_low');
    return { inst, piece };
}
function equipItemV32(ctx, itemId) {
    const { piece } = validateEquipV32(ctx, itemId);
    const next = { ...ctx.loadout, [piece.slot]: itemId };
    const ids = Object.values(next).filter((x) => Boolean(x));
    if (new Set(ids).size !== ids.length)
        throw new Error('same_item_multiple_slots');
    return next;
}
function loadoutSummaryV32(ctx) {
    const stats = allStats(), equipped = [];
    for (const itemId of Object.values(ctx.loadout)) {
        if (!itemId)
            continue;
        const { inst, piece } = validateEquipV32(ctx, itemId);
        const d = (0, equipment_item_instance_v26_1.deriveInstanceV26)(inst);
        for (const [k, v] of Object.entries(d.stats))
            stats[k] = Number((stats[k] + v).toFixed(5));
        equipped.push({ pieceId: piece.id, setId: piece.setId, slot: piece.slot });
    }
    return { stats, sets: (0, equipment_set_resolver_v22_1.resolveSetBonusesV22)(equipped, equipment_catalog_v23_1.EQUIPMENT_SETS_V23), equipped };
}
function compareEquipV32(ctx, candidateItemId) {
    const { piece, inst } = validateEquipV32(ctx, candidateItemId);
    const before = loadoutSummaryV32(ctx), afterLoadout = equipItemV32(ctx, candidateItemId), after = loadoutSummaryV32({ ...ctx, loadout: afterLoadout });
    const delta = allStats();
    for (const k of Object.keys(delta))
        delta[k] = Number((after.stats[k] - before.stats[k]).toFixed(5));
    const setIds = new Set([...before.sets.map(s => s.setId), ...after.sets.map(s => s.setId)]);
    const setChanges = [...setIds].map(setId => { const b = before.sets.find(s => s.setId === setId), a = after.sets.find(s => s.setId === setId), set = equipment_catalog_v23_1.EQUIPMENT_SETS_V23.find(s => s.id === setId); return { setId, setName: set?.name ?? setId, beforeCount: b?.pieceCount ?? 0, afterCount: a?.pieceCount ?? 0, beforeThresholds: b?.thresholds.map(x => x.pieces) ?? [], afterThresholds: a?.thresholds.map(x => x.pieces) ?? [] }; }).filter(x => x.beforeCount !== x.afterCount || x.beforeThresholds.join(',') !== x.afterThresholds.join(','));
    return { slot: piece.slot, currentItemId: ctx.loadout[piece.slot], candidateItemId, rarity: inst.rarity, upgradeRank: inst.upgradeRank, statDelta: delta, setChanges, before, after };
}

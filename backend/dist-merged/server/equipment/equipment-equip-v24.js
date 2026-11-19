"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEquipV24 = validateEquipV24;
exports.equipItemV24 = equipItemV24;
exports.loadoutSummaryV24 = loadoutSummaryV24;
exports.compareEquipV24 = compareEquipV24;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_set_resolver_v22_1 = require("./equipment-set-resolver-v22");
const equipment_item_instance_v24_1 = require("./equipment-item-instance-v24");
const allStats = () => ({ maxHp: 0, power: 0, armor: 0, ward: 0, accuracy: 0, evasion: 0, critRate: 0, critDamage: 0, haste: 0, tenacity: 0, penetration: 0, potency: 0 });
function validateEquipV24(ctx, itemId) { const inst = ctx.instances.find(v => v.id === itemId); if (!inst)
    throw new Error('item_not_owned'); if (inst.characterId !== ctx.characterId)
    throw new Error('wrong_character'); const p = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(v => v.id === inst.pieceId); if (!p)
    throw new Error('unknown_piece'); if (p.className !== ctx.className)
    throw new Error('wrong_class'); if (ctx.level < p.requiredLevel)
    throw new Error('level_too_low'); return { inst, piece: p }; }
function equipItemV24(ctx, itemId) { const { piece } = validateEquipV24(ctx, itemId); const next = { ...ctx.loadout, [piece.slot]: itemId }; const ids = Object.values(next).filter(Boolean); if (new Set(ids).size !== ids.length)
    throw new Error('same_item_multiple_slots'); return next; }
function loadoutSummaryV24(ctx) { const stats = allStats(), equipped = []; for (const itemId of Object.values(ctx.loadout)) {
    if (!itemId)
        continue;
    const { inst, piece } = validateEquipV24({ ...ctx, loadout: ctx.loadout }, itemId);
    const d = (0, equipment_item_instance_v24_1.deriveInstanceV24)(inst);
    for (const [k, v] of Object.entries(d.stats))
        stats[k] = Number((stats[k] + v).toFixed(5));
    equipped.push({ pieceId: piece.id, setId: piece.setId, slot: piece.slot });
} const sets = (0, equipment_set_resolver_v22_1.resolveSetBonusesV22)(equipped, equipment_catalog_v23_1.EQUIPMENT_SETS_V23); return { stats, sets }; }
function compareEquipV24(ctx, candidateItemId) { const { piece } = validateEquipV24(ctx, candidateItemId); const before = loadoutSummaryV24(ctx), afterLoadout = equipItemV24(ctx, candidateItemId), after = loadoutSummaryV24({ ...ctx, loadout: afterLoadout }); const delta = allStats(); for (const k of Object.keys(delta))
    delta[k] = Number((after.stats[k] - before.stats[k]).toFixed(5)); return { slot: piece.slot, currentItemId: ctx.loadout[piece.slot], candidateItemId, statDelta: delta, beforeSets: before.sets, afterSets: after.sets }; }

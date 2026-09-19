"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.craftingScreenPayloadV32 = craftingScreenPayloadV32;
exports.equipmentLoadoutPayloadV32 = equipmentLoadoutPayloadV32;
exports.equipmentComparePayloadV32 = equipmentComparePayloadV32;
exports.setCollectionPayloadV32 = setCollectionPayloadV32;
exports.setDetailPayloadV32 = setDetailPayloadV32;
const equipment_crafting_view_v31_1 = require("./equipment-crafting-view-v31");
const equipment_crafting_plan_v31_1 = require("./equipment-crafting-plan-v31");
const equipment_equip_v32_1 = require("./equipment-equip-v32");
const equipment_skin_progress_v24_1 = require("./equipment-skin-progress-v24");
const equipment_collection_v22_1 = require("./equipment-collection-v22");
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_item_instance_v26_1 = require("./equipment-item-instance-v26");
function craftingScreenPayloadV32(pieceId, state) { const detail = (0, equipment_crafting_view_v31_1.craftingDetailV31)(pieceId, state), plan = (0, equipment_crafting_plan_v31_1.buildCraftPlanV31)(pieceId, state); return { detail, steps: plan.steps, blockers: plan.blockers, pve: plan.pveSummary }; }
function equipmentLoadoutPayloadV32(ctx) { const summary = (0, equipment_equip_v32_1.loadoutSummaryV32)(ctx); return { loadout: ctx.loadout, stats: summary.stats, activeSets: summary.sets, equipped: Object.entries(ctx.loadout).flatMap(([slot, id]) => { if (!id)
        return []; const inst = ctx.instances.find(x => x.id === id); if (!inst)
        return []; const d = (0, equipment_item_instance_v26_1.deriveInstanceV26)(inst); return [{ slot, id, pieceId: inst.pieceId, name: d.pieceName, rarity: inst.rarity, upgradeRank: inst.upgradeRank, setId: d.setId, statGemId: inst.statGemId, effectGemId: inst.effectGemId }]; }) }; }
function equipmentComparePayloadV32(ctx, candidateItemId) { return (0, equipment_equip_v32_1.compareEquipV32)(ctx, candidateItemId); }
function setCollectionPayloadV32(className, craftedPieceIds, unlockedSkinIds) { const skins = (0, equipment_skin_progress_v24_1.setSkinProgressV24)(className, craftedPieceIds, unlockedSkinIds); return { skins, milestones: (0, equipment_collection_v22_1.unlockedSkinMilestonesV22)(unlockedSkinIds.length), totalUnlocked: unlockedSkinIds.length }; }
function setDetailPayloadV32(setId, craftedPieceIds) { const set = equipment_catalog_v23_1.EQUIPMENT_SETS_V23.find(s => s.id === setId); if (!set)
    throw new Error('unknown_set'); const crafted = new Set(craftedPieceIds), pieces = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.filter(p => p.setId === setId).map(p => ({ ...p, crafted: crafted.has(p.id) })); return { set, pieces, armorThresholdRule: 'Only Helmet/Chest/Gloves/Legs/Boots count for 2pc/3pc/5pc.', skinRule: 'Craft all 7 distinct pieces once on this character.' }; }

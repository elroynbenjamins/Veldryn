"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRAFTING_BALANCE_V22 = void 0;
exports.slotCostMultiplierV22 = slotCostMultiplierV22;
exports.tierPacingV22 = tierPacingV22;
exports.storyAcceleratedEffortV22 = storyAcceleratedEffortV22;
exports.oldTierCatchupMultiplierV22 = oldTierCatchupMultiplierV22;
const equipment_catalog_v22_1 = require("./equipment-catalog-v22");
const slotMap = new Map(equipment_catalog_v22_1.SLOT_PACING_V22.map(v => [v.slot, v.costMultiplier]));
exports.CRAFTING_BALANCE_V22 = { firstPrimarySetAcceleration: 0.15, requiredMaterialShare: { regionalCommon: [.55, .70], processed: [.15, .25], monsterSpecific: [.10, .15], dungeonBoss: [.05, .10] }, guaranteedRequiredBossMaterials: true, paidTimerSkipCreatesNoExtraStats: true };
function slotCostMultiplierV22(slot) { return slotMap.get(slot) ?? 1; }
function tierPacingV22(tier) { const v = equipment_catalog_v22_1.TIER_PACING_V22.find(p => p.tier === tier); if (!v)
    throw new Error(`unknown_tier:${tier}`); return v; }
function storyAcceleratedEffortV22(baseHours, isFirstPrimarySet) { return baseHours * (isFirstPrimarySet ? 1 - exports.CRAFTING_BALANCE_V22.firstPrimarySetAcceleration : 1); }
function oldTierCatchupMultiplierV22(currentTier, craftTier) { const gap = Math.max(0, currentTier - craftTier); return Math.min(4, 1 + gap * .45); }

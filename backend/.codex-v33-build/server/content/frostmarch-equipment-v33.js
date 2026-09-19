"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FROSTMARCH_EQUIPMENT_POLICY_V33 = void 0;
exports.validateFrostmarchEquipmentPolicyV33 = validateFrostmarchEquipmentPolicyV33;
const equipment_catalog_v33_1 = require("../equipment/equipment-catalog-v33");
/** v33 override for the historical v21 deferred-equipment note. */
exports.FROSTMARCH_EQUIPMENT_POLICY_V33 = {
    equipmentSetsAuthored: true,
    regionalWeaponsAuthored: true,
    regionalArmorAuthored: true,
    slotCount: 10,
    thresholds: [2, 4, 6, 8, 10],
    skinCompletionPieces: 10,
    catalogSetCount: equipment_catalog_v33_1.EQUIPMENT_SETS_V33.length,
    catalogPieceCount: equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.length,
    visualPolicy: 'fresh-generation-male-female-only',
};
function validateFrostmarchEquipmentPolicyV33() {
    const errors = (0, equipment_catalog_v33_1.validateCatalogV33)();
    if (exports.FROSTMARCH_EQUIPMENT_POLICY_V33.catalogSetCount !== 243)
        errors.push('set_count');
    if (exports.FROSTMARCH_EQUIPMENT_POLICY_V33.catalogPieceCount !== 2430)
        errors.push('piece_count');
    return errors;
}
